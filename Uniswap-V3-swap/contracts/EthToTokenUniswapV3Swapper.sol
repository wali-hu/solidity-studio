// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ETH to Token Swapper using Uniswap V3 (Sepolia)
/// @notice Swaps native ETH for ERC20 and vice versa via Uniswap V3 SwapRouter.
/// @dev Uses exactInputSingle; for buy, wraps ETH to WETH first then swaps.

/// @dev Minimal IWETH for wrap/unwrap
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @dev Uniswap V3 SwapRouter02 IV3SwapRouter – no deadline in struct (legacy SwapRouter has it)
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/// @dev Minimal ERC20 for approvals and transfers
interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract EthToTokenUniswapV3Swapper {
    ISwapRouter public immutable swapRouter;
    IWETH public immutable WETH;

    /// @notice Fee tier for the pool (3000 = 0.30%)
    uint24 public constant POOL_FEE = 3000;

    event EthSwappedForToken(
        address indexed sender,
        uint256 ethIn,
        address indexed tokenOut,
        uint256 amountOut
    );

    event TokenSwappedForEth(
        address indexed sender,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 ethOut
    );

    /// @param _router Uniswap V3 SwapRouter (or SwapRouter02) address. Sepolia: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
    /// @param _weth WETH address. Sepolia: 0xfff9976782d46cc05630d1f6ebab18b2324d6b14
    constructor(address _router, address _weth) {
        require(_router != address(0), "Router address is zero");
        require(_weth != address(0), "WETH address is zero");
        swapRouter = ISwapRouter(_router);
        WETH = IWETH(_weth);
    }

    /// @notice Swap native ETH for an ERC20 token via Uniswap V3.
    /// @dev Wraps msg.value to WETH, then exactInputSingle WETH -> token. Tokens sent to msg.sender.
    /// @param tokenAddress Token to receive
    /// @param minAmountOut Slippage protection
    function swapETHForToken(address tokenAddress, uint256 minAmountOut)
        external
        payable
        returns (uint256 amountOut)
    {
        require(msg.value > 0, "No ETH sent");
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAddress != address(WETH), "Use unwrap for WETH");

        WETH.deposit{value: msg.value}();
        WETH.approve(address(swapRouter), msg.value);

        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(WETH),
                tokenOut: tokenAddress,
                fee: POOL_FEE,
                recipient: msg.sender,
                amountIn: msg.value,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );

        emit EthSwappedForToken(msg.sender, msg.value, tokenAddress, amountOut);
    }

    /// @notice Swap an exact amount of token for ETH via Uniswap V3.
    /// @dev Token -> WETH swap; contract unwraps WETH and sends ETH to msg.sender.
    /// @param tokenAddress Token to sell
    /// @param amountIn Amount of tokens to swap
    /// @param minEthOut Minimum ETH out (slippage)
    function swapTokenForETH(
        address tokenAddress,
        uint256 amountIn,
        uint256 minEthOut
    ) external returns (uint256 ethOut) {
        require(amountIn > 0, "No tokens sent");
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAddress != address(WETH), "Use wrap for WETH");

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenAddress).approve(address(swapRouter), amountIn);

        uint256 wethOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenAddress,
                tokenOut: address(WETH),
                fee: POOL_FEE,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minEthOut,
                sqrtPriceLimitX96: 0
            })
        );

        WETH.withdraw(wethOut);
        (bool ok,) = msg.sender.call{value: wethOut}("");
        require(ok, "ETH transfer failed");
        ethOut = wethOut;

        emit TokenSwappedForEth(msg.sender, tokenAddress, amountIn, ethOut);
    }

    /// @notice Swap all caller's token balance for ETH.
    /// @param tokenAddress Token to sell
    /// @param minEthOut Minimum ETH out
    function swapAllTokenForETH(address tokenAddress, uint256 minEthOut)
        external
        returns (uint256 amountIn, uint256 ethOut)
    {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAddress != address(WETH), "Use wrap for WETH");

        IERC20 token = IERC20(tokenAddress);
        amountIn = token.balanceOf(msg.sender);
        require(amountIn > 0, "No tokens in wallet");

        token.transferFrom(msg.sender, address(this), amountIn);
        token.approve(address(swapRouter), amountIn);

        uint256 wethOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenAddress,
                tokenOut: address(WETH),
                fee: POOL_FEE,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minEthOut,
                sqrtPriceLimitX96: 0
            })
        );

        WETH.withdraw(wethOut);
        (bool ok,) = msg.sender.call{value: wethOut}("");
        require(ok, "ETH transfer failed");
        ethOut = wethOut;

        emit TokenSwappedForEth(msg.sender, tokenAddress, amountIn, ethOut);
    }

    receive() external payable {}
}
