import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to withdraw accumulated marketplace fees (owner only)
 * Uses signers[0] (Owner)
 * Usage: npx hardhat run scripts/withdraw.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting fee withdrawal...\n");

// Load deployment info
const deploymentsPath = path.join(__dirname, "..", "deployments", "latest.json");

if (!fs.existsSync(deploymentsPath)) {
  console.error("Deployment file not found. Please deploy contracts first.");
  process.exit(1);
}

const deploymentInfo = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
const marketplaceAddress = deploymentInfo.contracts.NFTMarketplace.address;

console.log("Marketplace Address:", marketplaceAddress);

const [owner] = await ethers.getSigners();
console.log("Withdrawing with account (Owner):", owner.address);

// Get contract instance
const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
const marketplace = NFTMarketplace.attach(marketplaceAddress);

// Check accumulated fees
const accumulatedFees = await marketplace.accumulatedFees();
console.log("\nAccumulated Fees:", ethers.formatEther(accumulatedFees), "ETH");

if (accumulatedFees === 0n) {
  console.log("\nNo fees to withdraw.");
  process.exit(0);
}

// Get current balance
const balanceBefore = await ethers.provider.getBalance(owner.address);
console.log("Current balance:", ethers.formatEther(balanceBefore), "ETH");

// Withdraw fees
console.log("\nWithdrawing fees...");
const withdrawTx = await marketplace.withdrawFees();
const receipt = await withdrawTx.wait();

console.log(`Transaction hash: ${receipt?.hash}`);

// Verify the event
const event = receipt?.logs.find((log: any) => {
  try {
    const parsed = marketplace.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    return parsed?.name === "FeesWithdrawn";
  } catch {
    return false;
  }
});

if (event) {
  const parsed = marketplace.interface.parseLog({
    topics: event.topics as string[],
    data: event.data,
  });
  console.log(`\nWithdrawal Successful!`);
  console.log(`Amount withdrawn: ${ethers.formatEther(parsed?.args[1])} ETH`);
}

// Display new balance
const balanceAfter = await ethers.provider.getBalance(owner.address);
console.log("\nNew balance:", ethers.formatEther(balanceAfter), "ETH");

// Verify fees are now zero
const remainingFees = await marketplace.accumulatedFees();
console.log("Remaining fees in contract:", ethers.formatEther(remainingFees), "ETH");
