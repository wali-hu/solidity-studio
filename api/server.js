import express from "express";
import { JsonRpcProvider, Wallet, Contract, parseEther, parseUnits } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 3000;

const SWAPPER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "minAmountOut", type: "uint256" },
    ],
    name: "swapETHForToken",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "minEthOut", type: "uint256" },
    ],
    name: "swapTokenForETH",
    outputs: [
      { internalType: "uint256", name: "ethOut", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Buy tokens: ETH -> Token
app.post("/api/v1/swap/buy", async (req, res) => {
  try {
    const { token_address, eth_amount } = req.body ?? {};

    if (!token_address || typeof token_address !== "string") {
      return res.status(400).json({ error: "token_address is required" });
    }
    if (!eth_amount || typeof eth_amount !== "string") {
      return res.status(400).json({ error: "eth_amount (string) is required" });
    }

    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    const swapperAddress = process.env.SWAPPER_ADDRESS;

    if (!rpcUrl || !privateKey || !swapperAddress) {
      return res.status(500).json({
        error:
          "SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, and SWAPPER_ADDRESS must be set",
      });
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);

    const swapper = new Contract(swapperAddress, SWAPPER_ABI, wallet);

    const value = parseEther(eth_amount);
    const minAmountOut =
      process.env.MIN_AMOUNT_OUT !== undefined
        ? BigInt(process.env.MIN_AMOUNT_OUT)
        : 0n;

    const tx = await swapper.swapETHForToken(token_address, minAmountOut, {
      value,
    });

    return res.json({
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("Swap failed:", err);
    return res.status(500).json({
      error: "Swap failed",
      details:
        err instanceof Error ? err.message : "Unknown error during swap",
    });
  }
});

// Sell tokens: Token -> ETH
// Automatically fetches wallet balance and sells all tokens
app.post("/api/v1/swap/sell", async (req, res) => {
  try {
    const { token_address, min_eth_out } = req.body ?? {};

    if (!token_address || typeof token_address !== "string") {
      return res.status(400).json({ error: "token_address is required" });
    }

    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    const swapperAddress = process.env.SWAPPER_ADDRESS;

    if (!rpcUrl || !privateKey || !swapperAddress) {
      return res.status(500).json({
        error:
          "SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, and SWAPPER_ADDRESS must be set",
      });
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);

    const erc20 = new Contract(
      token_address,
      [
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)",
        "function approve(address,uint256) returns (bool)",
        "function symbol() view returns (string)",
      ],
      wallet,
    );

    // Fetch wallet's token balance
    const [balance, decimals, symbol] = await Promise.all([
      erc20.balanceOf(wallet.address),
      erc20.decimals(),
      erc20.symbol(),
    ]);

    // Check if wallet has any tokens
    if (balance === 0n) {
      return res.status(400).json({
        error: "Insufficient balance",
        details: "Wallet has zero token balance",
        tokenAddress: token_address,
        symbol: symbol || "Unknown",
      });
    }

    // Use the full balance as amountIn
    const amountIn = balance;

    const approveTx = await erc20.approve(swapperAddress, amountIn);
    await approveTx.wait();

    const swapper = new Contract(swapperAddress, SWAPPER_ABI, wallet);

    const minEthOut =
      typeof min_eth_out === "string"
        ? BigInt(parseEther(min_eth_out).toString())
        : process.env.MIN_ETH_OUT !== undefined
          ? BigInt(process.env.MIN_ETH_OUT)
          : 0n;

    const tx = await swapper.swapTokenForETH(
      token_address,
      amountIn,
      minEthOut,
    );

    const balanceFormatted = Number(balance) / 10 ** Number(decimals);

    return res.json({
      txHash: tx.hash,
      tokenAddress: token_address,
      symbol: symbol || "Unknown",
      amountSold: balance.toString(),
      amountSoldFormatted: balanceFormatted.toString(),
    });
  } catch (err) {
    console.error("Swap failed:", err);
    return res.status(500).json({
      error: "Swap failed",
      details:
        err instanceof Error ? err.message : "Unknown error during swap",
    });
  }
});

// Get token balance for the configured wallet
app.get("/api/v1/balance/:tokenAddress", async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      return res.status(500).json({
        error: "SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY must be set",
      });
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);

    const erc20 = new Contract(
      tokenAddress,
      [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ],
      wallet,
    );

    const [balance, decimals, symbol] = await Promise.all([
      erc20.balanceOf(wallet.address),
      erc20.decimals(),
      erc20.symbol(),
    ]);

    const humanReadableBalance = Number(balance) / 10 ** Number(decimals);

    return res.json({
      wallet: wallet.address,
      tokenAddress,
      symbol,
      balance: balance.toString(),
      balanceFormatted: humanReadableBalance.toString(),
      decimals: Number(decimals),
    });
  } catch (err) {
    console.error("Balance check failed:", err);
    return res.status(500).json({
      error: "Balance check failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

