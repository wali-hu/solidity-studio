const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Contracts Tests", function () {
  let owner, wallet1, wallet2;
  let erc721a, erc1155;

  // Deploy contracts before each test
  beforeEach(async function () {
    [owner, wallet1, wallet2] = await ethers.getSigners();
  });

  describe("ERC-721A Tests", function () {
    const NAME = "Gaming Characters";
    const SYMBOL = "GCHAR";
    const BASE_URI = "https://gateway.pinata.cloud/ipfs/test/";

    beforeEach(async function () {
      const MyERC721A = await ethers.getContractFactory("MyERC721A");
      erc721a = await MyERC721A.deploy(NAME, SYMBOL, BASE_URI);
      await erc721a.waitForDeployment();
    });

    it("1. Should deploy with correct name and symbol", async function () {
      expect(await erc721a.name()).to.equal(NAME);
      expect(await erc721a.symbol()).to.equal(SYMBOL);
      expect(await erc721a.owner()).to.equal(owner.address);
    });

    it("2. Should batch mint 5 NFTs to owner in 1 transaction", async function () {
      const initialSupply = await erc721a.totalSupply();
      
      // Batch mint 5 NFTs
      const tx = await erc721a.batchMint(owner.address, 5);
      await tx.wait();

      const finalSupply = await erc721a.totalSupply();
      expect(finalSupply - initialSupply).to.equal(5n);

      // Verify owner has 5 NFTs
      const balance = await erc721a.balanceOf(owner.address);
      expect(balance).to.equal(5n);

      // Verify ownership of each token
      for (let i = 0; i < 5; i++) {
        const tokenOwner = await erc721a.ownerOf(i);
        expect(tokenOwner).to.equal(owner.address);
      }
    });

    it("3. Should batch transfer all 5 NFTs to another wallet in 1 transaction", async function () {
      // First, mint 5 NFTs to owner
      await erc721a.batchMint(owner.address, 5);

      // Batch transfer all 5 NFTs from owner to wallet1
      const tokenIds = [0, 1, 2, 3, 4];
      const tx = await erc721a.batchTransfer(owner.address, wallet1.address, tokenIds);
      const receipt = await tx.wait();

      // Verify transaction succeeded
      expect(receipt.status).to.equal(1);
      
      console.log(`      Gas used for batch transfer: ${receipt.gasUsed.toString()}`);
    });

    it("4. Should verify new wallet owns all 5 NFTs after transfer", async function () {
      // Mint and transfer
      await erc721a.batchMint(owner.address, 5);
      const tokenIds = [0, 1, 2, 3, 4];
      await erc721a.batchTransfer(owner.address, wallet1.address, tokenIds);

      // Verify wallet1 owns all 5 NFTs
      const balance = await erc721a.balanceOf(wallet1.address);
      expect(balance).to.equal(5n);

      // Verify ownership of each token
      for (let i = 0; i < 5; i++) {
        const tokenOwner = await erc721a.ownerOf(i);
        expect(tokenOwner).to.equal(wallet1.address);
      }
    });

    it("5. Should verify original owner has 0 NFTs after transfer", async function () {
      // Mint and transfer
      await erc721a.batchMint(owner.address, 5);
      const tokenIds = [0, 1, 2, 3, 4];
      await erc721a.batchTransfer(owner.address, wallet1.address, tokenIds);

      // Verify owner has 0 NFTs
      const balance = await erc721a.balanceOf(owner.address);
      expect(balance).to.equal(0n);
    });
  });

  describe("ERC-1155 Tests", function () {
    const BASE_URI = "https://gateway.pinata.cloud/ipfs/";

    beforeEach(async function () {
      const MyERC1155 = await ethers.getContractFactory("MyERC1155");
      erc1155 = await MyERC1155.deploy(BASE_URI);
      await erc1155.waitForDeployment();
    });

    it("1. Should deploy with correct URI", async function () {
      expect(await erc1155.owner()).to.equal(owner.address);
      
      // Verify constants
      expect(await erc1155.SWORD()).to.equal(1n);
      expect(await erc1155.GOLD_COIN()).to.equal(2n);
      expect(await erc1155.DRAGON_ARMOR()).to.equal(3n);
      expect(await erc1155.MAGIC_STAFF()).to.equal(4n);
      expect(await erc1155.LEGENDARY_CROWN()).to.equal(5n);
    });

    it("2. Should batch mint 2 fungible (100 + 500) and 3 non-fungible (1+1+1) tokens in 1 transaction", async function () {
      const tokenIds = [1, 2, 3, 4, 5];
      const amounts = [100, 500, 1, 1, 1];

      // Batch mint all tokens in 1 transaction
      const tx = await erc1155.mintBatch(owner.address, tokenIds, amounts, "0x");
      await tx.wait();

      // Verify balances
      for (let i = 0; i < tokenIds.length; i++) {
        const balance = await erc1155.balanceOf(owner.address, tokenIds[i]);
        expect(balance).to.equal(BigInt(amounts[i]));
      }

      // Specifically verify fungible tokens
      expect(await erc1155.balanceOf(owner.address, 1)).to.equal(100n); // SWORD
      expect(await erc1155.balanceOf(owner.address, 2)).to.equal(500n); // GOLD_COIN

      // Specifically verify non-fungible tokens
      expect(await erc1155.balanceOf(owner.address, 3)).to.equal(1n); // DRAGON_ARMOR
      expect(await erc1155.balanceOf(owner.address, 4)).to.equal(1n); // MAGIC_STAFF
      expect(await erc1155.balanceOf(owner.address, 5)).to.equal(1n); // LEGENDARY_CROWN
    });

    it("3. Should batch transfer all tokens to another wallet in 1 transaction", async function () {
      const tokenIds = [1, 2, 3, 4, 5];
      const amounts = [100, 500, 1, 1, 1];

      // First, mint tokens to owner
      await erc1155.mintBatch(owner.address, tokenIds, amounts, "0x");

      // Batch transfer all tokens from owner to wallet1
      const tx = await erc1155.batchTransfer(
        owner.address,
        wallet1.address,
        tokenIds,
        amounts
      );
      const receipt = await tx.wait();

      // Verify transaction succeeded
      expect(receipt.status).to.equal(1);
      
      console.log(`      Gas used for batch transfer: ${receipt.gasUsed.toString()}`);
    });

    it("4. Should verify new wallet has correct balances after transfer", async function () {
      const tokenIds = [1, 2, 3, 4, 5];
      const amounts = [100, 500, 1, 1, 1];

      // Mint and transfer
      await erc1155.mintBatch(owner.address, tokenIds, amounts, "0x");
      await erc1155.batchTransfer(
        owner.address,
        wallet1.address,
        tokenIds,
        amounts
      );

      // Verify wallet1 has correct balances
      for (let i = 0; i < tokenIds.length; i++) {
        const balance = await erc1155.balanceOf(wallet1.address, tokenIds[i]);
        expect(balance).to.equal(BigInt(amounts[i]));
      }

      // Specifically verify each token type
      expect(await erc1155.balanceOf(wallet1.address, 1)).to.equal(100n); // SWORD
      expect(await erc1155.balanceOf(wallet1.address, 2)).to.equal(500n); // GOLD_COIN
      expect(await erc1155.balanceOf(wallet1.address, 3)).to.equal(1n);   // DRAGON_ARMOR
      expect(await erc1155.balanceOf(wallet1.address, 4)).to.equal(1n);   // MAGIC_STAFF
      expect(await erc1155.balanceOf(wallet1.address, 5)).to.equal(1n);   // LEGENDARY_CROWN
    });

    it("5. Should verify original owner has 0 balance after transfer", async function () {
      const tokenIds = [1, 2, 3, 4, 5];
      const amounts = [100, 500, 1, 1, 1];

      // Mint and transfer
      await erc1155.mintBatch(owner.address, tokenIds, amounts, "0x");
      await erc1155.batchTransfer(
        owner.address,
        wallet1.address,
        tokenIds,
        amounts
      );

      // Verify owner has 0 balance for all tokens
      for (let i = 0; i < tokenIds.length; i++) {
        const balance = await erc1155.balanceOf(owner.address, tokenIds[i]);
        expect(balance).to.equal(0n);
      }
    });
  });
});
