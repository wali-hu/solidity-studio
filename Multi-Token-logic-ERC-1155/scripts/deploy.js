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

  // Get deployment transaction
  const deploymentTx = gameInventory.deploymentTransaction();

  console.log("\nDeployment Transaction:");
  console.log("Transaction Hash:", deploymentTx.hash);
  console.log("From:", deploymentTx.from);
  console.log("Nonce:", deploymentTx.nonce);

  await gameInventory.waitForDeployment();
  const contractAddress = await gameInventory.getAddress();

  // Get transaction receipt for additional details
  const receipt = await deploymentTx.wait();

  console.log("Block Number:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

  // Add Etherscan URL for Sepolia
  if (hre.network.name === 'sepolia') {
    console.log("Etherscan URL:", `https://sepolia.etherscan.io/tx/${deploymentTx.hash}`);
  }

  console.log("\nGameInventory deployed to:", contractAddress);
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
    transaction: {
      hash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      from: deploymentTx.from,
      nonce: deploymentTx.nonce,
      explorerUrl: hre.network.name === 'sepolia'
        ? `https://sepolia.etherscan.io/tx/${deploymentTx.hash}`
        : null
    },
    tokenBalances: {
      gold: goldBalance.toString(),
      founderSword: swordBalance.toString(),
      healthPotion: potionBalance.toString()
    }
  };

  // Save to JSON file
  const outputPath = path.join(__dirname, '../deployment-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to: deployment-info.json");

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
