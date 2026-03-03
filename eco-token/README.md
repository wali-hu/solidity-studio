# EcoToken (Hardhat)

A Hardhat-based smart contract project that implements `EcoToken`, an ERC-20 token with:

- **Owner-only minting**
- **Holder burning**
- **2% burn tax on transfers** (deflationary behavior)

## Project Structure

- `contracts/EcoToken.sol` — main token contract
- `test/EcoToken.test.js` — unit tests for access control, allowance behavior, and transfer tax
- `hardhat.config.js` — Solidity compiler + gas reporter configuration
- `package.json` — dependencies and npm scripts

## Contract Overview

`EcoToken` extends OpenZeppelin:

- `ERC20`
- `Ownable`

### Core Logic

1. **Constructor**
   - Accepts `name`, `symbol`, and `initialSupplyTokens`.
   - Mints `initialSupplyTokens * 10^decimals()` to deployer.

2. **Mint**
   - `mint(address to, uint256 amount)`
   - Restricted by `onlyOwner`.

3. **Burn**
   - `burn(uint256 amount)`
   - Burns caller’s tokens.

4. **Transfer Tax (2%)**
   - Implemented by overriding `_update`.
   - For normal transfers (`from != 0` and `to != 0`), 2% of the transferred amount is burned.
   - Receiver gets 98%.
   - Minting and burning flows are excluded from tax logic.

### Constants

- `TAX_BASIS_POINTS = 200`
- `BASIS_POINTS_DENOMINATOR = 10_000`

Tax formula:

- `fee = value * 200 / 10_000`  
- `net = value - fee`

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Installation

```bash
npm install
```

## Compile

```bash
npx hardhat compile
```

## Run Tests

```bash
npm test
```

or:

```bash
npx hardhat test
```

## Gas Reporting

Gas reporting is enabled in `hardhat.config.js` via `hardhat-gas-reporter`:

- `enabled: true`
- `currency: "USD"`

Run tests to see gas usage in the output.

## Current Test Coverage

The included tests verify:

- Non-owner cannot call `mint`
- `transferFrom` reverts when allowance is insufficient
- Transfer burns 2% and reduces total supply accordingly

## Notes for Integrators

- The constructor `initialSupplyTokens` is in whole-token units (scaled internally by decimals).
- The `mint` function mints raw token units (already-decimal-adjusted amount expected).
- Because every transfer burns 2%, sender-to-receiver transfers are deflationary.
