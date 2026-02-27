import express from "express";
import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
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
];

app.post("/api/v1/swap", async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

