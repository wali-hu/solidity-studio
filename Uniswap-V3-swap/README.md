# Uniswap V3 Swap – Sepolia

ETH ↔ ERC20 swap contract and API using **Uniswap V3** (SwapRouter02) on **Ethereum Sepolia**.

## Behaviour

- **swapETHForToken(tokenAddress, minAmountOut)** – Send ETH; receive ERC20 (wraps to WETH, then V3 single-hop swap).
- **swapAllTokenForETH(tokenAddress, minEthOut)** – Sell caller’s full token balance for ETH.

Pool fee tier: **0.30%** (3000).

## Addresses (Sepolia)

| Contract      | Address |
|---------------|--------|
| SwapRouter02  | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` |
| WETH          | `0xfff9976782d46cc05630d1f6ebab18b2324d6b14` |
| V3 Factory    | `0x0227628f3F023bb0B980b67D528571c95c6DaC1c` |

Ref: [Uniswap V3 Ethereum Deployments](https://docs.uniswap.org/contracts/v3/reference/deployments/ethereum-deployments).

## Why did my swap revert?

Uniswap V3 needs a **pool** for the pair (WETH, your token) with **liquidity**. If there is no pool or the pool is empty, the router reverts (often with no revert message).

- **Check if a pool exists:**  
  `npx hardhat run scripts/check-pool.ts --network sepolia`  
  (set `TOKEN_ADDRESS` in `.env`). It checks 0.05%, 0.30%, and 1% fee tiers.
- **Use a token that has a V3 pool on Sepolia** (e.g. a token from Uniswap’s Sepolia UI or one you know has WETH liquidity).
- This contract uses **0.30% fee** only. If your token only has a 0.05% or 1% pool, the swap will still revert until a 0.30% pool exists.

### Token with a 0.30% V3 pool on Sepolia

**USDC** has a WETH/USDC 0.30% pool with liquidity on Uniswap V3 Sepolia. Use it for testing:

| Token | Address (Sepolia) | Pool (0.3% fee) |
|-------|-------------------|------------------|
| USDC  | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | [GeckoTerminal](https://www.geckoterminal.com/sepolia-testnet/pools/0x6ce0896eae6d4bd668fde41bb784548fb8f59b50) (~$700K liq) |

In `.env` set:  
`TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`  
then run the buy script or API. Other pairs (e.g. UNI/WETH, tBTC/WETH) may use different fee tiers; this contract only supports 0.30%.

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
- **Sell all:** `npx hardhat run scripts/interact-sell-all-tokens.ts --network sepolia`  
  Env: `SWAPPER_ADDRESS`, `TOKEN_ADDRESS`, optional `MIN_ETH_OUT`.
- **Balance:** `npx hardhat run scripts/read-token-balance.ts --network sepolia`  
  Env: `TOKEN_ADDRESS`, optional `WALLET_ADDRESS`.
- **Check pool (WETH/token):** `npx hardhat run scripts/check-pool.ts --network sepolia`  
  Env: `TOKEN_ADDRESS`. Use before buy/sell to see if a V3 pool exists and has liquidity.

## API

Same endpoints as the V2 version:

| Method | Endpoint | Body |
|--------|----------|------|
| POST   | `/api/v1/swap/buy`      | `{ "token_address", "eth_amount" }` |
| POST   | `/api/v1/swap/sell-all`| `{ "token_address", "min_eth_out"? }` |
| GET    | `/api/v1/balance/:tokenAddress` | – |

```bash
npm run api
```

Use `postman_collection.json` for quick testing.

## License

MIT
