import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import {
  getNFTAuctionContract,
  getNFTCollectionContract,
  getSignerFromPrivateKey,
  ADDRESSES,
} from "../config.js";

const router = Router();

// ========================
// WRITE Endpoints
// ========================

/**
 * POST /api/auction/create
 * Creates a new auction
 * Body: { nftContract: string, tokenId: number, minPrice: string (ETH), duration: number (seconds), privateKey: string }
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const { nftContract, tokenId, minPrice, duration, privateKey } = req.body;
    if (
      !nftContract ||
      tokenId === undefined ||
      !minPrice ||
      !duration ||
      !privateKey
    ) {
      res.status(400).json({
        error:
          "Missing required fields: nftContract, tokenId, minPrice (in ETH), duration (seconds), privateKey",
      });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTAuctionContract(wallet);

    const minPriceWei = ethers.parseEther(minPrice.toString());

    const tx = await contract.createAuction(
      nftContract,
      tokenId,
      minPriceWei,
      duration
    );

    res.json({
      message: "Auction creation transaction submitted",
      transactionHash: tx.hash,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auction/relist-from-auction
 * Convenience endpoint: winner of a previous auction can start a new auction
 * for the same NFT.
 *
 * Body: {
 *   previousAuctionId: number,
 *   minPrice: string (ETH),
 *   duration: number (seconds),
 *   privateKey: string
 * }
 *
 * Requirements:
 * - The previous auction must be ended with a winner (highestBidder != 0)
 * - The caller's privateKey must belong to that winner address
 * - The winner must have approved the auction contract again for this NFT
 */
router.post(
  "/relist-from-auction",
  async (req: Request, res: Response) => {
    try {
      const { previousAuctionId, minPrice, duration, privateKey } = req.body;
      if (
        previousAuctionId === undefined ||
        !minPrice ||
        !duration ||
        !privateKey
      ) {
        res.status(400).json({
          error:
            "Missing required fields: previousAuctionId, minPrice (in ETH), duration (seconds), privateKey",
        });
        return;
      }

      const wallet = getSignerFromPrivateKey(privateKey);
      const readContract = getNFTAuctionContract();

      const prevAuction = await readContract.getAuction(previousAuctionId);

      if (!prevAuction.ended || prevAuction.highestBid <= 0n) {
        res.status(400).json({
          error:
            "Previous auction must be finalized with a winner to relist its NFT",
        });
        return;
      }

      if (
        prevAuction.highestBidder.toLowerCase() !==
        wallet.address.toLowerCase()
      ) {
        res.status(403).json({
          error:
            "Only the winner of the previous auction can relist this NFT via this endpoint",
        });
        return;
      }

      // Ensure NFTAuction contract is approved to transfer this NFT again.
      // Even if the seller previously approved it, ERC721 clears approvals
      // on transfer, so the winner must approve again.
      // We use approve() for the specific token, not setApprovalForAll.
      const nftCollection = getNFTCollectionContract(wallet);
      const auctionAddress = ADDRESSES.NFTAuction;

      const approvedForToken = await nftCollection.getApproved(
        prevAuction.tokenId
      );

      const minPriceWei = ethers.parseEther(minPrice.toString());
      const writeContract = getNFTAuctionContract(wallet);

      let approvalTxHash = null;
      if (
        approvedForToken.toLowerCase() !== auctionAddress.toLowerCase()
      ) {
        // Auto-approve the auction contract for this specific token
        // Submit but don't wait - return immediately for speed
        const approveTx = await nftCollection.approve(
          auctionAddress,
          prevAuction.tokenId
        );
        approvalTxHash = approveTx.hash;
      }

      // Submit createAuction transaction immediately (may revert if approval not confirmed yet)
      const tx = await writeContract.createAuction(
        prevAuction.nftContract,
        prevAuction.tokenId,
        minPriceWei,
        duration
      );

      res.json({
        message:
          approvalTxHash
            ? "Approval and auction creation transactions submitted. If auction creation fails, wait for approval to confirm and retry."
            : "Relist transaction submitted for winner to start a new auction",
        approvalTransactionHash: approvalTxHash,
        auctionTransactionHash: tx.hash,
        previousAuctionId: previousAuctionId.toString(),
        newSeller: wallet.address,
        nftContract: prevAuction.nftContract,
        tokenId: prevAuction.tokenId.toString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/auction/bid
 * Places a bid on an auction
 * Body: { auctionId: number, bidAmount: string (ETH), privateKey: string }
 */
router.post("/bid", async (req: Request, res: Response) => {
  try {
    const { auctionId, bidAmount, privateKey } = req.body;
    if (auctionId === undefined || !bidAmount || !privateKey) {
      res.status(400).json({
        error:
          "Missing required fields: auctionId, bidAmount (in ETH), privateKey",
      });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTAuctionContract(wallet);

    const bidAmountWei = ethers.parseEther(bidAmount.toString());

    const tx = await contract.placeBid(auctionId, { value: bidAmountWei });

    res.json({
      message: "Bid transaction submitted",
      transactionHash: tx.hash,
      auctionId: auctionId.toString(),
      bidder: wallet.address,
      amountEth: bidAmount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auction/finalize
 * Finalizes an auction (settle if bids exist, cancel if no bids)
 * Body: { auctionId: number, privateKey: string }
 */
router.post("/finalize", async (req: Request, res: Response) => {
  try {
    const { auctionId, privateKey } = req.body;
    if (auctionId === undefined || !privateKey) {
      res.status(400).json({
        error: "Missing required fields: auctionId, privateKey",
      });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTAuctionContract(wallet);

    const tx = await contract.finalizeAuction(auctionId);

    res.json({
      message:
        "Finalize transaction submitted. On-chain logic will handle winner selection, NFT transfer, platform fee, and refunds.",
      transactionHash: tx.hash,
      auctionId: auctionId.toString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auction/set-platform-fee
 * Updates the platform fee percentage (owner only)
 * Body: { newFeePercentage: number, privateKey: string }
 * Note: 250 = 2.5%, 500 = 5%, max 1000 = 10%
 */
router.post("/set-platform-fee", async (req: Request, res: Response) => {
  try {
    const { newFeePercentage, privateKey } = req.body;
    if (newFeePercentage === undefined || !privateKey) {
      res.status(400).json({
        error:
          "Missing required fields: newFeePercentage (e.g. 250 = 2.5%), privateKey",
      });
      return;
    }

    const wallet = getSignerFromPrivateKey(privateKey);
    const contract = getNFTAuctionContract(wallet);

    const tx = await contract.setPlatformFee(newFeePercentage);

    res.json({
      message: `Platform fee update transaction submitted (new fee: ${
        Number(newFeePercentage) / 100
      }%)`,
      transactionHash: tx.hash,
      newFeePercentage: newFeePercentage.toString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

