# Uniswap CCA Integration for DBBPT

## Overview

This document outlines the integration of Dr. Birdy Books Protocol Token (DBBPT) with Uniswap's Continuous Clearing Auction (CCA) system to raise $150,000 in liquidity.

---

## Why Uniswap CCA?

**Benefits:**
- ✅ **Uniswap brand recognition** - Trusted platform
- ✅ **Automated liquidity bootstrapping** - Directly creates Uniswap v4 pools
- ✅ **Fair price discovery** - No timing games or sniping
- ✅ **Built-in UI** - Uniswap interface handles bidding
- ✅ **Proven mechanism** - Used by major token launches

---

## Key Differences from Our Custom Auction

| Feature | Our Custom CCA | Uniswap CCA |
|---------|---------------|-------------|
| **Deployment** | Custom contract | Use Uniswap factory |
| **Control** | Full owner control (cancel, end early) | Limited control (no cancel/early end) |
| **UI** | Custom dashboard or BaseScan | Uniswap official interface |
| **Liquidity** | Manual pool creation | Automatic Uniswap v4 integration |
| **Fund Split** | Custom 2/3 + 1/3 split | All funds to `fundsRecipient` |
| **Visibility** | Self-promoted | Listed on Uniswap platform |
| **Approval** | Self-deployed | Requires Uniswap review/approval |

---

## Integration Requirements

### 1. Contract Addresses (Base Mainnet)

```solidity
// Already deployed by Uniswap
ContinuousClearingAuctionFactory: 0xCCccCcCAE7503Cac057829BF2811De42E16e0bD5

// Our tokens
DBBPT Token: 0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B
USDC (Base): 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### 2. Auction Parameters

Based on requirements:
- **Tokens to sell**: 1,500,000 DBBPT
- **Target raise**: $150,000 USDC
- **Floor price**: $0.10 per DBBPT (150,000 / 1,500,000)
- **Duration**: ~30 days (assume 12-second blocks = 216,000 blocks)
- **Currency**: USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)

### 3. AuctionParameters Struct

```solidity
struct AuctionParameters {
    address currency;              // USDC address
    address tokensRecipient;       // Your address (receives unsold tokens)
    address fundsRecipient;        // Your address (receives all USDC raised)
    uint64 startBlock;             // When auction starts
    uint64 endBlock;               // When auction ends
    uint64 claimBlock;             // When tokens can be claimed (>= endBlock)
    uint256 tickSpacing;           // Minimum price increment
    address validationHook;        // address(0) for no hook
    uint256 floorPrice;            // Minimum price in Q96 format
    uint128 requiredCurrencyRaised; // 0 = no minimum (graduates regardless)
    bytes auctionStepsData;        // Token release schedule
}
```

---

## Implementation Steps

### Step 1: Calculate Q96 Floor Price

Floor price of $0.10 per DBBPT = 0.1 USDC per DBBPT

**Q96 Format**: `price * 2^96`

```javascript
// USDC has 6 decimals, DBBPT has 18 decimals
// Price ratio = 0.1 USDC (1e5 units) per 1 DBBPT (1e18 units)
// ratio = 1e5 / 1e18 = 1e-13

const floorPrice = BigInt("0.1") * (2n ** 96n) // Simplified
// Actual: 7922816251426433400832 (for 0.1 USDC per DBBPT)
```

### Step 2: Design Token Release Schedule

**Strategy**: Gradual release to prevent sniping

Example schedule for 1,500,000 DBBPT over 216,000 blocks (30 days):
- **Phase 1** (days 1-10): 15% release (225k tokens) over 72,000 blocks = ~3.125 tokens/block
- **Phase 2** (days 11-25): 60% release (900k tokens) over 108,000 blocks = ~8.333 tokens/block  
- **Phase 3** (days 26-30): 25% release (375k tokens) over 36,000 blocks = ~10.417 tokens/block

### Step 3: Create Deployment Script

```typescript
// scripts/deploy-uniswap-cca.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Uniswap CCA Factory on Base Mainnet
  const FACTORY_ADDRESS = "0xCCccCcCAE7503Cac057829BF2811De42E16e0bD5";
  const DBBPT_TOKEN = "0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B";
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  const TOKEN_AMOUNT = ethers.parseEther("1500000"); // 1.5M DBBPT
  const FLOOR_PRICE = BigInt("7922816251426433400832"); // 0.1 USDC per DBBPT in Q96
  
  const currentBlock = await ethers.provider.getBlockNumber();
  const START_BLOCK = currentBlock + 100; // Start in ~20 minutes
  const END_BLOCK = START_BLOCK + 216000; // ~30 days
  const CLAIM_BLOCK = END_BLOCK; // Claim immediately after end
  
  // Auction steps (token release schedule)
  const auctionSteps = packAuctionSteps([
    { tokensPerBlock: 3125, blocks: 72000 },  // Phase 1: 15%
    { tokensPerBlock: 8333, blocks: 108000 }, // Phase 2: 60%
    { tokensPerBlock: 10417, blocks: 36000 }, // Phase 3: 25%
  ]);
  
  const parameters = {
    currency: USDC_ADDRESS,
    tokensRecipient: deployer.address,
    fundsRecipient: deployer.address,
    startBlock: START_BLOCK,
    endBlock: END_BLOCK,
    claimBlock: CLAIM_BLOCK,
    tickSpacing: FLOOR_PRICE, // Use floor price as tick spacing
    validationHook: ethers.ZeroAddress,
    floorPrice: FLOOR_PRICE,
    requiredCurrencyRaised: 0, // No minimum requirement
    auctionStepsData: auctionSteps,
  };
  
  // Initialize auction
  const factory = await ethers.getContractAt(
    "IContinuousClearingAuctionFactory",
    FACTORY_ADDRESS
  );
  
  const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address,address,address,uint64,uint64,uint64,uint256,address,uint256,uint128,bytes)"],
    [Object.values(parameters)]
  );
  
  const tx = await factory.initializeDistribution(
    DBBPT_TOKEN,
    TOKEN_AMOUNT,
    encodedParams,
    ethers.ZeroHash // No salt
  );
  
  const receipt = await tx.wait();
  const auctionAddress = receipt.logs[0].address; // Extract auction address
  
  console.log("✅ Auction created:", auctionAddress);
  
  // Step 4: Transfer DBBPT tokens to auction
  const token = await ethers.getContractAt("IERC20", DBBPT_TOKEN);
  await token.transfer(auctionAddress, TOKEN_AMOUNT);
  
  // Step 5: Notify auction of token receipt
  const auction = await ethers.getContractAt(
    "IContinuousClearingAuction",
    auctionAddress
  );
  await auction.onTokensReceived();
  
  console.log("✅ Auction funded and ready!");
  console.log("Auction address:", auctionAddress);
  console.log("Start block:", START_BLOCK);
  console.log("End block:", END_BLOCK);
}

function packAuctionSteps(steps: Array<{tokensPerBlock: number, blocks: number}>): string {
  // Pack steps into bytes8 format: (tokensPerBlock | (blocks << 24))
  let packed = "0x";
  for (const step of steps) {
    const value = BigInt(step.tokensPerBlock) | (BigInt(step.blocks) << 24n);
    packed += value.toString(16).padStart(16, "0");
  }
  return packed;
}

main().catch(console.error);
```

### Step 4: Submit Application to Uniswap

**Required**: Fill out Uniswap's application form
- URL: https://share.hsforms.com/1JvhInfDuQ8mYmvju2-H3_Qs8pgg
- Provide: Project details, token address, desired auction parameters
- Wait for approval before deployment

---

## Comparison: Custom vs Uniswap CCA

### Our Custom CCA (Already Built)

**Pros:**
- ✅ Already tested (36/36 tests passing)
- ✅ Full control (cancel, end early, withdraw)
- ✅ Custom fund splits (2/3 operations, 1/3 liquidity)
- ✅ Can deploy immediately
- ✅ No approval needed
- ✅ Flexible parameters

**Cons:**
- ❌ Less visibility
- ❌ Need to build own UI or use BaseScan
- ❌ Manual liquidity pool creation
- ❌ No Uniswap brand association

### Uniswap CCA Integration

**Pros:**
- ✅ Uniswap brand trust
- ✅ Built-in UI on Uniswap interface
- ✅ Automatic Uniswap v4 liquidity bootstrapping
- ✅ More visibility to broader audience
- ✅ Proven mechanism

**Cons:**
- ❌ Requires approval (timeline uncertain)
- ❌ Less control (no cancel/early end)
- ❌ Must follow their parameters
- ❌ Single recipient address (no automatic splits)
- ❌ May not meet June timeline if approval delayed

---

## Recommended Path Forward

### Option A: Start with Uniswap Application NOW

1. **Immediately**: Fill out Uniswap form (https://share.hsforms.com/1JvhInfDuQ8mYmvju2-H3_Qs8pgg)
2. **While waiting for approval**: Complete integration code
3. **If approved by mid-May**: Deploy Uniswap CCA for June launch ✅
4. **If not approved in time**: Fall back to our custom CCA

### Option B: Use Our Custom CCA (Backup Plan)

If Uniswap approval doesn't come through in time:
1. Deploy our already-tested `ContinuousClearingAuction.sol`
2. Use frontend dashboard or BaseScan
3. Manually create liquidity after auction
4. Still meets June timeline ✅

---

## Next Steps

### Immediate Actions:

1. ✅ **Fill out Uniswap application form**
   - Emphasize DBBPT is verified on BaseScan
   - Provide project details and community size
   - Request June launch timeline

2. **While waiting for approval:**
   - [ ] Complete Uniswap CCA integration script
   - [ ] Create interface ABIs for their contracts
   - [ ] Test on Base Sepolia testnet (if available)
   - [ ] Prepare marketing materials

3. **Contingency:**
   - [ ] Keep custom CCA ready as backup
   - [ ] Prepare both deployment paths

### Technical Implementation:

If approved, I'll create:
1. Deployment script for Uniswap CCA
2. Helper functions for auction parameters
3. Integration tests
4. Documentation for bidding process

---

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Application submission | 1 day | Ready to start |
| Uniswap review | 1-3 weeks | Unknown |
| Integration development | 1 week | Can start now |
| Testing | 3-5 days | After approval |
| Mainnet deployment | 1 day | After testing |
| **Total** | **3-5 weeks** | **Tight for June** |

**Recommendation**: Submit application NOW and develop both paths in parallel.

---

## Questions to Consider

1. **Risk tolerance**: Comfortable waiting for Uniswap approval vs. guaranteed launch with custom CCA?
2. **Liquidity strategy**: Prefer automatic Uniswap v4 integration vs. manual DEX listing?
3. **Control vs. visibility**: Value owner controls vs. Uniswap brand recognition?
4. **Fund distribution**: Need automatic 2/3 + 1/3 split (custom CCA) vs. single recipient (Uniswap)?

---

## Recommendation

**Start Uniswap application immediately**, but keep custom CCA as backup:

1. Fill out their form today
2. Develop Uniswap integration while waiting
3. If approved by May 15 → Use Uniswap CCA (better visibility)
4. If not approved → Use custom CCA (guaranteed June launch)

This "dual-track" approach ensures June timeline while pursuing optimal solution.

---

**Status**: Awaiting decision on which path to pursue
**Next Action**: Fill out Uniswap application form
