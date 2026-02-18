import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to place a bid on an active auction
 * Uses signers[2] (Buyer)
 * Usage: npx hardhat run scripts/place-bid.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting bid placement...\n");

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
const bidder = signers[2]; // Buyer account
if (!bidder) {
  console.error("Error: BUYER_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
console.log("Bidding with account (Buyer):", bidder.address);

const balance = await ethers.provider.getBalance(bidder.address);
console.log("Account balance:", ethers.formatEther(balance), "ETH");

// Get contract instance
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

// Configuration
const AUCTION_ID = 0; // Change this to the auction ID you want to bid on
const BID_AMOUNT = ethers.parseEther("0.002"); // Your bid amount

console.log(`\nFetching auction ${AUCTION_ID}...`);

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
console.log(
  "Current Highest Bid:",
  ethers.formatEther(auction.highestBid),
  "ETH"
);
console.log(
  "Highest Bidder:",
  auction.highestBidder === ethers.ZeroAddress
    ? "None"
    : auction.highestBidder
);
console.log("Ends at:", new Date(endTime * 1000).toLocaleString());
console.log("Time remaining:", Math.floor((endTime - now) / 60), "minutes");
console.log("======================\n");

console.log(`Your Bid: ${ethers.formatEther(BID_AMOUNT)} ETH`);

// Check if bid is sufficient
if (BID_AMOUNT < auction.minPrice) {
  console.error(
    `Error: Bid must be >= minimum price (${ethers.formatEther(auction.minPrice)} ETH)`
  );
  process.exit(1);
}

if (BID_AMOUNT <= auction.highestBid) {
  console.error(
    `Error: Bid must be > current highest bid (${ethers.formatEther(auction.highestBid)} ETH)`
  );
  process.exit(1);
}

if (balance < BID_AMOUNT) {
  console.error("Error: Insufficient balance");
  process.exit(1);
}

// Place the bid
console.log("Placing bid...");
const bidTx = await auctionContract
  .connect(bidder)
  .placeBid(AUCTION_ID, { value: BID_AMOUNT });
const receipt = await bidTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);

// Get the event
const event = receipt?.logs.find((log: any) => {
  try {
    const parsed = auctionContract.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    return parsed?.name === "BidPlaced";
  } catch {
    return false;
  }
});

if (event) {
  const parsed = auctionContract.interface.parseLog({
    topics: event.topics as string[],
    data: event.data,
  });
  console.log(`\nBid Placed Successfully!`);
  console.log(`Bid Amount: ${ethers.formatEther(parsed?.args[2])} ETH`);
}

const newBalance = await ethers.provider.getBalance(bidder.address);
console.log("\nNew account balance:", ethers.formatEther(newBalance), "ETH");
