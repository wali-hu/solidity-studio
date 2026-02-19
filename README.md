# Auction Based NFT Marketplace 

A complete NFT marketplace and auction system built with Hardhat 3, Solidity, and TypeScript. This project allows anyone to mint NFTs, sellers to list them for fixed-price sale or time-limited auctions, buyers to purchase or bid on NFTs, and the marketplace owner to collect commissions.

## Features

- **NFT Collection Contract** (`contracts/NFTCollection.sol`)

  - ERC721 standard implementation
  - Anyone can mint (no owner restriction)
  - Unlimited minting (no supply cap)
  - Creator tracking for each token
  - Text-based metadata URI storage

- **Marketplace Contract** (`contracts/NFTMarketplace.sol`)
  - Sellers set their own price per listing
  - Listing fee paid by seller (0.0001 ETH default)
  - NFT escrow — NFT is held by the marketplace until sold or cancelled
  - Platform commission on sales (2.5% default, max 10%)
  - Update listing price (seller) and listing fee (owner)
  - View functions: fetch unsold items, items owned by user, items created by user
  - Cancel listings (NFT returned from escrow)
  - Owner-only fee withdrawal
  - Reentrancy protection

- **Auction Contract** (`contracts/NFTAuction.sol`)
  - No listing fee — creating an auction is free for sellers
  - Time-limited auctions with configurable duration (up to 30 days)
  - Minimum price (reserve price) set by seller
  - Competitive bidding — highest bid wins
  - One-shot `finalizeAuction()` — single function handles settlement, cancellation, refunds, and fee distribution
  - NFT escrow during auction
  - Platform commission (2.5% default) deducted from winning bid and sent directly to owner on finalization
  - Auto-refund of all outbid bidders during finalization (with safety `withdraw()` fallback)
  - Cancel auction if no bids placed (seller can cancel anytime)
  - Only seller can finalize
  - Bidder tracking per auction for automatic refund processing
  - View functions: active auctions, auctions by seller, auctions won by user, auction bidders

## Accounts

The project uses six separate wallets:

| Account      | Signer Index | Private Key Variable   | Role                                                       |
| ------------ | ------------ | ---------------------- | ---------------------------------------------------------- |
| **Owner**    | `signers[0]` | `SEPOLIA_PRIVATE_KEY`  | Deploys contracts, withdraws fees, sets platform fee       |
| **Seller**   | `signers[1]` | `SELLER_PRIVATE_KEY`   | Mints NFTs, lists/auctions NFTs, finalizes auctions        |
| **Bidder 1** | `signers[2]` | `BIDDER1_PRIVATE_KEY`  | Bids on auctions (0.001 ETH), buys from marketplace       |
| **Bidder 2** | `signers[3]` | `BIDDER2_PRIVATE_KEY`  | Bids on auctions (0.002 ETH)                               |
| **Bidder 3** | `signers[4]` | `BIDDER3_PRIVATE_KEY`  | Bids on auctions (0.003 ETH) — highest bidder wins         |
| **Bidder 4** | `signers[5]` | `BIDDER4_PRIVATE_KEY`  | Tests bidding after expiry / finalize before expiry         |

## Project Structure

```
NFT-Marketpalce/
├── contracts/
│   ├── NFTCollection.sol        # NFT contract (anyone can mint)
│   ├── NFTMarketplace.sol       # Fixed-price marketplace contract
│   └── NFTAuction.sol           # Time-limited auction contract
├── scripts/
│   ├── deploy.ts                # Deploy all 3 contracts (Owner)
│   ├── mint.ts                  # Mint NFTs (Seller)
│   ├── list.ts                  # List NFTs on marketplace (Seller)
│   ├── buy.ts                   # Buy NFTs (Buyer)
│   ├── cancel-listing.ts        # Cancel a listing (Seller)
│   ├── withdraw.ts              # Withdraw marketplace fees (Owner)
│   ├── create-auction.ts        # Create an auction (Seller)
│   ├── place-bid.ts             # Place a bid on auction (Buyer)
│   ├── finalize-auction.ts      # Finalize auction — one-shot settlement (Seller)
│   ├── bid-after-expiry.ts      # Test bidding after expiry — on-chain revert (Bidder 4)
│   ├── finalize-before-expiry.ts # Test finalize before expiry — on-chain revert (Seller)
│   └── upload-metadata.ts       # Upload metadata to IPFS via Pinata
├── test/
│   ├── NFTMarketplace.test.ts   # Marketplace tests (51 tests)
│   └── NFTAuction.test.ts       # Auction tests (43 tests)
├── metadata/
│   ├── legendary-dragon.json
│   ├── mythical-phoenix.json
│   ├── rare-unicorn.json
│   ├── epic-griffin.json
│   └── common-wolf.json
└── .env.example                 # Environment variables template
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MetaMask or another Ethereum wallet (6 accounts needed)
- Sepolia testnet ETH (get from [Sepolia Faucet](https://sepoliafaucet.com/))
- Pinata account for IPFS storage

## Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file from the template:

```bash
cp .env.example .env
```

3. Fill in your environment variables in `.env`:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
SEPOLIA_PRIVATE_KEY=your_owner_private_key_without_0x_prefix
SELLER_PRIVATE_KEY=your_seller_private_key_without_0x_prefix
BIDDER1_PRIVATE_KEY=your_bidder1_private_key_without_0x_prefix
BIDDER2_PRIVATE_KEY=your_bidder2_private_key_without_0x_prefix
BIDDER3_PRIVATE_KEY=your_bidder3_private_key_without_0x_prefix
BIDDER4_PRIVATE_KEY=your_bidder4_private_key_without_0x_prefix
PINATA_JWT=your_pinata_jwt_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Smart Contracts

### NFTCollection

- Anyone can mint NFTs with metadata URIs
- No supply cap
- Tracks who created (minted) each token via `getCreator(tokenId)`
- Tracks total minted count

### NFTMarketplace

- **Listing fee**: Sellers pay a small fee to list (0.0001 ETH default)
- **Custom pricing**: Sellers set their own price per NFT
- **Escrow**: NFT is transferred to the marketplace on listing, returned on cancel
- **Commission**: 2.5% of sale price goes to the marketplace owner
- **Update price**: Sellers can update their listing price
- **Update listing fee**: Owner can update the listing fee
- **View functions**: Fetch all unsold items, user's purchased NFTs, user's created listings

#### How a Fixed-Price Sale Works

1. Seller mints an NFT
2. Seller approves the marketplace and lists the NFT (pays listing fee)
3. Buyer sends the listed price to buy the NFT
4. Marketplace deducts 2.5% commission, sends the rest to the seller
5. NFT is transferred from marketplace to buyer
6. Owner can withdraw accumulated fees (listing fees + commissions)

### NFTAuction

- **No listing fee**: Creating an auction is completely free for sellers
- **Reserve price**: Seller sets minimum starting bid
- **Duration**: Configurable auction length (up to 30 days)
- **Competitive bidding**: Each bid must exceed the current highest bid
- **Bidder tracking**: All bidders are tracked per auction for automatic refund processing
- **Commission**: 2.5% of winning bid deducted and sent directly to the contract owner on finalization
- **One-shot finalization**: Single `finalizeAuction()` call handles everything
- **Cancel**: Seller can cancel anytime if no bids have been placed
- **Safety withdraw**: Fallback `withdraw()` if auto-refund fails during finalization
- **View functions**: Fetch active auctions, auctions by seller, auctions won by user, auction bidders

#### How an Auction Works

1. Seller mints an NFT
2. Seller approves the auction contract and creates an auction (no fee required, sets min price + duration)
3. NFT is transferred to the auction contract (escrow)
4. Bidders place bids (must be >= min price and > current highest bid)
5. Previous highest bidder's funds are added to `pendingReturns` and bidder is tracked for auto-refund
6. After the auction timer expires, **seller** calls `finalizeAuction()` — one transaction does everything:
   - NFT transferred to the winner
   - Seller receives the winning bid minus 2.5% commission
   - Commission sent directly to the contract owner
   - All outbid bidders are automatically refunded their ETH
7. If no bids were placed, seller can call `finalizeAuction()` anytime to cancel and get the NFT back
8. If auto-refund fails for any bidder, they can use the safety `withdraw()` fallback

## All Commands

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Run Tests (94 tests)

```bash
npx hardhat test
```

### 3. Upload Metadata to IPFS

```bash
npx tsx scripts/upload-metadata.ts
```

After running, copy the folder CID and update the `baseURI` in `scripts/mint.ts`.

### 4. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Deploys NFTCollection, NFTMarketplace, and NFTAuction.

### 5. Mint NFTs (Seller)

```bash
npx hardhat run scripts/mint.ts --network sepolia
```

Edit `scripts/mint.ts` to set the `baseURI` to your Pinata folder CID.

### 6. List an NFT for Fixed-Price Sale (Seller)

```bash
npx hardhat run scripts/list.ts --network sepolia
```

Edit `TOKEN_ID` and `SALE_PRICE` in `scripts/list.ts`.

### 7. Buy an NFT (Buyer)

```bash
npx hardhat run scripts/buy.ts --network sepolia
```

Edit `LISTING_ID` in `scripts/buy.ts`.

### 8. Cancel a Listing (Seller)

```bash
npx hardhat run scripts/cancel-listing.ts --network sepolia
```

Edit `LISTING_ID` in `scripts/cancel-listing.ts`.

### 9. Withdraw Marketplace Fees (Owner)

```bash
npx hardhat run scripts/withdraw.ts --network sepolia
```

### 10. Create an Auction (Seller)

```bash
npx hardhat run scripts/create-auction.ts --network sepolia
```

Edit `TOKEN_ID`, `MIN_PRICE`, and `DURATION` in `scripts/create-auction.ts`. No listing fee is charged — creating an auction is free.

### 11. Place a Bid on Auction (Buyer)

```bash
npx hardhat run scripts/place-bid.ts --network sepolia
```

Edit `AUCTION_ID` and `BID_AMOUNT` in `scripts/place-bid.ts`.

### 12. Finalize an Auction (Seller)

```bash
npx hardhat run scripts/finalize-auction.ts --network sepolia
```

Edit `AUCTION_ID` in `scripts/finalize-auction.ts`. Only the seller can finalize. If bids exist, can only finalize after the auction timer expires. If no bids, seller can cancel anytime. One transaction handles everything: NFT transfer, seller payment, owner commission, and outbid bidder refunds.

### 13. Test Bidding After Expiry — On-Chain Revert (Bidder 4)

```bash
npx hardhat run scripts/bid-after-expiry.ts --network sepolia
```

Uses Bidder 4 (signers[5]) to attempt a bid on an expired auction. Sends a real on-chain transaction with a manual `gasLimit` to bypass ethers.js pre-flight gas estimation. The transaction gets mined but **reverts on-chain** with "Auction has expired" — visible as a failed transaction on Sepolia Etherscan. Edit `AUCTION_ID` in the script. Run this after the 5-minute auction duration has passed but before finalizing.

### 14. Test Finalize Before Expiry — On-Chain Revert (Seller)

```bash
npx hardhat run scripts/finalize-before-expiry.ts --network sepolia
```

Seller (signers[1]) attempts to finalize an auction before the time has expired (while bids exist). Sends a real on-chain transaction with a manual `gasLimit` to bypass ethers.js pre-flight gas estimation. The transaction gets mined but **reverts on-chain** with "Auction has not expired yet" — visible as a failed transaction on Sepolia Etherscan. Edit `AUCTION_ID` in the script. Run this while the auction is still active (before the 5-minute timer expires) and after at least one bid has been placed.

## Contract Verification

After deployment, verify your contracts on Etherscan:

```bash
# Verify NFT Collection
npx hardhat verify --network sepolia <NFT_ADDRESS> "Awesome NFT Collection" "ANFT"

# Verify Marketplace (pass the listing price in wei)
npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> "100000000000000"

# Verify Auction (no constructor arguments)
npx hardhat verify --network sepolia <AUCTION_ADDRESS>
```

The deployment script will print the exact verification commands.

## NFT Metadata

The project includes 5 sample text-based NFT metadata files with different rarities:

1. **Legendary Dragon** - Legendary rarity, Fire element
2. **Mythical Phoenix** - Mythical rarity, Fire element
3. **Rare Unicorn** - Rare rarity, Light element
4. **Epic Griffin** - Epic rarity, Air element
5. **Common Wolf** - Common rarity, Earth element

Each metadata file includes:

- Name and description
- Attributes (rarity, element, power, speed, abilities, background)

## Platform Fees

- **Marketplace listing fee**: 0.0001 ETH (paid by seller when listing on the marketplace)
- **Auction listing fee**: None — creating an auction is free
- **Marketplace commission**: 2.5% of sale price (deducted from payment)
- **Auction commission**: 2.5% of winning bid (deducted from winning bid on finalization)
- Maximum allowed commission: 10%
- Only contract owner can change the commission percentage
- **Marketplace**: Listing fees and commissions accumulate in the contract — owner can withdraw
- **Auction**: Commission is sent directly to the owner on finalization (no accumulation)

## Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks on all contracts
- **NFT Escrow**: NFTs are held by the contract during listing/auction
- **Auto-Refund with Safety Fallback**: Outbid bidders are auto-refunded on finalization; `withdraw()` exists as fallback if push fails
- **Checks-Effects-Interactions**: State changes before external calls
- **Access Control**: Owner-only functions for critical operations
- **Input Validation**: Comprehensive checks on all parameters
- **Duration Limits**: Maximum 30-day auction duration
- **Safe Transfers**: Using OpenZeppelin's safe transfer methods

## Common Issues

### Transaction fails with "Marketplace not approved" or "Auction contract not approved"

Before listing/auctioning an NFT, you must approve the contract to transfer your NFT. The scripts handle this automatically.

### "Must pay the listing fee"

When listing on the marketplace, the seller must send exactly the listing fee as `msg.value`. The scripts handle this automatically. Note: auctions do not require any listing fee.

### "Insufficient balance" when buying or bidding

Ensure your buyer wallet has enough Sepolia ETH to cover the NFT price/bid amount plus gas fees.

### "Cannot buy your own NFT" / "Seller cannot bid"

The buyer/bidder account must be different from the seller. Make sure `BIDDER1_PRIVATE_KEY` is a different wallet from `SELLER_PRIVATE_KEY`.

### "Auction has not expired yet"

You can only finalize an auction (with bids) after the duration has passed. Wait for the timer to expire. If no bids exist, the seller can cancel anytime.

### "Only seller can finalize"

Only the auction seller can call `finalizeAuction()`. Make sure you are using the seller account (signers[1]).

### "No funds to withdraw"

The safety `withdraw()` is only needed if auto-refund failed during finalization. If auto-refund succeeded, pending returns are already zeroed out.

## License

MIT
