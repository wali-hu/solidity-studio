import { Router } from "express";
import nftAuctionReadRoutes from "./nftAuctionRead.js";
import nftAuctionWriteRoutes from "./nftAuctionWrite.js";

const router = Router();

// Mount read and write routes under the same /api/auction base path
router.use("/", nftAuctionReadRoutes);
router.use("/", nftAuctionWriteRoutes);

export default router;
