// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTAuction
 * @dev Auction contract for NFTs with time-limited bidding
 *      - Seller creates an auction with a minimum price and duration
 *      - Bidders place bids; highest bid wins when auction ends
 *      - Uses pull-over-push pattern for safe bid refunds
 *      - Commission deducted from winning bid; NFT transferred to winner
 *      - Seller pays a listing fee to create an auction
 */
contract NFTAuction is ReentrancyGuard, Ownable {
    struct Auction {
        uint256 auctionId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 minPrice;
        uint256 highestBid;
        address payable highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool ended;
        bool active;
    }

    mapping(uint256 => Auction) public auctions;
    uint256 private _auctionIdCounter;

    // Pull-over-push: pending returns for outbid bidders
    mapping(address => uint256) public pendingReturns;

    // Listing fee to create an auction
    uint256 public listingPrice;

    // Platform fee percentage on sales (e.g., 250 = 2.5%)
    uint256 public platformFeePercentage = 250;
    uint256 private constant FEE_DENOMINATOR = 10000;

    // Accumulated platform fees
    uint256 public accumulatedFees;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 minPrice,
        uint256 startTime,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionFinalized(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 winningBid
    );

    event AuctionCancelled(uint256 indexed auctionId);

    event BidWithdrawn(address indexed bidder, uint256 amount);

    event FeesWithdrawn(address indexed owner, uint256 amount);

    event ListingPriceUpdated(uint256 oldPrice, uint256 newPrice);

    /**
     * @param _listingPrice The fee (in wei) sellers must pay to create an auction
     */
    constructor(uint256 _listingPrice) Ownable(msg.sender) {
        require(_listingPrice > 0, "Listing price must be greater than 0");
        listingPrice = _listingPrice;
    }

    /**
     * @dev Creates a new auction. NFT is transferred to contract as escrow.
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to auction
     * @param minPrice Minimum starting price (reserve price)
     * @param duration Auction duration in seconds
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 minPrice,
        uint256 duration
    ) external payable nonReentrant returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(minPrice > 0, "Min price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(duration <= 30 days, "Duration cannot exceed 30 days");
        require(msg.value == listingPrice, "Must pay the listing fee");

        IERC721 nft = IERC721(nftContract);
        require(
            nft.ownerOf(tokenId) == msg.sender,
            "Not the owner of this NFT"
        );
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this),
            "Auction contract not approved"
        );

        // Transfer NFT to auction contract (escrow)
        nft.transferFrom(msg.sender, address(this), tokenId);

        // Accumulate listing fee
        accumulatedFees += msg.value;

        uint256 auctionId = _auctionIdCounter;
        _auctionIdCounter++;

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: payable(msg.sender),
            minPrice: minPrice,
            highestBid: 0,
            highestBidder: payable(address(0)),
            startTime: startTime,
            endTime: endTime,
            ended: false,
            active: true
        });

        emit AuctionCreated(
            auctionId,
            msg.sender,
            nftContract,
            tokenId,
            minPrice,
            startTime,
            endTime
        );

        return auctionId;
    }

    /**
     * @dev Places a bid on an active auction.
     *      Bid must be higher than current highest bid and >= minPrice.
     *      Previous highest bidder's funds are added to pendingReturns.
     * @param auctionId ID of the auction
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];

        require(auction.active, "Auction is not active");
        require(!auction.ended, "Auction has ended");
        require(block.timestamp < auction.endTime, "Auction has expired");
        require(msg.sender != auction.seller, "Seller cannot bid");
        require(msg.value >= auction.minPrice, "Bid must be >= minimum price");
        require(
            msg.value > auction.highestBid,
            "Bid must be higher than current highest bid"
        );

        // Refund previous highest bidder via pull pattern
        if (auction.highestBidder != address(0)) {
            pendingReturns[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @dev Finalizes an auction after the time has expired.
     *      Transfers NFT to winner and funds to seller (minus commission).
     *      Anyone can call this once the auction time has passed.
     * @param auctionId ID of the auction
     */
    function finalizeAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];

        require(auction.active, "Auction is not active");
        require(!auction.ended, "Auction already finalized");
        require(
            block.timestamp >= auction.endTime,
            "Auction has not expired yet"
        );

        auction.ended = true;
        auction.active = false;

        if (auction.highestBidder != address(0)) {
            // We have a winner
            uint256 commission = (auction.highestBid * platformFeePercentage) /
                FEE_DENOMINATOR;
            uint256 sellerProceeds = auction.highestBid - commission;

            accumulatedFees += commission;

            // Transfer NFT to winner
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );

            // Transfer funds to seller
            (bool success, ) = auction.seller.call{value: sellerProceeds}("");
            require(success, "Transfer to seller failed");

            emit AuctionFinalized(
                auctionId,
                auction.highestBidder,
                auction.highestBid
            );
        } else {
            // No bids — return NFT to seller
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );

            emit AuctionFinalized(auctionId, address(0), 0);
        }
    }

    /**
     * @dev Cancels an auction. Only the seller can cancel, and only if no bids placed.
     *      Returns the NFT from escrow to the seller.
     * @param auctionId ID of the auction to cancel
     */
    function cancelAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];

        require(auction.active, "Auction is not active");
        require(!auction.ended, "Auction already finalized");
        require(auction.seller == msg.sender, "Not the seller");
        require(
            auction.highestBidder == address(0),
            "Cannot cancel auction with bids"
        );

        auction.active = false;
        auction.ended = true;

        // Return NFT to seller
        IERC721(auction.nftContract).transferFrom(
            address(this),
            msg.sender,
            auction.tokenId
        );

        emit AuctionCancelled(auctionId);
    }

    /**
     * @dev Withdraws pending returns for outbid bidders (pull-over-push pattern).
     *      This is the safe way to refund — prevents reentrancy attacks.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No funds to withdraw");

        // Zero out before transfer to prevent reentrancy
        pendingReturns[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit BidWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Withdraws accumulated platform fees (only owner)
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");

        accumulatedFees = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit FeesWithdrawn(owner(), amount);
    }

    /**
     * @dev Updates the listing fee for future auctions (only owner)
     * @param newListingPrice New listing fee in wei
     */
    function updateListingPrice(uint256 newListingPrice) external onlyOwner {
        require(newListingPrice > 0, "Listing price must be greater than 0");

        uint256 oldPrice = listingPrice;
        listingPrice = newListingPrice;

        emit ListingPriceUpdated(oldPrice, newListingPrice);
    }

    /**
     * @dev Updates the platform fee percentage (only owner)
     * @param newFeePercentage New fee percentage (e.g., 250 = 2.5%)
     */
    function setPlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee cannot exceed 10%");
        platformFeePercentage = newFeePercentage;
    }

    // ========================
    // View Functions
    // ========================

    /**
     * @dev Returns auction details
     * @param auctionId ID of the auction
     */
    function getAuction(
        uint256 auctionId
    ) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    /**
     * @dev Returns the total number of auctions created
     */
    function totalAuctions() external view returns (uint256) {
        return _auctionIdCounter;
    }

    /**
     * @dev Returns the current listing fee
     */
    function getListingPrice() external view returns (uint256) {
        return listingPrice;
    }

    /**
     * @dev Fetches all active auctions that have not expired
     */
    function fetchActiveAuctions() external view returns (Auction[] memory) {
        uint256 total = _auctionIdCounter;
        uint256 activeCount = 0;

        for (uint256 i = 0; i < total; i++) {
            if (auctions[i].active && !auctions[i].ended) {
                activeCount++;
            }
        }

        Auction[] memory items = new Auction[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < total; i++) {
            if (auctions[i].active && !auctions[i].ended) {
                items[index] = auctions[i];
                index++;
            }
        }

        return items;
    }

    /**
     * @dev Fetches all auctions created by a specific seller
     * @param user Address of the seller
     */
    function fetchAuctionsBySeller(
        address user
    ) external view returns (Auction[] memory) {
        uint256 total = _auctionIdCounter;
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            if (auctions[i].seller == user) {
                count++;
            }
        }

        Auction[] memory items = new Auction[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < total; i++) {
            if (auctions[i].seller == user) {
                items[index] = auctions[i];
                index++;
            }
        }

        return items;
    }

    /**
     * @dev Fetches all auctions won by a specific user
     * @param user Address of the winner
     */
    function fetchAuctionsWon(
        address user
    ) external view returns (Auction[] memory) {
        uint256 total = _auctionIdCounter;
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            if (
                auctions[i].ended &&
                auctions[i].highestBidder == user &&
                auctions[i].highestBid > 0
            ) {
                count++;
            }
        }

        Auction[] memory items = new Auction[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < total; i++) {
            if (
                auctions[i].ended &&
                auctions[i].highestBidder == user &&
                auctions[i].highestBid > 0
            ) {
                items[index] = auctions[i];
                index++;
            }
        }

        return items;
    }
}
