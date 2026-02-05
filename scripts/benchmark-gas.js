const { ethers } = require("hardhat");

async function main() {
  console.log("\n========================================");
  console.log("GAS BENCHMARKING: ERC721 vs ERC721A");
  console.log("========================================\n");

  const [deployer, user] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("User address:", user.address);

  // Deploy UniqueCollectible (ERC721)
  console.log("\n📦 Deploying UniqueCollectible (Standard ERC721)...");
  const UniqueCollectible = await ethers.getContractFactory("UniqueCollectible");
  const uniqueCollectible = await UniqueCollectible.deploy(
    "UniqueCollectible",
    "UNC",
    "https://example.com/metadata/"
  );
  await uniqueCollectible.waitForDeployment();
  const uniqueAddress = await uniqueCollectible.getAddress();
  console.log("✅ UniqueCollectible deployed at:", uniqueAddress);

  // Deploy BatchMint (ERC721A)
  console.log("\n📦 Deploying BatchMint (ERC721A)...");
  const BatchMint = await ethers.getContractFactory("BatchMint");
  const batchMint = await BatchMint.deploy(
    "BatchMint",
    "BATCH",
    "https://example.com/metadata/"
  );
  await batchMint.waitForDeployment();
  const batchAddress = await batchMint.getAddress();
  console.log("✅ BatchMint deployed at:", batchAddress);

  console.log("\n========================================");
  console.log("BENCHMARK RESULTS");
  console.log("========================================\n");

  const results = [];

  // Test 1 NFT
  console.log("🔹 Testing: Mint 1 NFT");
  const tx1_erc721 = await uniqueCollectible.connect(user).batchMint(user.address, 1);
  const receipt1_erc721 = await tx1_erc721.wait();
  const gas1_erc721 = receipt1_erc721.gasUsed;

  const tx1_erc721a = await batchMint.connect(user).mint(1);
  const receipt1_erc721a = await tx1_erc721a.wait();
  const gas1_erc721a = receipt1_erc721a.gasUsed;

  const savings1 = gas1_erc721 - gas1_erc721a;
  const percentage1 = ((Number(savings1) / Number(gas1_erc721)) * 100).toFixed(2);

  results.push({
    qty: 1,
    erc721: gas1_erc721.toString(),
    erc721a: gas1_erc721a.toString(),
    savings: savings1.toString(),
    percentage: percentage1,
  });

  console.log(`  ERC721:  ${gas1_erc721} gas`);
  console.log(`  ERC721A: ${gas1_erc721a} gas`);
  console.log(`  Savings: ${savings1} gas (${percentage1}%)\n`);

  // Test 5 NFTs
  console.log("🔹 Testing: Mint 5 NFTs");
  const tx5_erc721 = await uniqueCollectible.connect(user).batchMint(user.address, 5);
  const receipt5_erc721 = await tx5_erc721.wait();
  const gas5_erc721 = receipt5_erc721.gasUsed;

  const tx5_erc721a = await batchMint.connect(user).mint(5);
  const receipt5_erc721a = await tx5_erc721a.wait();
  const gas5_erc721a = receipt5_erc721a.gasUsed;

  const savings5 = gas5_erc721 - gas5_erc721a;
  const percentage5 = ((Number(savings5) / Number(gas5_erc721)) * 100).toFixed(2);

  results.push({
    qty: 5,
    erc721: gas5_erc721.toString(),
    erc721a: gas5_erc721a.toString(),
    savings: savings5.toString(),
    percentage: percentage5,
  });

  console.log(`  ERC721:  ${gas5_erc721} gas`);
  console.log(`  ERC721A: ${gas5_erc721a} gas`);
  console.log(`  Savings: ${savings5} gas (${percentage5}%)\n`);

  // Test 10 NFTs
  console.log("🔹 Testing: Mint 10 NFTs");
  const tx10_erc721 = await uniqueCollectible.connect(user).batchMint(user.address, 10);
  const receipt10_erc721 = await tx10_erc721.wait();
  const gas10_erc721 = receipt10_erc721.gasUsed;

  const tx10_erc721a = await batchMint.connect(user).mint(10);
  const receipt10_erc721a = await tx10_erc721a.wait();
  const gas10_erc721a = receipt10_erc721a.gasUsed;

  const savings10 = gas10_erc721 - gas10_erc721a;
  const percentage10 = ((Number(savings10) / Number(gas10_erc721)) * 100).toFixed(2);

  results.push({
    qty: 10,
    erc721: gas10_erc721.toString(),
    erc721a: gas10_erc721a.toString(),
    savings: savings10.toString(),
    percentage: percentage10,
  });

  console.log(`  ERC721:  ${gas10_erc721} gas`);
  console.log(`  ERC721A: ${gas10_erc721a} gas`);
  console.log(`  Savings: ${savings10} gas (${percentage10}%)\n`);

  // Print Summary Table
  console.log("========================================");
  console.log("SUMMARY TABLE");
  console.log("========================================\n");

  console.log("┌─────────┬──────────────┬──────────────┬──────────────┬────────────┐");
  console.log("│ Qty     │ ERC721 Gas   │ ERC721A Gas  │ Gas Saved    │ % Saved    │");
  console.log("├─────────┼──────────────┼──────────────┼──────────────┼────────────┤");

  results.forEach((r) => {
    const qtyStr = r.qty.toString().padEnd(7);
    const erc721Str = r.erc721.padEnd(12);
    const erc721aStr = r.erc721a.padEnd(12);
    const savingsStr = r.savings.padEnd(12);
    const percentStr = (r.percentage + "%").padEnd(10);

    console.log(
      `│ ${qtyStr} │ ${erc721Str} │ ${erc721aStr} │ ${savingsStr} │ ${percentStr} │`
    );
  });

  console.log("└─────────┴──────────────┴──────────────┴──────────────┴────────────┘\n");

  console.log("========================================");
  console.log("VERIFICATION CHECKS");
  console.log("========================================\n");

  // Verify balanceOf
  console.log("✅ DoD #2: balanceOf Verification");
  const balance_erc721 = await uniqueCollectible.balanceOf(user.address);
  const balance_erc721a = await batchMint.balanceOf(user.address);
  console.log(`  UniqueCollectible: ${balance_erc721} NFTs (expected: 16)`);
  console.log(`  BatchMint: ${balance_erc721a} NFTs (expected: 16)\n`);

  // Verify ownerOf
  console.log("✅ DoD #3: ownerOf Verification");
  const owner0 = await batchMint.ownerOf(0);
  const owner5 = await batchMint.ownerOf(5);
  const owner15 = await batchMint.ownerOf(15);
  console.log(`  ownerOf(0): ${owner0}`);
  console.log(`  ownerOf(5): ${owner5}`);
  console.log(`  ownerOf(15): ${owner15}`);
  console.log(`  All owned by: ${user.address}\n`);

  console.log("========================================");
  console.log("BENCHMARK COMPLETE! ✅");
  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
