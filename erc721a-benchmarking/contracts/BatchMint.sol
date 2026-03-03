// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";

contract BatchMint is ERC721A {
    uint256 public constant MAX_SUPPLY = 10000;
    string private _baseTokenURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseUri_
    ) ERC721A(name_, symbol_) {
        _baseTokenURI = baseUri_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function mint(uint256 quantity) external {
        require(_totalMinted() + quantity <= MAX_SUPPLY, "Max supply exceeded");
        require(quantity > 0, "Quantity must be greater than 0");
        _mint(msg.sender, quantity);
    }

    function totalMinted() external view returns (uint256) {
        return _totalMinted();
    }
}
