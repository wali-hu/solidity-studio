import { network } from "hardhat";

const { ethers } = await network.connect({ network: "sepolia", chainType: "l1" });

/**
 * Read ERC20 balance for configured wallet.
 * npx hardhat run scripts/read-token-balance.ts --network sepolia
 */
async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) throw new Error("TOKEN_ADDRESS env var must be set");

  const [signer] = await ethers.getSigners();
  const walletAddress = process.env.WALLET_ADDRESS ?? signer.address;

  const erc20 = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ],
    tokenAddress,
  );

  const [rawBalance, symbol, decimals] = await Promise.all([
    erc20.balanceOf(walletAddress),
    erc20.symbol(),
    erc20.decimals(),
  ]);

  const humanBalance = Number(rawBalance) / 10 ** Number(decimals ?? 18);
  console.log(`Token: ${tokenAddress}`);
  console.log(`Wallet: ${walletAddress}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Balance: ${humanBalance} ${symbol} (raw: ${rawBalance.toString()})`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
