# Uniswap V2 Swap Smart Contract

A production-ready Solidity smart contract that interfaces with Uniswap V2 Router to perform **ETH ↔ Token**, **Token → ETH**, and **Token → Token** swaps on Ethereum Sepolia testnet, with tests, deployment and interaction scripts, and RESTful API endpoints.

## Project Overview

This project implements a custom smart contract wrapper around Uniswap V2 Router02 that enables:
- **Buy Tokens**: Swap native ETH for ERC20 tokens
- **Sell Tokens**: Swap ERC20 tokens for native ETH (fixed amount or all balance)
- **Token-to-Token**: Swap one ERC20 token for another (path: tokenIn → WETH → tokenOut)

The contract is deployed and verified on Sepolia testnet, with full testing coverage and Postman-accessible API endpoints.

##  Requirements Fulfillment

### 1. Smart Contract Development
- Solidity contract written (`EthToTokenUniswapV2Swapper.sol`)
- Uniswap V2 Router interface integrated
- **swapETHForToken**: ETH → Token (path `[WETH, tokenAddress]`), calls `swapExactETHForTokens`
- **swapTokenForETH**: Token → ETH (path `[tokenAddress, WETH]`), calls `swapExactTokensForETH`
- **swapAllTokenForETH**: Fetches caller balance, sells all tokens for ETH (contract-level)
- **swapTokenForToken**: Token A → Token B (path `[tokenIn, WETH, tokenOut]`), calls `swapExactTokensForTokens`

### 2. Deployment & Testnet 
-  Contract deployed to Sepolia Testnet
-  Contract verified on Etherscan (Sepolia)
-  Contract address and ABI maintained in artifacts
-  Deployed contract: [`0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B`](https://sepolia.etherscan.io/address/0x2f315e0B691C5E1da07B77FD3FaA730AF3B8793B)

### 3. API Endpoints
- `POST /api/v1/swap/buy` — Buy tokens (ETH → Token): `token_address`, `eth_amount`
- `POST /api/v1/swap/sell` — Sell all tokens (Token → ETH, API fetches balance): `token_address`, `min_eth_out`
- `POST /api/v1/swap/sell-all` — Sell all tokens (Token → ETH, contract-level): `token_address`, `min_eth_out`
- `POST /api/v1/swap/token-to-token` — Token A → Token B: `token_in`, `token_out`, `token_amount`, `min_amount_out`
- `GET /api/v1/balance/:tokenAddress` — Get wallet token balance

All swap endpoints sign with `SEPOLIA_PRIVATE_KEY` and return `txHash` immediately.

### 4. Testing
- Hardhat test suite with 14 test cases (ETH↔Token, sell-all, token-to-token validation)
- Tests cover validation logic, error handling, and edge cases
- Mock ERC20 used for zero-balance and token-to-token tests

### 5. Deliverables 
-  Postman collection file (`postman_collection.json`) for API testing
-  Multiple successful transaction hashes from Sepolia testnet
-  Fast API response times (returns tx hash immediately, no waiting)

## Features

- **ETH ↔ Token**: Buy (ETH→Token) and sell (Token→ETH) with optional sell-all (contract-level)
- **Token-to-Token**: Swap any ERC20 for another via WETH path
- **Production-Ready**: Error handling, validation, and events
- **Sepolia Testnet**: Deployed and verified on Sepolia
- **RESTful API**: Fast, Postman-compatible endpoints
- **Full Test Coverage**: Unit tests for all contract functions
- **TypeScript Support**: Scripts and tests in TypeScript
- **Environment-Based Config**: Secure configuration via `.env` file

## Project Structure

```
uniswap-v2-swap/
├── contracts/
│   ├── EthToTokenUniswapV2Swapper.sol  # Main swap contract
│   └── MockERC20.sol                    # Mock ERC20 for tests
├── test/
│   └── EthToTokenUniswapV2Swapper.ts   # Hardhat test suite (14 tests)
├── scripts/
│   ├── deploy-swapper.ts               # Deployment script
│   ├── interact-swapper.ts             # Buy tokens (ETH→Token)
│   ├── interact-sell-token.ts           # Sell tokens (Token→ETH, fixed amount)
│   ├── interact-sell-all-tokens.ts     # Sell all tokens (contract-level)
│   ├── interact-token-to-token.ts      # Token A → Token B swap
│   └── read-token-balance.ts           # Read ERC20 balance
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

# Token-to-token swap (both must have WETH pair on same Uniswap V2)
TOKEN_IN=0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834
TOKEN_OUT=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
TOKEN_AMOUNT=0.001
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

Expected output: `14 passing` tests

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

**Sell All Tokens (contract-level):**
```bash
npx hardhat run scripts/interact-sell-all-tokens.ts --network sepolia
```

**Token-to-Token Swap:**
```bash
npx hardhat run scripts/interact-token-to-token.ts --network sepolia
```
Requires `TOKEN_IN`, `TOKEN_OUT`, `TOKEN_AMOUNT` (and optionally `MIN_AMOUNT_OUT`) in `.env`.

**Read Token Balance:**
```bash
npx hardhat run scripts/read-token-balance.ts --network sepolia
```

### Start API Server

```bash
npm run api
```

Server starts on `http://localhost:3000`

---

## End-to-End Flow (Commands in Order)

Follow these steps to run the project from zero to a full swap (compile → test → deploy → verify → interact → API).

### 1. One-time setup

```bash
git clone <repository-url>
cd uniswap-v2-swap
npm install
cp .env.example .env
```

Edit `.env`: set `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`, and optionally `ETHERSCAN_API_KEY`.

### 2. Compile and test

```bash
npx hardhat compile
npx hardhat test
```

Expect: `14 passing` tests.

### 3. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy-swapper.ts --network sepolia
```

Copy the printed **EthToTokenUniswapV2Swapper** address into `.env` as `SWAPPER_ADDRESS`.

### 4. (Optional) Verify on Etherscan

```bash
npx hardhat verify --network sepolia <SWAPPER_ADDRESS> 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3 0xfff9976782d46cc05630d1f6ebab18b2324d6b14
```

### 5. (Optional) Flatten contract

```bash
mkdir -p flattened
npx hardhat flatten contracts/EthToTokenUniswapV2Swapper.sol > flattened/EthToTokenUniswapV2Swapper.flattened.sol
```

### 6. Set token addresses in `.env`

For buy/sell: set `TOKEN_ADDRESS` (e.g. TEST `0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834`).  
For token-to-token: set `TOKEN_IN` and `TOKEN_OUT` (both must have WETH liquidity on the same Uniswap V2).

### 7. Run interaction scripts (optional)

```bash
# Buy tokens (ETH → Token)
npx hardhat run scripts/interact-swapper.ts --network sepolia

# Sell tokens (fixed amount)
export TOKEN_AMOUNT=0.001
npx hardhat run scripts/interact-sell-token.ts --network sepolia

# Sell all tokens (contract-level)
npx hardhat run scripts/interact-sell-all-tokens.ts --network sepolia

# Token-to-token swap
npx hardhat run scripts/interact-token-to-token.ts --network sepolia

# Read token balance
npx hardhat run scripts/read-token-balance.ts --network sepolia
```

### 8. Start API and call endpoints

```bash
npm run api
```

Then (with server running on port 3000):

```bash
# Buy tokens
curl -X POST http://localhost:3000/api/v1/swap/buy \
  -H "Content-Type: application/json" \
  -d '{"token_address":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","eth_amount":"0.001"}'

# Sell all tokens
curl -X POST http://localhost:3000/api/v1/swap/sell \
  -H "Content-Type: application/json" \
  -d '{"token_address":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","min_eth_out":"0"}'

# Token-to-token
curl -X POST http://localhost:3000/api/v1/swap/token-to-token \
  -H "Content-Type: application/json" \
  -d '{"token_in":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","token_out":"0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238","token_amount":"0.001","min_amount_out":"0"}'

# Get balance
curl http://localhost:3000/api/v1/balance/0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834
```

Or import `postman_collection.json` into Postman and use the requests there.

---

## API Endpoints

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

### Sell All Tokens (Token → ETH)

**Endpoint:** `POST /api/v1/swap/sell` — Fetches wallet balance and sells all tokens.

**Request Body:**
```json
{
  "token_address": "0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834",
  "min_eth_out": "0"
}
```

**Response:** `{ "txHash": "0x...", "amountSold": "...", "amountSoldFormatted": "...", "symbol": "TEST" }`

### Sell All (Contract-Level)

**Endpoint:** `POST /api/v1/swap/sell-all` — Uses contract’s `swapAllTokenForETH` (same behaviour, contract checks balance).

**Request Body:** Same as `/api/v1/swap/sell`. Response includes `"method": "contract-level"`.

### Token-to-Token Swap

**Endpoint:** `POST /api/v1/swap/token-to-token`

**Request Body:**
```json
{
  "token_in": "0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834",
  "token_out": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  "token_amount": "0.001",
  "min_amount_out": "0"
}
```

**Response:** `{ "txHash": "0x...", "tokenIn": "...", "tokenOut": "...", "amountIn": "..." }`

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/swap/token-to-token \
  -H "Content-Type: application/json" \
  -d '{"token_in":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","token_out":"0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238","token_amount":"0.001","min_amount_out":"0"}'
```

### Get Token Balance

**Endpoint:** `GET /api/v1/balance/:tokenAddress`

**Response:** `{ "wallet", "tokenAddress", "symbol", "balance", "balanceFormatted", "decimals" }`

## Postman Collection

Import `postman_collection.json` into Postman to test the API endpoints easily.

The collection includes:
- **Buy Tokens (ETH -> Token)**
- **Sell Tokens (Token -> ETH)** — sell all
- **Sell All Tokens (Contract-Level)**
- **Token to Token Swap**
- **Get Token Balance**

Variables: `{{TOKEN_ADDRESS}}`, `{{TOKEN_IN}}`, `{{TOKEN_OUT}}`

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

## Test Coverage

The test suite includes:
1. Contract deployment with correct router and WETH addresses
2. Revert when no ETH is sent (buy)
3. Revert when token address is zero (buy)
4. Revert when token address is WETH (buy)
5. Revert when no tokens are specified (sell)
6. Revert when token address is zero (sell)
7. Revert when token address is WETH (sell)
8. swapAllTokenForETH: revert when token address is zero / WETH / zero balance
9. swapTokenForToken: revert when amount zero / tokenIn zero / tokenOut zero / same token

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

**Note:** Caller must approve the contract to spend tokens before calling.

### `swapAllTokenForETH(address tokenAddress, uint256 minEthOut)`
Fetches caller’s token balance and sells all for ETH. Path: `[tokenAddress, WETH]`. Returns `(amountIn, ethOut)`.

### `swapTokenForToken(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)`
Swaps token A for token B. Path: `[tokenIn, WETH, tokenOut]`. Returns `amountOut`. Caller must approve contract for `amountIn` of `tokenIn`.

**Events:** `TokenSwappedForToken(address indexed sender, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)`

## Technology Stack

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
