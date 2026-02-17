import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to buy NFTs from the marketplace
 * Uses signers[2] (Buyer)
 * Usage: npx hardhat run scripts/buy.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting NFT purchase...\n");

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
const marketplaceAddress = deploymentInfo.contracts.NFTMarketplace.address;

console.log("Marketplace Address:", marketplaceAddress);

const signers = await ethers.getSigners();
const buyer = signers[2]; // Buyer account
if (!buyer) {
  console.error("Error: BUYER_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
console.log("Buying with account (Buyer):", buyer.address);

const balance = await ethers.provider.getBalance(buyer.address);
console.log("Account balance:", ethers.formatEther(balance), "ETH");

// Get contract instance
const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
const marketplace = NFTMarketplace.attach(marketplaceAddress);

// Configuration: Listing ID to purchase
const LISTING_ID = 0; // Change this to the listing ID you want to buy

console.log(`\nFetching listing ${LISTING_ID}...`);

// Get listing details
const listing = await marketplace.getListing(LISTING_ID);

if (!listing.active) {
  console.error("Error: Listing is not active");
  process.exit(1);
}

console.log("\n=== Listing Details ===");
console.log("Seller:", listing.seller);
console.log("NFT Contract:", listing.nftContract);
console.log("Token ID:", listing.tokenId.toString());
console.log("Price:", ethers.formatEther(listing.price), "ETH");
console.log("======================\n");

// Confirm purchase
if (listing.seller.toLowerCase() === buyer.address.toLowerCase()) {
  console.error("Error: Cannot buy your own NFT");
  process.exit(1);
}

// Check if buyer has enough balance
if (balance < listing.price) {
  console.error("Error: Insufficient balance to purchase this NFT");
  console.error(`Required: ${ethers.formatEther(listing.price)} ETH`);
  console.error(`Available: ${ethers.formatEther(balance)} ETH`);
  process.exit(1);
}

console.log("Purchasing NFT...");
const buyTx = await marketplace.connect(buyer).buyNFT(LISTING_ID, {
  value: listing.price,
});

const receipt = await buyTx.wait();
console.log(`Transaction hash: ${receipt?.hash}`);

// Verify the event
const event = receipt?.logs.find((log: any) => {
  try {
    const parsed = marketplace.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    return parsed?.name === "NFTSold";
  } catch {
    return false;
  }
});

if (event) {
  console.log("\nNFT Purchase Successful!");
  console.log("You now own Token ID:", listing.tokenId.toString());
}

// Display new balance
const newBalance = await ethers.provider.getBalance(buyer.address);
console.log("\nNew account balance:", ethers.formatEther(newBalance), "ETH");
