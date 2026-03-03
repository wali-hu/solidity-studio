import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to test what happens when Bidder 4 (signers[5]) tries to bid
 * AFTER the auction has already expired or been finalized.
 *
 * This sends a REAL on-chain transaction with a manual gasLimit to bypass
 * ethers.js pre-flight gas estimation. The transaction will be mined but
 * REVERT on-chain — visible as a failed transaction on Sepolia Etherscan.
 *
 * Expected on-chain revert reason:
 *   - "Auction has expired" (if auction expired but not yet finalized)
 *   - "Auction is not active" (if auction already finalized)
 *
 * Usage: npx hardhat run scripts/bid-after-expiry.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("=== Bid After Expiry Test (On-Chain Revert) ===\n");
console.log(
  "This script sends a REAL transaction that will REVERT on-chain.\n" +
  "The failed transaction will be visible on Sepolia Etherscan.\n"
);

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
const bidder4 = signers[5];

if (!bidder4) {
  console.error("Error: BIDDER4_PRIVATE_KEY not configured in .env");
  process.exit(1);
}

console.log("Bidder 4 Address:", bidder4.address);

const balance = await ethers.provider.getBalance(bidder4.address);
console.log("Bidder 4 Balance:", ethers.formatEther(balance), "ETH");

// Get contract instance
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

// Configuration
const AUCTION_ID = 0; // Change this to the auction ID you want to test
const BID_AMOUNT = ethers.parseEther("0.004"); // Higher than Bidder 3's 0.003 ETH

console.log(`\nFetching auction ${AUCTION_ID}...`);

// Get auction details
const auction = await auctionContract.getAuction(AUCTION_ID);

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
console.log("Highest Bidder:", hasBids ? auction.highestBidder : "None (no bids)");
console.log("Active:", auction.active);
console.log("Ended:", auction.ended);

if (!auction.active) {
  console.log("\nAuction is NOT active (already finalized or cancelled).");
  console.log("Expected on-chain revert: \"Auction is not active\"");
} else if (now >= endTime) {
  const expiredAgo = now - endTime;
  console.log(
    `\nAuction EXPIRED ${Math.floor(expiredAgo / 60)}m ${expiredAgo % 60}s ago`
  );
  console.log("Expected on-chain revert: \"Auction has expired\"");
} else {
  const remaining = endTime - now;
  console.log(
    `\nAuction is still ACTIVE — ${Math.floor(remaining / 60)}m ${remaining % 60}s remaining`
  );
  console.log("WARNING: Auction has not expired yet. The bid might succeed!");
  console.log("Wait for the auction to expire before running this script.");
  console.log("======================\n");
  process.exit(0);
}
console.log("======================\n");

// Send the transaction with a manual gasLimit to force it on-chain.
// Normally ethers.js would catch the revert during gas estimation (pre-flight)
// and throw before broadcasting. By setting gasLimit manually, we skip
// the estimation and the tx gets mined — but reverts on-chain.
console.log(`Bidder 4 sending ${ethers.formatEther(BID_AMOUNT)} ETH bid...`);
console.log("Using manual gasLimit to force on-chain execution...");
console.log("Expected: Transaction REVERTS on-chain\n");

try {
  const tx = await auctionContract
    .connect(bidder4)
    .placeBid(AUCTION_ID, { value: BID_AMOUNT, gasLimit: 200000 });

  console.log("Transaction sent! Hash:", tx.hash);
  console.log("Waiting for confirmation...\n");

  const receipt = await tx.wait();

  // Check receipt status (0 = reverted, 1 = success)
  if (receipt?.status === 0) {
    console.log("Transaction REVERTED on-chain as expected!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("\nView on Etherscan: https://sepolia.etherscan.io/tx/" + receipt.hash);
  } else {
    console.log("UNEXPECTED: Transaction succeeded! Hash:", receipt?.hash);
  }
} catch (error: any) {
  // Some providers/versions may still throw on reverted tx
  // Try to extract the tx hash from the error
  const txHash = error.receipt?.hash || error.transactionHash || error.hash;

  if (txHash) {
    console.log("Transaction REVERTED on-chain as expected!");
    console.log("Transaction hash:", txHash);
    console.log("\nView on Etherscan: https://sepolia.etherscan.io/tx/" + txHash);
  } else {
    console.log("Transaction reverted.");
    console.log("Error:", error.reason || error.shortMessage || error.message);
  }
}

const balanceAfter = await ethers.provider.getBalance(bidder4.address);
console.log("\nBidder 4 Balance After:", ethers.formatEther(balanceAfter), "ETH");
console.log("(Only gas was spent — bid ETH was NOT deducted)");

console.log("\n=== Bid After Expiry Test Complete ===");
