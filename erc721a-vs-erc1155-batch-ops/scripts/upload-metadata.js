const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PINATA_JWT = process.env.PINATA_JWT;

async function uploadJSONToPinata(jsonData, name) {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: jsonData,
        pinataMetadata: { name }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );
    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error.response?.data || error.message);
    throw error;
  }
}

async function uploadAllMetadata(folderPath, tokenIds) {
  const hashes = {};
  
  for (const tokenId of tokenIds) {
    const filePath = path.join(folderPath, `${tokenId}.json`);
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const hash = await uploadJSONToPinata(jsonData, `token-${tokenId}`);
    hashes[tokenId] = hash;
    console.log(`  Token ${tokenId}: ${hash}`);
  }
  
  return hashes;
}

async function main() {
  try {
    console.log(' Uploading metadata to IPFS via Pinata...\n');

    // Upload ERC721A metadata
    console.log('Uploading ERC721A metadata...');
    const erc721aHashes = await uploadAllMetadata('./metadata/erc721a', [1, 2, 3, 4, 5]);
    console.log(' ERC721A metadata uploaded!\n');
    
    console.log('ERC721A Token URIs:');
    for (const [tokenId, hash] of Object.entries(erc721aHashes)) {
      console.log(`  Token ${tokenId}: https://gateway.pinata.cloud/ipfs/${hash}`);
    }

    // Upload ERC1155 metadata
    console.log('Uploading ERC1155 metadata...');
    const erc1155Hashes = await uploadAllMetadata('./metadata/erc1155', [1, 2, 3, 4, 5]);
    console.log(' ERC1155 metadata uploaded!\n');

    console.log(' IPFS URIs for deployment scripts:\n');
    console.log(`ERC721A Token URIs:`);
    for (const [tokenId, hash] of Object.entries(erc721aHashes)) {
      console.log(`  Token ${tokenId}: https://gateway.pinata.cloud/ipfs/${hash}`);
    }
    console.log(`\nERC1155 Token URIs:`);
    for (const [tokenId, hash] of Object.entries(erc1155Hashes)) {
      console.log(`  Token ${tokenId}: https://gateway.pinata.cloud/ipfs/${hash}`);
    }

    // Save to file
    const uris = {
      erc721a: {
        hashes: erc721aHashes,
        baseURI: `https://gateway.pinata.cloud/ipfs/`
      },
      erc1155: {
        hashes: erc1155Hashes,
        baseURI: `https://gateway.pinata.cloud/ipfs/`
      }
    };

    fs.writeFileSync('./metadata/ipfs-uris.json', JSON.stringify(uris, null, 2));
    console.log('\n URIs saved to metadata/ipfs-uris.json');

  } catch (error) {
    console.error(' Upload failed:', error);
    process.exit(1);
  }
}

main();
