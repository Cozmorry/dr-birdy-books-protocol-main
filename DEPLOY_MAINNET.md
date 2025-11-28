# 🚀 Deploy to Base Mainnet - Step by Step Guide

## ⚠️ CRITICAL WARNINGS

1. **Mainnet deployments are PERMANENT and IRREVERSIBLE**
2. **All transactions cost REAL ETH** - ensure you have sufficient balance
3. **Test thoroughly on testnet first**
4. **Double-check all addresses before deploying**

---

## 📋 Pre-Deployment Checklist

### 1. Environment Setup

Create a `.env` file in the root directory (if it doesn't exist):

```env
# Mainnet Private Key (NEVER commit this to git!)
MAINNET_PRIVATE_KEY=your_private_key_here

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
```

**⚠️ SECURITY WARNING:**
- Never share your private key
- Never commit `.env` to git
- Use a dedicated wallet for deployment
- Ensure the wallet has sufficient ETH for gas fees (recommend at least 0.1 ETH)

### 2. Update Deployment Configuration

**File: `scripts/config.ts`**

Before deploying, verify these addresses are correct for Base Mainnet:

```typescript
const DEPLOYMENT_CONFIG = {
  UNISWAP_ROUTER: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24", // ✅ Base Mainnet
  PRIMARY_ORACLE: "0x71041dDDaD356F8F9546D0Ba93B54C0b4C458375", // ✅ Base Mainnet Chainlink ETH/USD
  BACKUP_ORACLE: "0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8", // ✅ Base Mainnet Chainlink BTC/USD
  MARKETING_WALLET: "0xF347Ce7bC1DA78c8DD482816dD4a38Db27700B22", // ⚠️ Verify this is correct
  
  // ⚠️ UPDATE THESE TEAM WALLETS:
  TEAM_WALLETS: {
    JOSEPH: "0x...", // Replace with actual address
    AJ: "0x...",     // Replace with actual address
    DSIGN: "0x...",  // Replace with actual address
    DEVELOPER: "0x...", // Replace with actual address
    BIRDY: "0xBdfa2B3e272fd2A26fa0Dd923697f3492Dd079cF", // ✅ Provided
    AIRDROP: "0x...", // Replace with actual address
  },
};
```

### 3. Verify Wallet Balance

Check that your deployment wallet has sufficient ETH:

```bash
# You can check balance on BaseScan:
# https://basescan.org/address/YOUR_WALLET_ADDRESS
```

**Recommended minimum:** 0.1 ETH for gas fees

---

## 🚀 Deployment Steps

### Step 1: Compile Contracts

```bash
npm run compile
```

This ensures all contracts are compiled and ready for deployment.

### Step 2: Deploy to Mainnet

```bash
npm run deploy:mainnet
```

Or directly:

```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

### Step 3: Save Deployment Addresses

The deployment script will output all contract addresses. **SAVE THESE IMMEDIATELY:**

```
🎯 Deployment Summary:
┌─────────────────────┬──────────────────────────────────────────────┐
│ gateway              │ 0x...                                        │
│ distribution         │ 0x...                                        │
│ staking              │ 0x...                                        │
│ timelock             │ 0x...                                        │
│ token                │ 0x...                                        │
└─────────────────────┴──────────────────────────────────────────────┘
```

### Step 4: Verify Contracts on BaseScan

For each deployed contract:

1. Go to https://basescan.org
2. Search for the contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Select:
   - Compiler: `0.8.28`
   - License: `MIT`
   - Optimization: `Yes` (200 runs)
6. Upload the contract source code
7. Click "Verify and Publish"

**Contracts to verify:**
- [ ] ArweaveGateway
- [ ] TokenDistribution
- [ ] FlexibleTieredStaking
- [ ] ImprovedTimelock
- [ ] ReflectiveToken

### Step 5: Update Frontend Configuration

**File: `frontend/src/config/networks.ts`**

Update the Base Mainnet addresses:

```typescript
[BASE_MAINNET.chainId]: {
  reflectiveToken: '0xYOUR_DEPLOYED_TOKEN_ADDRESS',
  tokenDistribution: '0xYOUR_DEPLOYED_DISTRIBUTION_ADDRESS',
  flexibleTieredStaking: '0xYOUR_DEPLOYED_STAKING_ADDRESS',
  arweaveGateway: '0xYOUR_DEPLOYED_GATEWAY_ADDRESS',
  improvedTimelock: '0xYOUR_DEPLOYED_TIMELOCK_ADDRESS',
},
```

### Step 6: Update Backend Configuration

**File: `backend/.env`**

```env
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
# Or use a private RPC (recommended):
# BLOCKCHAIN_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

STAKING_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_STAKING_ADDRESS
TOKEN_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_TOKEN_ADDRESS
```

### Step 7: Test Deployment

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Test Functions:**
   - Connect wallet to Base Mainnet
   - Check token balance
   - Test approval (small amount)
   - Test staking (minimum amount)
   - Verify tier assignment

---

## 🔧 Post-Deployment Configuration

### Configure Staking Contract

After deployment, you may need to manually configure:

1. **Set Tier Thresholds** (if not set automatically):
   ```javascript
   // Using Hardhat console or a script
   await staking.addTier("2400000000", "Tier 1"); // $24
   await staking.addTier("5000000000", "Tier 2"); // $50
   await staking.addTier("100000000000", "Tier 3"); // $1000
   ```

2. **Verify Contract Status:**
   ```javascript
   const status = await staking.getContractStatus();
   console.log("Staking Token Set:", status.stakingTokenSet);
   console.log("Primary Oracle Set:", status.primaryOracleSet);
   console.log("Backup Oracle Set:", status.backupOracleSet);
   console.log("Tier Count:", status.tierCount);
   ```

---

## 📊 Expected Gas Costs

Approximate gas costs for deployment (prices may vary):

- ArweaveGateway: ~500,000 gas
- TokenDistribution: ~1,000,000 gas
- FlexibleTieredStaking: ~2,500,000 gas
- ImprovedTimelock: ~800,000 gas
- ReflectiveToken: ~3,000,000 gas
- Initialization transactions: ~2,000,000 gas

**Total estimated:** ~10,000,000 gas

At 0.0001 ETH per 100,000 gas: **~0.01 ETH total**

---

## ✅ Post-Deployment Verification

- [ ] All contracts deployed successfully
- [ ] All contracts verified on BaseScan
- [ ] Contract addresses saved
- [ ] Frontend configuration updated
- [ ] Backend configuration updated
- [ ] Tested wallet connection
- [ ] Tested token approval (small amount)
- [ ] Tested staking (minimum amount)
- [ ] Verified tier calculations
- [ ] Checked oracle prices are correct

---

## 🆘 Troubleshooting

### "Insufficient funds for gas"
- Ensure your wallet has at least 0.1 ETH
- Check current gas prices on BaseScan

### "Contract initialization failed"
- Check that oracle addresses are correct
- Verify Uniswap router address
- Check contract status after deployment

### "Network not found"
- Ensure `.env` file has `MAINNET_PRIVATE_KEY` set
- Verify `hardhat.config.ts` has mainnet network configured

---

## 📝 Important Notes

1. **Save all addresses immediately** - you'll need them for frontend/backend updates
2. **Verify contracts** - unverified contracts are harder to trust
3. **Test with small amounts first** - don't stake large amounts until verified
4. **Monitor gas prices** - deploy during low gas periods if possible
5. **Have a rollback plan** - know how to pause contracts if needed

---

**Ready to deploy? Run:**
```bash
npm run deploy:mainnet
```

**Good luck! 🚀**

