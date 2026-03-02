const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const UniqueCollectible = await ethers.getContractFactory("UniqueCollectible");
  const baseURI = "https://example.com/metadata/"; // folder of JSON files
  const nft = await UniqueCollectible.deploy("UniqueCollectible", "UNC", baseURI);

  await nft.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("UniqueCollectible deployed to:", await nft.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});