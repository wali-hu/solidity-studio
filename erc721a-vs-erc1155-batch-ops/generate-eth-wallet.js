const { ethers } = require('ethers');
require('dotenv').config();

/**
 * Generate a new Ethereum wallet with mnemonic phrase
 * Displays the wallet address, private key, and mnemonic phrase
 */
async function generateEthereumWallet() {
  try {
    console.log('Generating new Ethereum wallet...\n');

    // Create a random mnemonic phrase (12 words by default)
    // This mnemonic can be used to recover the wallet
    const mnemonic = ethers.Wallet.createRandom().mnemonic;
    
    if (!mnemonic) {
      throw new Error('Failed to generate mnemonic phrase');
    }

    console.log('Mnemonic Phrase:');
    console.log(`   ${mnemonic.phrase}\n`);

    // Create wallet from mnemonic
    // The derivation path "m/44'/60'/0'/0/0" is the standard Ethereum path
    const wallet = ethers.Wallet.fromPhrase(mnemonic.phrase);

    // Display wallet information
    console.log('Wallet Address:');
    console.log(`   ${wallet.address}\n`);

    console.log('Private Key:');
    console.log(`   ${wallet.privateKey}\n`);

    // Optional: Connect to RPC provider if URL is provided
    // Supports multiple environment variable names for flexibility
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    
    if (rpcUrl) {
      console.log('Connecting to RPC provider...');
      
      // Create provider from RPC URL
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Connect wallet to provider
      const connectedWallet = wallet.connect(provider);
      
      // Get the current balance
      const balance = await connectedWallet.provider.getBalance(wallet.address);
      const balanceInEth = ethers.formatEther(balance);
      
      console.log(`   RPC URL: ${rpcUrl}`);
      console.log(`   Balance: ${balanceInEth} ETH\n`);
    } else {
      console.log('No RPC URL provided. Set RPC_URL or ETHEREUM_RPC_URL environment variable to check balance.\n');
    }

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: mnemonic.phrase
    };

  } catch (error) {
    console.error('Error generating Ethereum wallet:');
    
    // Handle specific error types
    if (error.code === 'NETWORK_ERROR') {
      console.error('   Network connection failed. Check your RPC URL and internet connection.');
    } else if (error.code === 'INVALID_ARGUMENT') {
      console.error('   Invalid argument provided to ethers.js');
    } else {
      console.error(`   ${error.message}`);
    }
    
    // Log full error in development
    if (process.env.DEBUG) {
      console.error('\nFull error details:', error);
    }
    
    throw error;
  }
}

// Execute the function if run directly
if (require.main === module) {
  generateEthereumWallet()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nWallet generation failed.');
      process.exit(1);
    });
}

// Export for use in other modules
module.exports = { generateEthereumWallet };
