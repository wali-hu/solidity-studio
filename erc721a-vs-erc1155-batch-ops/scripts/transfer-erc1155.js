const hre = require("hardhat");
require("dotenv").config();

async function main() {
  try {
    console.log("Transferring ERC1155 Gaming Items...\n");

    // Get addresses from .env
    const contractAddress = process.env.CONTRACT_ADDRESS_ERC1155;
    const ownerAddress = process.env.OWNER_ADDRESS;
    const newWalletAddress = process.env.NEW_WALLET_ADDRESS;

    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS_ERC1155 not found in .env file");
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

    // Token IDs and amounts to transfer
    const tokenIds = [1, 2, 3, 4, 5];
    const amounts = [100, 500, 1, 1, 1];
    const tokenNames = ["SWORD", "GOLD_COIN", "DRAGON_ARMOR", "MAGIC_STAFF", "LEGENDARY_CROWN"];

    console.log("\n Items to Transfer:");
    for (let i = 0; i < tokenIds.length; i++) {
      console.log(`   Token ID ${tokenIds[i]}: ${tokenNames[i]} (Quantity: ${amounts[i]})`);
    }

    // Connect to the deployed contract
    const MyERC1155 = await hre.ethers.getContractFactory("MyERC1155");
    const contract = MyERC1155.attach(contractAddress);

    // Verify balances before transfer
    console.log("\n Verifying balances before transfer...");
    for (let i = 0; i < tokenIds.length; i++) {
      const balance = await contract.balanceOf(ownerAddress, tokenIds[i]);
      console.log(`   ${tokenNames[i]}: ${balance.toString()} units`);
    }

    // Call batchTransfer to transfer all tokens in 1 transaction
    console.log("\n Transferring all tokens in 1 transaction...");
    const tx = await contract.batchTransfer(
      ownerAddress,
      newWalletAddress,
      tokenIds,
      amounts
    );
    
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

    // Verify new balances after transfer
    console.log("\n Verifying recipient balances after transfer...");
    for (let i = 0; i < tokenIds.length; i++) {
      const balance = await contract.balanceOf(newWalletAddress, tokenIds[i]);
      console.log(`   ${tokenNames[i]}: ${balance.toString()} units`);
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
