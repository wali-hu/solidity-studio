import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

/**
 * Simple interaction script to call swapETHForToken on an already-deployed
 * EthToTokenUniswapV2Swapper on Sepolia.
 * 
 *   npx hardhat run scripts/interact-swapper.ts --network sepolia
 */
async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Caller:", caller.address);

  // TODO: replace with the deployed Swapper address from deploy-swapper.ts logs.
  const swapperAddress = process.env.SWAPPER_ADDRESS;
  if (!swapperAddress) {
    throw new Error("SWAPPER_ADDRESS env var must be set");
  }

  // Token to receive (ERC20 on Sepolia).
  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("TOKEN_ADDRESS env var must be set");
  }

  // How much ETH to swap (e.g. "0.01").
  const ethAmount = process.env.ETH_AMOUNT ?? "0.01";
  const value = ethers.parseEther(ethAmount);

  const minAmountOut =
    process.env.MIN_AMOUNT_OUT !== undefined
      ? BigInt(process.env.MIN_AMOUNT_OUT)
      : 0n;

  const swapper = await ethers.getContractAt(
    "EthToTokenUniswapV2Swapper",
    swapperAddress,
  );

  console.log(
    `Swapping ${ethAmount} ETH for token ${tokenAddress} via ${swapperAddress}...`,
  );

  const tx = await swapper.swapETHForToken(tokenAddress, minAmountOut, {
    value,
  });
  console.log("Swap tx hash:", tx.hash);

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Transaction was not mined");
  }

  console.log("Swap confirmed in block:", receipt.blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

