import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to withdraw pending bid returns (for outbid bidders)
 * Uses signers[2] (Buyer) by default
 * Usage: npx hardhat run scripts/withdraw-bid.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting bid withdrawal...\n");

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
const withdrawer = signers[2]; // Buyer/bidder account
if (!withdrawer) {
  console.error("Error: BUYER_PRIVATE_KEY not configured in .env");
  process.exit(1);
}
console.log("Withdrawing with account:", withdrawer.address);

const balanceBefore = await ethers.provider.getBalance(withdrawer.address);
console.log("Current balance:", ethers.formatEther(balanceBefore), "ETH");

// Get contract instance
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

// Check pending returns
const pendingAmount = await auctionContract.pendingReturns(withdrawer.address);
console.log(
  `\nPending returns: ${ethers.formatEther(pendingAmount)} ETH`
);

if (pendingAmount === 0n) {
  console.log("No funds to withdraw.");
  process.exit(0);
}

// Withdraw
console.log("Withdrawing funds...");
const withdrawTx = await auctionContract.connect(withdrawer).withdraw();
const receipt = await withdrawTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);

const balanceAfter = await ethers.provider.getBalance(withdrawer.address);
console.log("\nNew balance:", ethers.formatEther(balanceAfter), "ETH");
console.log(
  "Recovered:",
  ethers.formatEther(balanceAfter - balanceBefore),
  "ETH (minus gas)"
);

console.log("\n=== Bid Withdrawal Complete ===");
