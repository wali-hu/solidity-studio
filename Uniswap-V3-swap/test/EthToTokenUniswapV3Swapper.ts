import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("EthToTokenUniswapV3Swapper", function () {
  // Sepolia: SwapRouter02 (V3 swaps)
  const ROUTER_ADDRESS = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
  const WETH_ADDRESS = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

  const DUMMY_TOKEN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  it("deploys with correct router and WETH", async () => {
    const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    expect(await swapper.swapRouter()).to.equal(ethers.getAddress(ROUTER_ADDRESS));
    expect(await swapper.WETH()).to.equal(ethers.getAddress(WETH_ADDRESS));
    expect(await swapper.POOL_FEE()).to.equal(3000);
  });

  it("reverts when no ETH is sent (swapETHForToken)", async () => {
    const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapETHForToken(DUMMY_TOKEN_ADDRESS, 0),
    ).to.be.revertedWith("No ETH sent");
  });

  it("reverts when token address is zero (swapETHForToken)", async () => {
    const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapETHForToken(ethers.ZeroAddress, 0, { value: ethers.parseEther("0.1") }),
    ).to.be.revertedWith("Invalid token address");
  });

  it("reverts when token is WETH (swapETHForToken)", async () => {
    const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapETHForToken(WETH_ADDRESS, 0, { value: ethers.parseEther("0.1") }),
    ).to.be.revertedWith("Use unwrap for WETH");
  });

  it("reverts swapAllTokenForETH when token address is zero", async () => {
    const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapAllTokenForETH(ethers.ZeroAddress, 0),
    ).to.be.revertedWith("Invalid token address");
  });

  it("reverts swapAllTokenForETH when token is WETH", async () => {
    const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapAllTokenForETH(WETH_ADDRESS, 0),
    ).to.be.revertedWith("Use wrap for WETH");
  });

  it("reverts swapAllTokenForETH when wallet has zero balance", async () => {
    const Swapper = await ethers.getContractFactory("EthToTokenUniswapV3Swapper");
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", 18);

    await expect(
      swapper.swapAllTokenForETH(await mockToken.getAddress(), 0),
    ).to.be.revertedWith("No tokens in wallet");
  });
});
