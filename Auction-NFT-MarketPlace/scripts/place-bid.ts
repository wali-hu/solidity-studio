import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to place bids on an active auction
 * 3 bidders place sequential bids:
 *   - Bidder 1 (signers[2]) bids 0.001 ETH
 *   - Bidder 2 (signers[3]) bids 0.002 ETH
 *   - Bidder 3 (signers[4]) bids 0.003 ETH
 * Usage: npx hardhat run scripts/place-bid.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting auction bidding...\n");

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
const auctionAddress = deploymentInfo.contracts.NFTAuction.address;

console.log("Auction Address:", auctionAddress);

const signers = await ethers.getSigners();

// Validate all 3 bidders are configured
const bidder1 = signers[2];
const bidder2 = signers[3];
const bidder3 = signers[4];

if (!bidder1) {
  console.error("Error: BIDDER1_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
if (!bidder2) {
  console.error("Error: BIDDER2_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
if (!bidder3) {
  console.error("Error: BIDDER3_PRIVATE_KEY not configured in .env");
  process.exit(1);
}

// Get contract instance
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

// Configuration
const AUCTION_ID = 0; // Change this to the auction ID you want to bid on

console.log(`Fetching auction ${AUCTION_ID}...`);

// Get auction details
const auction = await auctionContract.getAuction(AUCTION_ID);

if (!auction.active) {
  console.error("Error: Auction is not active");
  process.exit(1);
}

if (auction.ended) {
  console.error("Error: Auction has already ended");
  process.exit(1);
}

const endTime = Number(auction.endTime);
const now = Math.floor(Date.now() / 1000);

if (now >= endTime) {
  console.error("Error: Auction has expired");
  process.exit(1);
}

console.log("\n=== Auction Details ===");
console.log("Seller:", auction.seller);
console.log("NFT Contract:", auction.nftContract);
console.log("Token ID:", auction.tokenId.toString());
console.log("Min Price:", ethers.formatEther(auction.minPrice), "ETH");
console.log("Ends at:", new Date(endTime * 1000).toLocaleString());
console.log("Time remaining:", Math.floor((endTime - now) / 60), "minutes");
console.log("======================\n");

// Define the 3 bids
const bids = [
  { bidder: bidder1, amount: ethers.parseEther("0.001"), label: "Bidder 1" },
  { bidder: bidder2, amount: ethers.parseEther("0.002"), label: "Bidder 2" },
  { bidder: bidder3, amount: ethers.parseEther("0.003"), label: "Bidder 3" },
];

// Place bids sequentially
for (const { bidder, amount, label } of bids) {
  console.log(`\n--- ${label} ---`);
  console.log(`Address: ${bidder.address}`);

  const balance = await ethers.provider.getBalance(bidder.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`Bid Amount: ${ethers.formatEther(amount)} ETH`);

  if (balance < amount) {
    console.error(`Error: ${label} has insufficient balance. Skipping.`);
    continue;
  }

  // Check if auction is still active (might have expired mid-loop)
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime >= endTime) {
    console.error("Error: Auction has expired during bidding.");
    break;
  }

  try {
    console.log("Placing bid...");
    const bidTx = await auctionContract
      .connect(bidder)
      .placeBid(AUCTION_ID, { value: amount });
    const receipt = await bidTx.wait();
    console.log(`Transaction hash: ${receipt?.hash}`);
    console.log(`${label} bid of ${ethers.formatEther(amount)} ETH placed successfully!`);
  } catch (error: any) {
    console.error(`${label} bid failed: ${error.message}`);
  }
}

// Show final auction state
console.log("\n\n=== Final Auction State ===");
const finalAuction = await auctionContract.getAuction(AUCTION_ID);
console.log(
  "Highest Bid:",
  ethers.formatEther(finalAuction.highestBid),
  "ETH"
);
console.log("Highest Bidder:", finalAuction.highestBidder);

// Show pending returns for outbid bidders
console.log("\n--- Pending Returns (outbid bidders) ---");
for (const { bidder, label } of bids) {
  const pending = await auctionContract.pendingReturns(bidder.address);
  if (pending > 0n) {
    console.log(`${label} (${bidder.address}): ${ethers.formatEther(pending)} ETH`);
  }
}

console.log("\n=== All Bids Placed ===");
