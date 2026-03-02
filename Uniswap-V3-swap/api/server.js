import express from "express";
import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT ?? 3000;

const SWAPPER_ABI = [
  { inputs: [{ name: "tokenAddress", type: "address" }, { name: "minAmountOut", type: "uint256" }], name: "swapETHForToken", outputs: [{ name: "amountOut", type: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "tokenAddress", type: "address" }, { name: "minEthOut", type: "uint256" }], name: "swapAllTokenForETH", outputs: [{ name: "amountIn", type: "uint256" }, { name: "ethOut", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
];

app.post("/api/v1/swap/buy", async (req, res) => {
  try {
    const body = req.body || {};
    const token_address = body.token_address;
    const eth_amount = body.eth_amount;
    if (!token_address || typeof token_address !== "string") return res.status(400).json({ error: "token_address is required" });
    if (!eth_amount || typeof eth_amount !== "string") return res.status(400).json({ error: "eth_amount (string) is required" });
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    const swapperAddress = process.env.SWAPPER_ADDRESS;
    if (!rpcUrl || !privateKey || !swapperAddress) return res.status(500).json({ error: "SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, SWAPPER_ADDRESS required" });
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const swapper = new Contract(swapperAddress, SWAPPER_ABI, wallet);
    const value = parseEther(eth_amount);
    const minAmountOut = process.env.MIN_AMOUNT_OUT !== undefined ? BigInt(process.env.MIN_AMOUNT_OUT) : 0n;
    const tx = await swapper.swapETHForToken(token_address, minAmountOut, { value });
    return res.json({ txHash: tx.hash });
  } catch (err) {
    console.error("Swap failed:", err);
    return res.status(500).json({ error: "Swap failed", details: err instanceof Error ? err.message : "Unknown" });
  }
});

app.post("/api/v1/swap/sell-all", async (req, res) => {
  try {
    const body = req.body || {};
    const token_address = body.token_address;
    if (!token_address || typeof token_address !== "string") return res.status(400).json({ error: "token_address is required" });
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    const swapperAddress = process.env.SWAPPER_ADDRESS;
    if (!rpcUrl || !privateKey || !swapperAddress) return res.status(500).json({ error: "Config required" });
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const erc20 = new Contract(token_address, ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function symbol() view returns (string)", "function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)"], wallet);
    const [balance, decimals, symbol] = await Promise.all([erc20.balanceOf(wallet.address), erc20.decimals(), erc20.symbol()]);
    if (balance === 0n) return res.status(400).json({ error: "Insufficient balance", tokenAddress: token_address });
    const swapper = new Contract(swapperAddress, SWAPPER_ABI, wallet);
    const allowance = await erc20.allowance(wallet.address, swapperAddress);
    if (allowance < balance) await (await erc20.approve(swapperAddress, balance)).wait();
    const minEthOut = typeof body.min_eth_out === "string" ? BigInt(parseEther(body.min_eth_out).toString()) : (process.env.MIN_ETH_OUT !== undefined ? BigInt(process.env.MIN_ETH_OUT) : 0n);
    const tx = await swapper.swapAllTokenForETH(token_address, minEthOut);
    return res.json({ txHash: tx.hash, tokenAddress: token_address, symbol: symbol || "Unknown", amountSold: balance.toString(), method: "contract-level" });
  } catch (err) {
    console.error("Swap failed:", err);
    return res.status(500).json({ error: "Swap failed", details: err instanceof Error ? err.message : "Unknown" });
  }
});

app.get("/api/v1/balance/:tokenAddress", async (req, res) => {
  try {
    const tokenAddress = req.params.tokenAddress;
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    if (!rpcUrl || !privateKey) return res.status(500).json({ error: "SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY required" });
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const erc20 = new Contract(tokenAddress, ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function symbol() view returns (string)"], wallet);
    const [balance, decimals, symbol] = await Promise.all([erc20.balanceOf(wallet.address), erc20.decimals(), erc20.symbol()]);
    const human = Number(balance) / 10 ** Number(decimals);
    return res.json({ wallet: wallet.address, tokenAddress, symbol, balance: balance.toString(), balanceFormatted: human.toString(), decimals: Number(decimals) });
  } catch (err) {
    console.error("Balance failed:", err);
    return res.status(500).json({ error: "Balance failed", details: err instanceof Error ? err.message : "Unknown" });
  }
});

app.listen(PORT, () => console.log("API listening on http://localhost:" + PORT));
