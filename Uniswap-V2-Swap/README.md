# Uniswap V2 Swap (Sepolia)

A Solidity smart contract that uses Uniswap V2 to perform **ETH ↔ Token**, **Token → ETH**, and **Token → Token** swaps on Ethereum Sepolia testnet. Includes tests, deployment and interaction scripts, and a REST API.

---

## What This Project Does

- **Buy tokens** — Swap ETH for ERC20 tokens
- **Sell tokens** — Swap ERC20 for ETH (fixed amount or full balance)
- **Token-to-token swap** — Swap Token A for Token B (via WETH)
- **API** — Same swaps via REST endpoints (Postman or cURL)

---

## Prerequisites

- Node.js (v18+)
- Sepolia testnet ETH (for gas)
- Sepolia RPC URL (e.g. Alchemy, Infura)
- A wallet private key (use a test wallet only)

---

## Setup (One-Time)

```bash
git clone <repo-url>
cd uniswap-v2-swap
npm install
cp .env.example .env
```

Then edit `.env` and set these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` |
| `SEPOLIA_PRIVATE_KEY` | Wallet private key (0x prefix) | `0xabc...` |
| `SWAPPER_ADDRESS` | Contract address (set after deployment) | `0x...` |
| `ETHERSCAN_API_KEY` | For Etherscan verification (optional) | - |
| `TOKEN_ADDRESS` | Token used for buy/sell | `0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834` (TEST) |
| `ETH_AMOUNT` | ETH amount for buy script | `0.001` |
| `MIN_AMOUNT_OUT` | Minimum tokens/ETH out (slippage) | `0` |
| `MIN_ETH_OUT` | Minimum ETH on sell | `0` |
| `TOKEN_IN` | Token to sell (token-to-token) | `0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834` |
| `TOKEN_OUT` | Token to receive (token-to-token) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| `TOKEN_AMOUNT` | Amount for token-to-token | `0.001` |
| `PORT` | API server port (optional) | `3000` |

---

## Commands (Run in Order)

### 1. Compile

```bash
npx hardhat compile
```

### 2. Test

```bash
npx hardhat test
```

**Expected:** `14 passing`

### 3. Deploy (Sepolia)

```bash
npx hardhat run scripts/deploy-swapper.ts --network sepolia
```

Copy the printed address (e.g. `EthToTokenUniswapV2Swapper deployed to: 0x...`) into `.env` as `SWAPPER_ADDRESS`.

### 4. Verify on Etherscan (Optional)

```bash
npx hardhat verify --network sepolia <SWAPPER_ADDRESS> 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3 0xfff9976782d46cc05630d1f6ebab18b2324d6b14
```

Replace `<SWAPPER_ADDRESS>` with your deployed contract address.

### 5. Flatten Contract (Optional)

```bash
mkdir -p flattened
npx hardhat flatten contracts/EthToTokenUniswapV2Swapper.sol > flattened/EthToTokenUniswapV2Swapper.flattened.sol
```

---

## Scripts (CLI Swaps)

All scripts require `SWAPPER_ADDRESS` in `.env`. Required env vars are listed per script.

### Buy Tokens (ETH → Token)

- **Env:** `SWAPPER_ADDRESS`, `TOKEN_ADDRESS`, `ETH_AMOUNT`, `MIN_AMOUNT_OUT`

```bash
npx hardhat run scripts/interact-swapper.ts --network sepolia
```

### Sell Tokens — Fixed Amount (Token → ETH)

- **Env:** `SWAPPER_ADDRESS`, `TOKEN_ADDRESS`, `TOKEN_AMOUNT`, `MIN_ETH_OUT`

```bash
npx hardhat run scripts/interact-sell-token.ts --network sepolia
```

### Sell All Tokens — Contract Balance (Token → ETH)

- **Env:** `SWAPPER_ADDRESS`, `TOKEN_ADDRESS`, `MIN_ETH_OUT`

```bash
npx hardhat run scripts/interact-sell-all-tokens.ts --network sepolia
```

### Token-to-Token Swap (Token A → Token B)

- **Env:** `SWAPPER_ADDRESS`, `TOKEN_IN`, `TOKEN_OUT`, `TOKEN_AMOUNT`, `MIN_AMOUNT_OUT`

```bash
npx hardhat run scripts/interact-token-to-token.ts --network sepolia
```

### Read Token Balance

- **Env:** `TOKEN_ADDRESS` (optional: `WALLET_ADDRESS`)

```bash
npx hardhat run scripts/read-token-balance.ts --network sepolia
```

---

## API (Server and Endpoints)

### Start Server

```bash
npm run api
```

Server runs at `http://localhost:3000`. Ensure `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`, and `SWAPPER_ADDRESS` are set in `.env`.

---

### 1. Buy Tokens (ETH → Token)

| | |
|--|--|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/v1/swap/buy` |
| **Body** | `token_address`, `eth_amount` (string) |

**Example body:**
```json
{
  "token_address": "0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834",
  "eth_amount": "0.001"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/swap/buy \
  -H "Content-Type: application/json" \
  -d '{"token_address":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","eth_amount":"0.001"}'
```

**Response:** `{ "txHash": "0x..." }`

---

### 2. Sell All Tokens (Token → ETH) — API fetches balance

| | |
|--|--|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/v1/swap/sell` |
| **Body** | `token_address`, `min_eth_out` (optional, string) |

**Example body:**
```json
{
  "token_address": "0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834",
  "min_eth_out": "0"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/swap/sell \
  -H "Content-Type: application/json" \
  -d '{"token_address":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","min_eth_out":"0"}'
```

**Response:** `{ "txHash": "...", "amountSold": "...", "amountSoldFormatted": "...", "symbol": "..." }`

---

### 3. Sell All Tokens (Contract-Level)

| | |
|--|--|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/v1/swap/sell-all` |
| **Body** | Same as `/sell` |

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/swap/sell-all \
  -H "Content-Type: application/json" \
  -d '{"token_address":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","min_eth_out":"0"}'
```

---

### 4. Token-to-Token Swap

| | |
|--|--|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/v1/swap/token-to-token` |
| **Body** | `token_in`, `token_out`, `token_amount` (string), `min_amount_out` (optional, string) |

**Example body:**
```json
{
  "token_in": "0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834",
  "token_out": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  "token_amount": "0.001",
  "min_amount_out": "0"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/swap/token-to-token \
  -H "Content-Type: application/json" \
  -d '{"token_in":"0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834","token_out":"0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238","token_amount":"0.001","min_amount_out":"0"}'
```

**Response:** `{ "txHash": "...", "tokenIn": "...", "tokenOut": "...", "amountIn": "..." }`

---

### 5. Get Token Balance

| | |
|--|--|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/api/v1/balance/<TOKEN_ADDRESS>` |

**Example:**  
`http://localhost:3000/api/v1/balance/0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834`

**cURL:**
```bash
curl http://localhost:3000/api/v1/balance/0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834
```

**Response:** `{ "wallet", "tokenAddress", "symbol", "balance", "balanceFormatted", "decimals" }`

---

## Postman

- Import `postman_collection.json` into Postman.
- Requests included: Buy, Sell, Sell All (contract), Token-to-Token, Get Balance.
- Collection variables: `TOKEN_ADDRESS`, `TOKEN_IN`, `TOKEN_OUT` (can be set in the collection).

---

## Project Structure

```
contracts/   → EthToTokenUniswapV2Swapper.sol, MockERC20.sol
test/        → EthToTokenUniswapV2Swapper.ts (14 tests)
scripts/     → deploy-swapper, interact-swapper, interact-sell-token,
               interact-sell-all-tokens, interact-token-to-token, read-token-balance
api/         → server.js (Express)
postman_collection.json
.env.example
```

---

## Sepolia Addresses

| Purpose | Address |
|---------|---------|
| Uniswap V2 Router | `0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3` |
| WETH | `0xfff9976782d46cc05630d1f6ebab18b2324d6b14` |
| Example token (TEST) | `0x7a0A8c1FA9788cec58AeaA0B1859B537A0969834` |
| Example token (USDC) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

Your deployed contract address is printed on deploy; set it in `.env` as `SWAPPER_ADDRESS`.

---

## Quick Flow (All Steps)

```bash
# 1. Setup
npm install && cp .env.example .env
# Edit .env: SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY

# 2. Build and test
npx hardhat compile && npx hardhat test

# 3. Deploy
npx hardhat run scripts/deploy-swapper.ts --network sepolia
# Set printed address in .env as SWAPPER_ADDRESS

# 4. Scripts (any of these)
npx hardhat run scripts/interact-swapper.ts --network sepolia
npx hardhat run scripts/interact-token-to-token.ts --network sepolia

# 5. API
npm run api
# Then call http://localhost:3000/api/v1/... via browser, Postman, or cURL
```

---

## Security

- Do not commit `.env` (it contains your private key).
- This contract is for Sepolia testnet; do not use the same setup on mainnet without review.

---

## License

MIT
