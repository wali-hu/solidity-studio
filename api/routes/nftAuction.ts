import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { getNFTAuctionContract, getSigner } from "../config.js";

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
      platformFeePercentage: fee.toString(),
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

// ========================
// WRITE Endpoints
// ========================

/**
 * POST /api/auction/create
 * Creates a new auction
 * Body: { nftContract: string, tokenId: number, minPrice: string (ETH), duration: number (seconds), signer: string }
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const { nftContract, tokenId, minPrice, duration, signer } = req.body;
    if (
      !nftContract ||
      tokenId === undefined ||
      !minPrice ||
      !duration ||
      !signer
    ) {
      res.status(400).json({
        error:
          "Missing required fields: nftContract, tokenId, minPrice (in ETH), duration (seconds), signer",
      });
      return;
    }

    const wallet = getSigner(signer);
    const contract = getNFTAuctionContract(wallet);

    const minPriceWei = ethers.parseEther(minPrice.toString());

    const tx = await contract.createAuction(
      nftContract,
      tokenId,
      minPriceWei,
      duration
    );
    const receipt = await tx.wait();

    // Parse AuctionCreated event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "AuctionCreated");

    res.json({
      message: "Auction created successfully",
      transactionHash: receipt.hash,
      auctionId: event?.args?.auctionId?.toString() ?? null,
      seller: event?.args?.seller ?? null,
      nftContract: event?.args?.nftContract ?? nftContract,
      tokenId: event?.args?.tokenId?.toString() ?? tokenId.toString(),
      minPrice: minPrice + " ETH",
      startTime: event?.args?.startTime?.toString() ?? null,
      endTime: event?.args?.endTime?.toString() ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auction/bid
 * Places a bid on an auction
 * Body: { auctionId: number, bidAmount: string (ETH), signer: string }
 */
router.post("/bid", async (req: Request, res: Response) => {
  try {
    const { auctionId, bidAmount, signer } = req.body;
    if (auctionId === undefined || !bidAmount || !signer) {
      res.status(400).json({
        error:
          "Missing required fields: auctionId, bidAmount (in ETH), signer",
      });
      return;
    }

    const wallet = getSigner(signer);
    const contract = getNFTAuctionContract(wallet);

    const bidAmountWei = ethers.parseEther(bidAmount.toString());

    const tx = await contract.placeBid(auctionId, { value: bidAmountWei });
    const receipt = await tx.wait();

    // Parse BidPlaced event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "BidPlaced");

    res.json({
      message: "Bid placed successfully",
      transactionHash: receipt.hash,
      auctionId: event?.args?.auctionId?.toString() ?? auctionId.toString(),
      bidder: event?.args?.bidder ?? wallet.address,
      amount: bidAmount + " ETH",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auction/finalize
 * Finalizes an auction (settle if bids exist, cancel if no bids)
 * Body: { auctionId: number, signer: string }
 */
router.post("/finalize", async (req: Request, res: Response) => {
  try {
    const { auctionId, signer } = req.body;
    if (auctionId === undefined || !signer) {
      res.status(400).json({
        error: "Missing required fields: auctionId, signer",
      });
      return;
    }

    const wallet = getSigner(signer);
    const contract = getNFTAuctionContract(wallet);

    const tx = await contract.finalizeAuction(auctionId);
    const receipt = await tx.wait();

    // Check for AuctionFinalized or AuctionCancelled events
    const parsedLogs = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const finalizedEvent = parsedLogs.find(
      (e: any) => e.name === "AuctionFinalized"
    );
    const cancelledEvent = parsedLogs.find(
      (e: any) => e.name === "AuctionCancelled"
    );

    if (finalizedEvent) {
      res.json({
        message: "Auction finalized — NFT transferred to winner",
        transactionHash: receipt.hash,
        auctionId: finalizedEvent.args.auctionId.toString(),
        winner: finalizedEvent.args.winner,
        winningBid:
          ethers.formatEther(finalizedEvent.args.winningBid) + " ETH",
      });
    } else if (cancelledEvent) {
      res.json({
        message: "Auction cancelled — NFT returned to seller (no bids)",
        transactionHash: receipt.hash,
        auctionId: cancelledEvent.args.auctionId.toString(),
      });
    } else {
      res.json({
        message: "Auction finalized",
        transactionHash: receipt.hash,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auction/withdraw
 * Withdraws pending returns (safety fallback for failed auto-refunds)
 * Body: { signer: string }
 */
router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const { signer } = req.body;
    if (!signer) {
      res.status(400).json({ error: "Missing required field: signer" });
      return;
    }

    const wallet = getSigner(signer);
    const contract = getNFTAuctionContract(wallet);

    const tx = await contract.withdraw();
    const receipt = await tx.wait();

    // Parse BidRefunded event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "BidRefunded");

    res.json({
      message: "Withdrawal successful",
      transactionHash: receipt.hash,
      bidder: event?.args?.bidder ?? wallet.address,
      amount: event
        ? ethers.formatEther(event.args.amount) + " ETH"
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auction/set-platform-fee
 * Updates the platform fee percentage (owner only)
 * Body: { newFeePercentage: number, signer: string }
 * Note: 250 = 2.5%, 500 = 5%, max 1000 = 10%
 */
router.post("/set-platform-fee", async (req: Request, res: Response) => {
  try {
    const { newFeePercentage, signer } = req.body;
    if (newFeePercentage === undefined || !signer) {
      res.status(400).json({
        error:
          "Missing required fields: newFeePercentage (e.g. 250 = 2.5%), signer",
      });
      return;
    }

    const wallet = getSigner(signer);
    const contract = getNFTAuctionContract(wallet);

    const tx = await contract.setPlatformFee(newFeePercentage);
    const receipt = await tx.wait();

    res.json({
      message: `Platform fee updated to ${Number(newFeePercentage) / 100}%`,
      transactionHash: receipt.hash,
      newFeePercentage: newFeePercentage.toString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
