// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @dev Marketplace contract for listing, buying, and selling NFTs
 *      - Sellers pay a listing fee to list their NFTs
 *      - Buyers pay the listed price
 *      - A commission is deducted from the sale and sent to the marketplace owner
 */
contract NFTMarketplace is ReentrancyGuard, Ownable {
    struct MarketItem {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable buyer;
        uint256 price;
        bool sold;
        bool active;
    }

    // Mapping from listing ID to MarketItem
    mapping(uint256 => MarketItem) public listings;
    uint256 private _listingIdCounter;

    // Listing fee sellers must pay to list an NFT
    uint256 public listingPrice;

    // Platform fee percentage on sales (e.g., 250 = 2.5%)
    uint256 public platformFeePercentage = 250; // 2.5%
    uint256 private constant FEE_DENOMINATOR = 10000;

    // Accumulated platform fees (listing fees + sale commissions)
    uint256 public accumulatedFees;

    event NFTListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    event NFTSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );

    event ListingCancelled(uint256 indexed listingId);

    event FeesWithdrawn(address indexed owner, uint256 amount);

    event PriceUpdated(
        uint256 indexed listingId,
        uint256 oldPrice,
        uint256 newPrice
    );

    event ListingPriceUpdated(uint256 oldPrice, uint256 newPrice);

    /**
     * @param _listingPrice The fee (in wei) sellers must pay to list an NFT
     */
    constructor(uint256 _listingPrice) Ownable(msg.sender) {
        require(_listingPrice > 0, "Listing price must be greater than 0");
        listingPrice = _listingPrice;
    }

    /**
     * @dev Lists an NFT for sale. Seller sets their own price and pays the listing fee.
     *      The NFT is transferred to the marketplace (escrow) until sold or cancelled.
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param price Sale price for the NFT (in wei)
     */
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external payable nonReentrant returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(price > 0, "Price must be greater than 0");
        require(msg.value == listingPrice, "Must pay the listing fee");

        IERC721 nft = IERC721(nftContract);
        require(
            nft.ownerOf(tokenId) == msg.sender,
            "Not the owner of this NFT"
        );
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        // Transfer NFT to marketplace (escrow)
        nft.transferFrom(msg.sender, address(this), tokenId);

        // Accumulate listing fee
        accumulatedFees += msg.value;

        uint256 listingId = _listingIdCounter;
        _listingIdCounter++;

        listings[listingId] = MarketItem({
            listingId: listingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: payable(msg.sender),
            buyer: payable(address(0)),
            price: price,
            sold: false,
            active: true
        });

        emit NFTListed(listingId, msg.sender, nftContract, tokenId, price);

        return listingId;
    }

    /**
     * @dev Buys an NFT from the marketplace.
     *      A commission is deducted and the rest goes to the seller.
     * @param listingId ID of the listing
     */
    function buyNFT(uint256 listingId) external payable nonReentrant {
        MarketItem storage item = listings[listingId];

        require(item.active, "Listing is not active");
        require(!item.sold, "Item already sold");
        require(msg.value == item.price, "Incorrect payment amount");
        require(msg.sender != item.seller, "Cannot buy your own NFT");

        // Mark as sold before transfers to prevent reentrancy
        item.sold = true;
        item.active = false;
        item.buyer = payable(msg.sender);

        // Calculate commission
        uint256 commission = (item.price * platformFeePercentage) /
            FEE_DENOMINATOR;
        uint256 sellerProceeds = item.price - commission;

        // Accumulate commission
        accumulatedFees += commission;

        // Transfer NFT from marketplace to buyer
        IERC721(item.nftContract).transferFrom(
            address(this),
            msg.sender,
            item.tokenId
        );

        // Transfer funds to seller
        (bool success, ) = item.seller.call{value: sellerProceeds}("");
        require(success, "Transfer to seller failed");

        emit NFTSold(listingId, msg.sender, item.seller, item.price);
    }

    /**
     * @dev Cancels a listing and returns the NFT to the seller
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        MarketItem storage item = listings[listingId];

        require(item.active, "Listing is not active");
        require(!item.sold, "Item already sold");
        require(item.seller == msg.sender, "Not the seller");

        item.active = false;

        // Return NFT to seller
        IERC721(item.nftContract).transferFrom(
            address(this),
            msg.sender,
            item.tokenId
        );

        emit ListingCancelled(listingId);
    }

    /**
     * @dev Updates the price of an active listing
     * @param listingId ID of the listing
     * @param newPrice New price in wei
     */
    function updatePrice(
        uint256 listingId,
        uint256 newPrice
    ) external nonReentrant {
        MarketItem storage item = listings[listingId];

        require(item.active, "Listing is not active");
        require(!item.sold, "Item already sold");
        require(item.seller == msg.sender, "Not the seller");
        require(newPrice > 0, "Price must be greater than 0");

        uint256 oldPrice = item.price;
        item.price = newPrice;

        emit PriceUpdated(listingId, oldPrice, newPrice);
    }

    /**
     * @dev Updates the listing fee for future listings (only owner)
     * @param newListingPrice New listing fee in wei
     */
    function updateListingPrice(uint256 newListingPrice) external onlyOwner {
        require(newListingPrice > 0, "Listing price must be greater than 0");

        uint256 oldPrice = listingPrice;
        listingPrice = newListingPrice;

        emit ListingPriceUpdated(oldPrice, newListingPrice);
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
     * @dev Returns listing details
     * @param listingId ID of the listing
     */
    function getListing(
        uint256 listingId
    ) external view returns (MarketItem memory) {
        return listings[listingId];
    }

    /**
     * @dev Returns the total number of listings created
     */
    function totalListings() external view returns (uint256) {
        return _listingIdCounter;
    }

    /**
     * @dev Returns the current listing fee
     */
    function getListingPrice() external view returns (uint256) {
        return listingPrice;
    }

    /**
     * @dev Fetches all active, unsold market items
     */
    function fetchMarketItems() external view returns (MarketItem[] memory) {
        uint256 total = _listingIdCounter;
        uint256 activeCount = 0;

        for (uint256 i = 0; i < total; i++) {
            if (listings[i].active && !listings[i].sold) {
                activeCount++;
            }
        }

        MarketItem[] memory items = new MarketItem[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < total; i++) {
            if (listings[i].active && !listings[i].sold) {
                items[index] = listings[i];
                index++;
            }
        }

        return items;
    }

    /**
     * @dev Fetches all NFTs owned (purchased) by a user
     * @param user Address of the user
     */
    function fetchMyNFTs(
        address user
    ) external view returns (MarketItem[] memory) {
        uint256 total = _listingIdCounter;
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            if (listings[i].buyer == user && listings[i].sold) {
                count++;
            }
        }

        MarketItem[] memory items = new MarketItem[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < total; i++) {
            if (listings[i].buyer == user && listings[i].sold) {
                items[index] = listings[i];
                index++;
            }
        }

        return items;
    }

    /**
     * @dev Fetches all items created (listed) by a user
     * @param user Address of the user
     */
    function fetchItemsCreated(
        address user
    ) external view returns (MarketItem[] memory) {
        uint256 total = _listingIdCounter;
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            if (listings[i].seller == user) {
                count++;
            }
        }

        MarketItem[] memory items = new MarketItem[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < total; i++) {
            if (listings[i].seller == user) {
                items[index] = listings[i];
                index++;
            }
        }

        return items;
    }
}
