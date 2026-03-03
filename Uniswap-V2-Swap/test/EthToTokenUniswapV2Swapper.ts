import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("EthToTokenUniswapV2Swapper", function () {
  const ROUTER_ADDRESS = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const WETH_ADDRESS = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

  // Dummy token addresses for local tests; no real swaps occur.
  const DUMMY_TOKEN_ADDRESS = "0x000000000000000000000000000000000000dEaD";
  const DUMMY_TOKEN_ADDRESS_B = "0x000000000000000000000000000000000000bEEf";
  const DUMMY_TOKEN_HOLDER = "0x0000000000000000000000000000000000000001";

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

  it("reverts token-to-ETH swap when no tokens are specified", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapTokenForETH(DUMMY_TOKEN_ADDRESS, 0, 0),
    ).to.be.revertedWith("No tokens sent");
  });

  it("reverts token-to-ETH swap when token address is zero", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapTokenForETH(ethers.ZeroAddress, 1n, 0),
    ).to.be.revertedWith("Invalid token address");
  });

  it("reverts token-to-ETH swap when token address is WETH", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapTokenForETH(WETH_ADDRESS, 1n, 0),
    ).to.be.revertedWith("Use wrap for WETH");
  });

  it("reverts swapAllTokenForETH when token address is zero", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapAllTokenForETH(ethers.ZeroAddress, 0),
    ).to.be.revertedWith("Invalid token address");
  });

  it("reverts swapAllTokenForETH when token address is WETH", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapAllTokenForETH(WETH_ADDRESS, 0),
    ).to.be.revertedWith("Use wrap for WETH");
  });

  it("reverts swapAllTokenForETH when wallet has zero balance", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    // Deploy a mock ERC20 token with zero balance
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
    // Don't mint any tokens, so balance will be 0

    await expect(
      swapper.swapAllTokenForETH(await mockToken.getAddress(), 0),
    ).to.be.revertedWith("No tokens in wallet");
  });

  it("reverts swapTokenForToken when amount is zero", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapTokenForToken(
        DUMMY_TOKEN_ADDRESS,
        DUMMY_TOKEN_ADDRESS_B,
        0,
        0,
      ),
    ).to.be.revertedWith("No tokens sent");
  });

  it("reverts swapTokenForToken when tokenIn is zero", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapTokenForToken(
        ethers.ZeroAddress,
        DUMMY_TOKEN_ADDRESS,
        1n,
        0,
      ),
    ).to.be.revertedWith("Invalid tokenIn");
  });

  it("reverts swapTokenForToken when tokenOut is zero", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapTokenForToken(
        DUMMY_TOKEN_ADDRESS,
        ethers.ZeroAddress,
        1n,
        0,
      ),
    ).to.be.revertedWith("Invalid tokenOut");
  });

  it("reverts swapTokenForToken when tokenIn equals tokenOut", async () => {
    const Swapper = await ethers.getContractFactory(
      "EthToTokenUniswapV2Swapper",
    );
    const swapper = await Swapper.deploy(ROUTER_ADDRESS, WETH_ADDRESS);

    await expect(
      swapper.swapTokenForToken(
        DUMMY_TOKEN_ADDRESS,
        DUMMY_TOKEN_ADDRESS,
        1n,
        0,
      ),
    ).to.be.revertedWith("Same token");
  });
});

