import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to withdraw pending bid returns for all outbid bidders
 * Checks and withdraws for Bidder 1 (signers[2]), Bidder 2 (signers[3]), Bidder 3 (signers[4])
 * Usage: npx hardhat run scripts/withdraw-bid.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting bid withdrawals for all bidders...\n");

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

// Get contract instance
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auctionContract = NFTAuction.attach(auctionAddress);

// All bidders
const bidders = [
  { signer: signers[2], label: "Bidder 1" },
  { signer: signers[3], label: "Bidder 2" },
  { signer: signers[4], label: "Bidder 3" },
];

for (const { signer, label } of bidders) {
  if (!signer) {
    console.log(`${label}: Private key not configured. Skipping.`);
    continue;
  }

  console.log(`\n--- ${label} ---`);
  console.log(`Address: ${signer.address}`);

  const pendingAmount = await auctionContract.pendingReturns(signer.address);
  console.log(`Pending returns: ${ethers.formatEther(pendingAmount)} ETH`);

  if (pendingAmount === 0n) {
    console.log("No funds to withdraw. Skipping.");
    continue;
  }

  const balanceBefore = await ethers.provider.getBalance(signer.address);

  console.log("Withdrawing funds...");
  try {
    const withdrawTx = await auctionContract.connect(signer).withdraw();
    const receipt = await withdrawTx.wait();
    console.log(`Transaction hash: ${receipt?.hash}`);

    const balanceAfter = await ethers.provider.getBalance(signer.address);
    console.log(
      `Recovered: ${ethers.formatEther(balanceAfter - balanceBefore)} ETH (minus gas)`
    );
    console.log(`New balance: ${ethers.formatEther(balanceAfter)} ETH`);
  } catch (error: any) {
    console.error(`Withdrawal failed: ${error.message}`);
  }
}

console.log("\n=== All Bid Withdrawals Complete ===");
