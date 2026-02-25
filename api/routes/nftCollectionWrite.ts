import { Router, Request, Response } from "express";
import { getNFTCollectionContract, getSignerFromPrivateKey } from "../config.js";

const router = Router();

// ========================
// WRITE Endpoints
// ========================

/**
 * POST /api/nft/mint
 * Mints a new NFT
 * Body: { to: string, tokenURI: string, privateKey: string }
 */
router.post("/mint", async (req: Request, res: Response) => {
  try {
    const { to, tokenURI, privateKey } = req.body;
    if (!to || !tokenURI || !privateKey) {
      res.status(400).json({
        error: "Missing required fields: to, tokenURI, privateKey",
      });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTCollectionContract(wallet);

    const tx = await contract.mint(to, tokenURI);
    const receipt = await tx.wait();

    // Parse the NFTMinted event from receipt
    const mintEvent = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "NFTMinted");

    res.json({
      message: "NFT minted successfully",
      transactionHash: receipt.hash,
      tokenId: mintEvent?.args?.tokenId?.toString() ?? null,
      to: mintEvent?.args?.to ?? to,
      tokenURI: mintEvent?.args?.tokenURI ?? tokenURI,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/nft/approve
 * Approves an address to manage a specific token
 * Body: { to: string, tokenId: number, privateKey: string }
 */
router.post("/approve", async (req: Request, res: Response) => {
  try {
    const { to, tokenId, privateKey } = req.body;
    if (!to || tokenId === undefined || !privateKey) {
      res
        .status(400)
        .json({ error: "Missing required fields: to, tokenId, privateKey" });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTCollectionContract(wallet);

    const tx = await contract.approve(to, tokenId);
    const receipt = await tx.wait();

    res.json({
      message: `Token ${tokenId} approved for ${to}`,
      transactionHash: receipt.hash,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/nft/set-approval-for-all
 * Sets or revokes approval for an operator to manage all tokens
 * Body: { operator: string, approved: boolean, privateKey: string }
 */
router.post("/set-approval-for-all", async (req: Request, res: Response) => {
  try {
    const { operator, approved, privateKey } = req.body;
    if (!operator || approved === undefined || !privateKey) {
      res.status(400).json({
        error: "Missing required fields: operator, approved, privateKey",
      });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTCollectionContract(wallet);

    const tx = await contract.setApprovalForAll(operator, approved);
    const receipt = await tx.wait();

    res.json({
      message: `Approval for all ${approved ? "granted to" : "revoked from"} ${operator}`,
      transactionHash: receipt.hash,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/nft/transfer
 * Transfers an NFT from one address to another
 * Body: { from: string, to: string, tokenId: number, privateKey: string }
 */
router.post("/transfer", async (req: Request, res: Response) => {
  try {
    const { from, to, tokenId, privateKey } = req.body;
    if (!from || !to || tokenId === undefined || !privateKey) {
      res.status(400).json({
        error: "Missing required fields: from, to, tokenId, privateKey",
      });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTCollectionContract(wallet);

    const tx = await contract.transferFrom(from, to, tokenId);
    const receipt = await tx.wait();

    res.json({
      message: `Token ${tokenId} transferred from ${from} to ${to}`,
      transactionHash: receipt.hash,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

