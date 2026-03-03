import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to cancel NFT listings on the marketplace
 * Uses signers[1] (Seller) — NFT is returned from escrow
 * Usage: npx hardhat run scripts/cancel-listing.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting listing cancellation...\n");

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
const seller = signers[1]; // Seller account
if (!seller) {
  console.error("Error: SELLER_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
console.log("Cancelling with account (Seller):", seller.address);

// Get contract instance
const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
const marketplace = NFTMarketplace.attach(marketplaceAddress);

// Configuration: Listing ID to cancel
const LISTING_ID = 0; // Change this to the listing ID you want to cancel

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

// Verify ownership
if (listing.seller.toLowerCase() !== seller.address.toLowerCase()) {
  console.error("Error: You are not the seller of this listing");
  console.error(`Seller: ${listing.seller}`);
  process.exit(1);
}

console.log("Cancelling listing...");
const cancelTx = await marketplace.connect(seller).cancelListing(LISTING_ID);
const receipt = await cancelTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);

// Verify the event
const event = receipt?.logs.find((log: any) => {
  try {
    const parsed = marketplace.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    return parsed?.name === "ListingCancelled";
  } catch {
    return false;
  }
});

if (event) {
  console.log("\nListing Cancelled Successfully!");
  console.log("NFT has been returned to your wallet.");
}
