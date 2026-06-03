# Fee Exemption Guide for ContinuousClearingAuction

## Overview

The **ReflectiveToken (DBBPT)** charges a **5% transfer fee** on all token transfers. This fee is redistributed to holders through the reflection mechanism. However, for the auction to work properly, we need to **exempt the auction contract from this fee** so that:

1. **Owner can fund the auction** with 1.5M DBBPT without losing 75k tokens to fees
2. **Bidders can claim tokens** after auction finalization without losing 5% of their tokens

## Two Methods for Fee Exemption

### Method 1: `excludeFromFee()` - ✅ RECOMMENDED

This is the **modern, cleaner approach** that permanently excludes an address from fees.

**Advantages:**
- Can exclude multiple addresses simultaneously
- No need to swap back and forth
- Clearer intent and better for auditing
- Can be toggled on/off as needed

**Function signature:**
```solidity
function excludeFromFee(address account, bool excluded) external onlyOwner
```

**Example:**
```typescript
// Exclude auction from fees
await reflectiveToken.excludeFromFee(auctionAddress, true);

// Later, if needed, include it back
await reflectiveToken.excludeFromFee(auctionAddress, false);
```

### Method 2: `setStakingContract()` - ⚠️ LEGACY

This method sets a single address as the "staking contract" which is automatically fee-exempt.

**Disadvantages:**
- Only one address can be exempt at a time
- Requires swapping the staking contract address
- Risk of forgetting to restore the original staking contract
- Confusing for future maintainers

**We keep this for backwards compatibility but recommend Method 1.**

## Recommended Workflow (Using `excludeFromFee`)

### Step 1: Exclude Auction from Fees

**Option A: Using the Frontend UI**
1. Open the Auction Management Dashboard
2. Navigate to "Fee Exemption Controls"
3. Click "Exclude Auction from Fees" button
4. Confirm transaction in MetaMask
5. Wait for confirmation (green checkmark will appear)

**Option B: Using Hardhat Script**
```bash
npx hardhat run scripts/exclude-auction-from-fees.ts --network baseSepolia
```

**Option C: Using Hardhat Console**
```javascript
const reflectiveToken = await ethers.getContractAt("ReflectiveToken", "0xB49872C1aD8a052f1369ABDfC890264938647EB6");
const auctionAddress = "0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d";
await reflectiveToken.excludeFromFee(auctionAddress, true);
```

### Step 2: Verify Exemption Status

**Option A: Using the Frontend UI**
- Look for "✅ Auction is Fee-Exempt ✓" status in the button

**Option B: Using Hardhat Script**
```bash
npx hardhat run scripts/check-fee-exemptions.ts --network baseSepolia
```

**Option C: Manual Check**
```javascript
const isExcluded = await reflectiveToken.isExcludedFromFee(auctionAddress);
console.log("Is excluded?", isExcluded); // Should be true
```

### Step 3: Fund the Auction

Now you can transfer 1.5M DBBPT to the auction contract with **0% fee**:

**Option A: Using Frontend UI**
1. Click "Fund Auction (1.5M DBBPT)" button
2. Confirm transaction

**Option B: Using Script**
```bash
npx hardhat run scripts/fund-auction-localhost.ts --network baseSepolia
```

**Option C: Manual Transfer**
```javascript
const amount = ethers.parseEther("1500000");
await reflectiveToken.transfer(auctionAddress, amount);
```

**Expected Result:**
- Auction receives exactly **1,500,000 DBBPT**
- No 75k tokens lost to fees ✓

### Step 4: Run Auction

The auction proceeds normally:
- Bidders submit bids
- Owner ends early or waits for end block
- Owner finalizes auction

### Step 5: Bidders Claim Tokens

After finalization, bidders can claim their tokens with **0% fee** because the auction is still fee-exempt.

```javascript
await auctionContract.claimTokens();
```

### Step 6 (Optional): Remove Exemption

After all bidders have claimed, you can optionally remove the fee exemption:

```javascript
await reflectiveToken.excludeFromFee(auctionAddress, false);
```

**Note:** This is optional. Keeping the auction exempt doesn't harm anything.

## Checking Current Status

### Quick Check (Frontend)
Open the Auction Management Dashboard and look at the Fee Exemption Controls section. The button will show current status.

### Detailed Check (Script)
```bash
npx hardhat run scripts/check-fee-exemptions.ts --network baseSepolia
```

This will show a table of all important addresses and their exemption status:

```
┌─────────────────────────┬─────────────────────────────────────────────┬──────────┐
│ Contract                │ Address                                     │ Excluded │
├─────────────────────────┼─────────────────────────────────────────────┼──────────┤
│ Auction Contract        │ 0x5a09...20d                                │ ✅ YES   │
│ Token Distribution      │ 0x59ff...80e                                │ ❌ NO    │
│ Staking Contract        │ 0x23A9...822                                │ ✅ YES   │
└─────────────────────────┴─────────────────────────────────────────────┴──────────┘
```

## Common Issues & Troubleshooting

### Issue: "Insufficient _rOwned balance" error when finalizing

**Cause:** Auction contract doesn't have enough tokens (likely lost to 5% fee)

**Solution:**
1. Check if auction is excluded: `isExcludedFromFee(auctionAddress)`
2. If not excluded, exclude it first
3. Fund again to make up the deficit
4. Then finalize

### Issue: Transaction fails with "Ownable: caller is not the owner"

**Cause:** You're not the owner of ReflectiveToken

**Solution:**
- Only the token owner can call `excludeFromFee()`
- Check current owner: `await reflectiveToken.owner()`
- Make sure you're connected with the owner account

### Issue: Can I exclude multiple addresses?

**Answer:** Yes! Use `excludeFromFee()` for each address:

```javascript
await reflectiveToken.excludeFromFee(auctionAddress, true);
await reflectiveToken.excludeFromFee(stakingAddress, true);
await reflectiveToken.excludeFromFee(distributionAddress, true);
```

All these addresses can be exempt simultaneously.

## Contract Addresses (Base Sepolia Testnet)

```javascript
const REFLECTIVE_TOKEN = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // DBBPT Proxy
const AUCTION = "0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d";
const MOCK_USDC = "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B";
const STAKING = "0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822";
const DISTRIBUTION = "0x59ff0451A0718237CAd0FDb0835338180C66580e";
```

## Summary: Best Practices

1. ✅ **Use `excludeFromFee()` method** (not `setStakingContract()`)
2. ✅ **Exclude auction BEFORE funding** to avoid 5% fee loss
3. ✅ **Keep auction excluded during claims** so bidders don't lose 5%
4. ✅ **Use the check script** to verify exemption status
5. ✅ **Can exclude multiple addresses** - no need to swap
6. ⚠️ **Only token owner can exclude** addresses from fees

## Related Files

- Frontend UI: `frontend/src/admin/pages/AuctionPage.tsx`
- Exclude script: `scripts/exclude-auction-from-fees.ts`
- Check script: `scripts/check-fee-exemptions.ts`
- Contract: `contracts/ReflectiveToken.sol` (excludeFromFee function)
- Auction contract: `contracts/ContinuousClearingAuction.sol`
