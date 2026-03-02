import { network } from "hardhat";

const { ethers } = await network.connect({ network: "sepolia", chainType: "l1" });

/**
 * Sell all tokens via swapAllTokenForETH.
 * Env: SWAPPER_ADDRESS, TOKEN_ADDRESS, MIN_ETH_OUT (optional).
 */
async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Caller:", caller.address);

  const swapperAddress = process.env.SWAPPER_ADDRESS;
  if (!swapperAddress) throw new Error("SWAPPER_ADDRESS env var must be set");

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) throw new Error("TOKEN_ADDRESS env var must be set");

  const erc20 = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function approve(address,uint256) returns (bool)",
      "function allowance(address,address) view returns (uint256)",
    ],
    tokenAddress,
  );

  const [balance, decimals, symbol] = await Promise.all([
    erc20.balanceOf(caller.address),
    erc20.decimals(),
    erc20.symbol(),
  ]);

  const balanceFormatted = Number(balance) / 10 ** Number(decimals);
  console.log(`Current ${symbol} balance: ${balanceFormatted} (${balance.toString()} units)`);

  if (balance === 0n) throw new Error("Wallet has zero token balance");

  const swapper = await ethers.getContractAt(
    "EthToTokenUniswapV3Swapper",
    swapperAddress,
  );

  const allowance = await erc20.allowance(caller.address, swapperAddress);
  if (allowance < balance) {
    console.log(`Approving contract to spend ${symbol}...`);
    await (await erc20.approve(swapperAddress, balance)).wait();
  }

  const minEthOut =
    process.env.MIN_ETH_OUT !== undefined ? BigInt(process.env.MIN_ETH_OUT) : 0n;

  console.log(`Calling swapAllTokenForETH to sell all ${symbol}...`);
  const tx = await swapper.swapAllTokenForETH(tokenAddress, minEthOut);
  console.log("Swap tx hash:", tx.hash);

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction was not mined");
  console.log("Swap confirmed in block:", receipt.blockNumber);

  const finalBalance = await erc20.balanceOf(caller.address);
  console.log(`Final ${symbol} balance: ${finalBalance.toString()} units`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
