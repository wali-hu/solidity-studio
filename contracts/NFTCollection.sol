// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTCollection
 * @dev ERC721 NFT contract where anyone can mint — no supply cap
 */
contract NFTCollection is ERC721URIStorage, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    // Track who created (minted) each token
    mapping(uint256 => address) private _creators;

    event NFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI
    );

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

    /**
     * @dev Mints a new NFT — anyone can call
     * @param to Address to receive the NFT
     * @param tokenURI Metadata URI for the token
     */
    function mint(
        address to,
        string memory tokenURI
    ) external nonReentrant returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _creators[tokenId] = msg.sender;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit NFTMinted(to, tokenId, tokenURI);

        return tokenId;
    }

    /**
     * @dev Returns the creator (minter) of a token
     * @param tokenId Token ID to query
     */
    function getCreator(uint256 tokenId) external view returns (address) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        return _creators[tokenId];
    }

    /**
     * @dev Returns the total number of minted tokens
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
