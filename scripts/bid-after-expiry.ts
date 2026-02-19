import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to test what happens when Bidder 4 (signers[5]) tries to bid
 * AFTER the auction has already expired (past its 5-minute duration).
 *
 * Expected result: The transaction reverts with "Auction has expired"
 *
 * Usage: npx hardhat run scripts/bid-after-expiry.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("=== Bid After Expiry Test ===\n");
console.log(
  "This script tests what happens when a bidder tries to bid after the auction has expired.\n"
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

if (!auction.active) {
  console.log("\nAuction is NOT active (already finalized or cancelled).");
  console.log(
    "The bid would revert with: \"Auction is not active\"\n"
  );
  console.log("=== Test Complete ===");
  process.exit(0);
}

const endTime = Number(auction.endTime);
const now = Math.floor(Date.now() / 1000);

console.log("\n=== Auction Details ===");
console.log("Seller:", auction.seller);
console.log("Token ID:", auction.tokenId.toString());
console.log("Min Price:", ethers.formatEther(auction.minPrice), "ETH");
console.log(
  "Highest Bid:",
  auction.highestBidder !== ethers.ZeroAddress
    ? ethers.formatEther(auction.highestBid) + " ETH"
    : "None"
);
console.log("Highest Bidder:", auction.highestBidder);
console.log("End Time:", new Date(endTime * 1000).toLocaleString());

if (now < endTime) {
  const remaining = endTime - now;
  console.log(
    `\nAuction is still ACTIVE — ${Math.floor(remaining / 60)}m ${remaining % 60}s remaining`
  );
  console.log(
    "Wait for the auction to expire before running this script."
  );
  console.log("======================\n");
  process.exit(0);
}

const expiredAgo = now - endTime;
console.log(
  `\nAuction EXPIRED ${Math.floor(expiredAgo / 60)}m ${expiredAgo % 60}s ago`
);
console.log("======================\n");

// Attempt to bid after expiry
console.log(`Bidder 4 attempting to bid ${ethers.formatEther(BID_AMOUNT)} ETH on expired auction...`);
console.log("Expected result: Transaction REVERTS with \"Auction has expired\"\n");

try {
  const tx = await auctionContract
    .connect(bidder4)
    .placeBid(AUCTION_ID, { value: BID_AMOUNT });
  const receipt = await tx.wait();
  // This should NOT happen
  console.log("UNEXPECTED: Bid succeeded! Transaction hash:", receipt?.hash);
} catch (error: any) {
  // Extract the revert reason
  const reason =
    error.reason ||
    error.message?.match(/reverted with reason string '(.+?)'/)?.[1] ||
    error.message;

  console.log("Transaction REVERTED as expected!");
  console.log("Revert reason:", reason);
  console.log("\nBidder 4's balance is unchanged — no ETH was spent (except gas for the failed tx).");

  const balanceAfter = await ethers.provider.getBalance(bidder4.address);
  console.log("Bidder 4 Balance After:", ethers.formatEther(balanceAfter), "ETH");
}

console.log("\n=== Bid After Expiry Test Complete ===");
