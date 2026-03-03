import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { getNFTAuctionContract, ADDRESSES, provider } from "../config.js";

const router = Router();

// Helper to format an auction struct from the contract
function formatAuction(auction: any) {
  return {
    auctionId: auction.auctionId.toString(),
    nftContract: auction.nftContract,
    tokenId: auction.tokenId.toString(),
    seller: auction.seller,
    minPrice: ethers.formatEther(auction.minPrice) + " ETH",
    minPriceWei: auction.minPrice.toString(),
    highestBid: ethers.formatEther(auction.highestBid) + " ETH",
    highestBidWei: auction.highestBid.toString(),
    highestBidder: auction.highestBidder,
    startTime: auction.startTime.toString(),
    endTime: auction.endTime.toString(),
    startTimeFormatted: new Date(
      Number(auction.startTime) * 1000
    ).toISOString(),
    endTimeFormatted: new Date(Number(auction.endTime) * 1000).toISOString(),
    ended: auction.ended,
    active: auction.active,
  };
}

// ========================
// READ Endpoints
// ========================

/**
 * GET /api/auction/total-auctions
 * Returns the total number of auctions created
 */
router.get("/total-auctions", async (_req: Request, res: Response) => {
  try {
    const contract = getNFTAuctionContract();
    const total = await contract.totalAuctions();
    res.json({ totalAuctions: total.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auction/platform-fee
 * Returns the current platform fee percentage
 */
router.get("/platform-fee", async (_req: Request, res: Response) => {
  try {
    const contract = getNFTAuctionContract();
    const fee = await contract.platformFeePercentage();
    res.json({
      // platformFeePercentage: fee.toString(),
      platformFeePercent: `${Number(fee) / 100}%`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auction/active
 * Returns all active auctions that have not expired
 */
router.get("/active", async (_req: Request, res: Response) => {
  try {
    const contract = getNFTAuctionContract();
    const auctions = await contract.fetchActiveAuctions();
    res.json({
      count: auctions.length,
      auctions: auctions.map(formatAuction),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auction/by-seller/:address
 * Returns all auctions created by a specific seller
 */
router.get("/by-seller/:address", async (req: Request, res: Response) => {
  try {
    const contract = getNFTAuctionContract();
    const auctions = await contract.fetchAuctionsBySeller(req.params.address);
    res.json({
      seller: req.params.address,
      count: auctions.length,
      auctions: auctions.map(formatAuction),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auction/won-by/:address
 * Returns all auctions won by a specific user
 */
router.get("/won-by/:address", async (req: Request, res: Response) => {
  try {
    const contract = getNFTAuctionContract();
    const auctions = await contract.fetchAuctionsWon(req.params.address);
    res.json({
      winner: req.params.address,
      count: auctions.length,
      auctions: auctions.map(formatAuction),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auction/pending-returns/:address
 * Returns the pending return amount for an address
 */
router.get(
  "/pending-returns/:address",
  async (req: Request, res: Response) => {
    try {
      const contract = getNFTAuctionContract();
      const amount = await contract.pendingReturns(req.params.address);
      res.json({
        address: req.params.address,
        pendingReturns: ethers.formatEther(amount) + " ETH",
        pendingReturnsWei: amount.toString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/auction/contract-balance
 * Returns the native ETH balance of the NFTAuction contract.
 * You can call this before and after actions (bids/finalize) to see balance changes.
 */
router.get("/contract-balance", async (_req: Request, res: Response) => {
  try {
    const balance = await provider.getBalance(ADDRESSES.NFTAuction);
    res.json({
      contract: ADDRESSES.NFTAuction,
      balanceWei: balance.toString(),
      balanceEth: `${Number(balance) / 1e18} ETH`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auction/:auctionId
 * Returns details of a specific auction
 */
router.get("/:auctionId", async (req: Request, res: Response) => {
  try {
    const contract = getNFTAuctionContract();
    const auction = await contract.getAuction(req.params.auctionId);
    res.json(formatAuction(auction));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auction/:auctionId/bidders
 * Returns the list of bidders for an auction
 */
router.get("/:auctionId/bidders", async (req: Request, res: Response) => {
  try {
    const contract = getNFTAuctionContract();
    const bidders = await contract.getAuctionBidders(req.params.auctionId);
    res.json({
      auctionId: req.params.auctionId,
      count: bidders.length,
      bidders: [...bidders],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

