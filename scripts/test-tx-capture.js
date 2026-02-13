const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Testing Transaction Hash Capture - Combined Test");
  console.log("=".repeat(60));

  // ========== DEPLOY ==========
  console.log("\n[1/2] DEPLOYING CONTRACT\n");

  // Get IPFS CID
  let baseURI;
  const ipfsCidPath = path.join(__dirname, "../.ipfs-cid");

  if (fs.existsSync(ipfsCidPath)) {
    const ipfsCid = fs.readFileSync(ipfsCidPath, "utf8").trim();
    baseURI = `ipfs://${ipfsCid}/`;
  } else {
    baseURI = "https://api.example.com/metadata/";
  }

  const [deployer, recipient] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Recipient:", recipient.address);
  console.log("Base URI:", baseURI);

  // Deploy
  const GameInventory = await ethers.getContractFactory("GameInventory");
  const gameInventory = await GameInventory.deploy(baseURI);

  const deploymentTx = gameInventory.deploymentTransaction();
  console.log("\nDeployment Transaction Hash:", deploymentTx.hash);

  await gameInventory.waitForDeployment();
  const contractAddress = await gameInventory.getAddress();

  const deployReceipt = await deploymentTx.wait();
  console.log("Block Number:", deployReceipt.blockNumber);
  console.log("Gas Used:", deployReceipt.gasUsed.toString());
  console.log("Contract Address:", contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    transaction: {
      hash: deploymentTx.hash,
      blockNumber: deployReceipt.blockNumber,
      gasUsed: deployReceipt.gasUsed.toString()
    }
  };

  fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to: deployment-info.json");

  // ========== INTERACT ==========
  console.log("\n" + "=".repeat(60));
  console.log("[2/2] INTERACTING WITH CONTRACT\n");

  // Batch transfer
  const ids = [0, 1, 2];
  const amounts = [1000, 1, 10];

  console.log("Transferring tokens:", ids);
  console.log("Amounts:", amounts);
  console.log("From:", deployer.address);
  console.log("To:", recipient.address);

  const tx = await gameInventory.safeBatchTransferFrom(
    deployer.address,
    recipient.address,
    ids,
    amounts,
    "0x"
  );

  console.log("\nBatch Transfer Transaction Hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Block Number:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());

  // Check balances
  console.log("\nFinal Balances:");
  console.log("Recipient GOLD:", (await gameInventory.balanceOf(recipient.address, 0)).toString());
  console.log("Recipient SWORD:", (await gameInventory.balanceOf(recipient.address, 1)).toString());
  console.log("Recipient POTION:", (await gameInventory.balanceOf(recipient.address, 2)).toString());

  // Save interaction info
  const interactionInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    batchTransfer: {
      transaction: {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      },
      tokens: { ids, amounts },
      from: deployer.address,
      to: recipient.address
    }
  };

  fs.writeFileSync('interaction-info.json', JSON.stringify(interactionInfo, null, 2));
  console.log("\nInteraction info saved to: interaction-info.json");

  console.log("\n" + "=".repeat(60));
  console.log("TEST COMPLETED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log("\nGenerated files:");
  console.log("- deployment-info.json");
  console.log("- interaction-info.json");
  console.log("\nAll transaction hashes captured!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nTest failed:");
    console.error(error);
    process.exit(1);
  });
