# unique-collectible (Hardhat)

A Hardhat-based Ethereum smart contract project (`unique-collectible`) for minting and transferring ERC-721 NFTs with metadata URIs.

## What This Project Includes

- `contracts/UniqueCollectible.sol` — ERC-721 NFT contract using OpenZeppelin `ERC721URIStorage`
- `test/UniqueCollectible.test.js` — unit tests for metadata URI resolution and token transfer
- `scripts/deploy-unique.js` — deployment script for `UniqueCollectible`
- `metadata/1.json` — sample metadata JSON file
- `hardhat.config.js` — Solidity compiler and gas reporter config

## Contract Summary

`UniqueCollectible` has:

- Auto-incrementing token IDs starting from `1`
- Configurable base URI set in constructor
- `safeMint(address to, string uri)` for minting NFT metadata entries (example: `"1.json"`)

### URI Behavior

The contract overrides `_baseURI()` and stores per-token URIs.

If base URI is:

- `https://example.com/metadata/`

and token URI segment is:

- `1.json`

Then `tokenURI(1)` returns:

- `https://example.com/metadata/1.json`

## Prerequisites

- Node.js 18+
- npm

## Install Dependencies

```bash
npm install
```

## Compile Contracts

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

## Deploy Contract (Local Hardhat Network)

Default constructor args used in the deployment script:

- Name: `unique-collectible`
- Symbol: `UCOL`
- Base URI: `https://example.com/metadata/`

In one terminal:

```bash
npx hardhat node
```

In another terminal:

```bash
npx hardhat run scripts/deploy-unique.js --network localhost
```

## Metadata Example

Sample metadata file is in `metadata/1.json`:

```json
{
  "name": "Unique Collectible #1",
  "description": "First NFT in the collection",
  "image": "https://example.com/images/1.png"
}
```

## Gas Reporting

Gas reporting is enabled in `hardhat.config.js`:

- `enabled: true`
- `currency: "USD"`

Run tests to view gas usage output.

## Current Test Coverage

- `tokenURI` composition from base URI + token URI segment
- NFT ownership transfer from one account to another

## Important Note

`safeMint` is currently `external` with no access control, meaning **any address can mint NFTs**. If this is intended for a controlled collection, consider adding `Ownable` and restricting minting with `onlyOwner`.
