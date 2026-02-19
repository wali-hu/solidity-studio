// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTAuction
 * @dev Auction contract for NFTs with time-limited bidding.
 *      No listing fee — sellers create auctions for free.
 *      Revenue comes from 2.5% commission on the winning bid.
 *      One-shot finalization: finalizeAuction() handles everything —
 *      settlement, cancellation, bid refunds, and fee distribution.
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

    // Pending returns for outbid bidders
    mapping(address => uint256) public pendingReturns;

    // Track bidders per auction for auto-refund on finalization
    mapping(uint256 => address[]) private _auctionBidders;
    mapping(uint256 => mapping(address => bool)) private _hasBid;

    // Platform fee percentage on sales (e.g., 250 = 2.5%)
    uint256 public platformFeePercentage = 250;
    uint256 private constant FEE_DENOMINATOR = 10000;

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

    event BidRefunded(address indexed bidder, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new auction. NFT is transferred to contract as escrow.
     *      No listing fee required.
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
    ) external nonReentrant returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(minPrice > 0, "Min price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(duration <= 30 days, "Duration cannot exceed 30 days");

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
     *      Bidder is tracked for auto-refund on finalization.
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

        // Track bidder for auto-refund during finalization
        if (!_hasBid[auctionId][msg.sender]) {
            _auctionBidders[auctionId].push(msg.sender);
            _hasBid[auctionId][msg.sender] = true;
        }

        // Store previous highest bidder's funds for refund
        if (auction.highestBidder != address(0)) {
            pendingReturns[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @dev One-shot finalization — handles everything in a single call:
     *
     *      IF BIDS EXIST (and auction time expired):
     *        1. Transfers NFT to the highest bidder (winner)
     *        2. Sends sale proceeds to seller (minus 2.5% commission)
     *        3. Sends commission directly to contract owner
     *        4. Auto-refunds ALL outbid bidders their ETH
     *
     *      IF NO BIDS (cancel — can be called anytime):
     *        1. Returns NFT from escrow back to seller
     *
     *      Only the seller can call this function.
     *
     * @param auctionId ID of the auction to finalize
     */
    function finalizeAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];

        require(auction.active, "Auction is not active");
        require(!auction.ended, "Auction already finalized");
        require(auction.seller == msg.sender, "Only seller can finalize");

        auction.ended = true;
        auction.active = false;

        // === NO BIDS: Cancel — return NFT to seller ===
        if (auction.highestBidder == address(0)) {
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );

            emit AuctionCancelled(auctionId);
            return;
        }

        // === BIDS EXIST: Must wait for auction to expire ===
        require(
            block.timestamp >= auction.endTime,
            "Auction has not expired yet"
        );

        // Calculate commission
        uint256 commission = (auction.highestBid * platformFeePercentage) /
            FEE_DENOMINATOR;
        uint256 sellerProceeds = auction.highestBid - commission;

        // 1. Transfer NFT to winner
        IERC721(auction.nftContract).transferFrom(
            address(this),
            auction.highestBidder,
            auction.tokenId
        );

        // 2. Transfer proceeds to seller
        (bool sellerSuccess, ) = auction.seller.call{value: sellerProceeds}(
            ""
        );
        require(sellerSuccess, "Transfer to seller failed");

        // 3. Transfer commission to owner
        if (commission > 0) {
            (bool ownerSuccess, ) = payable(owner()).call{value: commission}(
                ""
            );
            require(ownerSuccess, "Commission transfer to owner failed");
        }

        // 4. Auto-refund all outbid bidders
        address[] memory bidders = _auctionBidders[auctionId];
        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            uint256 amount = pendingReturns[bidder];
            if (amount > 0) {
                pendingReturns[bidder] = 0;
                (bool refundSuccess, ) = payable(bidder).call{value: amount}(
                    ""
                );
                if (refundSuccess) {
                    emit BidRefunded(bidder, amount);
                } else {
                    // Restore on failure — bidder can use safety withdraw()
                    pendingReturns[bidder] = amount;
                }
            }
        }

        emit AuctionFinalized(
            auctionId,
            auction.highestBidder,
            auction.highestBid
        );
    }

    /**
     * @dev Safety fallback: if auto-refund failed during finalization,
     *      the bidder can manually withdraw their pending returns.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No funds to withdraw");

        pendingReturns[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit BidRefunded(msg.sender, amount);
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
     * @dev Returns the list of bidders for an auction
     */
    function getAuctionBidders(
        uint256 auctionId
    ) external view returns (address[] memory) {
        return _auctionBidders[auctionId];
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
