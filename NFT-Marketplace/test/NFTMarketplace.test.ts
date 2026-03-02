import { expect } from "chai";
import { network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";

const { ethers } = await network.connect();

describe("NFTMarketplace", function () {
  let nftCollection: any;
  let marketplace: any;
  let owner: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const NFT_NAME = "Test NFT Collection";
  const NFT_SYMBOL = "TNFT";
  const TOKEN_URI = "ipfs://QmTest/metadata.json";
  const LISTING_PRICE = ethers.parseEther("0.0001");
  const SALE_PRICE = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, seller, buyer, other] = await ethers.getSigners();

    // Deploy NFT Collection
    const NFTCollectionFactory =
      await ethers.getContractFactory("NFTCollection");
    nftCollection = await NFTCollectionFactory.deploy(NFT_NAME, NFT_SYMBOL);
    await nftCollection.waitForDeployment();

    // Deploy Marketplace with listing price
    const NFTMarketplaceFactory =
      await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplaceFactory.deploy(LISTING_PRICE);
    await marketplace.waitForDeployment();
  });

  // Helper: mint an NFT to a user and return token ID
  async function mintNFT(to: HardhatEthersSigner): Promise<number> {
    const totalBefore = await nftCollection.totalMinted();
    await nftCollection.connect(to).mint(to.address, TOKEN_URI);
    return Number(totalBefore);
  }

  // Helper: mint, approve, and list an NFT
  async function mintAndList(
    lister: HardhatEthersSigner,
    price: bigint = SALE_PRICE
  ): Promise<number> {
    const tokenId = await mintNFT(lister);
    await nftCollection
      .connect(lister)
      .setApprovalForAll(await marketplace.getAddress(), true);
    await marketplace
      .connect(lister)
      .listNFT(await nftCollection.getAddress(), tokenId, price, {
        value: LISTING_PRICE,
      });
    return tokenId;
  }

  describe("NFTCollection Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await nftCollection.name()).to.equal(NFT_NAME);
      expect(await nftCollection.symbol()).to.equal(NFT_SYMBOL);
    });

    it("Should start with zero minted tokens", async function () {
      expect(await nftCollection.totalMinted()).to.equal(0);
    });
  });

  describe("NFTCollection Minting", function () {
    it("Should allow anyone to mint NFTs", async function () {
      // Seller can mint
      await expect(
        nftCollection.connect(seller).mint(seller.address, TOKEN_URI)
      )
        .to.emit(nftCollection, "NFTMinted")
        .withArgs(seller.address, 0, TOKEN_URI);

      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);
      expect(await nftCollection.tokenURI(0)).to.equal(TOKEN_URI);

      // Buyer can also mint
      await nftCollection.connect(buyer).mint(buyer.address, TOKEN_URI);
      expect(await nftCollection.ownerOf(1)).to.equal(buyer.address);
    });

    it("Should track the creator of each token", async function () {
      await nftCollection.connect(seller).mint(seller.address, TOKEN_URI);
      expect(await nftCollection.getCreator(0)).to.equal(seller.address);

      await nftCollection.connect(buyer).mint(buyer.address, TOKEN_URI);
      expect(await nftCollection.getCreator(1)).to.equal(buyer.address);
    });

    it("Should increment token counter correctly", async function () {
      await nftCollection.connect(seller).mint(seller.address, TOKEN_URI);
      expect(await nftCollection.totalMinted()).to.equal(1);

      await nftCollection.connect(buyer).mint(buyer.address, TOKEN_URI);
      expect(await nftCollection.totalMinted()).to.equal(2);
    });

    it("Should revert when minting to zero address", async function () {
      await expect(
        nftCollection.connect(seller).mint(ethers.ZeroAddress, TOKEN_URI)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should revert when token URI is empty", async function () {
      await expect(
        nftCollection.connect(seller).mint(seller.address, "")
      ).to.be.revertedWith("Token URI cannot be empty");
    });

    it("Should revert getCreator for non-existent token", async function () {
      await expect(nftCollection.getCreator(0)).to.be.revertedWith(
        "Token does not exist"
      );
    });

    it("Should allow minting unlimited NFTs", async function () {
      for (let i = 0; i < 15; i++) {
        await nftCollection.connect(seller).mint(seller.address, TOKEN_URI);
      }
      expect(await nftCollection.totalMinted()).to.equal(15);
    });
  });

  describe("Marketplace Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });

    it("Should set the listing price", async function () {
      expect(await marketplace.listingPrice()).to.equal(LISTING_PRICE);
      expect(await marketplace.getListingPrice()).to.equal(LISTING_PRICE);
    });

    it("Should set initial platform fee to 2.5%", async function () {
      expect(await marketplace.platformFeePercentage()).to.equal(250);
    });

    it("Should have zero accumulated fees initially", async function () {
      expect(await marketplace.accumulatedFees()).to.equal(0);
    });

    it("Should revert if listing price is 0", async function () {
      const NFTMarketplaceFactory =
        await ethers.getContractFactory("NFTMarketplace");
      await expect(NFTMarketplaceFactory.deploy(0)).to.be.revertedWith(
        "Listing price must be greater than 0"
      );
    });
  });

  describe("Listing NFTs", function () {
    beforeEach(async function () {
      // Mint an NFT to seller (anyone can mint)
      await nftCollection.connect(seller).mint(seller.address, TOKEN_URI);
    });

    it("Should allow NFT owner to list with fee payment", async function () {
      await nftCollection
        .connect(seller)
        .approve(await marketplace.getAddress(), 0);

      await expect(
        marketplace
          .connect(seller)
          .listNFT(await nftCollection.getAddress(), 0, SALE_PRICE, {
            value: LISTING_PRICE,
          })
      )
        .to.emit(marketplace, "NFTListed")
        .withArgs(
          0,
          seller.address,
          await nftCollection.getAddress(),
          0,
          SALE_PRICE
        );

      const listing = await marketplace.getListing(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(SALE_PRICE);
      expect(listing.active).to.be.true;
      expect(listing.sold).to.be.false;
      expect(listing.buyer).to.equal(ethers.ZeroAddress);
    });

    it("Should transfer NFT to marketplace as escrow", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await marketplace.getAddress(), true);

      await marketplace
        .connect(seller)
        .listNFT(await nftCollection.getAddress(), 0, SALE_PRICE, {
          value: LISTING_PRICE,
        });

      expect(await nftCollection.ownerOf(0)).to.equal(
        await marketplace.getAddress()
      );
    });

    it("Should accumulate listing fee", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await marketplace.getAddress(), true);

      await marketplace
        .connect(seller)
        .listNFT(await nftCollection.getAddress(), 0, SALE_PRICE, {
          value: LISTING_PRICE,
        });

      expect(await marketplace.accumulatedFees()).to.equal(LISTING_PRICE);
    });

    it("Should revert if listing fee is incorrect", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await marketplace.getAddress(), true);

      await expect(
        marketplace
          .connect(seller)
          .listNFT(await nftCollection.getAddress(), 0, SALE_PRICE, {
            value: 0,
          })
      ).to.be.revertedWith("Must pay the listing fee");
    });

    it("Should revert if price is 0", async function () {
      await nftCollection
        .connect(seller)
        .setApprovalForAll(await marketplace.getAddress(), true);

      await expect(
        marketplace
          .connect(seller)
          .listNFT(await nftCollection.getAddress(), 0, 0, {
            value: LISTING_PRICE,
          })
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should revert if not NFT owner", async function () {
      await nftCollection
        .connect(seller)
        .approve(await marketplace.getAddress(), 0);

      await expect(
        marketplace
          .connect(buyer)
          .listNFT(await nftCollection.getAddress(), 0, SALE_PRICE, {
            value: LISTING_PRICE,
          })
      ).to.be.revertedWith("Not the owner of this NFT");
    });

    it("Should revert if marketplace not approved", async function () {
      await expect(
        marketplace
          .connect(seller)
          .listNFT(await nftCollection.getAddress(), 0, SALE_PRICE, {
            value: LISTING_PRICE,
          })
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("Should revert if NFT contract is zero address", async function () {
      await expect(
        marketplace
          .connect(seller)
          .listNFT(ethers.ZeroAddress, 0, SALE_PRICE, {
            value: LISTING_PRICE,
          })
      ).to.be.revertedWith("Invalid NFT contract");
    });
  });

  describe("Buying NFTs", function () {
    let listingId: number;

    beforeEach(async function () {
      await mintAndList(seller);
      listingId = 0;
    });

    it("Should allow buying an NFT", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );

      await expect(
        marketplace.connect(buyer).buyNFT(listingId, { value: SALE_PRICE })
      )
        .to.emit(marketplace, "NFTSold")
        .withArgs(listingId, buyer.address, seller.address, SALE_PRICE);

      // Check NFT ownership transferred to buyer
      expect(await nftCollection.ownerOf(0)).to.equal(buyer.address);

      // Check listing is sold and inactive
      const listing = await marketplace.getListing(listingId);
      expect(listing.active).to.be.false;
      expect(listing.sold).to.be.true;
      expect(listing.buyer).to.equal(buyer.address);

      // Check seller received payment minus commission
      const sellerBalanceAfter = await ethers.provider.getBalance(
        seller.address
      );
      const commission = (SALE_PRICE * 250n) / 10000n;
      const expectedSellerProceeds = SALE_PRICE - commission;

      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(
        expectedSellerProceeds
      );

      // Check accumulated fees include listing fee + commission
      expect(await marketplace.accumulatedFees()).to.equal(
        LISTING_PRICE + commission
      );
    });

    it("Should revert if payment amount is incorrect", async function () {
      await expect(
        marketplace
          .connect(buyer)
          .buyNFT(listingId, { value: SALE_PRICE / 2n })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should revert if listing is not active", async function () {
      await marketplace
        .connect(buyer)
        .buyNFT(listingId, { value: SALE_PRICE });

      await expect(
        marketplace.connect(other).buyNFT(listingId, { value: SALE_PRICE })
      ).to.be.revertedWith("Listing is not active");
    });

    it("Should revert if buyer is the seller", async function () {
      await expect(
        marketplace
          .connect(seller)
          .buyNFT(listingId, { value: SALE_PRICE })
      ).to.be.revertedWith("Cannot buy your own NFT");
    });
  });

  describe("Cancelling Listings", function () {
    let listingId: number;

    beforeEach(async function () {
      await mintAndList(seller);
      listingId = 0;
    });

    it("Should allow seller to cancel and return NFT", async function () {
      // NFT is in escrow (marketplace holds it)
      expect(await nftCollection.ownerOf(0)).to.equal(
        await marketplace.getAddress()
      );

      await expect(marketplace.connect(seller).cancelListing(listingId))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(listingId);

      // NFT returned to seller
      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);

      const listing = await marketplace.getListing(listingId);
      expect(listing.active).to.be.false;
    });

    it("Should revert if not the seller", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(listingId)
      ).to.be.revertedWith("Not the seller");
    });

    it("Should revert if listing is not active", async function () {
      await marketplace.connect(seller).cancelListing(listingId);

      await expect(
        marketplace.connect(seller).cancelListing(listingId)
      ).to.be.revertedWith("Listing is not active");
    });
  });

  describe("Update Price", function () {
    let listingId: number;
    const NEW_PRICE = ethers.parseEther("0.005");

    beforeEach(async function () {
      await mintAndList(seller);
      listingId = 0;
    });

    it("Should allow seller to update price", async function () {
      await expect(
        marketplace.connect(seller).updatePrice(listingId, NEW_PRICE)
      )
        .to.emit(marketplace, "PriceUpdated")
        .withArgs(listingId, SALE_PRICE, NEW_PRICE);

      const listing = await marketplace.getListing(listingId);
      expect(listing.price).to.equal(NEW_PRICE);
    });

    it("Should revert if not the seller", async function () {
      await expect(
        marketplace.connect(buyer).updatePrice(listingId, NEW_PRICE)
      ).to.be.revertedWith("Not the seller");
    });

    it("Should revert if listing is not active", async function () {
      await marketplace.connect(seller).cancelListing(listingId);

      await expect(
        marketplace.connect(seller).updatePrice(listingId, NEW_PRICE)
      ).to.be.revertedWith("Listing is not active");
    });

    it("Should revert if new price is 0", async function () {
      await expect(
        marketplace.connect(seller).updatePrice(listingId, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });
  });

  describe("Update Listing Price", function () {
    const NEW_LISTING_PRICE = ethers.parseEther("0.0002");

    it("Should allow owner to update listing price", async function () {
      await expect(marketplace.updateListingPrice(NEW_LISTING_PRICE))
        .to.emit(marketplace, "ListingPriceUpdated")
        .withArgs(LISTING_PRICE, NEW_LISTING_PRICE);

      expect(await marketplace.getListingPrice()).to.equal(NEW_LISTING_PRICE);
    });

    it("Should revert if not owner", async function () {
      await expect(
        marketplace.connect(seller).updateListingPrice(NEW_LISTING_PRICE)
      ).to.be.revertedWithCustomError(
        marketplace,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should revert if new listing price is 0", async function () {
      await expect(marketplace.updateListingPrice(0)).to.be.revertedWith(
        "Listing price must be greater than 0"
      );
    });
  });

  describe("Withdrawing Fees", function () {
    beforeEach(async function () {
      // Create and complete a sale to accumulate fees (listing fee + commission)
      await mintAndList(seller);
      await marketplace
        .connect(buyer)
        .buyNFT(0, { value: SALE_PRICE });
    });

    it("Should allow owner to withdraw fees", async function () {
      const accumulatedFees = await marketplace.accumulatedFees();
      const ownerBalanceBefore = await ethers.provider.getBalance(
        owner.address
      );

      const tx = await marketplace.withdrawFees();
      const receipt = await tx.wait();

      const gasUsed = BigInt(receipt!.gasUsed.toString()) * receipt!.gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(
        owner.address
      );

      expect(ownerBalanceAfter - ownerBalanceBefore + gasUsed).to.equal(
        accumulatedFees
      );
      expect(await marketplace.accumulatedFees()).to.equal(0);
    });

    it("Should emit FeesWithdrawn event", async function () {
      const accumulatedFees = await marketplace.accumulatedFees();

      await expect(marketplace.withdrawFees())
        .to.emit(marketplace, "FeesWithdrawn")
        .withArgs(owner.address, accumulatedFees);
    });

    it("Should revert if not owner", async function () {
      await expect(
        marketplace.connect(seller).withdrawFees()
      ).to.be.revertedWithCustomError(
        marketplace,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should revert if no fees to withdraw", async function () {
      await marketplace.withdrawFees();

      await expect(marketplace.withdrawFees()).to.be.revertedWith(
        "No fees to withdraw"
      );
    });
  });

  describe("Platform Fee Management", function () {
    it("Should allow owner to set platform fee", async function () {
      await marketplace.setPlatformFee(500); // 5%
      expect(await marketplace.platformFeePercentage()).to.equal(500);
    });

    it("Should revert if fee exceeds 10%", async function () {
      await expect(marketplace.setPlatformFee(1001)).to.be.revertedWith(
        "Fee cannot exceed 10%"
      );
    });

    it("Should revert if not owner", async function () {
      await expect(
        marketplace.connect(seller).setPlatformFee(500)
      ).to.be.revertedWithCustomError(
        marketplace,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("View Functions", function () {
    it("Should return correct total listings", async function () {
      expect(await marketplace.totalListings()).to.equal(0);

      await mintAndList(seller);
      expect(await marketplace.totalListings()).to.equal(1);
    });

    it("Should fetch all active market items", async function () {
      // List 3 NFTs
      await mintAndList(seller);
      await mintAndList(seller);
      await mintAndList(seller);

      let items = await marketplace.fetchMarketItems();
      expect(items.length).to.equal(3);

      // Buy one
      await marketplace
        .connect(buyer)
        .buyNFT(0, { value: SALE_PRICE });

      items = await marketplace.fetchMarketItems();
      expect(items.length).to.equal(2);

      // Cancel one
      await marketplace.connect(seller).cancelListing(1);

      items = await marketplace.fetchMarketItems();
      expect(items.length).to.equal(1);
      expect(items[0].listingId).to.equal(2);
    });

    it("Should fetch NFTs owned by a user (purchased)", async function () {
      await mintAndList(seller);
      await mintAndList(seller);

      // No purchases yet
      let myNfts = await marketplace.fetchMyNFTs(buyer.address);
      expect(myNfts.length).to.equal(0);

      // Buy one
      await marketplace
        .connect(buyer)
        .buyNFT(0, { value: SALE_PRICE });

      myNfts = await marketplace.fetchMyNFTs(buyer.address);
      expect(myNfts.length).to.equal(1);
      expect(myNfts[0].buyer).to.equal(buyer.address);
    });

    it("Should fetch items created (listed) by a user", async function () {
      await mintAndList(seller);
      await mintAndList(seller);

      const created = await marketplace.fetchItemsCreated(seller.address);
      expect(created.length).to.equal(2);
      expect(created[0].seller).to.equal(seller.address);
      expect(created[1].seller).to.equal(seller.address);

      // Other user has no listings
      const otherCreated = await marketplace.fetchItemsCreated(buyer.address);
      expect(otherCreated.length).to.equal(0);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should prevent buying after sale", async function () {
      await mintAndList(seller);

      await marketplace
        .connect(buyer)
        .buyNFT(0, { value: SALE_PRICE });

      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
      expect(listing.sold).to.be.true;

      await expect(
        marketplace.connect(other).buyNFT(0, { value: SALE_PRICE })
      ).to.be.revertedWith("Listing is not active");
    });

    it("Should handle multiple sales correctly", async function () {
      // Mint and list 3 NFTs
      for (let i = 0; i < 3; i++) {
        await mintAndList(seller);
      }

      // Buy all NFTs
      for (let i = 0; i < 3; i++) {
        await marketplace
          .connect(buyer)
          .buyNFT(i, { value: SALE_PRICE });
        expect(await nftCollection.ownerOf(i)).to.equal(buyer.address);
      }

      // Check accumulated fees = 3 listing fees + 3 commissions
      const commission = (SALE_PRICE * 250n) / 10000n;
      const expectedFees = LISTING_PRICE * 3n + commission * 3n;
      expect(await marketplace.accumulatedFees()).to.equal(expectedFees);
    });

    it("Should allow different prices for different listings", async function () {
      const price1 = ethers.parseEther("0.001");
      const price2 = ethers.parseEther("0.005");
      const price3 = ethers.parseEther("0.01");

      await mintAndList(seller, price1);
      await mintAndList(seller, price2);
      await mintAndList(seller, price3);

      expect((await marketplace.getListing(0)).price).to.equal(price1);
      expect((await marketplace.getListing(1)).price).to.equal(price2);
      expect((await marketplace.getListing(2)).price).to.equal(price3);
    });
  });
});
