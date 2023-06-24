// Contract based on https://docs.openzeppelin.com/contracts/4.x/erc721
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ExampleNFT is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    uint256 public _price = 0.001 ether;
    mapping(uint256 => string) private _tokenURIs;
    string private _baseURIextended;

    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("NFT", "ENFT") {}

    function mintNFT(address to, string memory tokenURI) public payable returns(uint256 tokenId) {
        _tokenIdCounter.increment();
        uint256 _current = _tokenIdCounter.current();
        _mint(to, _current);
        _setTokenURI(_current, tokenURI);
        return _current;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
       require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();
        
        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }
        // If there is a baseURI but no tokenURI, concatenate the tokenID to the baseURI.
        return super.tokenURI(tokenId);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721URIStorage: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIextended;
    }
    function setBaseURI(string memory baseURI_) external onlyOwner() {
        _baseURIextended = baseURI_;
    }
    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);

        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }

    function withdraw() public payable onlyOwner {
         address _owner = owner();
         uint256 amount = address(this).balance;
         (bool sent, ) = _owner.call{value: amount}("");
         require(sent, "Failed to send Ether");
     }

     // Function to receive Ether. msg.data must be empty
     receive() external payable {}

     // Fallback function is called when msg.data is not empty
     fallback() external payable {}
}