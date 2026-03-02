# Uniswap V3 Swap – Sepolia

ETH ↔ ERC20 swap contract and API using **Uniswap V3** (SwapRouter02) on **Ethereum Sepolia**.

## Behaviour

- **swapETHForToken(tokenAddress, minAmountOut)** – Send ETH; receive ERC20 (wraps to WETH, then V3 single-hop swap).
- **swapTokenForETH(tokenAddress, amountIn, minEthOut)** – Sell a fixed amount of token for ETH.
- **swapAllTokenForETH(tokenAddress, minEthOut)** – Sell caller’s full token balance for ETH.

Pool fee tier: **0.30%** (3000). Deadline: 15 minutes.

## Addresses (Sepolia)

| Contract   | Address |
|-----------|--------|
| SwapRouter02 | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` |
| WETH      | `0xfff9976782d46cc05630d1f6ebab18b2324d6b14` |

Ref: [Uniswap V3 Ethereum Deployments](https://docs.uniswap.org/contracts/v3/reference/deployments/ethereum-deployments).

## Setup

```bash
cp .env.example .env
# Edit .env: SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, SWAPPER_ADDRESS (after deploy), TOKEN_ADDRESS
npm install
```

## Build & Test

```bash
npx hardhat compile
npx hardhat test
```

## Deploy

```bash
npx hardhat run scripts/deploy-swapper.ts --network sepolia
```

Then set `SWAPPER_ADDRESS` in `.env` and (optional) verify:

```bash
npx hardhat verify --network sepolia <SWAPPER_ADDRESS> 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E 0xfff9976782d46cc05630d1f6ebab18b2324d6b14
```

## Scripts

- **Buy (ETH → token):** `npx hardhat run scripts/interact-swapper.ts --network sepolia`  
  Env: `SWAPPER_ADDRESS`, `TOKEN_ADDRESS`, optional `ETH_AMOUNT`, `MIN_AMOUNT_OUT`.
- **Sell (fixed amount):** `npx hardhat run scripts/interact-sell-token.ts --network sepolia`  
  Env: `SWAPPER_ADDRESS`, `TOKEN_ADDRESS`, optional `TOKEN_AMOUNT`, `MIN_ETH_OUT`.
- **Sell all:** `npx hardhat run scripts/interact-sell-all-tokens.ts --network sepolia`  
  Env: `SWAPPER_ADDRESS`, `TOKEN_ADDRESS`, optional `MIN_ETH_OUT`.
- **Balance:** `npx hardhat run scripts/read-token-balance.ts --network sepolia`  
  Env: `TOKEN_ADDRESS`, optional `WALLET_ADDRESS`.

## API

Same endpoints as the V2 version:

| Method | Endpoint | Body |
|--------|----------|------|
| POST   | `/api/v1/swap/buy`      | `{ "token_address", "eth_amount" }` |
| POST   | `/api/v1/swap/sell`     | `{ "token_address", "min_eth_out"? }` |
| POST   | `/api/v1/swap/sell-all`| `{ "token_address", "min_eth_out"? }` |
| GET    | `/api/v1/balance/:tokenAddress` | – |

```bash
npm run api
```

Use `postman_collection.json` for quick testing.

## License

MIT
