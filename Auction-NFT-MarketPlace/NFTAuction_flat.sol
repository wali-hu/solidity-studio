// Sources flattened with hardhat v3.1.8 https://hardhat.org

// SPDX-License-Identifier: MIT

// File npm/@openzeppelin/contracts@5.4.0/utils/Context.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File npm/@openzeppelin/contracts@5.4.0/access/Ownable.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File npm/@openzeppelin/contracts@5.4.0/utils/introspection/IERC165.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File npm/@openzeppelin/contracts@5.4.0/token/ERC721/IERC721.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC721/IERC721.sol)

pragma solidity >=0.6.2;

/**
 * @dev Required interface of an ERC-721 compliant contract.
 */
interface IERC721 is IERC165 {
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @dev Returns the number of tokens in ``owner``'s account.
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    /**
     * @dev Returns the owner of the `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon
     *   a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC-721 protocol to prevent tokens from being forever locked.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must have been allowed to move this token by either {approve} or
     *   {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon
     *   a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Note that the caller is responsible to confirm that the recipient is capable of receiving ERC-721
     * or else they may be permanently lost. Usage of {safeTransferFrom} prevents loss, though the caller must
     * understand this adds an external call which potentially creates a reentrancy vulnerability.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address to, uint256 tokenId) external;

    /**
     * @dev Approve or remove `operator` as an operator for the caller.
     * Operators can call {transferFrom} or {safeTransferFrom} for any token owned by the caller.
     *
     * Requirements:
     *
     * - The `operator` cannot be the address zero.
     *
     * Emits an {ApprovalForAll} event.
     */
    function setApprovalForAll(address operator, bool approved) external;

    /**
     * @dev Returns the account approved for `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function getApproved(uint256 tokenId) external view returns (address operator);

    /**
     * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
     *
     * See {setApprovalForAll}
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}


// File npm/@openzeppelin/contracts@5.4.0/utils/ReentrancyGuard.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/NFTAuction.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;



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

