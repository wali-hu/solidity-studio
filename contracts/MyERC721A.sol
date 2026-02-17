// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";

contract MyERC721A is ERC721A {
    address public owner;
    string private baseTokenURI;
    uint256 public constant MAX_SUPPLY = 10000;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory _baseTokenURI
    ) ERC721A(name, symbol) {
        owner = msg.sender;
        baseTokenURI = _baseTokenURI;
    }

    function batchMint(address to, uint256 quantity) external onlyOwner {
        require(_totalMinted() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, quantity);
    }

    function batchTransfer(
        address from,
        address to,
        uint256[] calldata tokenIds
    ) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            transferFrom(from, to, tokenIds[i]);
        }
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }
}
