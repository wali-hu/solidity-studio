import { expect } from "chai";
import { network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";

const { ethers } = await network.connect();

describe("NFTAuction", function () {
  let nftCollection: any;
  let auction: any;
  let owner: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let bidder1: HardhatEthersSigner;
  let bidder2: HardhatEthersSigner;
  let bidder3: HardhatEthersSigner;

  const NFT_NAME = "Test NFT Collection";
  const NFT_SYMBOL = "TNFT";
  const TOKEN_URI = "ipfs://QmTest/metadata.json";
  const MIN_PRICE = ethers.parseEther("0.001");
  const DURATION = 3600; // 1 hour

  beforeEach(async function () {
    [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

    const NFTCollectionFactory =
      await ethers.getContractFactory("NFTCollection");
    nftCollection = await NFTCollectionFactory.deploy(NFT_NAME, NFT_SYMBOL);
    await nftCollection.waitForDeployment();

    const NFTAuctionFactory = await ethers.getContractFactory("NFTAuction");
    auction = await NFTAuctionFactory.deploy();
    await auction.waitForDeployment();
  });

  async function mintNFT(to: HardhatEthersSigner): Promise<number> {
    const totalBefore = await nftCollection.totalMinted();
    await nftCollection.connect(to).mint(to.address, TOKEN_URI);
    return Number(totalBefore);
  }

  async function mintAndCreateAuction(
    lister: HardhatEthersSigner,
    minPrice: bigint = MIN_PRICE,
    duration: number = DURATION
  ): Promise<{ tokenId: number; auctionId: number }> {
    const tokenId = await mintNFT(lister);
    await nftCollection
      .connect(lister)
      .setApprovalForAll(await auction.getAddress(), true);
    const tx = await auction
      .connect(lister)
      .createAuction(
        await nftCollection.getAddress(),
        tokenId,
        minPrice,
        duration
      );
    const receipt = await tx.wait();
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = auction.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        return parsed?.name === "AuctionCreated";
      } catch {
        return false;
      }
    });
    const parsed = auction.interface.parseLog({
      topics: event.topics as string[],
      data: event.data,
    });
    return { tokenId, auctionId: Number(parsed?.args[0]) };
  }

  async function advanceTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await auction.owner()).to.equal(owner.address);
    });

    it("Should set initial platform fee to 2.5%", async function () {
      expect(await auction.platformFeePercentage()).to.equal(250);
    });
  });

  describe("Creating Auctions", function () {
    beforeEach(async function () {
      await nftCollection.connect(seller).mint(seller.address, TOKEN_URI);
    });

    it("Should create an auction with correct parameters", async function () {
      await nftCollection
        .connect(seller)
        .approve(await auction.getAddress(), 0);

      const tx = await auction
        .connect(seller)
        .createAuction(
          await nftCollection.getAddress(),
          0,
          MIN_PRICE,
          DURATION
        );

      await expect(tx).to.emit(auction, "AuctionCreated");

      const auctionData = await auction.getAuction(0);
      expect(auctionData.seller).to.equal(seller.address);
      expect(auctionData.minPrice).to.equal(MIN_PRICE);
      expect(auctionData.highestBid).to.equal(0);
      expect(auctionData.highestBidder).to.equal(ethers.ZeroAddress);
      expect(auctionData.active).to.be.true;
      expect(auctionData.ended).to.be.false;
    });

    it("Should transfer NFT to auction contract as escrow", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await auction.getAddress(), true);

      await auction
        .connect(seller)
        .createAuction(
          await nftCollection.getAddress(),
          0,
          MIN_PRICE,
          DURATION
        );

      expect(await nftCollection.ownerOf(0)).to.equal(
        await auction.getAddress()
      );
    });

    it("Should not charge any listing fee", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await auction.getAddress(), true);

      const sellerBalBefore = await ethers.provider.getBalance(seller.address);

      const tx = await auction
        .connect(seller)
        .createAuction(
          await nftCollection.getAddress(),
          0,
          MIN_PRICE,
          DURATION
        );
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed.toString()) * receipt!.gasPrice;

      const sellerBalAfter = await ethers.provider.getBalance(seller.address);
      // Only gas was spent, no listing fee
      expect(sellerBalBefore - sellerBalAfter).to.equal(gasUsed);
    });

    it("Should revert if min price is 0", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await auction.getAddress(), true);

      await expect(
        auction
          .connect(seller)
          .createAuction(await nftCollection.getAddress(), 0, 0, DURATION)
      ).to.be.revertedWith("Min price must be greater than 0");
    });

    it("Should revert if duration is 0", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await auction.getAddress(), true);

      await expect(
        auction
          .connect(seller)
          .createAuction(
            await nftCollection.getAddress(),
            0,
            MIN_PRICE,
            0
          )
      ).to.be.revertedWith("Duration must be greater than 0");
    });

    it("Should revert if duration exceeds 30 days", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await auction.getAddress(), true);

      const thirtyOneDays = 31 * 24 * 60 * 60;
      await expect(
        auction
          .connect(seller)
          .createAuction(
            await nftCollection.getAddress(),
            0,
            MIN_PRICE,
            thirtyOneDays
          )
      ).to.be.revertedWith("Duration cannot exceed 30 days");
    });

    it("Should revert if not NFT owner", async function () {
      await nftCollection
        .connect(seller)
        .approve(await auction.getAddress(), 0);

      await expect(
        auction
          .connect(bidder1)
          .createAuction(
            await nftCollection.getAddress(),
            0,
            MIN_PRICE,
            DURATION
          )
      ).to.be.revertedWith("Not the owner of this NFT");
    });

    it("Should revert if auction contract not approved", async function () {
      await expect(
        auction
          .connect(seller)
          .createAuction(
            await nftCollection.getAddress(),
            0,
            MIN_PRICE,
            DURATION
          )
      ).to.be.revertedWith("Auction contract not approved");
    });

    it("Should revert if NFT contract is zero address", async function () {
      await expect(
        auction
          .connect(seller)
          .createAuction(ethers.ZeroAddress, 0, MIN_PRICE, DURATION)
      ).to.be.revertedWith("Invalid NFT contract");
    });
  });

  describe("Placing Bids", function () {
    let auctionId: number;

    beforeEach(async function () {
      const result = await mintAndCreateAuction(seller);
      auctionId = result.auctionId;
    });

    it("Should allow placing a valid bid", async function () {
      await expect(
        auction.connect(bidder1).placeBid(auctionId, { value: MIN_PRICE })
      )
        .to.emit(auction, "BidPlaced")
        .withArgs(auctionId, bidder1.address, MIN_PRICE);

      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.highestBid).to.equal(MIN_PRICE);
      expect(auctionData.highestBidder).to.equal(bidder1.address);
    });

    it("Should track bidders for auto-refund", async function () {
      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: MIN_PRICE });
      await auction
        .connect(bidder2)
        .placeBid(auctionId, { value: MIN_PRICE * 2n });
      await auction
        .connect(bidder3)
        .placeBid(auctionId, { value: MIN_PRICE * 3n });

      const bidders = await auction.getAuctionBidders(auctionId);
      expect(bidders.length).to.equal(3);
      expect(bidders[0]).to.equal(bidder1.address);
      expect(bidders[1]).to.equal(bidder2.address);
      expect(bidders[2]).to.equal(bidder3.address);
    });

    it("Should allow outbidding and add previous bid to pendingReturns", async function () {
      const bid1 = MIN_PRICE;
      const bid2 = MIN_PRICE * 2n;

      await auction.connect(bidder1).placeBid(auctionId, { value: bid1 });
      await auction.connect(bidder2).placeBid(auctionId, { value: bid2 });

      expect(await auction.pendingReturns(bidder1.address)).to.equal(bid1);

      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.highestBidder).to.equal(bidder2.address);
      expect(auctionData.highestBid).to.equal(bid2);
    });

    it("Should not add duplicate bidder to tracker", async function () {
      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: MIN_PRICE });
      await auction
        .connect(bidder2)
        .placeBid(auctionId, { value: MIN_PRICE * 2n });
      // bidder1 bids again (higher)
      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: MIN_PRICE * 3n });

      const bidders = await auction.getAuctionBidders(auctionId);
      expect(bidders.length).to.equal(2); // only 2 unique bidders
    });

    it("Should revert if bid is below min price", async function () {
      await expect(
        auction
          .connect(bidder1)
          .placeBid(auctionId, { value: MIN_PRICE / 2n })
      ).to.be.revertedWith("Bid must be >= minimum price");
    });

    it("Should revert if bid is not higher than current highest", async function () {
      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: MIN_PRICE });

      await expect(
        auction
          .connect(bidder2)
          .placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("Should revert if seller tries to bid", async function () {
      await expect(
        auction.connect(seller).placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Seller cannot bid");
    });

    it("Should revert if auction has expired", async function () {
      await advanceTime(DURATION + 1);

      await expect(
        auction.connect(bidder1).placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Auction has expired");
    });

    it("Should revert if auction is not active", async function () {
      // Cancel by finalizing with no bids
      await auction.connect(seller).finalizeAuction(auctionId);

      await expect(
        auction.connect(bidder1).placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Auction is not active");
    });
  });

  describe("Finalize Auction — With Winner", function () {
    let auctionId: number;

    beforeEach(async function () {
      const result = await mintAndCreateAuction(seller);
      auctionId = result.auctionId;
    });

    it("Should finalize, transfer NFT to winner, pay seller minus commission", async function () {
      const bidAmount = ethers.parseEther("0.01");

      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: bidAmount });

      const sellerBalBefore = await ethers.provider.getBalance(seller.address);

      await advanceTime(DURATION + 1);

      const tx = await auction.connect(seller).finalizeAuction(auctionId);
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed.toString()) * receipt!.gasPrice;

      await expect(tx)
        .to.emit(auction, "AuctionFinalized")
        .withArgs(auctionId, bidder1.address, bidAmount);

      // NFT transferred to winner
      expect(await nftCollection.ownerOf(0)).to.equal(bidder1.address);

      // Seller gets proceeds minus gas
      const commission = (bidAmount * 250n) / 10000n;
      const expectedProceeds = bidAmount - commission;
      const sellerBalAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalAfter - sellerBalBefore + gasUsed).to.equal(
        expectedProceeds
      );

      // Auction marked as ended
      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.ended).to.be.true;
      expect(auctionData.active).to.be.false;
    });

    it("Should send commission directly to owner", async function () {
      const bidAmount = ethers.parseEther("1.0");

      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: bidAmount });

      await advanceTime(DURATION + 1);

      const ownerBalBefore = await ethers.provider.getBalance(owner.address);
      await auction.connect(seller).finalizeAuction(auctionId);
      const ownerBalAfter = await ethers.provider.getBalance(owner.address);

      const commission = ethers.parseEther("0.025"); // 2.5% of 1 ETH
      expect(ownerBalAfter - ownerBalBefore).to.equal(commission);
    });

    it("Should auto-refund all outbid bidders in one transaction", async function () {
      const bid1 = ethers.parseEther("0.001");
      const bid2 = ethers.parseEther("0.002");
      const bid3 = ethers.parseEther("0.003");

      await auction.connect(bidder1).placeBid(auctionId, { value: bid1 });
      await auction.connect(bidder2).placeBid(auctionId, { value: bid2 });
      await auction.connect(bidder3).placeBid(auctionId, { value: bid3 });

      // Verify pending returns exist
      expect(await auction.pendingReturns(bidder1.address)).to.equal(bid1);
      expect(await auction.pendingReturns(bidder2.address)).to.equal(bid2);

      const bidder1BalBefore = await ethers.provider.getBalance(
        bidder1.address
      );
      const bidder2BalBefore = await ethers.provider.getBalance(
        bidder2.address
      );

      await advanceTime(DURATION + 1);

      const tx = await auction.connect(seller).finalizeAuction(auctionId);

      // Should emit BidRefunded events
      await expect(tx)
        .to.emit(auction, "BidRefunded")
        .withArgs(bidder1.address, bid1);
      await expect(tx)
        .to.emit(auction, "BidRefunded")
        .withArgs(bidder2.address, bid2);

      // Pending returns should be zeroed out
      expect(await auction.pendingReturns(bidder1.address)).to.equal(0);
      expect(await auction.pendingReturns(bidder2.address)).to.equal(0);

      // Bidders should have received their ETH back
      const bidder1BalAfter = await ethers.provider.getBalance(
        bidder1.address
      );
      const bidder2BalAfter = await ethers.provider.getBalance(
        bidder2.address
      );
      expect(bidder1BalAfter - bidder1BalBefore).to.equal(bid1);
      expect(bidder2BalAfter - bidder2BalBefore).to.equal(bid2);

      // Winner (bidder3) NFT check
      expect(await nftCollection.ownerOf(0)).to.equal(bidder3.address);
    });

    it("Should revert if non-seller tries to finalize", async function () {
      await advanceTime(DURATION + 1);

      await expect(
        auction.connect(bidder1).finalizeAuction(auctionId)
      ).to.be.revertedWith("Only seller can finalize");

      await expect(
        auction.connect(owner).finalizeAuction(auctionId)
      ).to.be.revertedWith("Only seller can finalize");
    });

    it("Should revert if auction has not expired (with bids)", async function () {
      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: MIN_PRICE });

      await expect(
        auction.connect(seller).finalizeAuction(auctionId)
      ).to.be.revertedWith("Auction has not expired yet");
    });

    it("Should revert if already finalized", async function () {
      await advanceTime(DURATION + 1);
      await auction.connect(seller).finalizeAuction(auctionId);

      await expect(
        auction.connect(seller).finalizeAuction(auctionId)
      ).to.be.revertedWith("Auction is not active");
    });
  });

  describe("Finalize Auction — Cancel (No Bids)", function () {
    let auctionId: number;

    beforeEach(async function () {
      const result = await mintAndCreateAuction(seller);
      auctionId = result.auctionId;
    });

    it("Should cancel and return NFT to seller when no bids", async function () {
      await expect(auction.connect(seller).finalizeAuction(auctionId))
        .to.emit(auction, "AuctionCancelled")
        .withArgs(auctionId);

      // NFT returned to seller
      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);

      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.active).to.be.false;
      expect(auctionData.ended).to.be.true;
    });

    it("Should allow cancel anytime when no bids (even before expiry)", async function () {
      // Don't advance time — cancel immediately
      const tx = await auction.connect(seller).finalizeAuction(auctionId);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);
    });

    it("Should revert if non-seller tries to cancel", async function () {
      await expect(
        auction.connect(bidder1).finalizeAuction(auctionId)
      ).to.be.revertedWith("Only seller can finalize");
    });
  });

  describe("Safety Withdraw (Fallback)", function () {
    it("Should allow manual withdraw if bidder has pending returns", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);
      const bid1 = MIN_PRICE;
      const bid2 = MIN_PRICE * 2n;

      await auction.connect(bidder1).placeBid(auctionId, { value: bid1 });
      await auction.connect(bidder2).placeBid(auctionId, { value: bid2 });

      // Manually withdraw (safety fallback)
      const balBefore = await ethers.provider.getBalance(bidder1.address);
      const tx = await auction.connect(bidder1).withdraw();
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed.toString()) * receipt!.gasPrice;
      const balAfter = await ethers.provider.getBalance(bidder1.address);

      expect(balAfter - balBefore + gasUsed).to.equal(bid1);
      expect(await auction.pendingReturns(bidder1.address)).to.equal(0);
    });

    it("Should revert if no funds to withdraw", async function () {
      await expect(
        auction.connect(bidder1).withdraw()
      ).to.be.revertedWith("No funds to withdraw");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set platform fee", async function () {
      await auction.setPlatformFee(500); // 5%
      expect(await auction.platformFeePercentage()).to.equal(500);
    });

    it("Should revert if fee exceeds 10%", async function () {
      await expect(auction.setPlatformFee(1001)).to.be.revertedWith(
        "Fee cannot exceed 10%"
      );
    });

    it("Should revert if non-owner sets platform fee", async function () {
      await expect(
        auction.connect(seller).setPlatformFee(500)
      ).to.be.revertedWithCustomError(auction, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    it("Should return correct total auctions", async function () {
      expect(await auction.totalAuctions()).to.equal(0);

      await mintAndCreateAuction(seller);
      expect(await auction.totalAuctions()).to.equal(1);

      await mintAndCreateAuction(seller);
      expect(await auction.totalAuctions()).to.equal(2);
    });

    it("Should fetch active auctions", async function () {
      await mintAndCreateAuction(seller);
      await mintAndCreateAuction(seller);
      await mintAndCreateAuction(seller);

      let active = await auction.fetchActiveAuctions();
      expect(active.length).to.equal(3);

      // Cancel one (no bids)
      await auction.connect(seller).finalizeAuction(0);

      active = await auction.fetchActiveAuctions();
      expect(active.length).to.equal(2);
    });

    it("Should fetch auctions by seller", async function () {
      await mintAndCreateAuction(seller);
      await mintAndCreateAuction(seller);

      const sellerAuctions = await auction.fetchAuctionsBySeller(
        seller.address
      );
      expect(sellerAuctions.length).to.equal(2);

      const bidderAuctions = await auction.fetchAuctionsBySeller(
        bidder1.address
      );
      expect(bidderAuctions.length).to.equal(0);
    });

    it("Should fetch auctions won", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: MIN_PRICE });

      await advanceTime(DURATION + 1);
      await auction.connect(seller).finalizeAuction(auctionId);

      const won = await auction.fetchAuctionsWon(bidder1.address);
      expect(won.length).to.equal(1);
      expect(won[0].highestBidder).to.equal(bidder1.address);

      const otherWon = await auction.fetchAuctionsWon(bidder2.address);
      expect(otherWon.length).to.equal(0);
    });

    it("Should return auction bidders", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: MIN_PRICE });
      await auction
        .connect(bidder2)
        .placeBid(auctionId, { value: MIN_PRICE * 2n });

      const bidders = await auction.getAuctionBidders(auctionId);
      expect(bidders.length).to.equal(2);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle 3 bidders with increasing bids correctly", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      const bid1 = ethers.parseEther("0.001");
      const bid2 = ethers.parseEther("0.002");
      const bid3 = ethers.parseEther("0.003");

      await auction.connect(bidder1).placeBid(auctionId, { value: bid1 });
      await auction.connect(bidder2).placeBid(auctionId, { value: bid2 });
      await auction.connect(bidder3).placeBid(auctionId, { value: bid3 });

      await advanceTime(DURATION + 1);

      const b1Before = await ethers.provider.getBalance(bidder1.address);
      const b2Before = await ethers.provider.getBalance(bidder2.address);

      await auction.connect(seller).finalizeAuction(auctionId);

      // Bidder 3 wins, gets NFT
      expect(await nftCollection.ownerOf(0)).to.equal(bidder3.address);

      // Bidder 1 and 2 get auto-refunded
      const b1After = await ethers.provider.getBalance(bidder1.address);
      const b2After = await ethers.provider.getBalance(bidder2.address);
      expect(b1After - b1Before).to.equal(bid1);
      expect(b2After - b2Before).to.equal(bid2);
    });

    it("Should handle multiple auctions independently", async function () {
      const r1 = await mintAndCreateAuction(seller);
      const r2 = await mintAndCreateAuction(seller);

      // Bid on first only
      await auction
        .connect(bidder1)
        .placeBid(r1.auctionId, { value: MIN_PRICE });

      // Cancel second (no bids)
      await auction.connect(seller).finalizeAuction(r2.auctionId);

      // Finalize first
      await advanceTime(DURATION + 1);
      await auction.connect(seller).finalizeAuction(r1.auctionId);

      expect(await nftCollection.ownerOf(r1.tokenId)).to.equal(
        bidder1.address
      );
      expect(await nftCollection.ownerOf(r2.tokenId)).to.equal(seller.address);
    });

    it("Should prevent double finalization", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      await advanceTime(DURATION + 1);
      await auction.connect(seller).finalizeAuction(auctionId);

      await expect(
        auction.connect(seller).finalizeAuction(auctionId)
      ).to.be.revertedWith("Auction is not active");
    });

    it("Should prevent bidding after cancellation", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      await auction.connect(seller).finalizeAuction(auctionId);

      await expect(
        auction.connect(bidder1).placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Auction is not active");
    });

    it("Should correctly calculate commission on large bids", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);
      const bidAmount = ethers.parseEther("1.0"); // 1 ETH

      await auction
        .connect(bidder1)
        .placeBid(auctionId, { value: bidAmount });

      await advanceTime(DURATION + 1);

      const ownerBefore = await ethers.provider.getBalance(owner.address);
      const sellerBefore = await ethers.provider.getBalance(seller.address);

      const tx = await auction.connect(seller).finalizeAuction(auctionId);
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed.toString()) * receipt!.gasPrice;

      const ownerAfter = await ethers.provider.getBalance(owner.address);
      const sellerAfter = await ethers.provider.getBalance(seller.address);

      const commission = ethers.parseEther("0.025");
      const proceeds = bidAmount - commission;

      expect(ownerAfter - ownerBefore).to.equal(commission);
      expect(sellerAfter - sellerBefore + gasUsed).to.equal(proceeds);
    });
  });
});
