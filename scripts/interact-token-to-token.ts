import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

/**
 * Interact script: swap token A for token B via EthToTokenUniswapV2Swapper (path: tokenIn -> WETH -> tokenOut).
 *
 * Env vars:
 * - SWAPPER_ADDRESS : deployed swapper contract
 * - TOKEN_IN       : ERC20 token to sell
 * - TOKEN_OUT      : ERC20 token to receive
 * - TOKEN_AMOUNT   : amount of tokenIn to swap (decimal string)
 * - MIN_AMOUNT_OUT : optional minimum tokenOut (defaults to 0)
 */
async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Caller:", caller.address);

  const swapperAddress = process.env.SWAPPER_ADDRESS;
  if (!swapperAddress) {
    throw new Error("SWAPPER_ADDRESS env var must be set");
  }

  const tokenInAddress = process.env.TOKEN_IN;
  if (!tokenInAddress) {
    throw new Error("TOKEN_IN env var must be set");
  }

  const tokenOutAddress = process.env.TOKEN_OUT;
  if (!tokenOutAddress) {
    throw new Error("TOKEN_OUT env var must be set");
  }

  const tokenAmountStr = process.env.TOKEN_AMOUNT ?? "0.001";

  const erc20In = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function approve(address,uint256) returns (bool)",
      "function allowance(address,address) view returns (uint256)",
    ],
    tokenInAddress,
  );

  const [decimals, symbolIn, balance] = await Promise.all([
    erc20In.decimals(),
    erc20In.symbol(),
    erc20In.balanceOf(caller.address),
  ]);

  const amountIn = ethers.parseUnits(tokenAmountStr, decimals);

  if (balance < amountIn) {
    throw new Error(
      `Insufficient ${symbolIn} balance: have ${ethers.formatUnits(balance, decimals)}, need ${tokenAmountStr}`,
    );
  }

  const allowance = await erc20In.allowance(caller.address, swapperAddress);
  if (allowance < amountIn) {
    console.log(`Approving swapper to spend ${tokenAmountStr} ${symbolIn}...`);
    const approveTx = await erc20In.approve(swapperAddress, amountIn);
    await approveTx.wait();
    console.log("Approval confirmed");
  }

  const minAmountOut =
    process.env.MIN_AMOUNT_OUT !== undefined
      ? BigInt(process.env.MIN_AMOUNT_OUT)
      : 0n;

  const swapper = await ethers.getContractAt(
    "EthToTokenUniswapV2Swapper",
    swapperAddress,
  );

  console.log(
    `Swapping ${tokenAmountStr} ${symbolIn} for token ${tokenOutAddress} via ${swapperAddress}...`,
  );

  const tx = await swapper.swapTokenForToken(
    tokenInAddress,
    tokenOutAddress,
    amountIn,
    minAmountOut,
  );

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
