# Yield Generation System - Mainnet Deployment Guide

## Overview

The yield generation system has been **successfully restored** to the FlexibleTieredStaking contract. This guide covers deployment for **Base Mainnet**.

---

## ✅ What's Ready

### Contracts
- ✅ **FlexibleTieredStaking.sol** - With full yield integration
- ✅ **TreasuryYieldStrategy.sol** - Buyback & burn strategy
- ✅ **IYieldStrategy.sol** - Standard interface
- ✅ **ReflectiveToken.sol** - Token with fixes
- ✅ **TokenDistribution.sol** - Vesting system

### Features
- ✅ Automatic yield deployment when users stake
- ✅ Automatic yield withdrawal when users unstake
- ✅ Configurable deployment limits (default 50% max)
- ✅ Emergency controls for owner
- ✅ Bug fixes applied (emergencyWithdrawFromYield)

---

## 🚀 Mainnet Deployment Steps

### Step 1: Deploy Core Contracts

```bash
# Deploy all main contracts
npx hardhat run scripts/deploy.ts --network mainnet
```

**Expected Output:**
- ReflectiveToken: `0x...`
- TokenDistribution: `0x...`
- FlexibleTieredStaking: `0x...`
- ArweaveGateway: `0x...`
- ImprovedTimelock: `0x...`

### Step 2: Deploy TreasuryYieldStrategy

```bash
# Deploy yield strategy
npx hardhat run scripts/deploy-treasury-yield-strategy.ts --network mainnet
```

**Expected Output:**
- TreasuryYieldStrategy: `0x...`

### Step 3: Initialize Contracts

```bash
# Run initialization
npx hardhat run scripts/initialize-all.ts --network mainnet
```

This will:
- Initialize TokenDistribution
- Transfer tokens for distribution
- Set up vesting schedules

### Step 4: Connect Yield Strategy

Create and run: `scripts/setup-yield-mainnet.ts`

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Contract addresses from deployment
  const stakingAddress = "0x..."; // From Step 1
  const strategyAddress = "0x..."; // From Step 2
  
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", strategyAddress);
  
  // 1. Set staking contract in strategy
  console.log("Setting staking contract in strategy...");
  await (await strategy.setStakingContract(stakingAddress)).wait();
  
  // 2. Set yield strategy in staking
  console.log("Setting yield strategy in staking...");
  await (await staking.setYieldStrategy(strategyAddress)).wait();
  
  // 3. Configure yield deployment (50% max)
  console.log("Setting max yield deployment to 50%...");
  await (await staking.setMaxYieldDeployment(5000)).wait(); // 5000 = 50%
  
  // 4. Enable yield (optional - can enable later)
  // console.log("Enabling yield generation...");
  // await (await staking.setYieldEnabled(true)).wait();
  
  console.log("✅ Yield system configured!");
}

main().catch(console.error);
```

---

## 📊 Recommended Token Allocation (Mainnet)

Total Supply: **10,000,000 DBBPT**

### Allocation Strategy:

| Allocation | Amount | Percentage | Purpose |
|------------|--------|------------|---------|
| **Liquidity (DEX)** | 2,000,000 | 20% | Initial trading liquidity |
| **Team Vesting** | 587,500 | 5.875% | Locked for 1 year (4×162.5k std + 100k dev) |
| **Airdrop Reserve** | 250,000 | 2.5% | Community rewards |
| **Marketing** | 500,000 | 5% | Campaigns, partnerships |
| **Treasury/Reserve** | 6,662,500 | 66.625% | Protocol treasury, future use |

### Why This Allocation?

1. **Liquidity First** (20%): Ensures healthy trading from day 1
2. **Team Alignment** (5.875%): Vested over 1 year shows commitment
3. **Marketing Budget** (5%): Grow community and awareness
4. **Strong Treasury** (66.625%): Flexibility for:
   - Additional liquidity if needed
   - CEX listings
   - Strategic partnerships
   - Protocol development
   - Staking rewards

---

## ⚙️ Yield System Configuration

### Conservative Settings (Recommended Start):
```solidity
maxYieldDeploymentBps = 5000  // 50% of staked tokens
yieldEnabled = false           // Start disabled, enable after testing
```

### Initial Testing Phase:
1. Deploy contracts with yield **disabled**
2. Test staking/unstaking thoroughly
3. Add liquidity to DEX
4. Once stable, enable yield with **low deployment %**:
   ```bash
   staking.setMaxYieldDeployment(1000) // 10% to start
   staking.setYieldEnabled(true)
   ```

### Progressive Rollout:
- **Week 1-2**: Yield disabled, monitor staking
- **Week 3**: Enable yield at 10% deployment
- **Week 4-8**: Gradually increase to 25%
- **Month 3+**: Increase to 50% if all stable

---

## 🔐 Security Checklist

Before mainnet deployment:

- [ ] All contracts compiled without errors
- [ ] Linter shows no issues
- [ ] Team wallet addresses verified
- [ ] Oracle addresses correct for Base Mainnet
- [ ] Uniswap router correct for Base Mainnet
- [ ] Ownership set correctly
- [ ] Emergency functions tested on testnet
- [ ] Gas costs estimated
- [ ] Sufficient ETH for deployment (est. 0.02-0.05 ETH)

---

## 💰 Deployment Costs Estimate (Base Mainnet)

| Contract | Est. Gas | Est. Cost (1 gwei) |
|----------|----------|-------------------|
| ReflectiveToken | ~4M gas | ~$0.01 |
| TokenDistribution | ~2M gas | ~$0.005 |
| FlexibleTieredStaking | ~3M gas | ~$0.008 |
| TreasuryYieldStrategy | ~1.5M gas | ~$0.004 |
| Initialization | ~500K gas | ~$0.001 |
| **Total** | **~11M gas** | **~$0.028** |

*Note: Base has very low gas costs. At current prices, total deployment < $0.05*

---

## 🧪 Testing Before Mainnet

### On Current Testnet (Base Sepolia):

1. **Test the vesting system** ✅ (Already done)
2. **Test unstaking** (after 24 hours)
3. Redeploy with yield enabled (optional)
4. Test yield deployment/withdrawal
5. Test emergency functions

### Commands:
```bash
# Check vesting status
npx hardhat run scripts/check-vesting-status.ts --network testnet

# Test unstaking (after 24h)
npx hardhat run scripts/test-unstake-error.ts --network testnet
```

---

## 📝 Post-Deployment Checklist

After mainnet deployment:

- [ ] Save all contract addresses to `frontend/src/config/networks.ts`
- [ ] Update backend `.env` with new addresses
- [ ] Verify contracts on BaseScan
- [ ] Transfer ownership to multisig (if using)
- [ ] Add liquidity to Uniswap
- [ ] Update frontend with mainnet addresses
- [ ] Announce launch

---

## 🎯 Quick Reference

### Key Functions for Owner:

```solidity
// Yield Management
staking.setYieldStrategy(address)      // Set strategy contract
staking.setYieldEnabled(bool)          // Enable/disable yield
staking.setMaxYieldDeployment(uint256) // Set max % (in bps)
staking.deployToYield(uint256)         // Manually deploy tokens
staking.withdrawFromYield(uint256)     // Manually withdraw
staking.emergencyWithdrawFromYield()   // Emergency: withdraw all

// View Yield Info
staking.getYieldInfo()                 // Returns strategy status
```

### For TreasuryYieldStrategy:

```solidity
// Execute Buyback (send ETH to buy & burn tokens)
strategy.executeBuyback{value: ethAmount}()

// Pause/Resume
strategy.pauseStrategy()
strategy.resumeStrategy()
```

---

## 🚨 Emergency Procedures

### If Yield Strategy Has Issues:

1. **Pause strategy:**
   ```bash
   strategy.pauseStrategy()
   ```

2. **Emergency withdraw:**
   ```bash
   staking.emergencyWithdrawFromYield()
   ```

3. **Disable yield:**
   ```bash
   staking.setYieldEnabled(false)
   ```

### If Need to Change Strategy:

1. Disable current yield
2. Emergency withdraw all funds
3. Deploy new strategy
4. Set new strategy address
5. Re-enable yield

---

## 📞 Support

For issues or questions:
- Check contract events on BaseScan
- Review transaction logs
- Test on Sepolia first

---

## ✅ Current Status

- **Testnet (Base Sepolia)**: Core contracts deployed, vesting active, yield code ready
- **Mainnet (Base)**: Ready to deploy
- **Code**: Fully compiled, no errors
- **Documentation**: Complete

**You're ready to deploy to mainnet when you're ready! 🚀**

