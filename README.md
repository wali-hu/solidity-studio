# Auction Based NFT Marketplace 

A complete NFT marketplace and auction system built with Hardhat 3, Solidity, and TypeScript. This project allows anyone to mint NFTs, sellers to list them for fixed-price sale or time-limited auctions, buyers to purchase or bid on NFTs, and the marketplace owner to collect commissions and listing fees.

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
  - Time-limited auctions with configurable duration (up to 30 days)
  - Minimum price (reserve price) set by seller
  - Competitive bidding — highest bid wins
  - Pull-over-push pattern for safe bid refunds (prevents reentrancy)
  - NFT escrow during auction
  - Automatic commission deduction on finalization
  - Cancel auction if no bids placed
  - Anyone can finalize after auction expires
  - View functions: active auctions, auctions by seller, auctions won by user

## Accounts

The project uses five separate wallets:

| Account      | Signer Index | Private Key Variable   | Role                                                       |
| ------------ | ------------ | ---------------------- | ---------------------------------------------------------- |
| **Owner**    | `signers[0]` | `SEPOLIA_PRIVATE_KEY`  | Deploys contracts, withdraws fees, sets platform fee       |
| **Seller**   | `signers[1]` | `SELLER_PRIVATE_KEY`   | Mints NFTs, lists/auctions NFTs, finalizes auctions        |
| **Bidder 1** | `signers[2]` | `BIDDER1_PRIVATE_KEY`  | Bids on auctions (0.001 ETH), buys from marketplace       |
| **Bidder 2** | `signers[3]` | `BIDDER2_PRIVATE_KEY`  | Bids on auctions (0.002 ETH)                               |
| **Bidder 3** | `signers[4]` | `BIDDER3_PRIVATE_KEY`  | Bids on auctions (0.003 ETH) — highest bidder wins         |

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
│   ├── finalize-auction.ts      # Finalize expired auction (Anyone)
│   ├── withdraw-bid.ts          # Withdraw outbid funds (Bidder)
│   └── upload-metadata.ts       # Upload metadata to IPFS via Pinata
├── test/
│   ├── NFTMarketplace.test.ts   # Marketplace tests (50 tests)
│   └── NFTAuction.test.ts       # Auction tests (51 tests)
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
- MetaMask or another Ethereum wallet (3 accounts needed)
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

- **Listing fee**: Sellers pay a small fee to create an auction (0.0001 ETH default)
- **Reserve price**: Seller sets minimum starting bid
- **Duration**: Configurable auction length (up to 30 days)
- **Competitive bidding**: Each bid must exceed the current highest bid
- **Pull-over-push refunds**: Outbid bidders withdraw their funds safely (prevents reentrancy)
- **Commission**: 2.5% of winning bid goes to the contract owner
- **Cancel**: Seller can cancel if no bids have been placed
- **Finalize**: Anyone can finalize once the auction timer expires
- **View functions**: Fetch active auctions, auctions by seller, auctions won by user

#### How an Auction Works

1. Seller mints an NFT
2. Seller approves the auction contract and creates an auction (pays listing fee, sets min price + duration)
3. NFT is transferred to the auction contract (escrow)
4. Bidders place bids (must be >= min price and > current highest bid)
5. Previous highest bidder's funds are added to `pendingReturns` (pull-over-push pattern)
6. After the auction timer expires, anyone calls `finalizeAuction()`
7. Winner gets the NFT, seller gets the winning bid minus 2.5% commission
8. If no bids were placed, NFT is returned to the seller
9. Outbid bidders call `withdraw()` to reclaim their funds
10. Owner can withdraw accumulated fees

## All Commands

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Run Tests (101 tests)

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

Edit `TOKEN_ID`, `MIN_PRICE`, and `DURATION` in `scripts/create-auction.ts`.

### 11. Place a Bid on Auction (Buyer)

```bash
npx hardhat run scripts/place-bid.ts --network sepolia
```

Edit `AUCTION_ID` and `BID_AMOUNT` in `scripts/place-bid.ts`.

### 12. Finalize an Auction (Anyone)

```bash
npx hardhat run scripts/finalize-auction.ts --network sepolia
```

Edit `AUCTION_ID` in `scripts/finalize-auction.ts`. Can only finalize after the auction timer expires.

### 13. Withdraw Outbid Funds (Bidder)

```bash
npx hardhat run scripts/withdraw-bid.ts --network sepolia
```

Withdraws pending returns for outbid bidders from the auction contract.

## Contract Verification

After deployment, verify your contracts on Etherscan:

```bash
# Verify NFT Collection
npx hardhat verify --network sepolia <NFT_ADDRESS> "Awesome NFT Collection" "ANFT"

# Verify Marketplace (pass the listing price in wei)
npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> "100000000000000"

# Verify Auction (pass the listing price in wei)
npx hardhat verify --network sepolia <AUCTION_ADDRESS> "100000000000000"
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

- **Listing fee**: 0.0001 ETH (paid by seller when listing or creating auction)
- **Sale/auction commission**: 2.5% of sale/winning bid (deducted from payment)
- Maximum allowed commission: 10%
- Only contract owner can change the fee and listing price
- Fees accumulate in each contract separately (marketplace + auction)
- Only owner can withdraw accumulated fees from each contract

## Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks on all contracts
- **NFT Escrow**: NFTs are held by the contract during listing/auction
- **Pull-over-Push Pattern**: Outbid bidders withdraw funds safely (auction)
- **Access Control**: Owner-only functions for critical operations
- **Input Validation**: Comprehensive checks on all parameters
- **Duration Limits**: Maximum 30-day auction duration
- **Safe Transfers**: Using OpenZeppelin's safe transfer methods

## Common Issues

### Transaction fails with "Marketplace not approved" or "Auction contract not approved"

Before listing/auctioning an NFT, you must approve the contract to transfer your NFT. The scripts handle this automatically.

### "Must pay the listing fee"

When listing or creating an auction, the seller must send exactly the listing fee as `msg.value`. The scripts handle this automatically.

### "Insufficient balance" when buying or bidding

Ensure your buyer wallet has enough Sepolia ETH to cover the NFT price/bid amount plus gas fees.

### "Cannot buy your own NFT" / "Seller cannot bid"

The buyer/bidder account must be different from the seller. Make sure `BUYER_PRIVATE_KEY` is a different wallet from `SELLER_PRIVATE_KEY`.

### "Auction has not expired yet"

You can only finalize an auction after the duration has passed. Wait for the timer to expire.

### "Cannot cancel auction with bids"

Once bids have been placed, the auction cannot be cancelled. It must be finalized after expiry.

### "No funds to withdraw"

If you were outbid, call `withdraw-bid.ts` to reclaim your funds. If the amount is 0, your funds were already withdrawn.

## License

MIT
