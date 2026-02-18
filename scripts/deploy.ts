import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Script to deploy NFTCollection, NFTMarketplace, and NFTAuction contracts
 * Uses signers[0] (Owner) to deploy
 * Usage: npx hardhat run scripts/deploy.ts --network sepolia
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { ethers } = await network.connect();

console.log("Starting deployment...\n");

const [deployer] = await ethers.getSigners();
console.log("Deploying contracts with account:", deployer.address);

const balance = await ethers.provider.getBalance(deployer.address);
console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

// NFT Collection parameters
const NFT_NAME = "Awesome NFT Collection";
const NFT_SYMBOL = "ANFT";

// Listing fee for the marketplace (0.0001 ETH — kept cheap)
const LISTING_PRICE = ethers.parseEther("0.0001");

// Deploy NFT Collection
console.log("Deploying NFTCollection...");
const NFTCollection = await ethers.getContractFactory("NFTCollection");
const nftCollection = await NFTCollection.deploy(NFT_NAME, NFT_SYMBOL);
await nftCollection.waitForDeployment();
const nftAddress = await nftCollection.getAddress();
console.log("NFTCollection deployed to:", nftAddress);

// Deploy Marketplace with listing price
console.log("\nDeploying NFTMarketplace...");
console.log("Listing Price:", ethers.formatEther(LISTING_PRICE), "ETH");
const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
const marketplace = await NFTMarketplace.deploy(LISTING_PRICE);
await marketplace.waitForDeployment();
const marketplaceAddress = await marketplace.getAddress();
console.log("NFTMarketplace deployed to:", marketplaceAddress);

// Deploy Auction with same listing price
console.log("\nDeploying NFTAuction...");
console.log("Auction Listing Price:", ethers.formatEther(LISTING_PRICE), "ETH");
const NFTAuction = await ethers.getContractFactory("NFTAuction");
const auction = await NFTAuction.deploy(LISTING_PRICE);
await auction.waitForDeployment();
const auctionAddress = await auction.getAddress();
console.log("NFTAuction deployed to:", auctionAddress);

// Save deployment addresses
const deploymentInfo = {
  network: (await ethers.provider.getNetwork()).name,
  chainId: (await ethers.provider.getNetwork()).chainId.toString(),
  deployer: deployer.address,
  listingPrice: LISTING_PRICE.toString(),
  contracts: {
    NFTCollection: {
      address: nftAddress,
      name: NFT_NAME,
      symbol: NFT_SYMBOL,
    },
    NFTMarketplace: {
      address: marketplaceAddress,
    },
    NFTAuction: {
      address: auctionAddress,
    },
  },
  timestamp: new Date().toISOString(),
};

const deploymentsDir = path.join(__dirname, "..", "deployments");
if (!fs.existsSync(deploymentsDir)) {
  fs.mkdirSync(deploymentsDir);
}

const filename = `deployment-${Date.now()}.json`;
const filepath = path.join(deploymentsDir, filename);
fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
console.log("\nDeployment info saved to:", filepath);

const latestPath = path.join(deploymentsDir, "latest.json");
fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
console.log("Latest deployment info saved to:", latestPath);

console.log("\n=== Deployment Summary ===");
console.log("NFT Collection:", nftAddress);
console.log("NFT Marketplace:", marketplaceAddress);
console.log("NFT Auction:", auctionAddress);
console.log("Listing Price:", ethers.formatEther(LISTING_PRICE), "ETH");
console.log("Platform Fee: 2.5%");
console.log("==========================\n");

console.log("IMPORTANT: Please verify your contracts on Etherscan:");
console.log(
  `npx hardhat verify --network sepolia ${nftAddress} "${NFT_NAME}" "${NFT_SYMBOL}"`
);
console.log(
  `npx hardhat verify --network sepolia ${marketplaceAddress} "${LISTING_PRICE.toString()}"`
);
console.log(
  `npx hardhat verify --network sepolia ${auctionAddress} "${LISTING_PRICE.toString()}"`
);
