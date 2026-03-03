// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract UniqueCollectible is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string private _baseTokenURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseUri_
    ) ERC721(name_, symbol_) {
        _baseTokenURI = baseUri_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function safeMint(address to, string memory uri) external {
        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        _safeMint(to, newId);
        _setTokenURI(newId, uri); // e.g. "1.json"
    }

    function batchMint(address to, uint256 quantity) external {
        for (uint256 i = 0; i < quantity; i++) {
            _tokenIds.increment();
            uint256 newId = _tokenIds.current();
            _safeMint(to, newId);
            _setTokenURI(newId, string(abi.encodePacked(Strings.toString(newId), ".json")));
        }
    }
}
