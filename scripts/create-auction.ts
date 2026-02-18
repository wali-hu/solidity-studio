import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to create an auction for an NFT
 * Uses signers[1] (Seller) — pays listing fee and sets min price + duration
 * Usage: npx hardhat run scripts/create-auction.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting auction creation...\n");

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
const auctionAddress = deploymentInfo.contracts.NFTAuction.address;

console.log("NFT Collection Address:", nftAddress);
console.log("Auction Address:", auctionAddress);

const signers = await ethers.getSigners();
const seller = signers[1]; // Seller account
if (!seller) {
  console.error("Error: SELLER_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
console.log("Creating auction with account (Seller):", seller.address);

// Get contract instances
const NFTCollection = await ethers.getContractFactory("NFTCollection");
const nftCollection = NFTCollection.attach(nftAddress);

const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

// Get listing fee
const listingFee = await auctionContract.getListingPrice();
console.log(`\nListing Fee: ${ethers.formatEther(listingFee)} ETH`);

// Configuration
const TOKEN_ID = 0; // Change this to the token ID you want to auction
const MIN_PRICE = ethers.parseEther("0.001"); // Minimum starting price
const DURATION = 300; // Auction duration in seconds (5 minutes)

console.log(`Token ID: ${TOKEN_ID}`);
console.log(`Minimum Price: ${ethers.formatEther(MIN_PRICE)} ETH`);
console.log(`Duration: ${DURATION} seconds (${DURATION / 60} minutes)`);

// Check ownership
const owner = await nftCollection.ownerOf(TOKEN_ID);
if (owner.toLowerCase() !== seller.address.toLowerCase()) {
  console.error(`\nError: You don't own token ID ${TOKEN_ID}`);
  console.error(`Owner: ${owner}`);
  process.exit(1);
}

console.log("Ownership verified");

// Check if auction contract is approved
const isApproved = await nftCollection
  .connect(seller)
  .isApprovedForAll(seller.address, auctionAddress);
const approvedAddress = await nftCollection.getApproved(TOKEN_ID);

if (
  !isApproved &&
  approvedAddress.toLowerCase() !== auctionAddress.toLowerCase()
) {
  console.log("\nApproving auction contract to transfer NFT...");
  const approveTx = await nftCollection
    .connect(seller)
    .setApprovalForAll(auctionAddress, true);
  await approveTx.wait();
  console.log("Auction contract approved");
} else {
  console.log("Auction contract already approved");
}

// Create the auction
console.log("\nCreating auction...");
const createTx = await auctionContract
  .connect(seller)
  .createAuction(nftAddress, TOKEN_ID, MIN_PRICE, DURATION, {
    value: listingFee,
  });
const receipt = await createTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);

// Get the auction ID from the event
const event = receipt?.logs.find((log: any) => {
  try {
    const parsed = auctionContract.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    return parsed?.name === "AuctionCreated";
  } catch {
    return false;
  }
});

if (event) {
  const parsed = auctionContract.interface.parseLog({
    topics: event.topics as string[],
    data: event.data,
  });
  console.log(`\nAuction Created! Auction ID: ${parsed?.args[0]}`);
  console.log(`Min Price: ${ethers.formatEther(parsed?.args[4])} ETH`);
  console.log(`End Time: ${new Date(Number(parsed?.args[6]) * 1000).toLocaleString()}`);
}

console.log("\n=== Auction Created Successfully ===");
