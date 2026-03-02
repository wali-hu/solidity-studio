const hre = require("hardhat");

async function main() {
  try {
    console.log("Deploying MyERC721A contract...\n");

    // Contract parameters
    const name = "Gaming Characters";
    const symbol = "GCHAR";
    const baseURI = "https://gateway.pinata.cloud/ipfs/";

    // Deploy contract
    const MyERC721A = await hre.ethers.getContractFactory("MyERC721A");
    const contract = await MyERC721A.deploy(name, symbol, baseURI);
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log(" MyERC721A deployed to:", contractAddress);
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Base URI:", baseURI);
    console.log("\n   Token URIs:");
    console.log("   Token 1 (Warrior): https://gateway.pinata.cloud/ipfs/QmTP4sggmVkWu92Uis8QdFuQTc8EukZMVu5qYiGnVLkKe4");
    console.log("   Token 2 (Mage): https://gateway.pinata.cloud/ipfs/QmWwHjkdEjh2sPuwny5RiVL6goqwDnogw4EhMtB2g9rCuH");
    console.log("   Token 3 (Archer): https://gateway.pinata.cloud/ipfs/QmQ2KpCqpTL2uEeXmzgdGrGUeCsWdQXMeiMynBaS7LRyJS");
    console.log("   Token 4 (Rogue): https://gateway.pinata.cloud/ipfs/QmVp8NvgKsMnNv36KLBAfm9Mvg6FdsdasR8ymqs3Xv7Qva");
    console.log("   Token 5 (Paladin): https://gateway.pinata.cloud/ipfs/QmQ48pWJSePocqhGQbpbTzH9uKS1v8qVzbhZoC6VYxbMm9");
    console.log("\nWaiting for block confirmations...");

    // Wait for 5 block confirmations before verifying
    await contract.deploymentTransaction().wait(5);

    console.log("\n Verifying contract on Etherscan...");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [name, symbol, baseURI],
    });

    console.log(" Contract verified on Etherscan!");
    console.log("\n Add to .env file:");
    console.log(`CONTRACT_ADDRESS_ERC721A=${contractAddress}`);

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
