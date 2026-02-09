# GameInventory - ERC-1155 Multi-Token Smart Contract

A fully-featured ERC-1155 multi-token smart contract for game items, supporting fungible, semi-fungible, and NFT tokens with batch operations and dynamic metadata URIs.

## Features

- **ERC-1155 Multi-Token Standard**: Supports multiple token types in a single contract
- **Three Token Types**:
  - **Gold (ID 0)**: Fungible token - 1,000,000 units
  - **Founder Sword (ID 1)**: NFT - 1 unique unit
  - **Health Potion (ID 2)**: Semi-Fungible token - 100 units
- **Batch Operations**: Transfer multiple token types in a single transaction
- **Dynamic Metadata URIs**: Automatically generated JSON metadata URLs
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

## Project Structure

```
multi-token-logic/
├── contracts/
│   └── GameInventory.sol           # Main ERC-1155 contract
├── scripts/
│   ├── deploy.js                   # Deployment script
│   └── interact.js                 # Interaction script
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

Dynamic metadata URLs pointing to JSON server:

```javascript
await gameInventory.uri(0); // Returns: "https://api.example.com/metadata/0.json"
await gameInventory.uri(1); // Returns: "https://api.example.com/metadata/1.json"
await gameInventory.uri(2); // Returns: "https://api.example.com/metadata/2.json"
```

**Validation**: Run tests with `npx hardhat test --grep "URI"`

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

Token metadata follows the ERC-1155 metadata standard. Each token URI points to a JSON file with this structure:

```json
{
  "name": "Token Name",
  "description": "Token description",
  "image": "https://api.example.com/images/token.png",
  "properties": {
    "type": "Fungible|NFT|Semi-Fungible",
    "rarity": "Common|Rare|Legendary",
    "max_supply": 1000000
  }
}
```

### Example Metadata URLs

- **Gold**: `https://api.example.com/metadata/0.json`
- **Founder Sword**: `https://api.example.com/metadata/1.json`
- **Health Potion**: `https://api.example.com/metadata/2.json`

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
