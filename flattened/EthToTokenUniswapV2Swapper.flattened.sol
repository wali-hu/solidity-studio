// [dotenv@17.3.1] injecting env (7) from .env -- tip: 🛡️ auth for agents: https://vestauth.com
// Sources flattened with hardhat v3.1.10 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/EthToTokenUniswapV2Swapper.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;

/// @title ETH to Token Swapper using Uniswap V2 (Sepolia)
/// @notice Swaps native ETH for a specified ERC20 token via Uniswap V2 Router02.

/// @dev Minimal interface for the Uniswap V2 Router02 with only what I need here.
interface IUniswapV2Router02 {
        function swapExactETHForTokens(
            uint256 amountOutMin,
            address[] calldata path,
            address to,
            uint256 deadline
        ) external payable returns (uint256[] memory amounts);
        function WETH() external view returns (address);
}

contract EthToTokenUniswapV2Swapper {

    /// @notice Address of the Uniswap V2 Router02.
    IUniswapV2Router02 public immutable uniswapRouter;

    /// @notice Address of WETH on Sepolia (wrapped native ETH).
    address public immutable WETH;

    /// @notice Emitted after a successful swap.
    /// @param sender The address that initiated the swap.
    /// @param ethIn Amount of ETH sent into the swap.
    /// @param tokenOut Address of the token received.
    /// @param amountOut Amount of tokens received.
    event EthSwappedForToken(
        address indexed sender,
        uint256 ethIn,
        address indexed tokenOut,
        uint256 amountOut
    );

    /// @param _router Address of the Uniswap V2 Router02.
    /// @param _weth Address of the WETH token on Sepolia.
    /// @dev For Sepolia using my provided addresses, deploy with:
    ///      _router = 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3
    ///      _weth   = 0xfff9976782d46cc05630d1f6ebab18b2324d6b14
    constructor(address _router, address _weth) {
        require(_router != address(0), "Router address is zero");
        require(_weth != address(0), "WETH address is zero");

        uniswapRouter = IUniswapV2Router02(_router);
        WETH = _weth;
    }

    /// @notice Swap native ETH (msg.value) for a specific ERC20 token via Uniswap V2.
    /// @dev
    /// - `msg.value` is the exact amount of ETH to swap.
    /// - Swaps along the path [WETH, tokenAddress].
    /// - Tokens are sent directly to the caller (`msg.sender`).
    ///
    /// @param tokenAddress Address of the ERC20 token to receive.
    /// @param minAmountOut Minimum acceptable amount of tokens out (slippage protection).
    /// @return amountOut The actual amount of tokens received.
    function swapETHForToken(
        address tokenAddress,
        uint256 minAmountOut
    ) external payable returns (uint256 amountOut) {
        require(msg.value > 0, "No ETH sent");
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAddress != WETH, "Use unwrap for WETH");

        // Build the swap path: WETH -> token
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = tokenAddress;

        // Use a short deadline for safety against stuck transactions.
        uint256 deadline = block.timestamp + 15 minutes;

        // Perform the swap: send ETH in, receive tokens to msg.sender.
        uint256[] memory amounts = uniswapRouter.swapExactETHForTokens{
            value: msg.value
        }(
            minAmountOut, // amountOutMin
            path, // path
            msg.sender, // to (recipient of tokens)
            deadline // deadline
        );

        // The last element in `amounts` is the amount of `tokenAddress` received.
        amountOut = amounts[amounts.length - 1];

        emit EthSwappedForToken(msg.sender, msg.value, tokenAddress, amountOut);
    }

    /// @notice Allow the contract to receive plain ETH (e.g., refunds from Uniswap).
    receive() external payable {}
}

