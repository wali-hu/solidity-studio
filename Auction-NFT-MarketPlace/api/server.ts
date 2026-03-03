import express from "express";
import cors from "cors";
import nftCollectionRoutes from "./routes/nftCollection.js";
import nftAuctionRoutes from "./routes/nftAuction.js";
import { ADDRESSES, provider } from "./config.js";

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/nft", nftCollectionRoutes);
app.use("/api/auction", nftAuctionRoutes);

// Health check & info
app.get("/", async (_req, res) => {
  const network = await provider.getNetwork();
  res.json({
    name: "NFT Marketplace API",
    network: network.name,
    chainId: network.chainId.toString(),
    contracts: {
      NFTCollection: ADDRESSES.NFTCollection,
      NFTAuction: ADDRESSES.NFTAuction,
    },
    endpoints: {
      nftCollection: {
        read: [
          "GET  /api/nft/total-minted",
          "GET  /api/nft/name",
          "GET  /api/nft/symbol",
          "GET  /api/nft/creator/:tokenId",
          "GET  /api/nft/token-uri/:tokenId",
          "GET  /api/nft/owner-of/:tokenId",
          "GET  /api/nft/balance-of/:address",
          "GET  /api/nft/approved/:tokenId",
          "GET  /api/nft/is-approved-for-all/:owner/:operator",
        ],
        write: [
          "POST /api/nft/mint                   { to, tokenURI, signer }",
          "POST /api/nft/approve                { to, tokenId, signer }",
          "POST /api/nft/set-approval-for-all   { operator, approved, signer }",
          "POST /api/nft/transfer               { from, to, tokenId, signer }",
        ],
      },
      nftAuction: {
        read: [
          "GET  /api/auction/total-auctions",
          "GET  /api/auction/platform-fee",
          "GET  /api/auction/active",
          "GET  /api/auction/by-seller/:address",
          "GET  /api/auction/won-by/:address",
          "GET  /api/auction/pending-returns/:address",
          "GET  /api/auction/:auctionId",
          "GET  /api/auction/:auctionId/bidders",
        ],
        write: [
          "POST /api/auction/create             { nftContract, tokenId, minPrice (ETH), duration (sec), signer }",
          "POST /api/auction/bid                { auctionId, bidAmount (ETH), signer }",
          "POST /api/auction/finalize           { auctionId, signer }",
          "POST /api/auction/withdraw           { signer }",
          "POST /api/auction/set-platform-fee   { newFeePercentage, signer }",
        ],
      },
    },
    signerRoles: [
      "owner   — contract deployer / marketplace owner",
      "seller  — mints and lists NFTs, creates auctions",
      "bidder1 — bids on auctions / buys NFTs",
      "bidder2 — bids on auctions",
      "bidder3 — bids on auctions",
      "bidder4 — bids on auctions",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`\n  NFT Marketplace API running at http://localhost:${PORT}`);
  console.log(`  View all endpoints at        http://localhost:${PORT}/\n`);
});
