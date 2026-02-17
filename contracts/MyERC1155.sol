// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MyERC1155 is ERC1155 {
    address public owner;

    // Gaming Items Token IDs
    uint256 public constant SWORD = 1;           // Fungible, quantity 100
    uint256 public constant GOLD_COIN = 2;       // Fungible, quantity 500
    uint256 public constant DRAGON_ARMOR = 3;    // Non-Fungible, quantity 1
    uint256 public constant MAGIC_STAFF = 4;     // Non-Fungible, quantity 1
    uint256 public constant LEGENDARY_CROWN = 5; // Non-Fungible, quantity 1

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(string memory uri) ERC1155(uri) {
        owner = msg.sender;
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @notice Convenience wrapper for batch transferring multiple token types
     * @dev This function wraps the inherited safeBatchTransferFrom from ERC1155
     * @param from The address to transfer tokens from
     * @param to The address to transfer tokens to
     * @param ids Array of token IDs to transfer
     * @param amounts Array of amounts for each token ID
     */
    function batchTransfer(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external {
        safeBatchTransferFrom(from, to, ids, amounts, "");
    }
}
