import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to mint NFTs — anyone can mint (no owner restriction)
 * Uses signers[1] (Seller) to mint
 * Usage: npx hardhat run scripts/mint.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting NFT minting...\n");

// Load deployment info
const deploymentsPath = path.join(
  __dirname,
  "..",
  "deployments",
  "latest.json"
);

if (!fs.existsSync(deploymentsPath)) {
  console.error("Deployment file not found. Please deploy contracts first.");
  process.exit(1);
}

const deploymentInfo = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
const nftAddress = deploymentInfo.contracts.NFTCollection.address;

console.log("NFT Collection Address:", nftAddress);

const signers = await ethers.getSigners();
const seller = signers[1]; // Seller account
if (!seller) {
  console.error("Error: SELLER_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
console.log("Minting with account (Seller):", seller.address);

// Get contract instance
const NFTCollection = await ethers.getContractFactory("NFTCollection");
const nftCollection = NFTCollection.attach(nftAddress);

// Example: Mint multiple NFTs with metadata
const metadataFiles = [
  "legendary-dragon.json",
  "mythical-phoenix.json",
  "rare-unicorn.json",
  "epic-griffin.json",
  "common-wolf.json",
];

const baseURI =
  "ipfs://QmX99E9E5DRJfSLti7Rowqnp4CxhVb5LpVZCGNCXLRsu2p/"; // Replace with actual Pinata CID from upload-metadata script

for (let i = 0; i < metadataFiles.length; i++) {
  const tokenURI = baseURI + metadataFiles[i];

  console.log(`\nMinting NFT ${i + 1}/${metadataFiles.length}...`);
  console.log("Token URI:", tokenURI);

  const tx = await nftCollection
    .connect(seller)
    .mint(seller.address, tokenURI);
  const receipt = await tx.wait();

  console.log(`Transaction hash: ${receipt?.hash}`);

  // Get the minted token ID from the event
  const event = receipt?.logs.find((log: any) => {
    try {
      const parsed = nftCollection.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      return parsed?.name === "NFTMinted";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = nftCollection.interface.parseLog({
      topics: event.topics as string[],
      data: event.data,
    });
    console.log(`NFT minted! Token ID: ${parsed?.args[1]}`);
  }
}

// Display summary
const totalMinted = await nftCollection.totalMinted();

console.log("\n=== Minting Summary ===");
console.log("Total Minted:", totalMinted.toString());
console.log("=======================");
