import { network } from "hardhat";

const { ethers } = await network.connect({ network: "sepolia", chainType: "l1" });

/**
 * Check if a Uniswap V3 pool exists for WETH + token on Sepolia.
 * Swap will revert if no pool or no liquidity. Run this before buying/selling.
 *
 * npx hardhat run scripts/check-pool.ts --network sepolia
 * Env: TOKEN_ADDRESS
 */
const SEPOLIA_FACTORY = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const WETH = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

const FEE_TIERS = [
  { fee: 500, label: "0.05%" },
  { fee: 3000, label: "0.30%" },
  { fee: 10000, label: "1.00%" },
] as const;

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("Set TOKEN_ADDRESS in .env");
  }

  const factory = await ethers.getContractAt(
    ["function getPool(address, address, uint24) view returns (address)"],
    SEPOLIA_FACTORY,
  );

  const token0 = WETH.toLowerCase() < tokenAddress.toLowerCase() ? WETH : tokenAddress;
  const token1 = token0 === WETH ? tokenAddress : WETH;

  console.log("Token:", tokenAddress);
  console.log("WETH: ", WETH);
  console.log("");

  for (const { fee, label } of FEE_TIERS) {
    const poolAddress = await factory.getPool(WETH, tokenAddress, fee);
    if (poolAddress === ethers.ZeroAddress) {
      console.log(`Fee ${label} (${fee}): no pool`);
      continue;
    }
    console.log(`Fee ${label} (${fee}): pool ${poolAddress}`);

    const pool = await ethers.getContractAt(
      [
        "function liquidity() view returns (uint128)",
        "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)",
      ],
      poolAddress,
    );
    try {
      const liquidity = await pool.liquidity();
      const slot0 = await pool.slot0();
      console.log("  liquidity:", liquidity.toString());
      console.log("  sqrtPriceX96:", slot0[0].toString());
      if (liquidity === 0n) {
        console.log("  -> Pool exists but has NO LIQUIDITY. Swap will revert.");
      } else {
        console.log("  -> Pool has liquidity. Swap should work for this fee tier.");
      }
    } catch (e) {
      console.log("  (could not read liquidity)", e instanceof Error ? e.message : e);
    }
    console.log("");
  }

  console.log("This contract uses 0.30% (3000) only. If that pool is missing or has no liquidity, use a token with an existing WETH/Token 0.30% pool on Sepolia.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
