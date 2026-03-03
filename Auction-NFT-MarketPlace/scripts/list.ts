import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to list NFTs on the marketplace
 * Uses signers[1] (Seller) — pays listing fee and sets price
 * Usage: npx hardhat run scripts/list.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting NFT listing...\n");

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
const marketplaceAddress = deploymentInfo.contracts.NFTMarketplace.address;

console.log("NFT Collection Address:", nftAddress);
console.log("Marketplace Address:", marketplaceAddress);

const signers = await ethers.getSigners();
const seller = signers[1]; // Seller account
if (!seller) {
  console.error("Error: SELLER_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
console.log("Listing with account (Seller):", seller.address);

// Get contract instances
const NFTCollection = await ethers.getContractFactory("NFTCollection");
const nftCollection = NFTCollection.attach(nftAddress);

const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
const marketplace = NFTMarketplace.attach(marketplaceAddress);

// Get listing fee
const listingFee = await marketplace.getListingPrice();
console.log(`\nListing Fee: ${ethers.formatEther(listingFee)} ETH`);

// Configuration
const TOKEN_ID = 0; // Change this to the token ID you want to list
const SALE_PRICE = ethers.parseEther("0.001"); // Change to your desired sale price

console.log(`Listing Token ID: ${TOKEN_ID}`);
console.log(`Sale Price: ${ethers.formatEther(SALE_PRICE)} ETH`);

// Check ownership
const owner = await nftCollection.ownerOf(TOKEN_ID);
if (owner.toLowerCase() !== seller.address.toLowerCase()) {
  console.error(`\nError: You don't own token ID ${TOKEN_ID}`);
  console.error(`Owner: ${owner}`);
  process.exit(1);
}

console.log("Ownership verified");

// Check if marketplace is approved
const isApproved = await nftCollection
  .connect(seller)
  .isApprovedForAll(seller.address, marketplaceAddress);
const approvedAddress = await nftCollection.getApproved(TOKEN_ID);

if (
  !isApproved &&
  approvedAddress.toLowerCase() !== marketplaceAddress.toLowerCase()
) {
  console.log("\nApproving marketplace to transfer NFT...");
  const approveTx = await nftCollection
    .connect(seller)
    .setApprovalForAll(marketplaceAddress, true);
  await approveTx.wait();
  console.log("Marketplace approved");
} else {
  console.log("Marketplace already approved");
}

// List the NFT (seller sets price and pays listing fee)
console.log("\nListing NFT on marketplace...");
const listTx = await marketplace
  .connect(seller)
  .listNFT(nftAddress, TOKEN_ID, SALE_PRICE, { value: listingFee });
const receipt = await listTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);

// Get the listing ID from the event
const event = receipt?.logs.find((log: any) => {
  try {
    const parsed = marketplace.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    return parsed?.name === "NFTListed";
  } catch {
    return false;
  }
});

if (event) {
  const parsed = marketplace.interface.parseLog({
    topics: event.topics as string[],
    data: event.data,
  });
  console.log(`\nNFT Listed! Listing ID: ${parsed?.args[0]}`);
  console.log(`Price: ${ethers.formatEther(parsed?.args[4])} ETH`);
}

console.log("\n=== Listing Complete ===");
