import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

/**
 * Interact script to sell tokens for ETH via EthToTokenUniswapV2Swapper.
 *
 * Env vars:
 * - SWAPPER_ADDRESS : deployed swapper contract
 * - TOKEN_ADDRESS   : ERC20 token to sell
 * - TOKEN_AMOUNT    : amount of tokens to sell, as a decimal string
 * - MIN_ETH_OUT     : optional minimum ETH out (defaults to 0)
 */
async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Caller:", caller.address);

  const swapperAddress = process.env.SWAPPER_ADDRESS;
  if (!swapperAddress) {
    throw new Error("SWAPPER_ADDRESS env var must be set");
  }

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("TOKEN_ADDRESS env var must be set");
  }

  const tokenAmountStr = process.env.TOKEN_AMOUNT ?? "0.001";

  const erc20 = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function approve(address,uint256) returns (bool)",
      "function symbol() view returns (string)",
    ],
    tokenAddress,
  );

  const [decimals, symbol] = await Promise.all([
    erc20.decimals(),
    erc20.symbol(),
  ]);

  const amountIn = ethers.parseUnits(tokenAmountStr, decimals);

  console.log(
    `Approving ${swapperAddress} to spend ${tokenAmountStr} ${symbol} (${amountIn.toString()} units)...`,
  );
  const approveTx = await erc20.approve(swapperAddress, amountIn);
  await approveTx.wait();

  const minEthOut =
    process.env.MIN_ETH_OUT !== undefined
      ? BigInt(process.env.MIN_ETH_OUT)
      : 0n;

  const swapper = await ethers.getContractAt(
    "EthToTokenUniswapV2Swapper",
    swapperAddress,
  );

  console.log(
    `Swapping ${tokenAmountStr} ${symbol} for ETH via ${swapperAddress}...`,
  );

  const tx = await swapper.swapTokenForETH(tokenAddress, amountIn, minEthOut);
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

