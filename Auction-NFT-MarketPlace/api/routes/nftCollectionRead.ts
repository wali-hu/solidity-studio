import { Router, Request, Response } from "express";
import { getNFTCollectionContract } from "../config.js";

const router = Router();

// ========================
// READ Endpoints
// ========================

/**
 * GET /api/nft/total-minted
 * Returns the total number of minted tokens
 */
router.get("/total-minted", async (_req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const total = await contract.totalMinted();
    res.json({ totalMinted: total.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/name
 * Returns the collection name
 */
router.get("/name", async (_req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const name = await contract.name();
    res.json({ name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/symbol
 * Returns the collection symbol
 */
router.get("/symbol", async (_req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const symbol = await contract.symbol();
    res.json({ symbol });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/creator/:tokenId
 * Returns the creator (original minter) of a token
 */
router.get("/creator/:tokenId", async (req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const creator = await contract.getCreator(req.params.tokenId);
    res.json({ tokenId: req.params.tokenId, creator });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/token-uri/:tokenId
 * Returns the metadata URI for a token
 */
router.get("/token-uri/:tokenId", async (req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const uri = await contract.tokenURI(req.params.tokenId);
    res.json({ tokenId: req.params.tokenId, tokenURI: uri });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/owner-of/:tokenId
 * Returns the current owner of a token
 */
router.get("/owner-of/:tokenId", async (req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const owner = await contract.ownerOf(req.params.tokenId);
    res.json({ tokenId: req.params.tokenId, owner });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/balance-of/:address
 * Returns the number of NFTs owned by an address
 */
router.get("/balance-of/:address", async (req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const balance = await contract.balanceOf(req.params.address);
    res.json({ address: req.params.address, balance: balance.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/approved/:tokenId
 * Returns the approved address for a specific token
 */
router.get("/approved/:tokenId", async (req: Request, res: Response) => {
  try {
    const contract = getNFTCollectionContract();
    const approved = await contract.getApproved(req.params.tokenId);
    res.json({ tokenId: req.params.tokenId, approved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/nft/is-approved-for-all/:owner/:operator
 * Checks if an operator is approved for all tokens of an owner
 */
router.get(
  "/is-approved-for-all/:owner/:operator",
  async (req: Request, res: Response) => {
    try {
      const contract = getNFTCollectionContract();
      const isApproved = await contract.isApprovedForAll(
        req.params.owner,
        req.params.operator
      );
      res.json({
        owner: req.params.owner,
        operator: req.params.operator,
        isApprovedForAll: isApproved,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;

