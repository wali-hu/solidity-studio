# NFT Batch Operations Project

A comprehensive Hardhat-based project demonstrating batch operations for ERC-721A and ERC-1155 NFTs on Ethereum Sepolia testnet. This project showcases gas-efficient batch minting and batch transferring of both unique (ERC-721A) and multi-type (ERC-1155) tokens.

##  Project Overview

This project includes:
- **MyERC721A**: Gaming Character NFTs using Azuki's ERC-721A (gas-efficient implementation)
- **MyERC1155**: Gaming Items (fungible + non-fungible) using OpenZeppelin's ERC-1155

### Key Features
-  Batch mint 5 unique Gaming Character NFTs in 1 transaction
-  Batch transfer all 5 NFTs in 1 transaction
-  Batch mint 5 token types (2 fungible + 3 non-fungible) in 1 transaction
-  Batch transfer all items in 1 transaction
-  Metadata stored on IPFS via Pinata
-  Automated deployment and verification on Etherscan
-  Comprehensive test suite

##  Gaming Items

### ERC-721A Gaming Characters (5 Unique NFTs)
1. **Warrior** - Level 10 (Common)
2. **Mage** - Level 15 (Rare)
3. **Archer** - Level 12 (Uncommon)
4. **Rogue** - Level 20 (Epic)
5. **Paladin** - Level 25 (Legendary)

### ERC-1155 Gaming Items (5 Token Types)
1. **SWORD** - 100 units (Fungible)
2. **GOLD_COIN** - 500 units (Fungible)
3. **DRAGON_ARMOR** - 1 unit (Non-Fungible)
4. **MAGIC_STAFF** - 1 unit (Non-Fungible)
5. **LEGENDARY_CROWN** - 1 unit (Non-Fungible)

##  Tech Stack

- **Hardhat** - Ethereum development environment
- **ethers.js v6** - Ethereum library
- **ERC721A** - Azuki's gas-efficient ERC-721 implementation
- **OpenZeppelin Contracts** - Secure smart contract library
- **Pinata** - IPFS pinning service for metadata
- **Solidity 0.8.20** - Smart contract language

##  Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Alchemy account (for Sepolia RPC)
- Etherscan API key
- Pinata account (for IPFS)

### Setup

1. **Clone and install dependencies:**
```bash
cd comparison2
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required: Sepolia testnet RPC URL from Alchemy
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Required: Etherscan API key for contract verification
ETHERSCAN_API_KEY=YOUR-ETHERSCAN-API-KEY

# Required: Your wallet private key (starts with 0x)
OWNER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Required: Your wallet address (starts with 0x)
OWNER_ADDRESS=0xYOUR_OWNER_WALLET_ADDRESS

# Required: Destination wallet for transfers (starts with 0x)
NEW_WALLET_ADDRESS=0xYOUR_NEW_WALLET_ADDRESS

# Optional: Pinata JWT (already configured if using provided metadata)
PINATA_JWT=YOUR_PINATA_JWT_TOKEN

# Will be added after deployment
CONTRACT_ADDRESS_ERC721A=
CONTRACT_ADDRESS_ERC1155=
```

##  Usage Guide

### Step 1: Generate Wallet (Optional)
If you need a new Ethereum wallet:
```bash
npm run wallet
```
This generates a wallet with address, private key, and mnemonic phrase.

### Step 2: Compile Contracts
```bash
npm run compile
```

### Step 3: Run Tests
Test on local Hardhat network:
```bash
npm test
```

**Expected Output:**
```
NFT Contracts Tests
  ERC-721A Tests
    ✔ Should deploy with correct name and symbol
    ✔ Should batch mint 5 NFTs to owner in 1 transaction
    ✔ Should batch transfer all 5 NFTs in 1 transaction (176,610 gas)
    ✔ Should verify new wallet owns all 5 NFTs after transfer
    ✔ Should verify original owner has 0 NFTs after transfer
  ERC-1155 Tests
    ✔ Should deploy with correct URI
    ✔ Should batch mint 2 fungible + 3 non-fungible in 1 transaction
    ✔ Should batch transfer all tokens in 1 transaction (152,133 gas)
    ✔ Should verify new wallet has correct balances after transfer
    ✔ Should verify original owner has 0 balance after transfer

10 passing (569ms)
```

### Step 4: Deploy to Sepolia

**Deploy ERC721A Contract:**
```bash
npm run deploy:721a
```

After deployment, copy the contract address and add to `.env`:
```env
CONTRACT_ADDRESS_ERC721A=0xYOUR_DEPLOYED_ADDRESS
```

**Deploy ERC1155 Contract:**
```bash
npm run deploy:1155
```

After deployment, copy the contract address and add to `.env`:
```env
CONTRACT_ADDRESS_ERC1155=0xYOUR_DEPLOYED_ADDRESS
```

### Step 5: Mint NFTs

**Mint 5 Gaming Character NFTs (ERC721A):**
```bash
npm run mint:721a
```

This mints token IDs 0, 1, 2, 3, 4 to OWNER_ADDRESS.

**Mint Gaming Items (ERC1155):**
```bash
npm run mint:1155
```

This mints:
- 100 SWORD tokens
- 500 GOLD_COIN tokens
- 1 DRAGON_ARMOR token
- 1 MAGIC_STAFF token
- 1 LEGENDARY_CROWN token

### Step 6: Transfer NFTs

**Transfer all Gaming Characters (ERC721A):**
```bash
npm run transfer:721a
```

This transfers all 5 NFTs from OWNER_ADDRESS to NEW_WALLET_ADDRESS in 1 transaction.

**Transfer all Gaming Items (ERC1155):**
```bash
npm run transfer:1155
```

This transfers all tokens from OWNER_ADDRESS to NEW_WALLET_ADDRESS in 1 transaction.

##  Gas Comparison

Based on test results:

| Operation | ERC721A Gas | ERC1155 Gas | Winner |
|-----------|-------------|-------------|---------|
| Deployment | 1,143,889 | 1,200,204 | ERC721A ⚡ |
| Batch Mint | 100,617 | 148,460 | ERC721A ⚡ |
| Batch Transfer | 176,610 | 152,133 | ERC1155 ⚡ |

**Key Insights:**
- ERC721A is more gas-efficient for minting unique NFTs
- ERC1155 is more gas-efficient for batch transfers
- ERC1155 is ideal for games with multiple item types

##  Project Structure

```
comparison2/
├── contracts/
│   ├── MyERC721A.sol        # Gaming Characters (ERC-721A)
│   └── MyERC1155.sol         # Gaming Items (ERC-1155)
├── scripts/
│   ├── deploy-erc721a.js     # Deploy ERC721A
│   ├── deploy-erc1155.js     # Deploy ERC1155
│   ├── mint-erc721a.js       # Mint 5 NFTs
│   ├── mint-erc1155.js       # Mint all items
│   ├── transfer-erc721a.js   # Batch transfer NFTs
│   ├── transfer-erc1155.js   # Batch transfer items
│   └── upload-metadata.js    # Upload metadata to IPFS
├── test/
│   └── NFTTest.test.js       # Comprehensive tests
├── metadata/
│   ├── erc721a/              # NFT metadata (1-5.json)
│   └── erc1155/              # Item metadata (1-5.json)
├── hardhat.config.js         # Hardhat configuration
├── generate-eth-wallet.js    # Wallet generator
├── .env                      # Environment variables (DON'T COMMIT)
├── .env.example              # Example environment variables
└── package.json              # NPM scripts and dependencies
```

##  NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile smart contracts |
| `npm test` | Run test suite on local network |
| `npm run deploy:721a` | Deploy ERC721A to Sepolia |
| `npm run deploy:1155` | Deploy ERC1155 to Sepolia |
| `npm run mint:721a` | Mint 5 Gaming Characters |
| `npm run mint:1155` | Mint all Gaming Items |
| `npm run transfer:721a` | Transfer all NFTs |
| `npm run transfer:1155` | Transfer all items |
| `npm run wallet` | Generate new Ethereum wallet |

##  Security Best Practices

1. **Never commit .env file** - It contains private keys
2. **Use separate wallets** for development and production
3. **Test on Sepolia** before deploying to mainnet
4. **Verify contracts** on Etherscan after deployment
5. **Store private keys securely** (hardware wallet recommended)
6. **Review transactions** before signing

##  IPFS Metadata

Metadata is stored on IPFS via Pinata. The metadata includes:
- NFT names and descriptions
- Attributes (class, level, rarity, etc.)
- Token properties

**ERC721A Metadata URLs:**
- Token 1 (Warrior): `https://gateway.pinata.cloud/ipfs/QmTP4sggmVkWu92Uis8QdFuQTc8EukZMVu5qYiGnVLkKe4`
- Token 2 (Mage): `https://gateway.pinata.cloud/ipfs/QmWwHjkdEjh2sPuwny5RiVL6goqwDnogw4EhMtB2g9rCuH`
- Token 3 (Archer): `https://gateway.pinata.cloud/ipfs/QmQ2KpCqpTL2uEeXmzgdGrGUeCsWdQXMeiMynBaS7LRyJS`
- Token 4 (Rogue): `https://gateway.pinata.cloud/ipfs/QmVp8NvgKsMnNv36KLBAfm9Mvg6FdsdasR8ymqs3Xv7Qva`
- Token 5 (Paladin): `https://gateway.pinata.cloud/ipfs/QmQ48pWJSePocqhGQbpbTzH9uKS1v8qVzbhZoC6VYxbMm9`

**ERC1155 Metadata URLs:**
- Token 1 (SWORD): `https://gateway.pinata.cloud/ipfs/QmY4sFjHNh94wHxhn7m2NwnGs7n7dnBfkNbu6GmgLhR6wa`
- Token 2 (GOLD_COIN): `https://gateway.pinata.cloud/ipfs/QmX8jU1D1a2aZKwThjqbaP648qvjetMGPrXSzQFXkqKg6Q`
- Token 3 (DRAGON_ARMOR): `https://gateway.pinata.cloud/ipfs/QmejYgxfxcbqPmohsL4KBAgwr9r5mpQKKxDRaptppEtJHP`
- Token 4 (MAGIC_STAFF): `https://gateway.pinata.cloud/ipfs/QmWxtKWpSkXycuNPdnSmKaqNGzf37Spfm4W1N6u7Gjj5fD`
- Token 5 (LEGENDARY_CROWN): `https://gateway.pinata.cloud/ipfs/QmZck9JAM2rb8Q1FdeAXHpXbc2t9Ha5wqPLBstazG7sNoT`

##  Troubleshooting

### "Insufficient funds" error
- Ensure your wallet has Sepolia ETH
- Get testnet ETH from: https://sepoliafaucet.com/

### "Contract not deployed" error
- Run deployment script first: `npm run deploy:721a` or `npm run deploy:1155`
- Add contract address to `.env`

### "OWNER_PRIVATE_KEY not found" error
- Ensure `.env` file exists and contains OWNER_PRIVATE_KEY
- Private key should start with `0x`

### Verification fails
- Wait a few minutes after deployment
- Ensure ETHERSCAN_API_KEY is correct
- Check Sepolia Etherscan for manual verification

##  Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [ERC721A Documentation](https://chiru-labs.github.io/ERC721A/)
- [OpenZeppelin ERC1155](https://docs.openzeppelin.com/contracts/4.x/erc1155)
- [ethers.js Documentation](https://docs.ethers.org/v6/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)

##  License

ISC

##  Development Notes

This project demonstrates:
- Gas-efficient batch operations for NFTs
- Comparison between ERC721A and ERC1155
- Real-world gaming NFT use cases
- Proper testing and deployment practices
- IPFS metadata integration

Perfect for learning about NFT development and batch operations!

---

**Built with ❤️ using Hardhat, ethers.js, and Solidity**
