const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying GameInventory contract...\n");

  // Configuration - Read IPFS CID if available
  let baseURI;
  const ipfsCidPath = path.join(__dirname, "../.ipfs-cid");

  if (fs.existsSync(ipfsCidPath)) {
    const ipfsCid = fs.readFileSync(ipfsCidPath, "utf8").trim();
    baseURI = `ipfs://${ipfsCid}/`;
    console.log("Using IPFS CID from .ipfs-cid file");
    console.log("IPFS CID:", ipfsCid);
  } else {
    baseURI = "https://api.example.com/metadata/";
    console.log("Warning: .ipfs-cid file not found, using fallback JSON server URI");
    console.log("To use IPFS, first run: node scripts/uploadToIPFS.js");
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  console.log("Deploying contract...");
  const GameInventory = await ethers.getContractFactory("GameInventory");
  const gameInventory = await GameInventory.deploy(baseURI);

  await gameInventory.waitForDeployment();
  const contractAddress = await gameInventory.getAddress();

  console.log("GameInventory deployed to:", contractAddress);
  console.log("Base URI:", baseURI);
  console.log("=".repeat(50));

  // Verify initial balances
  console.log("\nInitial Token Balances:");
  const goldBalance = await gameInventory.balanceOf(deployer.address, 0);
  const swordBalance = await gameInventory.balanceOf(deployer.address, 1);
  const potionBalance = await gameInventory.balanceOf(deployer.address, 2);

  console.log("GOLD (ID 0):", goldBalance.toString(), "units");
  console.log("FOUNDER_SWORD (ID 1):", swordBalance.toString(), "unit");
  console.log("HEALTH_POTION (ID 2):", potionBalance.toString(), "units");
  console.log("=".repeat(50));

  // Output metadata URLs
  console.log("\nMetadata URLs:");
  console.log("GOLD:", await gameInventory.uri(0));
  console.log("FOUNDER_SWORD:", await gameInventory.uri(1));
  console.log("HEALTH_POTION:", await gameInventory.uri(2));
  console.log("=".repeat(50));

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    baseURI: baseURI,
    timestamp: new Date().toISOString(),
    tokenBalances: {
      gold: goldBalance.toString(),
      founderSword: swordBalance.toString(),
      healthPotion: potionBalance.toString()
    }
  };

  console.log("\nDeployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment completed successfully!");
  console.log("\nTo interact with the contract, run:");
  console.log(`CONTRACT_ADDRESS=${contractAddress} npx hardhat run scripts/interact.js --network ${hre.network.name}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exit(1);
  });
