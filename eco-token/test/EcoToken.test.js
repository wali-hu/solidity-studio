const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EcoToken", function () {
  let EcoToken, token, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    EcoToken = await ethers.getContractFactory("EcoToken");
    token = await EcoToken.deploy("EcoToken", "ECO", 1_000_000);
    await token.waitForDeployment();
  });

  it("non-owner cannot mint", async function () {
    await expect(token.connect(user).mint(user.address, 100)).to.be.revertedWithCustomError(
      token,
      "OwnableUnauthorizedAccount"
    );
  });

  it("transferFrom fails if allowance is less than amount", async function () {
    await token.mint(owner.address, 100);
    await token.approve(user.address, 10);

    await expect(
      token.connect(user).transferFrom(owner.address, user.address, 20)
    ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
  });

  it("burns 2% on transfer", async function () {
    const initialSupply = await token.totalSupply();
    const decimals = await token.decimals();
    const units = 10n ** decimals;
    const amount = 10_000n * units;

    await token.transfer(user.address, amount);

    expect(await token.balanceOf(user.address)).to.equal(amount - amount / 50n);
    expect(await token.totalSupply()).to.equal(initialSupply - amount / 50n);
  });
});
