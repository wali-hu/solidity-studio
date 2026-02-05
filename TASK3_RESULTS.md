# Task 3: ERC721A Implementation - Final Results

##  Benchmarking Results (DoD #1)

### Gas Comparison Table: ERC721 vs ERC721A

```
┌─────────┬──────────────┬──────────────┬──────────────┬────────────┐
│ Qty     │ ERC721 Gas   │ ERC721A Gas  │ Gas Saved    │ % Saved    │
├─────────┼──────────────┼──────────────┼──────────────┼────────────┤
│ 1       │ 117,862      │ 91,223       │ 26,639       │ 22.60%     │
│ 5       │ 290,591      │ 64,743       │ 225,848      │ 77.72%     │
│ 10      │ 550,198      │ 74,393       │ 475,805      │ 86.48%     │
└─────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

### Key Insights:

1. **Single Mint (1 NFT):**

   - ERC721: 117,862 gas
   - ERC721A: 91,223 gas
   - **Savings: 22.60%**

2. **Medium Batch (5 NFTs):**

   - ERC721: 290,591 gas
   - ERC721A: 64,743 gas
   - **Savings: 77.72%** 

3. **Large Batch (10 NFTs):**
   - ERC721: 550,198 gas
   - ERC721A: 74,393 gas
   - **Savings: 86.48%** 

### Analysis:

**Cost Curve Behavior:**

- **ERC721:** Linear growth (O(n)) - each additional NFT costs ~51,925 gas
- **ERC721A:** Nearly flat curve (O(1)) - each additional NFT costs ~2,000 gas

**Efficiency Improvement:**

- Minting 5 NFTs: ERC721A uses **4.5x LESS gas**
- Minting 10 NFTs: ERC721A uses **7.4x LESS gas**

---

##  DoD #2: balanceOf Verification

### Test Results:

```javascript
✓ balanceOf after minting 5 NFTs: 5
✓ balanceOf after minting 10 NFTs: 10
```

### Verification:

- **Batch Mint 5 NFTs:**

  ```solidity
  await batchMint.mint(5);
  balance = await batchMint.balanceOf(userAddress);
  // Result: 5 
  ```

- **Batch Mint 10 NFTs:**

  ```solidity
  await batchMint.mint(10);
  balance = await batchMint.balanceOf(userAddress);
  // Result: 10 
  ```

- **Multiple Addresses:**
  ```solidity
  await batchMint.connect(addr1).mint(5);  // addr1 balance: 5
  await batchMint.connect(addr2).mint(3);  // addr2 balance: 3
  // Both correct 
  ```

**Conclusion:** `balanceOf()` returns accurate count after batch minting.

---

##  DoD #3: ownerOf Verification

### Test Results:

```javascript
✓ ownerOf(0): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
✓ ownerOf(2): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
✓ ownerOf(4): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
✓ All 20 tokens verified to belong to addr1
```

### Verification:

**Scenario 1: Tokens 0-4 (Batch mint 5 to addr1)**

```solidity
await batchMint.connect(addr1).mint(5);
ownerOf(0) → addr1 
ownerOf(2) → addr1 
ownerOf(4) → addr1 
```

**Scenario 2: Tokens 5-14 (Batch mint 10 to addr2)**

```solidity
await batchMint.connect(addr1).mint(5);   // tokens 0-4
await batchMint.connect(addr2).mint(10);  // tokens 5-14

ownerOf(5)  → addr2 
ownerOf(9)  → addr2 
ownerOf(14) → addr2 
```

**Scenario 3: Large batch verification**

```solidity
await batchMint.connect(addr1).mint(20);
// Verified ALL 20 tokens (0-19) belong to addr1 
```

**Conclusion:** `ownerOf()` correctly returns owner for ANY token ID within a minted batch, demonstrating ERC721A's sequential ownership tracking works perfectly.

---

##  Files Created/Modified

### New Files:

1. **contracts/BatchMint.sol** - ERC721A implementation
2. **test/BatchMint.test.js** - Comprehensive tests
3. **scripts/benchmark-gas.js** - Gas comparison script

### Modified Files:

1. **contracts/UniqueCollectible.sol** - Added `batchMint()` function for fair comparison
2. **package.json** - Added `erc721a` dependency

---

##  Test Results

### All Tests Passing: 

```
BatchMint (ERC721A)
  Deployment
    ✔ should deploy with correct name and symbol
    ✔ should start with 0 total supply
  Minting
    ✔ should mint single NFT
    ✔ should mint 5 NFTs in batch
    ✔ should mint 10 NFTs in batch
    ✔ should fail when minting 0 NFTs
    ✔ should fail when exceeding max supply
  balanceOf verification (DoD #2)
    ✔ should return correct balance after batch mint of 5
    ✔ should return correct balance after batch mint of 10
    ✔ should track multiple addresses correctly
  ownerOf verification (DoD #3)
    ✔ should return correct owner for all tokens in batch (0-4)
    ✔ should return correct owner for all tokens in batch (5-14)
    ✔ should verify ownership for middle tokens in large batch
  Token URI
    ✔ should return correct tokenURI
  Transfer
    ✔ should transfer NFT correctly

UniqueCollectible
  ✔ tokenURI returns a valid URL
  ✔ transfers NFT from A to B

17 passing (605ms)
```

---

##  DoD Completion Status

- [x] **DoD #1:** Benchmarking table provided 

  - Gas costs for 1, 5, 10 mints compared
  - Percentage savings calculated
  - Clear table format delivered

- [x] **DoD #2:** balanceOf verification 

  - Returns correct count after batch mint of 5
  - Returns correct count after batch mint of 10
  - Multiple addresses tracked correctly

- [x] **DoD #3:** ownerOf validation 
  - Works correctly for tokens 0-4 in batch
  - Works correctly for tokens 5-14 in batch
  - Verified for large batches (20 tokens)

---

##  Key Learnings

### Why ERC721A is More Efficient:

1. **Slot Packing:**

   - Combines owner address, timestamp, flags into one 256-bit slot
   - Reduces storage writes from 5+ to 1

2. **Sequential Ownership:**

   - Only first token in batch stores explicit owner
   - Subsequent tokens infer ownership
   - Backward scanning for queries

3. **Batch-Optimized Storage:**
   - Single balance update for entire batch
   - Events emitted for compatibility
   - Minimal incremental cost per NFT

### Real-World Impact:

**Example: Minting 10 NFTs at 50 gwei gas price:**

- ERC721: 550,198 gas × 50 gwei = **27,509,900 gwei (0.0275 ETH)**
- ERC721A: 74,393 gas × 50 gwei = **3,719,650 gwei (0.0037 ETH)**
- **User saves: 0.0238 ETH (~$60 at $2500 ETH)**

---

##  Conclusion

ERC721A successfully demonstrates:

- **77-86% gas savings** for batch minting
- **Full ERC721 compatibility** maintained
- **Correct balanceOf tracking** after batch operations
- **Accurate ownerOf queries** for all token IDs

The implementation follows best practices from Chiru Labs.

---

##  References

- ERC721A Docs: https://chiru-labs.github.io/ERC721A/
- GitHub Repo: https://github.com/chiru-labs/ERC721A
- Implementation: https://www.quicknode.com/guides/polygon/how-to-mint-nfts-using-the-erc721a-implementation

---

**Task 3 Complete! **
