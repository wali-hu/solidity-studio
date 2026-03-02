const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("GameInventory", function () {
  // Fixture for test setup
  async function deployGameInventoryFixture() {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const baseURI = "ipfs://QmTest123/";

    const GameInventory = await ethers.getContractFactory("GameInventory");
    const gameInventory = await GameInventory.deploy(baseURI);

    return { gameInventory, owner, addr1, addr2, addr3, baseURI };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { gameInventory, owner } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.owner()).to.equal(owner.address);
    });

    it("Should mint correct initial GOLD supply to owner", async function () {
      const { gameInventory, owner } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.balanceOf(owner.address, 0)).to.equal(1000000);
    });

    it("Should mint correct initial FOUNDER_SWORD supply to owner", async function () {
      const { gameInventory, owner } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.balanceOf(owner.address, 1)).to.equal(1);
    });

    it("Should mint correct initial HEALTH_POTION supply to owner", async function () {
      const { gameInventory, owner } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.balanceOf(owner.address, 2)).to.equal(100);
    });

    it("Should set the correct base URI", async function () {
      const { gameInventory, baseURI } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.baseURI()).to.equal(baseURI);
    });

    it("Should track total supplies correctly", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.totalSupply(0)).to.equal(1000000);
      expect(await gameInventory.totalSupply(1)).to.equal(1);
      expect(await gameInventory.totalSupply(2)).to.equal(100);
    });
  });

  describe("URI Functionality - DoD Requirement", function () {
    it("Should return correct URI for GOLD (ID 0)", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.uri(0))
        .to.equal("ipfs://QmTest123/0.json");
    });

    it("Should return correct URI for FOUNDER_SWORD (ID 1)", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.uri(1))
        .to.equal("ipfs://QmTest123/1.json");
    });

    it("Should return correct URI for HEALTH_POTION (ID 2)", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.uri(2))
        .to.equal("ipfs://QmTest123/2.json");
    });

    it("Should return correct URI for any token ID", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);
      expect(await gameInventory.uri(999))
        .to.equal("ipfs://QmTest123/999.json");
    });

    it("Should update URI correctly when setBaseURI is called", async function () {
      const { gameInventory, owner } = await loadFixture(deployGameInventoryFixture);
      const newBaseURI = "ipfs://QmNewCID456/";

      await gameInventory.connect(owner).setBaseURI(newBaseURI);
      expect(await gameInventory.baseURI()).to.equal(newBaseURI);
      expect(await gameInventory.uri(0)).to.equal("ipfs://QmNewCID456/0.json");
    });

    it("Should emit BaseURIUpdated event when URI is changed", async function () {
      const { gameInventory, owner } = await loadFixture(deployGameInventoryFixture);
      const newBaseURI = "ipfs://QmNewCID456/";

      await expect(gameInventory.connect(owner).setBaseURI(newBaseURI))
        .to.emit(gameInventory, "BaseURIUpdated")
        .withArgs(newBaseURI);
    });

    it("Should revert when non-owner tries to update base URI", async function () {
      const { gameInventory, addr1 } = await loadFixture(deployGameInventoryFixture);
      const newBaseURI = "ipfs://QmNewCID456/";

      await expect(
        gameInventory.connect(addr1).setBaseURI(newBaseURI)
      ).to.be.revertedWithCustomError(gameInventory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Batch Transfer - DoD Critical Requirement", function () {
    it("Should transfer all 3 token types in one batch transaction", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      const ids = [0, 1, 2]; // GOLD, FOUNDER_SWORD, HEALTH_POTION
      const amounts = [1000, 1, 10];

      // Perform batch transfer
      await expect(
        gameInventory.connect(owner).safeBatchTransferFrom(
          owner.address,
          addr1.address,
          ids,
          amounts,
          "0x"
        )
      ).to.emit(gameInventory, "TransferBatch");

      // Verify recipient balances
      expect(await gameInventory.balanceOf(addr1.address, 0)).to.equal(1000);
      expect(await gameInventory.balanceOf(addr1.address, 1)).to.equal(1);
      expect(await gameInventory.balanceOf(addr1.address, 2)).to.equal(10);

      // Verify sender balances decreased
      expect(await gameInventory.balanceOf(owner.address, 0)).to.equal(999000);
      expect(await gameInventory.balanceOf(owner.address, 1)).to.equal(0);
      expect(await gameInventory.balanceOf(owner.address, 2)).to.equal(90);
    });

    it("Should transfer varying amounts of all token types", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      const ids = [0, 1, 2];
      const amounts = [50000, 1, 50];

      await gameInventory.connect(owner).safeBatchTransferFrom(
        owner.address,
        addr1.address,
        ids,
        amounts,
        "0x"
      );

      expect(await gameInventory.balanceOf(addr1.address, 0)).to.equal(50000);
      expect(await gameInventory.balanceOf(addr1.address, 1)).to.equal(1);
      expect(await gameInventory.balanceOf(addr1.address, 2)).to.equal(50);
    });

    it("Should revert batch transfer with insufficient balance", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      const ids = [0, 1, 2];
      const amounts = [2000000, 1, 10]; // More GOLD than exists

      await expect(
        gameInventory.connect(owner).safeBatchTransferFrom(
          owner.address,
          addr1.address,
          ids,
          amounts,
          "0x"
        )
      ).to.be.revertedWithCustomError(gameInventory, "ERC1155InsufficientBalance");
    });

    it("Should revert batch transfer when not authorized", async function () {
      const { gameInventory, owner, addr1, addr2 } = await loadFixture(deployGameInventoryFixture);

      const ids = [0, 1, 2];
      const amounts = [1000, 1, 10];

      await expect(
        gameInventory.connect(addr1).safeBatchTransferFrom(
          owner.address,
          addr2.address,
          ids,
          amounts,
          "0x"
        )
      ).to.be.revertedWithCustomError(gameInventory, "ERC1155MissingApprovalForAll");
    });

    it("Should allow batch transfer when approved", async function () {
      const { gameInventory, owner, addr1, addr2 } = await loadFixture(deployGameInventoryFixture);

      // Owner approves addr1 as operator
      await gameInventory.connect(owner).setApprovalForAll(addr1.address, true);

      const ids = [0, 2]; // GOLD and HEALTH_POTION
      const amounts = [500, 5];

      // addr1 transfers on behalf of owner
      await gameInventory.connect(addr1).safeBatchTransferFrom(
        owner.address,
        addr2.address,
        ids,
        amounts,
        "0x"
      );

      expect(await gameInventory.balanceOf(addr2.address, 0)).to.equal(500);
      expect(await gameInventory.balanceOf(addr2.address, 2)).to.equal(5);
    });

    it("Should emit TransferBatch event with correct parameters", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      const ids = [0, 1, 2];
      const amounts = [1000, 1, 10];

      await expect(
        gameInventory.connect(owner).safeBatchTransferFrom(
          owner.address,
          addr1.address,
          ids,
          amounts,
          "0x"
        )
      ).to.emit(gameInventory, "TransferBatch")
        .withArgs(owner.address, owner.address, addr1.address, ids, amounts);
    });
  });

  describe("Balance Of Batch - DoD Critical Requirement", function () {
    it("Should return correct balances for multiple addresses", async function () {
      const { gameInventory, owner, addr1, addr2 } = await loadFixture(deployGameInventoryFixture);

      // Transfer tokens to different addresses
      await gameInventory.safeTransferFrom(owner.address, addr1.address, 0, 500, "0x");
      await gameInventory.safeTransferFrom(owner.address, addr2.address, 1, 1, "0x");
      await gameInventory.safeTransferFrom(owner.address, addr2.address, 2, 25, "0x");

      // Query multiple balances
      const addresses = [owner.address, addr1.address, addr2.address, addr2.address];
      const ids = [0, 0, 1, 2];

      const balances = await gameInventory.balanceOfBatch(addresses, ids);

      expect(balances[0]).to.equal(999500); // owner's remaining GOLD
      expect(balances[1]).to.equal(500);    // addr1's GOLD
      expect(balances[2]).to.equal(1);      // addr2's FOUNDER_SWORD
      expect(balances[3]).to.equal(25);     // addr2's HEALTH_POTION
    });

    it("Should return correct balances for same address with different tokens", async function () {
      const { gameInventory, owner } = await loadFixture(deployGameInventoryFixture);

      const addresses = [owner.address, owner.address, owner.address];
      const ids = [0, 1, 2];

      const balances = await gameInventory.balanceOfBatch(addresses, ids);

      expect(balances[0]).to.equal(1000000);
      expect(balances[1]).to.equal(1);
      expect(balances[2]).to.equal(100);
    });

    it("Should return correct balances for same token across multiple addresses", async function () {
      const { gameInventory, owner, addr1, addr2 } = await loadFixture(deployGameInventoryFixture);

      // Distribute GOLD to multiple addresses
      await gameInventory.safeTransferFrom(owner.address, addr1.address, 0, 100, "0x");
      await gameInventory.safeTransferFrom(owner.address, addr2.address, 0, 200, "0x");

      const addresses = [owner.address, addr1.address, addr2.address];
      const ids = [0, 0, 0];

      const balances = await gameInventory.balanceOfBatch(addresses, ids);

      expect(balances[0]).to.equal(999700);
      expect(balances[1]).to.equal(100);
      expect(balances[2]).to.equal(200);
    });

    it("Should return array with length matching input", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      const addresses = [owner.address, addr1.address, owner.address, addr1.address, owner.address];
      const ids = [0, 0, 1, 1, 2];

      const balances = await gameInventory.balanceOfBatch(addresses, ids);

      expect(balances.length).to.equal(5);
    });

    it("Should return zero balances for addresses without tokens", async function () {
      const { gameInventory, addr1, addr2, addr3 } = await loadFixture(deployGameInventoryFixture);

      const addresses = [addr1.address, addr2.address, addr3.address];
      const ids = [0, 1, 2];

      const balances = await gameInventory.balanceOfBatch(addresses, ids);

      expect(balances[0]).to.equal(0);
      expect(balances[1]).to.equal(0);
      expect(balances[2]).to.equal(0);
    });
  });

  describe("ERC-1155 Standard Compliance", function () {
    it("Should transfer single token type correctly", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      await gameInventory.connect(owner).safeTransferFrom(
        owner.address,
        addr1.address,
        0,
        1000,
        "0x"
      );

      expect(await gameInventory.balanceOf(addr1.address, 0)).to.equal(1000);
      expect(await gameInventory.balanceOf(owner.address, 0)).to.equal(999000);
    });

    it("Should set and query approval for all", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      expect(await gameInventory.isApprovedForAll(owner.address, addr1.address)).to.be.false;

      await gameInventory.connect(owner).setApprovalForAll(addr1.address, true);

      expect(await gameInventory.isApprovedForAll(owner.address, addr1.address)).to.be.true;
    });

    it("Should support ERC-1155 interface", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);

      expect(await gameInventory.supportsInterface("0xd9b67a26")).to.be.true; // ERC-1155
    });

    it("Should support ERC-165 interface", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);

      expect(await gameInventory.supportsInterface("0x01ffc9a7")).to.be.true; // ERC-165
    });

    it("Should emit TransferSingle event on single transfer", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      await expect(
        gameInventory.connect(owner).safeTransferFrom(
          owner.address,
          addr1.address,
          0,
          100,
          "0x"
        )
      ).to.emit(gameInventory, "TransferSingle")
        .withArgs(owner.address, owner.address, addr1.address, 0, 100);
    });

    it("Should emit ApprovalForAll event", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      await expect(
        gameInventory.connect(owner).setApprovalForAll(addr1.address, true)
      ).to.emit(gameInventory, "ApprovalForAll")
        .withArgs(owner.address, addr1.address, true);
    });
  });

  describe("Access Control", function () {
    it("Should allow only owner to mint batch", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      const ids = [0, 2];
      const amounts = [5000, 50];

      await expect(
        gameInventory.connect(owner).mintBatch(addr1.address, ids, amounts, "0x")
      ).to.emit(gameInventory, "ItemsMinted");

      expect(await gameInventory.balanceOf(addr1.address, 0)).to.equal(5000);
      expect(await gameInventory.balanceOf(addr1.address, 2)).to.equal(50);
    });

    it("Should revert when non-owner tries to mint batch", async function () {
      const { gameInventory, addr1, addr2 } = await loadFixture(deployGameInventoryFixture);

      const ids = [0, 2];
      const amounts = [5000, 50];

      await expect(
        gameInventory.connect(addr1).mintBatch(addr2.address, ids, amounts, "0x")
      ).to.be.revertedWithCustomError(gameInventory, "OwnableUnauthorizedAccount");
    });

    it("Should update total supply after minting", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      const initialSupply = await gameInventory.totalSupply(0);

      await gameInventory.connect(owner).mintBatch(addr1.address, [0], [1000], "0x");

      expect(await gameInventory.totalSupply(0)).to.equal(initialSupply + BigInt(1000));
    });

    it("Should transfer ownership correctly", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      await gameInventory.connect(owner).transferOwnership(addr1.address);

      expect(await gameInventory.owner()).to.equal(addr1.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle transfer of zero amount", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      await expect(
        gameInventory.connect(owner).safeTransferFrom(
          owner.address,
          addr1.address,
          0,
          0,
          "0x"
        )
      ).to.not.be.reverted;

      expect(await gameInventory.balanceOf(addr1.address, 0)).to.equal(0);
    });

    it("Should handle batch transfer with empty arrays", async function () {
      const { gameInventory, owner, addr1 } = await loadFixture(deployGameInventoryFixture);

      await expect(
        gameInventory.connect(owner).safeBatchTransferFrom(
          owner.address,
          addr1.address,
          [],
          [],
          "0x"
        )
      ).to.not.be.reverted;
    });

    it("Should return zero for non-existent token balance", async function () {
      const { gameInventory, addr1 } = await loadFixture(deployGameInventoryFixture);

      expect(await gameInventory.balanceOf(addr1.address, 999)).to.equal(0);
    });

    it("Should return zero for total supply of unminted token", async function () {
      const { gameInventory } = await loadFixture(deployGameInventoryFixture);

      expect(await gameInventory.totalSupply(999)).to.equal(0);
    });
  });
});
