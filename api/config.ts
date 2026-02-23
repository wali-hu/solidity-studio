import "dotenv/config";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load deployment info
const deployment = JSON.parse(
  readFileSync(resolve(root, "deployments/latest.json"), "utf-8")
);

// Load ABIs from compiled artifacts
const nftCollectionArtifact = JSON.parse(
  readFileSync(
    resolve(
      root,
      "artifacts/contracts/NFTCollection.sol/NFTCollection.json"
    ),
    "utf-8"
  )
);

const nftAuctionArtifact = JSON.parse(
  readFileSync(
    resolve(root, "artifacts/contracts/NFTAuction.sol/NFTAuction.json"),
    "utf-8"
  )
);

// Provider
const RPC_URL = process.env.SEPOLIA_RPC_URL!;
if (!RPC_URL) throw new Error("SEPOLIA_RPC_URL not set in .env");

export const provider = new ethers.JsonRpcProvider(RPC_URL);

// Wallets mapped by role name
const walletKeys: Record<string, string | undefined> = {
  owner: process.env.SEPOLIA_PRIVATE_KEY,
  seller: process.env.SELLER_PRIVATE_KEY,
  bidder1: process.env.BIDDER1_PRIVATE_KEY,
  bidder2: process.env.BIDDER2_PRIVATE_KEY,
  bidder3: process.env.BIDDER3_PRIVATE_KEY,
  bidder4: process.env.BIDDER4_PRIVATE_KEY,
};

export function getSigner(role: string): ethers.Wallet {
  const key = walletKeys[role.toLowerCase()];
  if (!key) {
    throw new Error(
      `Unknown signer role "${role}". Valid roles: ${Object.keys(walletKeys).join(", ")}`
    );
  }
  return new ethers.Wallet(key, provider);
}

// Contract addresses
export const ADDRESSES = {
  NFTCollection: deployment.contracts.NFTCollection.address as string,
  NFTAuction: deployment.contracts.NFTAuction.address as string,
};

// ABIs
export const ABIS = {
  NFTCollection: nftCollectionArtifact.abi,
  NFTAuction: nftAuctionArtifact.abi,
};

// Contract instances (read-only, connected to provider)
export function getNFTCollectionContract(signer?: ethers.Wallet) {
  return new ethers.Contract(
    ADDRESSES.NFTCollection,
    ABIS.NFTCollection,
    signer ?? provider
  );
}

export function getNFTAuctionContract(signer?: ethers.Wallet) {
  return new ethers.Contract(
    ADDRESSES.NFTAuction,
    ABIS.NFTAuction,
    signer ?? provider
  );
}
