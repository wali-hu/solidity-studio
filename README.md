# Uniswap V2 ETH-to-Token Swap Smart Contract

A production-ready Solidity smart contract that interfaces with Uniswap V2 Router to perform bidirectional swaps (ETH ↔ Token and Token ↔ ETH) on Ethereum Sepolia testnet, accompanied by comprehensive tests, deployment scripts, and RESTful API endpoints.

##  Project Overview

This project implements a custom smart contract wrapper around Uniswap V2 Router02 that enables:
- **Buy Tokens**: Swap native ETH for ERC20 tokens
- **Sell Tokens**: Swap ERC20 tokens for native ETH

The contract is deployed and verified on Sepolia testnet, with full testing coverage and Postman-accessible API endpoints for easy integration.

##  Requirements Fulfillment

### 1. Smart Contract Development 
-  Solidity contract written (`EthToTokenUniswapV2Swapper.sol`)
-  Uniswap V2 Router interface integrated
-  Custom function `swapETHForToken` implemented:
  - Accepts ETH from caller (`msg.value`)
  - Defines swap path: `[WETH, tokenAddress]`
  - Calls `swapExactETHForTokens` on Uniswap Router
  - Sends purchased tokens to `msg.sender`
-  Additional function `swapTokenForETH` implemented:
  - Accepts ERC20 tokens from caller
  - Defines swap path: `[tokenAddress, WETH]`
  - Calls `swapExactTokensForETH` on Uniswap Router
  - Sends ETH to `msg.sender`

### 2. Deployment & Testnet 
-  Contract deployed to Sepolia Testnet
-  Contract verified on Etherscan (Sepolia)
-  Contract address and ABI maintained in artifacts
-  Deployed contract: [`0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B`](https://sepolia.etherscan.io/address/0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B)

### 3. API Endpoints 
-  `POST /api/v1/swap/buy` - Buy tokens (ETH → Token)
  - Accepts `token_address` and `eth_amount` as parameters
  - Signs transaction using secure private key (environment variable)
  - Returns transaction hash immediately
-  `POST /api/v1/swap/sell` - Sell tokens (Token → ETH)
  - Accepts `token_address`, `token_amount`, and `min_eth_out` as parameters
  - Signs transaction using secure private key (environment variable)
  - Returns transaction hash immediately

### 4. Testing 
-  Comprehensive Hardhat test suite with 7 test cases
-  Tests cover validation logic, error handling, and edge cases
-  All tests passing

### 5. Deliverables 
-  Postman collection file (`postman_collection.json`) for API testing
-  Multiple successful transaction hashes from Sepolia testnet
-  Fast API response times (returns tx hash immediately, no waiting)

##  Features

- **Bidirectional Swaps**: Both ETH→Token and Token→ETH swaps
- **Production-Ready**: Comprehensive error handling, validation, and events
- **Sepolia Testnet**: Deployed and verified on Sepolia
- **RESTful API**: Fast, Postman-compatible endpoints
- **Full Test Coverage**: Unit tests for all contract functions
- **TypeScript Support**: All scripts and tests in TypeScript
- **Environment-Based Config**: Secure configuration via `.env` file

##  Project Structure

```
uniswap-v2-swap/
├── contracts/
│   └── EthToTokenUniswapV2Swapper.sol  # Main swap contract
├── test/
│   └── EthToTokenUniswapV2Swapper.ts   # Hardhat test suite
├── scripts/
│   ├── deploy-swapper.ts               # Deployment script
│   ├── interact-swapper.ts             # Buy tokens script (ETH→Token)
│   ├── interact-sell-token.ts          # Sell tokens script (Token→ETH)
│   └── read-token-balance.ts            # Read ERC20 balance script
├── api/
│   └── server.js                        # Express API server
├── postman_collection.json              # Postman API collection
├── hardhat.config.ts                    # Hardhat configuration
├── package.json                         # Dependencies
└── .env.example                         # Environment variables template
```

##  Setup

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Sepolia testnet ETH (for deployment and testing)
- Sepolia RPC URL (Alchemy, Infura, or similar)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd uniswap-v2-swap
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
# Network Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_PROJECT_ID
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Contract Address (update after deployment)
SWAPPER_ADDRESS=0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B

# Optional: Etherscan Verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# API Configuration
PORT=3000

# Token Configuration (for testing)
TOKEN_ADDRESS=0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834
ETH_AMOUNT=0.001
MIN_AMOUNT_OUT=0
MIN_ETH_OUT=0
```

##  Usage

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

Expected output: `7 passing` tests

### Deploy to Sepolia

```bash
npx hardhat run scripts/deploy-swapper.ts --network sepolia
```

After deployment, update `SWAPPER_ADDRESS` in your `.env` file.

### Verify on Etherscan

```bash
npx hardhat verify --network sepolia \
  0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B \
  0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3 \
  0xfff9976782d46cc05630d1f6ebab18b2324d6b14
```

### Flatten Contract (for Etherscan verification)

```bash
mkdir -p flattened
npx hardhat flatten contracts/EthToTokenUniswapV2Swapper.sol > flattened/EthToTokenUniswapV2Swapper.flattened.sol
```

### Direct Script Interaction

**Buy Tokens (ETH → Token):**
```bash
npx hardhat run scripts/interact-swapper.ts --network sepolia
```

**Sell Tokens (Token → ETH):**
```bash
export TOKEN_AMOUNT="0.001"
npx hardhat run scripts/interact-sell-token.ts --network sepolia
```

**Read Token Balance:**
```bash
npx hardhat run scripts/read-token-balance.ts --network sepolia
```

### Start API Server

```bash
npm run api
```

Server starts on `http://localhost:3000`

##  API Endpoints

### Buy Tokens (ETH → Token)

**Endpoint:** `POST /api/v1/swap/buy`

**Request Body:**
```json
{
  "token_address": "0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834",
  "eth_amount": "0.001"
}
```

**Response:**
```json
{
  "txHash": "0x4fc42f740f8e688846f20339f95870ce19d05fba500320c628d8305e9c4539f3"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/swap/buy \
  -H "Content-Type: application/json" \
  -d '{"token_address":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","eth_amount":"0.001"}'
```

### Sell Tokens (Token → ETH)

**Endpoint:** `POST /api/v1/swap/sell`

**Request Body:**
```json
{
  "token_address": "0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834",
  "token_amount": "0.001",
  "min_eth_out": "0"
}
```

**Response:**
```json
{
  "txHash": "0x8b234114abe151a996fe0bb2e7c42dce5c97bf7ec00eed0b24c98dfc6cd2667b"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/swap/sell \
  -H "Content-Type: application/json" \
  -d '{"token_address":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","token_amount":"0.001","min_eth_out":"0"}'
```

##  Postman Collection

Import `postman_collection.json` into Postman to test the API endpoints easily.

The collection includes:
- **Buy Tokens (ETH -> Token)** request
- **Sell Tokens (Token -> ETH)** request
- Pre-configured environment variable `{{TOKEN_ADDRESS}}`

##  Sepolia Testnet Configuration

- **Uniswap V2 Router02:** `0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3`
- **Uniswap V2 Factory:** `0xF62c03E08ada871A0bEb309762E260a7a6a880E6`
- **WETH (Sepolia):** `0xfff9976782d46cc05630d1f6ebab18b2324d6b14`
- **Deployed Contract:** [`0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B`](https://sepolia.etherscan.io/address/0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B)

##  Example Transactions

### Successful Buy Transaction
- **Tx Hash:** `0x4fc42f740f8e688846f20339f95870ce19d05fba500320c628d8305e9c4539f3`
- **Type:** ETH → Token
- **Amount:** 0.001 ETH
- **Status:**  Confirmed

### Successful Sell Transaction
- **Tx Hash:** `0x8b234114abe151a996fe0bb2e7c42dce5c97bf7ec00eed0b24c98dfc6cd2667b`
- **Type:** Token → ETH
- **Amount:** 0.001 TEST tokens
- **Status:**  Confirmed

View all transactions on [Etherscan](https://sepolia.etherscan.io/address/0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B#txns)

##  Security Notes

- **Private Keys**: Never commit `.env` file to version control
- **Testnet Only**: This contract is configured for Sepolia testnet
- **Slippage Protection**: Always set appropriate `minAmountOut` / `minEthOut` values in production
- **Deadline**: Contract uses `block.timestamp + 15 minutes` for swap deadlines

##  Test Coverage

The test suite includes:
1.  Contract deployment with correct router and WETH addresses
2.  Revert when no ETH is sent (buy)
3.  Revert when token address is zero (buy)
4.  Revert when token address is WETH (buy)
5.  Revert when no tokens are specified (sell)
6.  Revert when token address is zero (sell)
7.  Revert when token address is WETH (sell)

Run tests: `npx hardhat test`

##  Contract Functions

### `swapETHForToken(address tokenAddress, uint256 minAmountOut)`
Swaps native ETH for ERC20 tokens.

**Parameters:**
- `tokenAddress`: Address of the ERC20 token to receive
- `minAmountOut`: Minimum acceptable tokens (slippage protection)

**Returns:** `uint256 amountOut` - Actual tokens received

**Events:** `EthSwappedForToken(address indexed sender, uint256 ethIn, address indexed tokenOut, uint256 amountOut)`

### `swapTokenForETH(address tokenAddress, uint256 amountIn, uint256 minEthOut)`
Swaps ERC20 tokens for native ETH.

**Parameters:**
- `tokenAddress`: Address of the ERC20 token to sell
- `amountIn`: Exact amount of tokens to swap
- `minEthOut`: Minimum acceptable ETH (slippage protection)

**Returns:** `uint256 ethOut` - Actual ETH received

**Events:** `TokenSwappedForEth(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 ethOut)`

**Note:** Caller must approve the contract to spend tokens before calling this function.

##  Technology Stack

- **Solidity:** ^0.8.28
- **Hardhat:** ^3.1.10
- **Ethers.js:** ^6.16.0
- **TypeScript:** ~5.8.0
- **Express:** ^4.21.2
- **Mocha:** ^11.7.5 (testing)

##  License

MIT

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##  Support

For issues or questions, please open an issue on the repository.

---

**Built with ❤️ for Uniswap V2 integration on Sepolia Testnet**
