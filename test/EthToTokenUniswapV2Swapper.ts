import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("EthToTokenUniswapV2Swapper", function () {
  const ROUTER_ADDRESS = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const WETH_ADDRESS = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

  // I am using a dummy token address in local tests; no real swaps occur.
  const DUMMY_TOKEN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  it("deploys with the correct router and WETH addresses", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    const expectedRouter = ethers.getAddress(ROUTER_ADDRESS);
    const expectedWeth = ethers.getAddress(WETH_ADDRESS);

    expect(await swapper.uniswapRouter()).to.equal(expectedRouter);
    expect(await swapper.WETH()).to.equal(expectedWeth);
  });

  it("reverts when no ETH is sent", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapETHForToken(DUMMY_TOKEN_ADDRESS, 0),
    ).to.be.revertedWith("No ETH sent");
  });

  it("reverts when token address is zero", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapETHForToken(
        ethers.ZeroAddress,
        0, // minAmountOut
        { value: ethers.parseEther("0.1") },
      ),
    ).to.be.revertedWith("Invalid token address");
  });

  it("reverts when token address is WETH", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapETHForToken(
        WETH_ADDRESS,
        0, // minAmountOut
        { value: ethers.parseEther("0.1") },
      ),
    ).to.be.revertedWith("Use unwrap for WETH");
  });
});

