const hre = require("hardhat");
require("dotenv").config();

async function main() {
  try {
    console.log("Transferring ERC721A NFTs...\n");

    // Get addresses from .env
    const contractAddress = process.env.CONTRACT_ADDRESS_ERC721A;
    const ownerAddress = process.env.OWNER_ADDRESS;
    const newWalletAddress = process.env.NEW_WALLET_ADDRESS;

    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS_ERC721A not found in .env file");
    }
    if (!ownerAddress) {
      throw new Error("OWNER_ADDRESS not found in .env file");
    }
    if (!newWalletAddress) {
      throw new Error("NEW_WALLET_ADDRESS not found in .env file");
    }

    console.log("Contract Address:", contractAddress);
    console.log("From:", ownerAddress);
    console.log("To:", newWalletAddress);

    // Token IDs to transfer
    const tokenIds = [0, 1, 2, 3, 4];
    console.log("Token IDs to transfer:", tokenIds.join(", "));

    // Connect to the deployed contract
    const MyERC721A = await hre.ethers.getContractFactory("MyERC721A");
    const contract = MyERC721A.attach(contractAddress);

    // Verify ownership before transfer
    console.log("\n Verifying ownership...");
    for (const tokenId of tokenIds) {
      const owner = await contract.ownerOf(tokenId);
      console.log(`   Token ${tokenId}: ${owner === ownerAddress ? "✓ Owned by sender" : "✗ NOT owned by sender"}`);
    }

    // Call batchTransfer to transfer all 5 NFTs in 1 transaction
    console.log("\n Transferring 5 NFTs in 1 transaction...");
    const tx = await contract.batchTransfer(ownerAddress, newWalletAddress, tokenIds);
    
    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...\n");

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    console.log(" Batch transfer successful!");
    console.log("\n Transaction Details:");
    console.log("   Transaction Hash:", receipt.hash);
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());
    console.log("   Status:", receipt.status === 1 ? "Success" : "Failed");

    // Verify new ownership after transfer
    console.log("\n Verifying new ownership...");
    for (const tokenId of tokenIds) {
      const owner = await contract.ownerOf(tokenId);
      console.log(`   Token ${tokenId}: ${owner === newWalletAddress ? "✓ Now owned by recipient" : "✗ Transfer failed"}`);
    }

    console.log("\n View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/tx/${receipt.hash}`);

  } catch (error) {
    console.error("\n Transfer failed:", error.message);
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
