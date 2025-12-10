# Tier Management Guide

## Current Situation

You have **7 tiers** in your staking contract:
1. Tier 1 ($24) - from constructor
2. Tier 2 ($50) - from constructor  
3. Tier 3 ($1000) - from constructor
4. Free ($0) - added during deployment
5. Bronze ($100) - added during deployment
6. Silver ($500) - added during deployment
7. Gold ($1000) - added during deployment

**Problem**: Duplicates and overlaps! You probably only need 3 tiers for content unlocking.

---

## How Tiers Work

### Tier Selection Logic
- Users get access to the **HIGHEST tier they qualify for**
- A user with $1000 staked qualifies for ALL tiers, but gets **Tier 3** (highest)
- Tiers are used for **content access control** via `hasAccess()` and `getUserTier()`

### Example:
```
User stakes $100 worth:
- ✅ Qualifies for: Tier 1 ($24), Tier 2 ($50)
- ❌ Doesn't qualify for: Tier 3 ($1000)
- Gets: Tier 2 (highest they qualify for)
```

---

## Solution: Clean Up Tiers

### Option 1: Remove All & Add Your 3 Tiers (Recommended)

Run the cleanup script:
```bash
npx hardhat run scripts/cleanup-tiers.ts --network testnet
```

This will:
1. Remove all 7 existing tiers
2. Add back only your 3 content tiers:
   - Tier 1: $24
   - Tier 2: $50
   - Tier 3: $1000

### Option 2: Manual Tier Management

You can manage tiers using these functions (owner only):

```solidity
// Add a new tier
staking.addTier(thresholdInWei, "Tier Name");

// Update existing tier
staking.updateTier(tierIndex, newThreshold, "New Name");

// Remove a tier
staking.removeTier(tierIndex);

// Get tier info
const tier = await staking.getTier(tierIndex);
const count = await staking.getTierCount();
```

---

## Recommended Tier Structure

For content unlocking, you probably want:

| Tier | Threshold | Purpose |
|------|-----------|---------|
| **Tier 1** | $24 | Basic content access |
| **Tier 2** | $50 | Premium content access |
| **Tier 3** | $1000 | VIP content access |

**Or customize to your needs:**
- Free tier ($0) - for basic users
- Bronze ($100) - for regular users
- Silver ($500) - for premium users
- Gold ($1000) - for VIP users

---

## Frontend Integration

### Check User's Tier:
```typescript
const [tierIndex, tierName] = await staking.getUserTier(userAddress);
// Returns: (int256 tierIndex, string tierName)
// tierIndex = -1 if no tier, otherwise 0, 1, 2, etc.
```

### Check Access:
```typescript
const hasAccess = await staking.hasAccess(userAddress);
// Returns: true if user has any tier OR is in grace period
```

### Verify Specific Tier:
```typescript
const meetsRequirement = await staking.meetsTierRequirement(userAddress, tierIndex);
// Returns: true if user qualifies for that specific tier
```

---

## Content Access Control

### In Your Backend/Frontend:

```typescript
// Check if user can access content
async function canAccessContent(userAddress: string, requiredTier: number) {
  const [userTier, tierName] = await staking.getUserTier(userAddress);
  
  if (userTier === -1) {
    // No tier - check grace period
    return await staking.hasAccess(userAddress);
  }
  
  // User has tier - check if it's high enough
  return userTier >= requiredTier;
}

// Example: Check if user can access Tier 2 content
const canAccess = await canAccessContent(userAddress, 1); // tier index 1 = Tier 2
```

---

## Tier Files (Arweave Content)

You can associate files/content with specific tiers:

```solidity
// Add files to a tier (requires FILE_MANAGER_ROLE)
staking.addFileToTierBatch(
  tierIndex,
  ["arweave-tx-id-1", "arweave-tx-id-2"],
  ["pdf", "jpeg"],
  ["Description 1", "Description 2"],
  [1, 1] // versions
);

// Get files for a tier
const files = await staking.getTierFiles(tierIndex);
```

---

## Quick Actions

### View Current Tiers:
```bash
npx hardhat run scripts/check-tiers.ts --network testnet
```

### Clean Up Tiers:
```bash
npx hardhat run scripts/cleanup-tiers.ts --network testnet
```

### Add Custom Tier:
```typescript
// In a script
await staking.addTier(
  ethers.parseUnits("250", 8), // $250 threshold
  "Premium"
);
```

---

## Important Notes

1. **Tier Order Matters**: Users get the **highest** tier they qualify for
2. **No Duplicates**: Avoid having multiple tiers with same threshold
3. **Owner Only**: Only contract owner can modify tiers
4. **Content Access**: Use `hasAccess()` or `getUserTier()` to check permissions
5. **Grace Period**: Users keep access for 1 day after unstaking (grace period)

---

## Next Steps

1. ✅ Run `cleanup-tiers.ts` to remove duplicates
2. ✅ Verify tiers with `check-tiers.ts`
3. ✅ Update frontend to use correct tier indices
4. ✅ Test content access with different stake amounts

**Ready to clean up?** Run the cleanup script when you're ready!

