import { Router } from "express";
import nftCollectionReadRoutes from "./nftCollectionRead.js";
import nftCollectionWriteRoutes from "./nftCollectionWrite.js";

const router = Router();

// Mount read and write routes under the same /api/nft base path
router.use("/", nftCollectionReadRoutes);
router.use("/", nftCollectionWriteRoutes);

export default router;
