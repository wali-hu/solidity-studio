import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * Deploy EthToTokenUniswapV2Swapper to Sepolia and optionally verifies on Etherscan.
 * 
 * npx hardhat run scripts/deploy-swapper.ts --network sepolia
 */
async function main() {
  console.log("Deploying EthToTokenUniswapV2Swapper...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const routerAddress = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const wethAddress = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

  const Swapper = await ethers.getContractFactory(
    "EthToTokenUniswapV2Swapper",
  );
  const swapper = await Swapper.deploy(routerAddress, wethAddress);

  console.log("Deployment tx hash:", swapper.deploymentTransaction()?.hash);
  await swapper.waitForDeployment();

  const deployedAddress = await swapper.getAddress();
  console.log("EthToTokenUniswapV2Swapper deployed to:", deployedAddress);

  const chainId = (await ethers.provider.getNetwork()).chainId;

  if (chainId === 11155111n) {
    console.log(
      "To verify on Etherscan, run the following command separately:\n" +
        `npx hardhat verify --network sepolia ${deployedAddress} ${routerAddress} ${wethAddress}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

