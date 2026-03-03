# GameInventory - ERC-1155 Multi-Token Smart Contract

A fully-featured ERC-1155 multi-token smart contract for game items, supporting fungible, semi-fungible, and NFT tokens with batch operations and decentralized metadata storage on IPFS.

## Features

- **ERC-1155 Multi-Token Standard**: Supports multiple token types in a single contract
- **Three Token Types**:
  - **Gold (ID 0)**: Fungible token - 1,000,000 units
  - **Founder Sword (ID 1)**: NFT - 1 unique unit
  - **Health Potion (ID 2)**: Semi-Fungible token - 100 units
- **Batch Operations**: Transfer multiple token types in a single transaction
- **IPFS Metadata Storage**: Decentralized, immutable metadata hosting via Pinata
- **Dynamic Metadata URIs**: Automatically generated IPFS URLs for token metadata
- **Access Control**: Owner-controlled minting and URI updates
- **Gas Optimized**: Leverages OpenZeppelin's battle-tested implementations

## Token Specification

| Token         | ID  | Type          | Supply    | Description                   |
| ------------- | --- | ------------- | --------- | ----------------------------- |
| Gold          | 0   | Fungible      | 1,000,000 | In-game currency              |
| Founder Sword | 1   | NFT           | 1         | Legendary unique weapon       |
| Health Potion | 2   | Semi-Fungible | 100       | Consumable health restoration |

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd multi-token-logic
```

2. Install dependencies:

```bash
npm install
```

3. (Optional) Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your values
```

## IPFS Setup

The contract uses IPFS (InterPlanetary File System) for decentralized metadata storage. Metadata is hosted on Pinata, a free IPFS pinning service.

### Step 1: Get Pinata JWT Token

1. Sign up for a free account at [https://pinata.cloud](https://pinata.cloud)
2. Navigate to **API Keys** section (https://app.pinata.cloud/developers/api-keys)
3. Click **New Key**
4. Enable permissions for:
   - **pinFileToIPFS** (required for uploads)
   - **Admin** permissions (recommended)
5. Give it a name (e.g., "GameInventory Upload")
6. Copy the **JWT token** (this is shown only once!)

### Step 2: Configure Environment

Add your Pinata JWT to the `.env` file:

```env
PINATA_JWT=your-jwt-token-here
```

**Important:** The new Pinata SDK uses JWT authentication, not API Key/Secret pairs.

### Step 3: Upload Metadata to IPFS

The project includes metadata files in the `metadata/` directory (0.json, 1.json, 2.json). Upload them to IPFS:

```bash
npm run upload:ipfs
```

This command will:
- Authenticate with Pinata
- Upload the metadata folder to IPFS
- Return a Content Identifier (CID) like `QmXXXXX...`
- Save the CID to `.ipfs-cid` file for deployment
- Display gateway URLs for verification

### Step 4: Verify Metadata

Check your metadata is accessible via IPFS gateways:

```
https://ipfs.io/ipfs/QmYourCID/0.json
https://gateway.pinata.cloud/ipfs/QmYourCID/0.json
```

### Step 5: Deploy Contract

The deployment script automatically reads the CID from `.ipfs-cid`:

```bash
npm run deploy:localhost
```

The contract will be deployed with `ipfs://QmYourCID/` as the base URI.

### IPFS Benefits

- **Decentralized**: No single point of failure
- **Immutable**: Content-addressed storage ensures data integrity
- **Cost-Effective**: Free hosting with Pinata
- **Standard**: NFT marketplaces natively support `ipfs://` URIs
- **Permanent**: Pinned files remain accessible indefinitely

## Project Structure

```
multi-token-logic/
├── contracts/
│   └── GameInventory.sol           # Main ERC-1155 contract
├── scripts/
│   ├── deploy.js                   # Deployment script
│   ├── interact.js                 # Interaction script
│   └── uploadToIPFS.js             # IPFS metadata upload
├── metadata/                        # Token metadata files
│   ├── 0.json                      # Gold metadata
│   ├── 1.json                      # Founder Sword metadata
│   └── 2.json                      # Health Potion metadata
├── test/
│   └── GameInventory.test.js       # Test suite (38 tests)
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Dependencies
├── .env.example                    # Environment template
└── README.md                       # This file
```

## Usage

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

Expected output: **38 passing tests** covering:

- Deployment verification
- URI functionality (DoD requirement)
- Batch transfers (DoD requirement)
- Balance batch queries (DoD requirement)
- ERC-1155 compliance
- Access control
- Edge cases

### Test Coverage

```bash
npm run test:coverage
```

### Start Local Hardhat Node

```bash
npm run node
```

### Deploy Contract

Deploy to local network:

```bash
npm run deploy:localhost
```

Deploy to Sepolia testnet:

```bash
npm run deploy:sepolia
```

### Interact with Deployed Contract

```bash
CONTRACT_ADDRESS=<deployed-address> npx hardhat run scripts/interact.js --network localhost
```

## Definition of Done Validation

### Requirement 1: safeBatchTransferFrom

Transfer all 3 token types in a single transaction:

```javascript
await gameInventory.safeBatchTransferFrom(
  owner.address,
  recipient.address,
  [0, 1, 2], // GOLD, FOUNDER_SWORD, HEALTH_POTION
  [1000, 1, 10], // Amounts
  "0x",
);
```

**Validation**: Run tests with `npx hardhat test --grep "Batch Transfer"`

### Requirement 2: balanceOfBatch

Query balances for multiple addresses simultaneously:

```javascript
const balances = await gameInventory.balanceOfBatch(
  [owner.address, addr1.address, addr2.address],
  [0, 0, 1],
);
```

**Validation**: Run tests with `npx hardhat test --grep "Balance Of Batch"`

### Requirement 3: URI Override

Dynamic metadata URLs pointing to IPFS:

```javascript
await gameInventory.uri(0); // Returns: "ipfs://QmYourCID/0.json"
await gameInventory.uri(1); // Returns: "ipfs://QmYourCID/1.json"
await gameInventory.uri(2); // Returns: "ipfs://QmYourCID/2.json"
```

**Validation**: Run tests with `npx hardhat test --grep "URI"`

**IPFS Gateway Access**:
```
https://ipfs.io/ipfs/QmYourCID/0.json
https://gateway.pinata.cloud/ipfs/QmYourCID/0.json
```

## Contract API

### Read Functions

#### `uri(uint256 id) → string`

Returns the metadata URI for a token ID.

#### `balanceOf(address account, uint256 id) → uint256`

Returns the balance of a specific token for an address.

#### `balanceOfBatch(address[] accounts, uint256[] ids) → uint256[]`

Returns balances for multiple address/token ID pairs.

#### `totalSupply(uint256 id) → uint256`

Returns the total minted supply for a token ID.

#### `baseURI() → string`

Returns the current base URI for metadata.

#### `owner() → address`

Returns the contract owner address.

### Write Functions

#### `safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)`

Transfers a single token type.

#### `safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)`

Transfers multiple token types in one transaction.

#### `setApprovalForAll(address operator, bool approved)`

Approves an operator to manage all tokens.

#### `setBaseURI(string newBaseURI)` (Owner only)

Updates the base URI for metadata.

#### `mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data)` (Owner only)

Mints additional tokens.

## Metadata Format

Token metadata follows the ERC-1155 metadata standard and is stored on IPFS. Each token URI points to a JSON file with this structure:

```json
{
  "name": "Token Name",
  "description": "Token description",
  "properties": {
    "type": "Fungible|NFT|Semi-Fungible",
    "rarity": "Common|Rare|Legendary",
    "max_supply": 1000000
  }
}
```

### Example Metadata URLs

**Native IPFS URIs** (used by contract):
- **Gold**: `ipfs://QmYourCID/0.json`
- **Founder Sword**: `ipfs://QmYourCID/1.json`
- **Health Potion**: `ipfs://QmYourCID/2.json`

**Gateway URLs** (for browser access):
- **Gold**: `https://ipfs.io/ipfs/QmYourCID/0.json`
- **Gold (Pinata)**: `https://gateway.pinata.cloud/ipfs/QmYourCID/0.json`

NFT marketplaces and wallets automatically resolve `ipfs://` URIs using their preferred gateways.

## Security Features

- **Reentrancy Protection**: OpenZeppelin's ERC-1155 implementation includes checks-effects-interactions pattern
- **Integer Overflow Protection**: Solidity ^0.8.20 has built-in overflow checks
- **Access Control**: Ownable pattern restricts sensitive functions
- **Supply Tracking**: Prevents over-minting beyond intended limits
- **Input Validation**: Array length checks in batch operations

## Gas Optimization

The contract uses OpenZeppelin's optimized ERC-1155 implementation with compiler optimization enabled (200 runs):

```javascript
optimizer: {
  enabled: true,
  runs: 200
}
```

## Development Tools

- **Framework**: Hardhat ^2.28.4
- **Language**: Solidity ^0.8.20
- **Standards**: ERC-1155 (OpenZeppelin ^5.4.0)
- **Testing**: Chai ^4.5.0, Hardhat Toolbox ^6.1.0
- **Library**: ethers.js ^6.16.0

## Testing

The test suite includes 38 comprehensive tests:

- **Deployment Tests**: Verify initial minting and configuration
- **URI Tests**: Validate dynamic metadata URL generation
- **Batch Transfer Tests**: Test multi-token transfers (DoD requirement)
- **Balance Batch Tests**: Verify batch balance queries (DoD requirement)
- **ERC-1155 Compliance**: Ensure standard conformance
- **Access Control Tests**: Verify owner-only functions
- **Edge Case Tests**: Handle zero amounts, empty arrays, etc.

Run specific test categories:

```bash
npx hardhat test --grep "Deployment"
npx hardhat test --grep "URI"
npx hardhat test --grep "Batch Transfer"
npx hardhat test --grep "Balance Of Batch"
```

## Transaction Hash Capture

The test suite includes an optional transaction hash capture feature that records all on-chain transactions from test executions. This is useful for debugging, gas analysis, and verification.

### Enable Transaction Capture

Run tests with transaction hash capture enabled:

```bash
# Run on local Hardhat network
npm run test:capture

# Or use environment variable directly
CAPTURE_TX_HASH=true npm test
```

### Capture on Sepolia Testnet

Capture real on-chain transaction hashes from Sepolia:

```bash
# Requires SEPOLIA_RPC_URL and PRIVATE_KEY in .env
npm run test:capture:sepolia

# Or manually
CAPTURE_TX_HASH=true npx hardhat test --network sepolia
```

### Output

Transaction hashes are saved to `test-transactions.json` with detailed information:

- Transaction hash and block number
- Gas used per transaction
- Test name and test suite grouping
- Contract method signatures
- Network information (chainId, explorer URLs)
- Timestamp and transaction status
- Gas usage analysis by contract method

### Example Output

```json
{
  "captureMetadata": {
    "generatedAt": "2026-02-13T05:17:45.186Z",
    "network": "hardhat",
    "chainId": 31337,
    "totalTransactions": 22,
    "totalTests": 38,
    "testsWithTransactions": 22,
    "testsReadOnly": 16,
    "testRunDuration": "1.0s"
  },
  "transactions": [
    {
      "testName": "Should transfer all 3 token types in one batch transaction",
      "testSuite": "Batch Transfer - DoD Critical Requirement",
      "transactionHash": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
      "blockNumber": 5,
      "gasUsed": "125892",
      "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "network": "hardhat",
      "chainId": 31337,
      "blockchainExplorer": null,
      "timestamp": "2026-02-13T05:17:44.880Z",
      "status": "success"
    }
  ],
  "transactionsByTestSuite": {
    "Batch Transfer - DoD Critical Requirement": 6,
    "URI Functionality - DoD Requirement": 3
  },
  "gasAnalysis": {
    "totalGasUsed": "2938181",
    "averageGasPerTransaction": "133553",
    "gasByMethod": {
      "safeBatchTransferFrom": {
        "count": 6,
        "avg": "120000",
        "min": "115000",
        "max": "125000"
      }
    }
  }
}
```

For Sepolia transactions, the `blockchainExplorer` field includes the Etherscan URL:

```json
{
  "transactionHash": "0x1a6e3301dd4e59481d58d7a392230a24b6988f9d6f9768b143de800127a9e5a7",
  "blockchainExplorer": "https://sepolia.etherscan.io/tx/0x1a6e3301dd4e59481d58d7a392230a24b6988f9d6f9768b143de800127a9e5a7"
}
```

### Configuration

Customize capture behavior using environment variables in `.env`:

```bash
# Enable/disable capture (default: false)
CAPTURE_TX_HASH=true

# Optional: custom output file path
CAPTURE_OUTPUT_FILE=my-transactions.json
```

### Features

- Zero test code modifications required
- Automatic detection of write operations (state-changing transactions)
- Read-only operations automatically skipped
- Network-aware (supports Hardhat, Sepolia, and other networks)
- Gas usage analysis by contract method
- Transaction grouping by test suite
- Blockchain explorer URLs for supported networks
- Minimal performance overhead (<10% increase in test time)

## Script Transaction Capture

The deployment and interaction scripts automatically capture transaction hashes and save them to JSON files for reference and verification.

### Deploy Script with Transaction Capture

Deploy the contract and capture deployment transaction details:

```bash
# Deploy to local Hardhat network
npm run deploy:localhost

# Deploy to Sepolia testnet
npm run deploy:sepolia
```

**Output File**: `deployment-info.json`

The deployment script captures:
- Contract address
- Deployment transaction hash
- Block number and gas used
- Deployer address and base URI
- Initial token balances
- Etherscan URL (for Sepolia)

**Example Output**:
```json
{
  "network": "sepolia",
  "contractAddress": "0xC005567bE071811f921388a4c000433D9D89e0C5",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "baseURI": "ipfs://QmYourCID/",
  "timestamp": "2026-02-13T10:30:00.000Z",
  "transaction": {
    "hash": "0x1a6e3301dd4e59481d58d7a392230a24b6988f9d6f9768b143de800127a9e5a7",
    "blockNumber": 5234567,
    "gasUsed": "2145892",
    "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "nonce": 42,
    "explorerUrl": "https://sepolia.etherscan.io/tx/0x1a6e3301dd4e59481d58d7a392230a24b6988f9d6f9768b143de800127a9e5a7"
  },
  "tokenBalances": {
    "gold": "1000000",
    "founderSword": "1",
    "healthPotion": "100"
  }
}
```

### Interact Script with Transaction Capture

Interact with deployed contract and capture transaction details:

```bash
# Interact on local Hardhat network
CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network localhost

# Interact on Sepolia testnet (with recipient address)
CONTRACT_ADDRESS=0x... RECIPIENT_ADDRESS=0x... npx hardhat run scripts/interact.js --network sepolia
```

**Output File**: `interaction-info.json`

The interaction script captures:
- Batch transfer transaction hash
- Block number and gas used
- Token IDs and amounts transferred
- Sender and recipient addresses
- Final balances after transfer
- Etherscan URL (for Sepolia)

**Example Output**:
```json
{
  "network": "sepolia",
  "contractAddress": "0xC005567bE071811f921388a4c000433D9D89e0C5",
  "timestamp": "2026-02-13T10:35:00.000Z",
  "batchTransfer": {
    "transaction": {
      "hash": "0x9f2e8a4b3c1d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
      "blockNumber": 5234580,
      "gasUsed": "125000",
      "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "to": "0xC005567bE071811f921388a4c000433D9D89e0C5",
      "nonce": 43,
      "explorerUrl": "https://sepolia.etherscan.io/tx/0x9f2e8a4b3c1d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f"
    },
    "tokens": {
      "ids": [0, 1, 2],
      "amounts": [1000, 1, 10]
    },
    "participants": {
      "sender": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "recipient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    }
  },
  "finalBalances": {
    "owner": {
      "gold": "999000",
      "founderSword": "0",
      "healthPotion": "90"
    },
    "recipient": {
      "gold": "1000",
      "founderSword": "1",
      "healthPotion": "10"
    }
  }
}
```

### Combined Test Script

Test both deployment and interaction in a single run:

```bash
# Run combined test on local Hardhat network
npx hardhat run scripts/test-tx-capture.js --network localhost

# Run combined test on Sepolia testnet
npx hardhat run scripts/test-tx-capture.js --network sepolia
```

This script:
1. Deploys the GameInventory contract
2. Captures deployment transaction
3. Performs batch transfer of all 3 token types
4. Captures transfer transaction
5. Verifies final balances
6. Saves both transactions to separate JSON files

**Output Files**:
- `deployment-info.json` - Deployment transaction details
- `interaction-info.json` - Batch transfer transaction details

### Complete Sepolia Workflow

End-to-end workflow for deploying and interacting on Sepolia testnet:

```bash
# Step 1: Upload metadata to IPFS (if not already done)
npm run upload:ipfs

# Step 2: Deploy contract to Sepolia
npm run deploy:sepolia
# Note the CONTRACT_ADDRESS from output

# Step 3: Interact with contract on Sepolia
CONTRACT_ADDRESS=0xYourAddress RECIPIENT_ADDRESS=0xRecipient npx hardhat run scripts/interact.js --network sepolia

# Step 4: Verify transactions on Etherscan
# Check the explorerUrl in deployment-info.json and interaction-info.json
```

**Transaction Files Generated**:
- `deployment-info.json` - Contains deployment tx hash and Etherscan URL
- `interaction-info.json` - Contains batch transfer tx hash and Etherscan URL
- `test-transactions.json` - (Only when running `npm run test:capture:sepolia`)

### Verifying Transactions

All transaction hashes can be verified on blockchain explorers:

**Hardhat (Local Network)**:
- No explorer available (use transaction hash in JSON files for reference)

**Sepolia Testnet**:
- Etherscan URL automatically included in JSON output
- Manual check: `https://sepolia.etherscan.io/tx/YOUR_TX_HASH`

## Example Usage

### Basic Transfer

```javascript
// Transfer 100 Gold tokens
await gameInventory.safeTransferFrom(
  owner.address,
  recipient.address,
  0, // Token ID (Gold)
  100,
  "0x",
);
```

### Batch Transfer

```javascript
// Transfer multiple tokens at once
await gameInventory.safeBatchTransferFrom(
  owner.address,
  recipient.address,
  [0, 2], // Gold and Health Potion
  [5000, 10],
  "0x",
);
```

### Query Multiple Balances

```javascript
// Get balances for multiple accounts
const balances = await gameInventory.balanceOfBatch(
  [player1.address, player2.address, player3.address],
  [0, 1, 2],
);
console.log("Player1 Gold:", balances[0].toString());
console.log("Player2 Founder Sword:", balances[1].toString());
console.log("Player3 Health Potion:", balances[2].toString());
```

### Mint Additional Tokens (Owner Only)

```javascript
// Mint more tokens to a player
await gameInventory.mintBatch(
  player.address,
  [0, 2], // Gold and Health Potion
  [10000, 50],
  "0x",
);
```

## Deployment

1. Start local Hardhat node:

```bash
npx hardhat node
```

2. Deploy contract (in new terminal):

```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. Note the deployed contract address

4. Interact with the contract:

```bash
CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network localhost
```

## Networks

### Local Network (Hardhat)

- **Chain ID**: 31337
- **RPC URL**: http://127.0.0.1:8545
- **Use for**: Development and testing

### Sepolia Testnet

- **Chain ID**: 11155111
- **RPC URL**: Set in `.env` file
- **Use for**: Testnet deployment
- **Requirements**: Test ETH from faucet

## Troubleshooting

### Tests Failing

- Ensure dependencies are installed: `npm install`
- Clear cache: `npx hardhat clean`
- Recompile: `npx hardhat compile`

### Deployment Issues

- Check account has sufficient ETH
- Verify RPC URL is correct in `.env`
- Ensure private key is properly formatted (without 0x prefix in some cases)

### Gas Estimation Errors

- Increase gas limit in transaction
- Check account balance
- Verify contract function arguments

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:

- Open an issue on GitHub
- Review test cases for usage examples
- Check Hardhat documentation: https://hardhat.org/

## Acknowledgments

- OpenZeppelin for secure contract implementations
- Hardhat for development framework
- ERC-1155 standard authors

---

**Built with:** Solidity ^0.8.20 | Hardhat ^2.28.4 | OpenZeppelin ^5.4.0
