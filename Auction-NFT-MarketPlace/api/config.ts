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

// Create a signer from a raw private key provided by the client
export function getSignerFromPrivateKey(privateKey: string): ethers.Wallet {
  if (!privateKey || typeof privateKey !== "string") {
    throw new Error("Private key is required");
  }

  // Accept keys with or without 0x prefix
  const normalizedKey = privateKey.startsWith("0x")
    ? privateKey
    : `0x${privateKey}`;

  try {
    return new ethers.Wallet(normalizedKey, provider);
  } catch (err: any) {
    throw new Error(`Invalid private key: ${err.message ?? String(err)}`);
  }
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
