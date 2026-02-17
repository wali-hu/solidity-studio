const hre = require("hardhat");
require("dotenv").config();

async function main() {
  try {
    console.log("Minting ERC721A NFTs...\n");

    // Get contract address and owner address from .env
    const contractAddress = process.env.CONTRACT_ADDRESS_ERC721A;
    const ownerAddress = process.env.OWNER_ADDRESS;

    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS_ERC721A not found in .env file");
    }
    if (!ownerAddress) {
      throw new Error("OWNER_ADDRESS not found in .env file");
    }

    console.log("Contract Address:", contractAddress);
    console.log("Minting to:", ownerAddress);
    console.log("Quantity: 5 NFTs\n");

    // Connect to the deployed contract
    const MyERC721A = await hre.ethers.getContractFactory("MyERC721A");
    const contract = MyERC721A.attach(contractAddress);

    // Get the current total supply to know which token IDs will be minted
    const totalSupplyBefore = await contract.totalSupply();
    console.log("Total supply before minting:", totalSupplyBefore.toString());

    // Call batchMint to mint 5 NFTs
    console.log("\n Minting 5 NFTs...");
    const tx = await contract.batchMint(ownerAddress, 5);
    
    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...\n");

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    // Get the new total supply
    const totalSupplyAfter = await contract.totalSupply();

    console.log(" Minting successful!");
    console.log("\n Transaction Details:");
    console.log("   Transaction Hash:", receipt.hash);
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());
    console.log("   Status:", receipt.status === 1 ? "Success" : "Failed");

    console.log("\n NFTs Minted:");
    console.log("   Total Supply Before:", totalSupplyBefore.toString());
    console.log("   Total Supply After:", totalSupplyAfter.toString());
    console.log("   Token IDs Minted:", `${totalSupplyBefore} to ${totalSupplyAfter - 1n}`);
    
    // Display individual token IDs
    const tokenIds = [];
    for (let i = totalSupplyBefore; i < totalSupplyAfter; i++) {
      tokenIds.push(i.toString());
    }
    console.log("   Token IDs:", tokenIds.join(", "));

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
