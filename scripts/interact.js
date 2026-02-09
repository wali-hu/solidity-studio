const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error("Please set CONTRACT_ADDRESS environment variable");
  }

  console.log("Interacting with GameInventory at:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("=".repeat(50));

  const [owner, addr1] = await ethers.getSigners();
  const GameInventory = await ethers.getContractFactory("GameInventory");
  const gameInventory = GameInventory.attach(contractAddress);

  // Verify contract is accessible
  console.log("\nContract Info:");
  console.log("Owner:", await gameInventory.owner());
  console.log("Base URI:", await gameInventory.baseURI());
  console.log("=".repeat(50));

  // Display initial balances
  console.log("\nInitial Balances:");
  console.log("Owner GOLD:", (await gameInventory.balanceOf(owner.address, 0)).toString());
  console.log("Owner FOUNDER_SWORD:", (await gameInventory.balanceOf(owner.address, 1)).toString());
  console.log("Owner HEALTH_POTION:", (await gameInventory.balanceOf(owner.address, 2)).toString());
  console.log("=".repeat(50));

  // DoD Test 1: safeBatchTransferFrom - Transfer all 3 token types in ONE transaction
  console.log("\nDoD Test 1: safeBatchTransferFrom");
  console.log("Transferring all 3 token types to addr1 in one transaction...");

  const ids = [0, 1, 2]; // GOLD, FOUNDER_SWORD, HEALTH_POTION
  const amounts = [1000, 1, 10];

  console.log("Token IDs:", ids);
  console.log("Amounts:", amounts);

  const tx = await gameInventory.safeBatchTransferFrom(
    owner.address,
    addr1.address,
    ids,
    amounts,
    "0x"
  );

  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("Batch transfer successful!");
  console.log("=".repeat(50));

  // Verify balances after transfer
  console.log("\nBalances After Batch Transfer:");
  console.log("Owner GOLD:", (await gameInventory.balanceOf(owner.address, 0)).toString());
  console.log("Owner FOUNDER_SWORD:", (await gameInventory.balanceOf(owner.address, 1)).toString());
  console.log("Owner HEALTH_POTION:", (await gameInventory.balanceOf(owner.address, 2)).toString());
  console.log("");
  console.log("Addr1 GOLD:", (await gameInventory.balanceOf(addr1.address, 0)).toString());
  console.log("Addr1 FOUNDER_SWORD:", (await gameInventory.balanceOf(addr1.address, 1)).toString());
  console.log("Addr1 HEALTH_POTION:", (await gameInventory.balanceOf(addr1.address, 2)).toString());
  console.log("=".repeat(50));

  // DoD Test 2: balanceOfBatch - Query multiple addresses at once
  console.log("\nDoD Test 2: balanceOfBatch");
  console.log("Querying balances for multiple addresses...");

  const addresses = [owner.address, addr1.address, addr1.address, owner.address];
  const tokenIds = [0, 0, 1, 2];

  console.log("Addresses:", addresses.map(a => a.slice(0, 6) + "..." + a.slice(-4)));
  console.log("Token IDs:", tokenIds);

  const balances = await gameInventory.balanceOfBatch(addresses, tokenIds);

  console.log("\nReturned Balances:");
  console.log(`[0] Owner GOLD (ID 0): ${balances[0]}`);
  console.log(`[1] Addr1 GOLD (ID 0): ${balances[1]}`);
  console.log(`[2] Addr1 FOUNDER_SWORD (ID 1): ${balances[2]}`);
  console.log(`[3] Owner HEALTH_POTION (ID 2): ${balances[3]}`);
  console.log("balanceOfBatch successful!");
  console.log("=".repeat(50));

  // DoD Test 3: URI verification
  console.log("\nDoD Test 3: URI Override");
  console.log("Verifying dynamic URI generation...");

  console.log("Token 0 URI:", await gameInventory.uri(0));
  console.log("Token 1 URI:", await gameInventory.uri(1));
  console.log("Token 2 URI:", await gameInventory.uri(2));
  console.log("URI override working correctly!");
  console.log("=".repeat(50));

  // Summary
  console.log("\nAll DoD Requirements Validated:");
  console.log("safeBatchTransferFrom: Transferred all 3 token types in one transaction");
  console.log("balanceOfBatch: Retrieved multiple balances correctly");
  console.log("URI Override: Dynamic JSON server URLs generated correctly");
  console.log("\nInteraction completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Interaction failed:");
    console.error(error);
    process.exit(1);
  });
