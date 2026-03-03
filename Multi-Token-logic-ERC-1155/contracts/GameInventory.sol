// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GameInventory
 * @dev ERC-1155 Multi-Token contract for game items including fungible, semi-fungible, and NFT tokens
 */
contract GameInventory is ERC1155, Ownable {
    using Strings for uint256;

    // Token IDs
    uint256 public constant GOLD = 0; // Fungible token
    uint256 public constant FOUNDER_SWORD = 1; // NFT
    uint256 public constant HEALTH_POTION = 2; // Semi-Fungible token

    // Max supplies for each token type
    uint256 public constant GOLD_SUPPLY = 1000000;
    uint256 public constant FOUNDER_SWORD_SUPPLY = 1;
    uint256 public constant HEALTH_POTION_SUPPLY = 100;

    // Track minted amounts for supply management
    mapping(uint256 => uint256) private _totalSupply;

    // Base URI for token metadata
    string private _baseURI;

    // Events
    event ItemsMinted(address indexed to, uint256[] ids, uint256[] amounts);
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Constructor that initializes the contract with a base URI and mints initial token supplies
     * @param initialBaseURI The base URI for token metadata (e.g., "https://api.example.com/metadata/")
     */
    constructor(string memory initialBaseURI) ERC1155("") Ownable(msg.sender) {
        _baseURI = initialBaseURI;

        // Mint initial supplies to contract owner
        _mint(msg.sender, GOLD, GOLD_SUPPLY, "");
        _mint(msg.sender, FOUNDER_SWORD, FOUNDER_SWORD_SUPPLY, "");
        _mint(msg.sender, HEALTH_POTION, HEALTH_POTION_SUPPLY, "");

        // Track total supplies
        _totalSupply[GOLD] = GOLD_SUPPLY;
        _totalSupply[FOUNDER_SWORD] = FOUNDER_SWORD_SUPPLY;
        _totalSupply[HEALTH_POTION] = HEALTH_POTION_SUPPLY;
    }

    /**
     * @dev Returns the URI for a given token ID
     * @param id The token ID
     * @return The complete metadata URI (base URI + token ID + .json)
     */
    function uri(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, id.toString(), ".json"));
    }

    /**
     * @dev Returns the total supply for a given token ID
     * @param id The token ID
     * @return The total minted supply
     */
    function totalSupply(uint256 id) public view returns (uint256) {
        return _totalSupply[id];
    }

    /**
     * @dev Updates the base URI for token metadata (only owner)
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Returns the current base URI
     * @return The base URI string
     */
    function baseURI() external view returns (string memory) {
        return _baseURI;
    }

    /**
     * @dev Mints a batch of tokens to a specified address (only owner)
     * @param to The address to mint tokens to
     * @param ids Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @param data Additional data to pass to the receiver
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);

        // Update total supplies
        for (uint256 i = 0; i < ids.length; i++) {
            _totalSupply[ids[i]] += amounts[i];
        }

        emit ItemsMinted(to, ids, amounts);
    }
}
