import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * Deploy EthToTokenUniswapV2Swapper to Sepolia and optionally verify on Etherscan.
 *
 * Expected environment variables:
 * - SEPOLIA_RPC_URL        : JSON-RPC URL (already used by hardhat.config.ts)
 * - SEPOLIA_PRIVATE_KEY    : Deployer private key (already used by hardhat.config.ts)
 * - ETHERSCAN_API_KEY      : Etherscan API key for verification (optional)
 *
 * Example:
 *   ETHERSCAN_API_KEY=xxx npx hardhat run scripts/deploy-swapper.ts --network sepolia
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

  // Optional: verify on Etherscan if API key is provided and we're on Sepolia.
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const etherscanKey = process.env.ETHERSCAN_API_KEY;

  if (chainId === 11155111n && etherscanKey) {
    console.log("Waiting for a few confirmations before verification...");
    const tx = swapper.deploymentTransaction();
    if (tx) {
      await ethers.provider.waitForTransaction(tx.hash, 5);
    }

    console.log("Verifying contract on Etherscan...");
    // Hardhat 3 uses the built-in verify task if @nomicfoundation/hardhat-verify is installed.
    await network.run("verify:verify", {
      address: deployedAddress,
      constructorArguments: [routerAddress, wethAddress],
    });
  } else {
    console.log(
      "Skipping Etherscan verification (non-Sepolia network or no ETHERSCAN_API_KEY).",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

