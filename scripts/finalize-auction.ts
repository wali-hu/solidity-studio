import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to finalize an expired auction
 * Anyone can call this once the auction time has passed
 * Uses signers[1] (Seller) by default
 * Usage: npx hardhat run scripts/finalize-auction.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting auction finalization...\n");

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
const caller = signers[1]; // Seller finalizes (anyone can call)
console.log("Finalizing with account (Seller):", caller.address);

// Get contract instance
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

// Configuration
const AUCTION_ID = 0; // Change this to the auction ID to finalize

console.log(`\nFetching auction ${AUCTION_ID}...`);

// Get auction details
const auction = await auctionContract.getAuction(AUCTION_ID);

if (!auction.active) {
  console.error("Error: Auction is not active");
  process.exit(1);
}

if (auction.ended) {
  console.error("Error: Auction already finalized");
  process.exit(1);
}

const endTime = Number(auction.endTime);
const now = Math.floor(Date.now() / 1000);

console.log("\n=== Auction Details ===");
console.log("Seller:", auction.seller);
console.log("Token ID:", auction.tokenId.toString());
console.log("Min Price:", ethers.formatEther(auction.minPrice), "ETH");
console.log(
  "Highest Bid:",
  ethers.formatEther(auction.highestBid),
  "ETH"
);
console.log(
  "Highest Bidder:",
  auction.highestBidder === ethers.ZeroAddress
    ? "None (no bids)"
    : auction.highestBidder
);
console.log("End Time:", new Date(endTime * 1000).toLocaleString());
console.log("======================\n");

if (now < endTime) {
  const remaining = endTime - now;
  console.error(
    `Error: Auction has not expired yet. ${Math.floor(remaining / 60)} minutes remaining.`
  );
  process.exit(1);
}

// Finalize the auction
console.log("Finalizing auction...");
const finalizeTx = await auctionContract
  .connect(caller)
  .finalizeAuction(AUCTION_ID);
const receipt = await finalizeTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);

// Get the event
const event = receipt?.logs.find((log: any) => {
  try {
    const parsed = auctionContract.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    return parsed?.name === "AuctionFinalized";
  } catch {
    return false;
  }
});

if (event) {
  const parsed = auctionContract.interface.parseLog({
    topics: event.topics as string[],
    data: event.data,
  });
  const winner = parsed?.args[1];
  const winningBid = parsed?.args[2];

  if (winner === ethers.ZeroAddress) {
    console.log("\nAuction finalized — no bids received.");
    console.log("NFT returned to seller.");
  } else {
    console.log("\nAuction Finalized Successfully!");
    console.log("Winner:", winner);
    console.log("Winning Bid:", ethers.formatEther(winningBid), "ETH");
  }
}

console.log("\n=== Auction Finalization Complete ===");
