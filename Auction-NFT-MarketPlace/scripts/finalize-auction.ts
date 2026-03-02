import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to finalize an auction — does EVERYTHING in one shot:
 *   - If bids exist & time expired: NFT to winner, funds to seller, commission to owner, refunds to outbid bidders
 *   - If no bids: cancels and returns NFT to seller
 * Uses signers[1] (Seller) — only seller can finalize
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
const nftAddress = deploymentInfo.contracts.NFTCollection.address;

console.log("Auction Address:", auctionAddress);
console.log("NFT Collection Address:", nftAddress);

const signers = await ethers.getSigners();
const seller = signers[1]; // Only seller can finalize
console.log("Finalizing with account (Seller):", seller.address);

// Get contract instances
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

const NFTCollection = await ethers.getContractFactory("NFTCollection");
const nftCollection = NFTCollection.attach(nftAddress);

// Configuration
const AUCTION_ID = 0; // Change this to the auction ID to finalize

console.log(`\nFetching auction ${AUCTION_ID}...`);

// Get auction details
const auction = await auctionContract.getAuction(AUCTION_ID);

if (!auction.active) {
  console.error("Error: Auction is not active (already finalized or cancelled)");
  process.exit(1);
}

if (auction.ended) {
  console.error("Error: Auction already finalized");
  process.exit(1);
}

const endTime = Number(auction.endTime);
const now = Math.floor(Date.now() / 1000);
const hasBids = auction.highestBidder !== ethers.ZeroAddress;

console.log("\n=== Auction Details ===");
console.log("Seller:", auction.seller);
console.log("Token ID:", auction.tokenId.toString());
console.log("Min Price:", ethers.formatEther(auction.minPrice), "ETH");
console.log(
  "Highest Bid:",
  hasBids ? ethers.formatEther(auction.highestBid) + " ETH" : "None"
);
console.log(
  "Highest Bidder:",
  hasBids ? auction.highestBidder : "None (no bids)"
);
console.log("End Time:", new Date(endTime * 1000).toLocaleString());

if (hasBids) {
  if (now < endTime) {
    const remaining = endTime - now;
    console.log(
      `\nTime remaining: ${Math.floor(remaining / 60)}m ${remaining % 60}s`
    );
    console.error(
      "Error: Auction has not expired yet. Wait for the timer to end."
    );
    process.exit(1);
  }
  console.log("Status: EXPIRED — ready to finalize");
} else {
  console.log("Status: NO BIDS — will cancel and return NFT to seller");
}
console.log("======================\n");

// Show bidders before finalization
if (hasBids) {
  const bidders = await auctionContract.getAuctionBidders(AUCTION_ID);
  console.log(`Total bidders: ${bidders.length}`);
  for (let i = 0; i < bidders.length; i++) {
    const pending = await auctionContract.pendingReturns(bidders[i]);
    const isWinner =
      bidders[i].toLowerCase() === auction.highestBidder.toLowerCase();
    console.log(
      `  Bidder ${i + 1}: ${bidders[i]} ${
        isWinner
          ? "(WINNER)"
          : `— pending refund: ${ethers.formatEther(pending)} ETH`
      }`
    );
  }
  console.log();
}

// Get balances before
const sellerBalBefore = await ethers.provider.getBalance(seller.address);
const ownerBalBefore = await ethers.provider.getBalance(signers[0].address);

// Finalize the auction — ONE transaction does everything
console.log("Finalizing auction (one-shot)...");
const finalizeTx = await auctionContract
  .connect(seller)
  .finalizeAuction(AUCTION_ID);
const receipt = await finalizeTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);
console.log(`Gas used: ${receipt?.gasUsed.toString()}`);

// Parse events from the receipt
const events = receipt?.logs
  .map((log: any) => {
    try {
      return auctionContract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
    } catch {
      return null;
    }
  })
  .filter(Boolean);

// Check what happened
const finalizedEvent = events?.find(
  (e: any) => e?.name === "AuctionFinalized"
);
const cancelledEvent = events?.find(
  (e: any) => e?.name === "AuctionCancelled"
);
const refundEvents = events?.filter((e: any) => e?.name === "BidRefunded");

if (cancelledEvent) {
  console.log("\n=== Auction Cancelled ===");
  console.log("No bids were placed. NFT returned to seller.");

  // Verify NFT ownership
  const nftOwner = await nftCollection.ownerOf(auction.tokenId);
  console.log("NFT owner:", nftOwner);
} else if (finalizedEvent) {
  const winner = finalizedEvent.args[1];
  const winningBid = finalizedEvent.args[2];
  const commission =
    (BigInt(winningBid) * 250n) / 10000n;
  const sellerProceeds = BigInt(winningBid) - commission;

  console.log("\n=== Auction Finalized Successfully ===");
  console.log("Winner:", winner);
  console.log("Winning Bid:", ethers.formatEther(winningBid), "ETH");
  console.log("Commission (2.5%):", ethers.formatEther(commission), "ETH");
  console.log(
    "Seller received:",
    ethers.formatEther(sellerProceeds),
    "ETH"
  );

  // Verify NFT ownership
  const nftOwner = await nftCollection.ownerOf(auction.tokenId);
  console.log("NFT transferred to:", nftOwner);

  // Show refunds
  if (refundEvents && refundEvents.length > 0) {
    console.log(`\n--- Auto-Refunds (${refundEvents.length} bidders) ---`);
    for (const refund of refundEvents) {
      console.log(
        `  ${refund?.args[0]}: ${ethers.formatEther(refund?.args[1])} ETH refunded`
      );
    }
  }

  // Show owner earnings
  const ownerBalAfter = await ethers.provider.getBalance(signers[0].address);
  console.log(
    "\nOwner commission received:",
    ethers.formatEther(ownerBalAfter - ownerBalBefore),
    "ETH"
  );
}

console.log("\n=== Finalization Complete — Everything Done In One Shot ===");
