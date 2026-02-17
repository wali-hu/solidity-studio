# NFT Marketplace

A complete NFT marketplace built with Hardhat 3, Solidity, and TypeScript. This project allows anyone to mint NFTs, sellers to list them with a custom price (paying a small listing fee), buyers to purchase NFTs, and the marketplace owner to collect commissions and listing fees.

## Features

- **NFT Collection Contract** (`contracts/NFTCollection.sol`)

  - ERC721 standard implementation
  - Anyone can mint (no owner restriction)
  - Unlimited minting (no supply cap)
  - Creator tracking for each token
  - Text-based metadata URI storage

- **Marketplace Contract** (`contracts/NFTMarketplace.sol`)
  - Sellers set their own price per listing
  - Listing fee paid by seller (0.0001 ETH default — kept cheap)
  - NFT escrow — NFT is held by the marketplace until sold or cancelled
  - Platform commission on sales (2.5% default, max 10%)
  - Update listing price (seller) and listing fee (owner)
  - View functions: fetch unsold items, items owned by user, items created by user
  - Cancel listings (NFT returned from escrow)
  - Owner-only fee withdrawal
  - Reentrancy protection

## Accounts

The project uses three separate wallets:

| Account    | Signer Index | Private Key Variable  | Role                                                 |
| ---------- | ------------ | --------------------- | ---------------------------------------------------- |
| **Owner**  | `signers[0]` | `SEPOLIA_PRIVATE_KEY` | Deploys contracts, withdraws fees, sets platform fee |
| **Seller** | `signers[1]` | `SELLER_PRIVATE_KEY`  | Mints NFTs, lists on marketplace, cancels listings   |
| **Buyer**  | `signers[2]` | `BUYER_PRIVATE_KEY`   | Buys NFTs from marketplace                           |

## Project Structure

```
NFT-Marketpalce/
├── contracts/
│   ├── NFTCollection.sol        # NFT contract (anyone can mint)
│   └── NFTMarketplace.sol       # Marketplace contract
├── scripts/
│   ├── deploy.ts                # Deploy both contracts (Owner)
│   ├── mint.ts                  # Mint NFTs (Seller)
│   ├── list.ts                  # List NFTs on marketplace (Seller)
│   ├── buy.ts                   # Buy NFTs (Buyer)
│   ├── cancel-listing.ts        # Cancel a listing (Seller)
│   ├── withdraw.ts              # Withdraw marketplace fees (Owner)
│   └── upload-metadata.ts       # Upload metadata to IPFS via Pinata
├── test/
│   └── NFTMarketplace.test.ts   # Comprehensive test suite (50 tests)
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
BUYER_PRIVATE_KEY=your_buyer_private_key_without_0x_prefix
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

#### How a Sale Works

1. Seller mints an NFT
2. Seller approves the marketplace and lists the NFT (pays listing fee)
3. Buyer sends the listed price to buy the NFT
4. Marketplace deducts 2.5% commission, sends the rest to the seller
5. NFT is transferred from marketplace to buyer
6. Owner can withdraw accumulated fees (listing fees + commissions)

## All Commands

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Run Tests

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

### 5. Mint NFTs (Seller)

```bash
npx hardhat run scripts/mint.ts --network sepolia
```

Edit `scripts/mint.ts` to set the `baseURI` to your Pinata folder CID.

### 6. List an NFT (Seller)

```bash
npx hardhat run scripts/list.ts --network sepolia
```

Edit `TOKEN_ID` and `SALE_PRICE` in `scripts/list.ts`. The seller pays a listing fee and sets their own price.

### 7. Buy an NFT (Buyer)

```bash
npx hardhat run scripts/buy.ts --network sepolia
```

Edit `LISTING_ID` in `scripts/buy.ts` to specify which listing to buy.

### 8. Cancel a Listing (Seller)

```bash
npx hardhat run scripts/cancel-listing.ts --network sepolia
```

Edit `LISTING_ID` in `scripts/cancel-listing.ts`. Only the seller can cancel. The NFT is returned from escrow.

### 9. Withdraw Fees (Owner Only)

```bash
npx hardhat run scripts/withdraw.ts --network sepolia
```

## Contract Verification

After deployment, verify your contracts on Etherscan:

```bash
# Verify NFT Collection
npx hardhat verify --network sepolia <NFT_ADDRESS> "Awesome NFT Collection" "ANFT"

# Verify Marketplace (pass the listing price in wei)
npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> "100000000000000"
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

- **Listing fee**: 0.0001 ETH (paid by seller when listing)
- **Sale commission**: 2.5% of sale price (deducted from buyer's payment)
- Maximum allowed commission: 10%
- Only contract owner can change the fee and listing price
- Fees accumulate in the contract (listing fees + commissions)
- Only owner can withdraw accumulated fees

## Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks
- **NFT Escrow**: NFTs are held by the marketplace contract during listing
- **Access Control**: Owner-only functions for critical operations
- **Input Validation**: Comprehensive checks on all parameters
- **Safe Transfers**: Using OpenZeppelin's safe transfer methods

## Common Issues

### Transaction fails with "Marketplace not approved"

Before listing an NFT, you must approve the marketplace to transfer your NFT. The listing script handles this automatically.

### "Must pay the listing fee"

When listing, the seller must send exactly the listing fee as `msg.value`. The listing script handles this automatically.

### "Insufficient balance" when buying

Ensure your buyer wallet has enough Sepolia ETH to cover:

- NFT price (set by seller)
- Gas fees

### "Cannot buy your own NFT"

The buyer account must be different from the seller. Make sure `BUYER_PRIVATE_KEY` is a different wallet from `SELLER_PRIVATE_KEY`.

### "Not the seller" errors

Only the seller can cancel their listings or update the listing price.

## License

MIT
