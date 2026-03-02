import { network } from "hardhat";

const { ethers } = await network.connect({ network: "sepolia", chainType: "l1" });

/**
 * Buy tokens: call swapETHForToken on deployed V3 swapper.
 * npx hardhat run scripts/interact-swapper.ts --network sepolia
 */
async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Caller:", caller.address);

  const swapperAddress = process.env.SWAPPER_ADDRESS;
  if (!swapperAddress) throw new Error("SWAPPER_ADDRESS env var must be set");

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) throw new Error("TOKEN_ADDRESS env var must be set");

  const ethAmount = process.env.ETH_AMOUNT ?? "0.01";
  const value = ethers.parseEther(ethAmount);
  const minAmountOut =
    process.env.MIN_AMOUNT_OUT !== undefined ? BigInt(process.env.MIN_AMOUNT_OUT) : 0n;

  const swapper = await ethers.getContractAt(
    "EthToTokenUniswapV3Swapper",
    swapperAddress,
  );

  console.log(`Swapping ${ethAmount} ETH for token ${tokenAddress}...`);
  const tx = await swapper.swapETHForToken(tokenAddress, minAmountOut, { value });
  console.log("Swap tx hash:", tx.hash);

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction was not mined");
  console.log("Swap confirmed in block:", receipt.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
