// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EcoToken is ERC20, Ownable {
    uint256 public constant TAX_BASIS_POINTS = 200; 
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10_000;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupplyTokens
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _mint(msg.sender, initialSupplyTokens * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && value > 0) {
            uint256 fee = (value * TAX_BASIS_POINTS) / BASIS_POINTS_DENOMINATOR;
            uint256 net = value - fee;

            if (fee > 0) {
                super._update(from, address(0), fee);
            }

            super._update(from, to, net);
            return;
        }

        super._update(from, to, value);
    }
}
