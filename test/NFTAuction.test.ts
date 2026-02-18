import { expect } from "chai";
import { network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";

const { ethers } = await network.connect();

describe("NFTAuction", function () {
  let nftCollection: any;
  let auction: any;
  let owner: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const NFT_NAME = "Test NFT Collection";
  const NFT_SYMBOL = "TNFT";
  const TOKEN_URI = "ipfs://QmTest/metadata.json";
  const LISTING_PRICE = ethers.parseEther("0.0001");
  const MIN_PRICE = ethers.parseEther("0.001");
  const DURATION = 3600; // 1 hour

  beforeEach(async function () {
    [owner, seller, buyer, other] = await ethers.getSigners();

    // Deploy NFT Collection
    const NFTCollectionFactory =
      await ethers.getContractFactory("NFTCollection");
    nftCollection = await NFTCollectionFactory.deploy(NFT_NAME, NFT_SYMBOL);
    await nftCollection.waitForDeployment();

    // Deploy Auction
    const NFTAuctionFactory = await ethers.getContractFactory("NFTAuction");
    auction = await NFTAuctionFactory.deploy(LISTING_PRICE);
    await auction.waitForDeployment();
  });

  // Helper: mint an NFT to a user and return token ID
  async function mintNFT(to: HardhatEthersSigner): Promise<number> {
    const totalBefore = await nftCollection.totalMinted();
    await nftCollection.connect(to).mint(to.address, TOKEN_URI);
    return Number(totalBefore);
  }

  // Helper: mint, approve, and create auction
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
        duration,
        { value: LISTING_PRICE }
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

  // Helper: advance time by seconds
  async function advanceTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await auction.owner()).to.equal(owner.address);
    });

    it("Should set the listing price", async function () {
      expect(await auction.listingPrice()).to.equal(LISTING_PRICE);
      expect(await auction.getListingPrice()).to.equal(LISTING_PRICE);
    });

    it("Should set initial platform fee to 2.5%", async function () {
      expect(await auction.platformFeePercentage()).to.equal(250);
    });

    it("Should have zero accumulated fees initially", async function () {
      expect(await auction.accumulatedFees()).to.equal(0);
    });

    it("Should revert if listing price is 0", async function () {
      const Factory = await ethers.getContractFactory("NFTAuction");
      await expect(Factory.deploy(0)).to.be.revertedWith(
        "Listing price must be greater than 0"
      );
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
          DURATION,
          { value: LISTING_PRICE }
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
          DURATION,
          { value: LISTING_PRICE }
        );

      expect(await nftCollection.ownerOf(0)).to.equal(
        await auction.getAddress()
      );
    });

    it("Should accumulate listing fee", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await auction.getAddress(), true);

      await auction
        .connect(seller)
        .createAuction(
          await nftCollection.getAddress(),
          0,
          MIN_PRICE,
          DURATION,
          { value: LISTING_PRICE }
        );

      expect(await auction.accumulatedFees()).to.equal(LISTING_PRICE);
    });

    it("Should revert if listing fee is incorrect", async function () {
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
            DURATION,
            { value: 0 }
          )
      ).to.be.revertedWith("Must pay the listing fee");
    });

    it("Should revert if min price is 0", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await auction.getAddress(), true);

      await expect(
        auction
          .connect(seller)
          .createAuction(
            await nftCollection.getAddress(),
            0,
            0,
            DURATION,
            { value: LISTING_PRICE }
          )
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
            0,
            { value: LISTING_PRICE }
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
            thirtyOneDays,
            { value: LISTING_PRICE }
          )
      ).to.be.revertedWith("Duration cannot exceed 30 days");
    });

    it("Should revert if not NFT owner", async function () {
      await nftCollection
        .connect(seller)
        .approve(await auction.getAddress(), 0);

      await expect(
        auction
          .connect(buyer)
          .createAuction(
            await nftCollection.getAddress(),
            0,
            MIN_PRICE,
            DURATION,
            { value: LISTING_PRICE }
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
            DURATION,
            { value: LISTING_PRICE }
          )
      ).to.be.revertedWith("Auction contract not approved");
    });

    it("Should revert if NFT contract is zero address", async function () {
      await expect(
        auction
          .connect(seller)
          .createAuction(ethers.ZeroAddress, 0, MIN_PRICE, DURATION, {
            value: LISTING_PRICE,
          })
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
      const bidAmount = MIN_PRICE;

      await expect(
        auction.connect(buyer).placeBid(auctionId, { value: bidAmount })
      )
        .to.emit(auction, "BidPlaced")
        .withArgs(auctionId, buyer.address, bidAmount);

      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.highestBid).to.equal(bidAmount);
      expect(auctionData.highestBidder).to.equal(buyer.address);
    });

    it("Should allow outbidding and add previous bid to pendingReturns", async function () {
      const bid1 = MIN_PRICE;
      const bid2 = MIN_PRICE * 2n;

      // First bid by buyer
      await auction.connect(buyer).placeBid(auctionId, { value: bid1 });

      // Second bid by other (outbids buyer)
      await auction.connect(other).placeBid(auctionId, { value: bid2 });

      // Check pending returns for outbid buyer
      expect(await auction.pendingReturns(buyer.address)).to.equal(bid1);

      // Check new highest bidder
      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.highestBidder).to.equal(other.address);
      expect(auctionData.highestBid).to.equal(bid2);
    });

    it("Should revert if bid is below min price", async function () {
      const lowBid = MIN_PRICE / 2n;

      await expect(
        auction.connect(buyer).placeBid(auctionId, { value: lowBid })
      ).to.be.revertedWith("Bid must be >= minimum price");
    });

    it("Should revert if bid is not higher than current highest", async function () {
      await auction
        .connect(buyer)
        .placeBid(auctionId, { value: MIN_PRICE });

      await expect(
        auction
          .connect(other)
          .placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("Should revert if seller tries to bid", async function () {
      await expect(
        auction
          .connect(seller)
          .placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Seller cannot bid");
    });

    it("Should revert if auction has expired", async function () {
      await advanceTime(DURATION + 1);

      await expect(
        auction
          .connect(buyer)
          .placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Auction has expired");
    });

    it("Should revert if auction is not active", async function () {
      // Cancel the auction first (no bids)
      await auction.connect(seller).cancelAuction(auctionId);

      await expect(
        auction
          .connect(buyer)
          .placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Auction is not active");
    });

    it("Should accumulate pending returns across multiple outbids", async function () {
      const bid1 = MIN_PRICE;
      const bid2 = MIN_PRICE * 2n;
      const bid3 = MIN_PRICE * 3n;

      // buyer bids
      await auction.connect(buyer).placeBid(auctionId, { value: bid1 });
      // other outbids
      await auction.connect(other).placeBid(auctionId, { value: bid2 });
      // buyer outbids again
      await auction.connect(buyer).placeBid(auctionId, { value: bid3 });

      // other should have bid2 in pending returns
      expect(await auction.pendingReturns(other.address)).to.equal(bid2);
      // buyer should have bid1 in pending returns (from first outbid)
      expect(await auction.pendingReturns(buyer.address)).to.equal(bid1);
    });
  });

  describe("Finalizing Auctions", function () {
    let auctionId: number;

    beforeEach(async function () {
      const result = await mintAndCreateAuction(seller);
      auctionId = result.auctionId;
    });

    it("Should finalize with a winner and transfer NFT + funds", async function () {
      const bidAmount = ethers.parseEther("0.01");

      await auction
        .connect(buyer)
        .placeBid(auctionId, { value: bidAmount });

      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );

      // Advance time past auction end
      await advanceTime(DURATION + 1);

      await expect(auction.connect(owner).finalizeAuction(auctionId))
        .to.emit(auction, "AuctionFinalized")
        .withArgs(auctionId, buyer.address, bidAmount);

      // NFT transferred to winner
      expect(await nftCollection.ownerOf(0)).to.equal(buyer.address);

      // Seller gets bid minus commission
      const sellerBalanceAfter = await ethers.provider.getBalance(
        seller.address
      );
      const commission = (bidAmount * 250n) / 10000n;
      const expectedProceeds = bidAmount - commission;

      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(
        expectedProceeds
      );

      // Commission accumulated
      expect(await auction.accumulatedFees()).to.equal(
        LISTING_PRICE + commission
      );

      // Auction marked as ended
      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.ended).to.be.true;
      expect(auctionData.active).to.be.false;
    });

    it("Should finalize with no bids and return NFT to seller", async function () {
      await advanceTime(DURATION + 1);

      await expect(auction.connect(owner).finalizeAuction(auctionId))
        .to.emit(auction, "AuctionFinalized")
        .withArgs(auctionId, ethers.ZeroAddress, 0);

      // NFT returned to seller
      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);
    });

    it("Should allow anyone to finalize", async function () {
      await advanceTime(DURATION + 1);

      // Other (non-owner, non-seller) can finalize
      const tx = await auction.connect(other).finalizeAuction(auctionId);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.ended).to.be.true;
    });

    it("Should revert if auction has not expired", async function () {
      await expect(
        auction.connect(owner).finalizeAuction(auctionId)
      ).to.be.revertedWith("Auction has not expired yet");
    });

    it("Should revert if already finalized", async function () {
      await advanceTime(DURATION + 1);
      await auction.connect(owner).finalizeAuction(auctionId);

      await expect(
        auction.connect(owner).finalizeAuction(auctionId)
      ).to.be.revertedWith("Auction is not active");
    });
  });

  describe("Cancelling Auctions", function () {
    let auctionId: number;

    beforeEach(async function () {
      const result = await mintAndCreateAuction(seller);
      auctionId = result.auctionId;
    });

    it("Should allow seller to cancel if no bids", async function () {
      await expect(auction.connect(seller).cancelAuction(auctionId))
        .to.emit(auction, "AuctionCancelled")
        .withArgs(auctionId);

      // NFT returned to seller
      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);

      const auctionData = await auction.getAuction(auctionId);
      expect(auctionData.active).to.be.false;
      expect(auctionData.ended).to.be.true;
    });

    it("Should revert if bids have been placed", async function () {
      await auction
        .connect(buyer)
        .placeBid(auctionId, { value: MIN_PRICE });

      await expect(
        auction.connect(seller).cancelAuction(auctionId)
      ).to.be.revertedWith("Cannot cancel auction with bids");
    });

    it("Should revert if not the seller", async function () {
      await expect(
        auction.connect(buyer).cancelAuction(auctionId)
      ).to.be.revertedWith("Not the seller");
    });

    it("Should revert if auction is not active", async function () {
      await auction.connect(seller).cancelAuction(auctionId);

      await expect(
        auction.connect(seller).cancelAuction(auctionId)
      ).to.be.revertedWith("Auction is not active");
    });
  });

  describe("Withdrawing Bid Returns", function () {
    let auctionId: number;

    beforeEach(async function () {
      const result = await mintAndCreateAuction(seller);
      auctionId = result.auctionId;
    });

    it("Should allow outbid bidder to withdraw", async function () {
      const bid1 = MIN_PRICE;
      const bid2 = MIN_PRICE * 2n;

      // buyer bids, then gets outbid by other
      await auction.connect(buyer).placeBid(auctionId, { value: bid1 });
      await auction.connect(other).placeBid(auctionId, { value: bid2 });

      expect(await auction.pendingReturns(buyer.address)).to.equal(bid1);

      const balanceBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await auction.connect(buyer).withdraw();
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed.toString()) * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(balanceAfter - balanceBefore + gasUsed).to.equal(bid1);

      // Pending returns zeroed
      expect(await auction.pendingReturns(buyer.address)).to.equal(0);
    });

    it("Should emit BidWithdrawn event", async function () {
      const bid1 = MIN_PRICE;
      const bid2 = MIN_PRICE * 2n;

      await auction.connect(buyer).placeBid(auctionId, { value: bid1 });
      await auction.connect(other).placeBid(auctionId, { value: bid2 });

      await expect(auction.connect(buyer).withdraw())
        .to.emit(auction, "BidWithdrawn")
        .withArgs(buyer.address, bid1);
    });

    it("Should revert if no funds to withdraw", async function () {
      await expect(
        auction.connect(buyer).withdraw()
      ).to.be.revertedWith("No funds to withdraw");
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to withdraw accumulated fees", async function () {
      // Create and finalize an auction with a bid
      const { auctionId } = await mintAndCreateAuction(seller);
      const bidAmount = ethers.parseEther("0.01");

      await auction
        .connect(buyer)
        .placeBid(auctionId, { value: bidAmount });

      await advanceTime(DURATION + 1);
      await auction.connect(owner).finalizeAuction(auctionId);

      const accFees = await auction.accumulatedFees();
      expect(accFees).to.be.gt(0);

      const ownerBalBefore = await ethers.provider.getBalance(owner.address);

      const tx = await auction.withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = BigInt(receipt!.gasUsed.toString()) * receipt!.gasPrice;

      const ownerBalAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalAfter - ownerBalBefore + gasUsed).to.equal(accFees);
      expect(await auction.accumulatedFees()).to.equal(0);
    });

    it("Should emit FeesWithdrawn event", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);
      await auction
        .connect(buyer)
        .placeBid(auctionId, { value: MIN_PRICE });
      await advanceTime(DURATION + 1);
      await auction.connect(owner).finalizeAuction(auctionId);

      const accFees = await auction.accumulatedFees();

      await expect(auction.withdrawFees())
        .to.emit(auction, "FeesWithdrawn")
        .withArgs(owner.address, accFees);
    });

    it("Should revert if not owner tries to withdraw fees", async function () {
      await expect(
        auction.connect(seller).withdrawFees()
      ).to.be.revertedWithCustomError(
        auction,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should revert if no fees to withdraw", async function () {
      await expect(auction.withdrawFees()).to.be.revertedWith(
        "No fees to withdraw"
      );
    });

    it("Should allow owner to update listing price", async function () {
      const newPrice = ethers.parseEther("0.0002");

      await expect(auction.updateListingPrice(newPrice))
        .to.emit(auction, "ListingPriceUpdated")
        .withArgs(LISTING_PRICE, newPrice);

      expect(await auction.getListingPrice()).to.equal(newPrice);
    });

    it("Should revert if non-owner updates listing price", async function () {
      await expect(
        auction.connect(seller).updateListingPrice(ethers.parseEther("0.0002"))
      ).to.be.revertedWithCustomError(
        auction,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should allow owner to set platform fee", async function () {
      await auction.setPlatformFee(500); // 5%
      expect(await auction.platformFeePercentage()).to.equal(500);
    });

    it("Should revert if fee exceeds 10%", async function () {
      await expect(auction.setPlatformFee(1001)).to.be.revertedWith(
        "Fee cannot exceed 10%"
      );
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

      // Cancel one
      await auction.connect(seller).cancelAuction(0);

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

      const buyerAuctions = await auction.fetchAuctionsBySeller(
        buyer.address
      );
      expect(buyerAuctions.length).to.equal(0);
    });

    it("Should fetch auctions won", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      await auction
        .connect(buyer)
        .placeBid(auctionId, { value: MIN_PRICE });

      await advanceTime(DURATION + 1);
      await auction.connect(owner).finalizeAuction(auctionId);

      const won = await auction.fetchAuctionsWon(buyer.address);
      expect(won.length).to.equal(1);
      expect(won[0].highestBidder).to.equal(buyer.address);

      const otherWon = await auction.fetchAuctionsWon(other.address);
      expect(otherWon.length).to.equal(0);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle multiple auctions independently", async function () {
      const r1 = await mintAndCreateAuction(seller);
      const r2 = await mintAndCreateAuction(seller);

      // Bid on first only
      await auction
        .connect(buyer)
        .placeBid(r1.auctionId, { value: MIN_PRICE });

      // Cancel second (no bids)
      await auction.connect(seller).cancelAuction(r2.auctionId);

      // Finalize first
      await advanceTime(DURATION + 1);
      await auction.connect(owner).finalizeAuction(r1.auctionId);

      // First NFT goes to buyer, second returns to seller
      expect(await nftCollection.ownerOf(r1.tokenId)).to.equal(buyer.address);
      expect(await nftCollection.ownerOf(r2.tokenId)).to.equal(seller.address);
    });

    it("Should prevent double finalization", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      await advanceTime(DURATION + 1);
      await auction.connect(owner).finalizeAuction(auctionId);

      await expect(
        auction.connect(owner).finalizeAuction(auctionId)
      ).to.be.revertedWith("Auction is not active");
    });

    it("Should prevent bidding after cancellation", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);

      await auction.connect(seller).cancelAuction(auctionId);

      await expect(
        auction.connect(buyer).placeBid(auctionId, { value: MIN_PRICE })
      ).to.be.revertedWith("Auction is not active");
    });

    it("Should correctly handle commission calculation", async function () {
      const { auctionId } = await mintAndCreateAuction(seller);
      const bidAmount = ethers.parseEther("1.0"); // 1 ETH

      await auction
        .connect(buyer)
        .placeBid(auctionId, { value: bidAmount });

      await advanceTime(DURATION + 1);

      const sellerBefore = await ethers.provider.getBalance(seller.address);
      await auction.connect(owner).finalizeAuction(auctionId);
      const sellerAfter = await ethers.provider.getBalance(seller.address);

      // 2.5% of 1 ETH = 0.025 ETH commission
      const commission = ethers.parseEther("0.025");
      const expectedProceeds = bidAmount - commission;

      expect(sellerAfter - sellerBefore).to.equal(expectedProceeds);
    });
  });
});
