const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UniqueCollectible", function () {
  let nft, owner, addrA, addrB;

  beforeEach(async function () {
    [owner, addrA, addrB] = await ethers.getSigners();
    const UniqueCollectible = await ethers.getContractFactory("UniqueCollectible");
    nft = await UniqueCollectible.deploy("UniqueCollectible", "UNC", "https://example.com/metadata/");
    await nft.waitForDeployment();
  });

  it("tokenURI returns a valid URL", async function () {
    await nft.safeMint(addrA.address, "1.json");
    const tokenUri = await nft.tokenURI(1);
    expect(tokenUri).to.equal("https://example.com/metadata/1.json");
  });

  it("transfers NFT from A to B", async function () {
    await nft.safeMint(addrA.address, "1.json");
    await nft.connect(addrA).transferFrom(addrA.address, addrB.address, 1);
    expect(await nft.ownerOf(1)).to.equal(addrB.address);
  });
});