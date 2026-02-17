const hre = require("hardhat");

async function main() {
  try {
    console.log("Deploying MyERC1155 contract...\n");

    // Contract parameters - using base IPFS gateway, individual token URIs already uploaded
    const uri = "https://gateway.pinata.cloud/ipfs/";

    // Deploy contract
    const MyERC1155 = await hre.ethers.getContractFactory("MyERC1155");
    const contract = await MyERC1155.deploy(uri);
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log(" MyERC1155 deployed to:", contractAddress);
    console.log("   Base URI:", uri);
    console.log("\n   Token URIs:");
    console.log("   Token 1 (SWORD): https://gateway.pinata.cloud/ipfs/QmY4sFjHNh94wHxhn7m2NwnGs7n7dnBfkNbu6GmgLhR6wa");
    console.log("   Token 2 (GOLD_COIN): https://gateway.pinata.cloud/ipfs/QmX8jU1D1a2aZKwThjqbaP648qvjetMGPrXSzQFXkqKg6Q");
    console.log("   Token 3 (DRAGON_ARMOR): https://gateway.pinata.cloud/ipfs/QmejYgxfxcbqPmohsL4KBAgwr9r5mpQKKxDRaptppEtJHP");
    console.log("   Token 4 (MAGIC_STAFF): https://gateway.pinata.cloud/ipfs/QmWxtKWpSkXycuNPdnSmKaqNGzf37Spfm4W1N6u7Gjj5fD");
    console.log("   Token 5 (LEGENDARY_CROWN): https://gateway.pinata.cloud/ipfs/QmZck9JAM2rb8Q1FdeAXHpXbc2t9Ha5wqPLBstazG7sNoT");
    console.log("\nWaiting for block confirmations...");

    // Wait for 5 block confirmations before verifying
    await contract.deploymentTransaction().wait(5);

    console.log("\n Verifying contract on Etherscan...");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [uri],
    });

    console.log(" Contract verified on Etherscan!");
    console.log("\n Add to .env file:");
    console.log(`CONTRACT_ADDRESS_ERC1155=${contractAddress}`);

  } catch (error) {
    console.error(" Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
