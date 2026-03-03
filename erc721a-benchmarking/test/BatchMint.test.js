const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BatchMint (ERC721A)", function () {
  let batchMint, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const BatchMint = await ethers.getContractFactory("BatchMint");
    batchMint = await BatchMint.deploy("BatchMint", "BATCH", "https://example.com/metadata/");
    await batchMint.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy with correct name and symbol", async function () {
      expect(await batchMint.name()).to.equal("BatchMint");
      expect(await batchMint.symbol()).to.equal("BATCH");
    });

    it("should start with 0 total supply", async function () {
      expect(await batchMint.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("should mint single NFT", async function () {
      await batchMint.connect(addr1).mint(1);
      expect(await batchMint.balanceOf(addr1.address)).to.equal(1);
      expect(await batchMint.ownerOf(0)).to.equal(addr1.address);
    });

    it("should mint 5 NFTs in batch", async function () {
      await batchMint.connect(addr1).mint(5);
      expect(await batchMint.balanceOf(addr1.address)).to.equal(5);
      expect(await batchMint.totalSupply()).to.equal(5);
    });

    it("should mint 10 NFTs in batch", async function () {
      await batchMint.connect(addr1).mint(10);
      expect(await batchMint.balanceOf(addr1.address)).to.equal(10);
      expect(await batchMint.totalSupply()).to.equal(10);
    });

    it("should fail when minting 0 NFTs", async function () {
      await expect(batchMint.connect(addr1).mint(0)).to.be.revertedWith(
        "Quantity must be greater than 0"
      );
    });

    it("should fail when exceeding max supply", async function () {
      await expect(batchMint.connect(addr1).mint(10001)).to.be.revertedWith(
        "Max supply exceeded"
      );
    });
  });

  describe("balanceOf verification (DoD #2)", function () {
    it("should return correct balance after batch mint of 5", async function () {
      await batchMint.connect(addr1).mint(5);
      const balance = await batchMint.balanceOf(addr1.address);
      expect(balance).to.equal(5);
      console.log(`      ✓ balanceOf after minting 5 NFTs: ${balance}`);
    });

    it("should return correct balance after batch mint of 10", async function () {
      await batchMint.connect(addr1).mint(10);
      const balance = await batchMint.balanceOf(addr1.address);
      expect(balance).to.equal(10);
      console.log(`      ✓ balanceOf after minting 10 NFTs: ${balance}`);
    });

    it("should track multiple addresses correctly", async function () {
      await batchMint.connect(addr1).mint(5);
      await batchMint.connect(addr2).mint(3);
      expect(await batchMint.balanceOf(addr1.address)).to.equal(5);
      expect(await batchMint.balanceOf(addr2.address)).to.equal(3);
    });
  });

  describe("ownerOf verification (DoD #3)", function () {
    it("should return correct owner for all tokens in batch (0-4)", async function () {
      await batchMint.connect(addr1).mint(5);
      
      expect(await batchMint.ownerOf(0)).to.equal(addr1.address);
      expect(await batchMint.ownerOf(2)).to.equal(addr1.address);
      expect(await batchMint.ownerOf(4)).to.equal(addr1.address);
      
      console.log(`      ✓ ownerOf(0): ${await batchMint.ownerOf(0)}`);
      console.log(`      ✓ ownerOf(2): ${await batchMint.ownerOf(2)}`);
      console.log(`      ✓ ownerOf(4): ${await batchMint.ownerOf(4)}`);
    });

    it("should return correct owner for all tokens in batch (5-14)", async function () {
      await batchMint.connect(addr1).mint(5);
      await batchMint.connect(addr2).mint(10);
      
      expect(await batchMint.ownerOf(5)).to.equal(addr2.address);
      expect(await batchMint.ownerOf(9)).to.equal(addr2.address);
      expect(await batchMint.ownerOf(14)).to.equal(addr2.address);
      
      console.log(`      ✓ ownerOf(5): ${await batchMint.ownerOf(5)}`);
      console.log(`      ✓ ownerOf(9): ${await batchMint.ownerOf(9)}`);
      console.log(`      ✓ ownerOf(14): ${await batchMint.ownerOf(14)}`);
    });

    it("should verify ownership for middle tokens in large batch", async function () {
      await batchMint.connect(addr1).mint(20);
      
      for (let i = 0; i < 20; i++) {
        expect(await batchMint.ownerOf(i)).to.equal(addr1.address);
      }
      console.log(`      ✓ All 20 tokens verified to belong to addr1`);
    });
  });

  describe("Token URI", function () {
    it("should return correct tokenURI", async function () {
      await batchMint.connect(addr1).mint(3);
      const tokenUri0 = await batchMint.tokenURI(0);
      const tokenUri1 = await batchMint.tokenURI(1);
      const tokenUri2 = await batchMint.tokenURI(2);
      
      expect(tokenUri0).to.equal("https://example.com/metadata/0");
      expect(tokenUri1).to.equal("https://example.com/metadata/1");
      expect(tokenUri2).to.equal("https://example.com/metadata/2");
    });
  });

  describe("Transfer", function () {
    it("should transfer NFT correctly", async function () {
      await batchMint.connect(addr1).mint(5);
      await batchMint.connect(addr1).transferFrom(addr1.address, addr2.address, 2);
      
      expect(await batchMint.ownerOf(2)).to.equal(addr2.address);
      expect(await batchMint.balanceOf(addr1.address)).to.equal(4);
      expect(await batchMint.balanceOf(addr2.address)).to.equal(1);
    });
  });
});
