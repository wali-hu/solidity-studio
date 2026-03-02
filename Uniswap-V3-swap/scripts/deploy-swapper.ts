import { network } from "hardhat";

const { ethers } = await network.connect();

/** Deploy EthToTokenUniswapV3Swapper to Sepolia. npx hardhat run scripts/deploy-swapper.ts --network sepolia */
async function main() {
  console.log("Deploying EthToTokenUniswapV3Swapper...");
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const routerAddress = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
  const wethAddress = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

  const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
  const swapper = await Swapper.deploy(routerAddress, wethAddress);
  console.log("Deployment tx hash:", swapper.deploymentTransaction()?.hash);
  await swapper.waitForDeployment();

  const deployedAddress = await swapper.getAddress();
  console.log("EthToTokenUniswapV3Swapper deployed to:", deployedAddress);

  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId === 11155111n) {
    console.log("Verify: npx hardhat verify --network sepolia", deployedAddress, routerAddress, wethAddress);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
