const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

class TxHashCapture {
  constructor() {
    this.enabled = process.env.CAPTURE_TX_HASH === 'true';
    this.transactions = [];
    this.currentTestName = null;
    this.currentTestSuite = null;
    this.startTime = null;
    this.totalTests = 0;
    this.networkInfo = null;
  }

  initialize() {
    if (!this.enabled) return;

    this.startTime = Date.now();
    console.log('\nTransaction Capture: ENABLED');
  }

  async detectNetwork() {
    if (!this.enabled) return;

    try {
      const network = await ethers.provider.getNetwork();
      const chainId = Number(network.chainId);

      const networkMap = {
        31337: { name: 'hardhat', explorer: null },
        11155111: { name: 'sepolia', explorer: 'https://sepolia.etherscan.io/tx/' }
      };

      this.networkInfo = networkMap[chainId] || { name: 'unknown', explorer: null };

      console.log(`Network: ${this.networkInfo.name} (ChainID: ${chainId})`);
      console.log(`Output File: ${this.getOutputFilePath()}\n`);
    } catch (error) {
      console.error('Failed to detect network:', error.message);
      this.networkInfo = { name: 'unknown', explorer: null };
    }
  }

  setCurrentTest(testName, suiteName) {
    if (!this.enabled) return;

    this.currentTestName = testName;
    this.currentTestSuite = suiteName || 'Unknown Suite';
    this.totalTests++;
  }

  async captureTransaction(testName, txResponse) {
    if (!this.enabled) return txResponse;

    // Check if this is actually a transaction response
    if (!txResponse || !txResponse.hash || typeof txResponse.wait !== 'function') {
      return txResponse;
    }

    try {
      // Wait for transaction to be mined
      const receipt = await txResponse.wait();

      // Extract network info if not already set
      if (!this.networkInfo) {
        await this.detectNetwork();
      }

      // Get network details
      const network = await ethers.provider.getNetwork();
      const chainId = Number(network.chainId);

      // Try to extract contract method name from transaction data
      let contractMethod = 'unknown';
      try {
        // This is a simplified method name extraction
        // In reality, you'd need to decode the transaction data
        if (txResponse.data && txResponse.data.length > 10) {
          const methodSignature = txResponse.data.slice(0, 10);
          // Map common method signatures to names
          const methodMap = {
            '0xa22cb465': 'setApprovalForAll',
            '0xf242432a': 'safeTransferFrom',
            '0x2eb2c2d6': 'safeBatchTransferFrom',
            '0x862440e2': 'setBaseURI',
            '0x1f7fdffa': 'mintBatch',
            '0xf2fde38b': 'transferOwnership'
          };
          contractMethod = methodMap[methodSignature] || methodSignature;
        }
      } catch (err) {
        // If method extraction fails, keep as 'unknown'
      }

      // Create transaction record
      const txRecord = {
        testName: testName || this.currentTestName || 'Unknown Test',
        testSuite: this.currentTestSuite || 'Unknown Suite',
        transactionHash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        contractMethod: contractMethod,
        from: txResponse.from,
        to: txResponse.to,
        network: this.networkInfo?.name || 'unknown',
        chainId: chainId,
        blockchainExplorer: this.networkInfo?.explorer
          ? `${this.networkInfo.explorer}${txResponse.hash}`
          : null,
        timestamp: new Date().toISOString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };

      this.transactions.push(txRecord);

      return txResponse;
    } catch (error) {
      // Even if waiting fails, try to capture what we have
      this.captureFailedTransaction(testName, txResponse, error);
      throw error;
    }
  }

  captureFailedTransaction(testName, txResponse, error) {
    if (!this.enabled || !txResponse?.hash) return;

    const txRecord = {
      testName: testName || this.currentTestName || 'Unknown Test',
      testSuite: this.currentTestSuite || 'Unknown Suite',
      transactionHash: txResponse.hash,
      blockNumber: null,
      gasUsed: null,
      contractMethod: 'unknown',
      from: txResponse.from || null,
      to: txResponse.to || null,
      network: this.networkInfo?.name || 'unknown',
      chainId: null,
      blockchainExplorer: null,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message
    };

    this.transactions.push(txRecord);
  }

  getOutputFilePath() {
    const customPath = process.env.CAPTURE_OUTPUT_FILE;
    if (customPath) {
      return path.isAbsolute(customPath)
        ? customPath
        : path.join(process.cwd(), customPath);
    }
    return path.join(process.cwd(), 'test-transactions.json');
  }

  async writeToFile() {
    if (!this.enabled || this.transactions.length === 0) return;

    try {
      const outputPath = this.getOutputFilePath();

      // Create backup if file exists
      if (fs.existsSync(outputPath)) {
        const backupPath = `${outputPath}.backup`;
        fs.copyFileSync(outputPath, backupPath);
      }

      // Calculate statistics
      const testDuration = this.startTime
        ? ((Date.now() - this.startTime) / 1000).toFixed(1) + 's'
        : 'unknown';

      const testsWithTransactions = new Set(
        this.transactions.map(tx => tx.testName)
      ).size;

      const readOnlyTests = this.totalTests - testsWithTransactions;

      // Group by test suite
      const transactionsByTestSuite = {};
      this.transactions.forEach(tx => {
        const suite = tx.testSuite || 'Unknown Suite';
        transactionsByTestSuite[suite] = (transactionsByTestSuite[suite] || 0) + 1;
      });

      // Group by method
      const transactionsByMethod = {};
      this.transactions.forEach(tx => {
        const method = tx.contractMethod;
        transactionsByMethod[method] = (transactionsByMethod[method] || 0) + 1;
      });

      // Calculate gas analysis
      const gasAnalysis = this.calculateGasAnalysis();

      // Build output JSON
      const output = {
        captureMetadata: {
          generatedAt: new Date().toISOString(),
          network: this.networkInfo?.name || 'unknown',
          chainId: this.transactions[0]?.chainId || null,
          totalTransactions: this.transactions.length,
          totalTests: this.totalTests,
          testsWithTransactions: testsWithTransactions,
          testsReadOnly: readOnlyTests,
          testRunDuration: testDuration
        },
        transactions: this.transactions,
        transactionsByTestSuite,
        transactionsByMethod,
        gasAnalysis
      };

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('Transaction Capture Summary:');
      console.log('='.repeat(60));
      console.log(`  Total Tests: ${this.totalTests}`);
      console.log(`  Tests with Transactions: ${testsWithTransactions}`);
      console.log(`  Read-Only Tests: ${readOnlyTests}`);
      console.log(`  Total Transactions Captured: ${this.transactions.length}`);
      console.log(`  Total Gas Used: ${gasAnalysis.totalGasUsed}`);
      console.log(`  Output File: ${outputPath}`);
      console.log('='.repeat(60) + '\n');

    } catch (error) {
      console.error('\nFailed to write transaction capture file:', error.message);
    }
  }

  calculateGasAnalysis() {
    if (this.transactions.length === 0) {
      return {
        totalGasUsed: '0',
        averageGasPerTransaction: '0',
        gasByMethod: {}
      };
    }

    // Calculate total gas
    const totalGas = this.transactions.reduce((sum, tx) => {
      const gas = tx.gasUsed ? BigInt(tx.gasUsed) : BigInt(0);
      return sum + gas;
    }, BigInt(0));

    const avgGas = totalGas / BigInt(this.transactions.length);

    // Calculate gas by method
    const gasByMethod = {};
    this.transactions.forEach(tx => {
      const method = tx.contractMethod;
      if (!gasByMethod[method]) {
        gasByMethod[method] = {
          transactions: [],
          count: 0
        };
      }
      if (tx.gasUsed) {
        gasByMethod[method].transactions.push(BigInt(tx.gasUsed));
        gasByMethod[method].count++;
      }
    });

    // Calculate min, max, avg for each method
    Object.keys(gasByMethod).forEach(method => {
      const gases = gasByMethod[method].transactions;
      if (gases.length > 0) {
        const sum = gases.reduce((a, b) => a + b, BigInt(0));
        const avg = sum / BigInt(gases.length);
        const min = gases.reduce((a, b) => a < b ? a : b);
        const max = gases.reduce((a, b) => a > b ? a : b);

        gasByMethod[method] = {
          count: gasByMethod[method].count,
          avg: avg.toString(),
          min: min.toString(),
          max: max.toString()
        };
      }
    });

    return {
      totalGasUsed: totalGas.toString(),
      averageGasPerTransaction: avgGas.toString(),
      gasByMethod
    };
  }
}

// Singleton instance
const txCapture = new TxHashCapture();

module.exports = txCapture;
