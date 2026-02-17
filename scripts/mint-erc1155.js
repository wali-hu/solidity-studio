const hre = require("hardhat");
require("dotenv").config();

async function main() {
  try {
    console.log("Minting ERC1155 Gaming Items...\n");

    // Get contract address and owner address from .env
    const contractAddress = process.env.CONTRACT_ADDRESS_ERC1155;
    const ownerAddress = process.env.OWNER_ADDRESS;

    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS_ERC1155 not found in .env file");
    }
    if (!ownerAddress) {
      throw new Error("OWNER_ADDRESS not found in .env file");
    }

    console.log("Contract Address:", contractAddress);
    console.log("Minting to:", ownerAddress);

    // Define token IDs and amounts
    const tokenIds = [1, 2, 3, 4, 5];
    const amounts = [100, 500, 1, 1, 1];
    const tokenNames = ["SWORD", "GOLD_COIN", "DRAGON_ARMOR", "MAGIC_STAFF", "LEGENDARY_CROWN"];

    console.log("\n Items to Mint:");
    for (let i = 0; i < tokenIds.length; i++) {
      console.log(`   Token ID ${tokenIds[i]}: ${tokenNames[i]} (Quantity: ${amounts[i]})`);
    }

    // Connect to the deployed contract
    const MyERC1155 = await hre.ethers.getContractFactory("MyERC1155");
    const contract = MyERC1155.attach(contractAddress);

    // Call mintBatch to mint all 5 token types in 1 transaction
    console.log("\n Minting batch...");
    const tx = await contract.mintBatch(
      ownerAddress,
      tokenIds,
      amounts,
      "0x" // empty data
    );
    
    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...\n");

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    console.log(" Batch minting successful!");
    console.log("\n Transaction Details:");
    console.log("   Transaction Hash:", receipt.hash);
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());
    console.log("   Status:", receipt.status === 1 ? "Success" : "Failed");

    console.log("\n Items Minted:");
    for (let i = 0; i < tokenIds.length; i++) {
      const balance = await contract.balanceOf(ownerAddress, tokenIds[i]);
      console.log(`   Token ID ${tokenIds[i]} (${tokenNames[i]}): ${balance.toString()} units`);
    }

    console.log("\n View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/tx/${receipt.hash}`);

  } catch (error) {
    console.error("\n Minting failed:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
