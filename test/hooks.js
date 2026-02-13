const { ethers } = require('hardhat');
const txCapture = require('./utils/txHashCapture');

// Store original getContractFactory - will be set in before hook
let originalGetContractFactory = null;

// Wrap contract instances to capture transactions
function wrapContract(contract, testName) {
  return new Proxy(contract, {
    get(target, prop) {
      const original = target[prop];

      // Don't wrap non-function properties
      if (typeof original !== 'function') {
        return original;
      }

      // Special handling for 'connect' method to maintain wrapping
      if (prop === 'connect') {
        return function(...args) {
          const connectedContract = original.apply(target, args);
          return wrapContract(connectedContract, testName);
        };
      }

      // Wrap contract methods
      return async function(...args) {
        try {
          const result = await original.apply(target, args);

          // If result is a transaction response, capture it
          if (result && result.hash && typeof result.wait === 'function') {
            await txCapture.captureTransaction(testName, result);
          }

          return result;
        } catch (error) {
          // Re-throw the error so tests fail as expected
          throw error;
        }
      };
    }
  });
}

// Override getContractFactory to return wrapped contracts
function wrappedGetContractFactory(...args) {
  return originalGetContractFactory(...args).then(factory => {
    // Wrap the factory's deploy and attach methods
    const originalDeploy = factory.deploy;
    const originalAttach = factory.attach;

    factory.deploy = async function(...deployArgs) {
      const contract = await originalDeploy.apply(factory, deployArgs);
      const testName = txCapture.currentTestName || 'Contract Deployment';

      // Capture deployment transaction
      if (contract.deploymentTransaction) {
        await txCapture.captureTransaction(testName, contract.deploymentTransaction());
      }

      return wrapContract(contract, testName);
    };

    factory.attach = function(...attachArgs) {
      const contract = originalAttach.apply(factory, attachArgs);
      return wrapContract(contract, txCapture.currentTestName || 'Unknown Test');
    };

    return factory;
  });
}

// Register global before/after hooks
before(async function() {
  // Save original getContractFactory reference
  originalGetContractFactory = ethers.getContractFactory;

  // Initialize capture system
  txCapture.initialize();

  // Detect network
  await txCapture.detectNetwork();

  // Override getContractFactory with wrapped version
  if (txCapture.enabled) {
    ethers.getContractFactory = wrappedGetContractFactory;
  }
});

beforeEach(function() {
  if (!txCapture.enabled) return;

  // Extract test name and suite name
  const currentTest = this.currentTest;
  if (currentTest) {
    const fullTitle = currentTest.fullTitle();
    const suiteName = currentTest.parent ? currentTest.parent.title : 'Unknown Suite';

    txCapture.setCurrentTest(fullTitle, suiteName);
  }
});

after(async function() {
  // Write captured transactions to file
  await txCapture.writeToFile();

  // Restore original getContractFactory
  if (txCapture.enabled && originalGetContractFactory) {
    ethers.getContractFactory = originalGetContractFactory;
  }
});

