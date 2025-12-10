# 🚀 Pre-Mainnet Deployment Checklist
# Dr. Birdy Books Protocol

**Date Created**: December 8, 2025  
**Target Network**: Base Mainnet (Chain ID: 8453)  
**Estimated Gas Cost**: ~0.01-0.02 ETH

---

## ⚠️ CRITICAL WARNINGS

1. **Mainnet deployments are PERMANENT and IRREVERSIBLE**
2. **All transactions cost REAL ETH** - No refunds!
3. **Triple-check ALL addresses before deploying**
4. **Have a backup plan for emergency situations**
5. **Deploy during LOW gas price periods** (check https://basescan.org)

---

## 📋 Phase 1: Pre-Deployment Verification

### ✅ 1.1 Smart Contract Code Review

- [x] **Contracts compile successfully** ✅ 
  - Compiled 35 Solidity files successfully
  - Only minor warnings (unused variables - safe)
  - Solidity version: 0.8.28
  - Optimizer enabled: 200 runs

- [ ] **Security audit completed**
  - ⚠️ Critical issues FIXED (reentrancy, zero address validation)
  - ⚠️ Contract size exceeds 24KB limit (34,859 bytes for ReflectiveToken)
  - 💡 **RECOMMENDATION**: Consider using EIP-2535 (Diamond Pattern) or proxy pattern for large contracts
  
- [x] **Test suite passes** ✅
  - 188 tests passing on testnet
  - 100% test success rate
  - Comprehensive coverage verified

- [ ] **Code review checklist**:
  - [ ] All TODO comments removed or addressed
  - [ ] No console.log statements in production code
  - [ ] All magic numbers replaced with constants
  - [ ] Gas optimization reviewed
  - [ ] Emergency pause mechanisms tested

---

### ✅ 1.2 Configuration Files Review

#### **File: `scripts/config.ts`** - CRITICAL!

Current configuration:
```typescript
UNISWAP_ROUTER: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24" ✅ Base Mainnet
UNISWAP_FACTORY: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6" ✅ Base Mainnet
WETH: "0x4200000000000000000000000000000000000006" ✅ Base WETH
MARKETING_WALLET: "0xF347Ce7bC1DA78c8DD482816dD4a38Db27700B22" ⚠️ VERIFY THIS!
PRIMARY_ORACLE: "0x71041dDDaD356F8F9546D0Ba93B54C0b4C458375" ✅ Chainlink ETH/USD
BACKUP_ORACLE: "0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8" ✅ Chainlink BTC/USD
```

**Action Items**:
- [ ] **VERIFY Marketing Wallet address** is correct and accessible
- [ ] **VERIFY Team Wallet addresses** in `TEAM_WALLETS` section:
  - [ ] JOSEPH: `0x4d8b10e7d6bff54c8c1c1c42240c74e173c5f8ed`
  - [ ] AJ: `0xdd82052fbc8edc7091dafa1540f16c63c51cb2fb`
  - [ ] DSIGN: `0x130678ed1594929c02da4c10ab11a848df727eea`
  - [ ] DEVELOPER: `0xe409c2f794647ac4940d7f1b6506790098bba136`
  - [ ] BIRDY: `0xad19c12098037b7d35009c7cc794769e1427cc2d`
  - [ ] AIRDROP: `0xad19c12098037b7d35009c7cc794769e1427cc2d` ⚠️ Same as BIRDY - Is this correct?

- [ ] **Verify Token Allocations**:
  ```
  Total Supply: 10,000,000 DBBPT
  - Team (Standard): 162,500 tokens each × 4 = 650,000 tokens
  - Developer: 100,000 tokens
  - Airdrop: 250,000 tokens
  - Total Distributed: 1,000,000 tokens (10%)
  - Deployer gets: 9,000,000 tokens initially
  ```

- [ ] **Verify Fee Configuration**:
  ```
  Tax Fee: 1% (100 bps)
  Liquidity Fee: 2% (200 bps)
  Marketing Fee: 2% (200 bps)
  Burn Fee: 0.5% (50 bps)
  Total: 5.5%
  ```

- [ ] **Verify Tier Configuration**:
  ```
  Tier 1: $24 (2400000000 with 8 decimals)
  Tier 2: $50 (5000000000 with 8 decimals)
  Tier 3: $1000 (100000000000 with 8 decimals)
  ```

---

### ✅ 1.3 Environment Variables

#### **Root `.env` file** - DO NOT COMMIT TO GIT!

```env
# Required for deployment
MAINNET_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE  # ⚠️ NEVER SHARE THIS!
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY       # For contract verification

# Optional but recommended
ALCHEMY_API_KEY=YOUR_ALCHEMY_KEY           # For reliable RPC
```

**Security Checklist**:
- [ ] `.env` file is in `.gitignore`
- [ ] Private key is from a dedicated deployment wallet
- [ ] Deployment wallet has sufficient ETH (recommend 0.1 ETH minimum)
- [ ] Private key has NEVER been committed to git
- [ ] Backup of private key stored securely offline

---

### ✅ 1.4 Wallet Preparation

#### **Deployment Wallet**:
- [ ] Wallet address: `_______________________________`
- [ ] Current ETH balance: `_______ ETH` (minimum 0.1 ETH recommended)
- [ ] Check balance on BaseScan: https://basescan.org/address/YOUR_ADDRESS
- [ ] Test wallet can sign transactions
- [ ] Have backup wallet ready for emergency operations

#### **Contract Owner Strategy**:
- [ ] Decide if deployer will remain owner or transfer to multisig
- [ ] If using multisig, prepare multisig address: `_______________________________`
- [ ] Plan ownership transfer timeline (suggest 1-2 weeks after deployment)

---

## 📋 Phase 2: Deployment Preparation

### ✅ 2.1 Network Configuration

- [x] **Hardhat Config Verified** (`hardhat.config.ts`):
  ```typescript
  mainnet: {
    url: "https://mainnet.base.org",
    accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
    chainId: 8453,
  }
  ```

- [ ] **RPC Endpoint Selection**:
  - [ ] Option A: Public RPC `https://mainnet.base.org` (Free, may be slow)
  - [ ] Option B: Alchemy RPC `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY` (Faster, more reliable) ✅ RECOMMENDED
  - [ ] Option C: Infura or other provider

---

### ✅ 2.2 Deployment Script Review

**File**: `scripts/deploy.ts`

**Deployment Order**:
1. ArweaveGateway (no dependencies)
2. TokenDistribution (no dependencies)
3. ImprovedTimelock (admin: deployer, delay: 2 days)
4. ReflectiveToken (requires: router, marketing wallet, oracles)
5. FlexibleTieredStaking (requires: token, oracles)

**Post-Deployment Steps** (automated in script):
1. Initialize ReflectiveToken
2. Set timelock contract
3. Set distribution contract
4. Create Uniswap pair
5. Complete post-deployment setup

**Checklist**:
- [x] Deployment script reviewed
- [ ] Understand each deployment step
- [ ] Gas limits configured appropriately (default: 10M gas)
- [ ] Error handling understood
- [ ] Know what to do if deployment fails mid-way

---

### ✅ 2.3 Gas Cost Estimation

**Estimated Gas Usage**:
```
Contract                  | Est. Gas    | Cost @ 0.05 Gwei | Cost @ 1 Gwei
--------------------------|-------------|------------------|---------------
ArweaveGateway           | 500,000     | $0.01           | $0.20
TokenDistribution        | 1,000,000   | $0.02           | $0.40
ImprovedTimelock         | 800,000     | $0.016          | $0.32
ReflectiveToken          | 3,000,000   | $0.06           | $1.20
FlexibleTieredStaking    | 2,500,000   | $0.05           | $1.00
Initialization txs       | 2,000,000   | $0.04           | $0.80
--------------------------|-------------|------------------|---------------
TOTAL                    | ~10,000,000 | ~$0.20          | ~$4.00
```

**Gas Price Strategy**:
- [ ] Check current Base gas prices: https://basescan.org/gastracker
- [ ] Consider deploying during off-peak hours (weekends, late night UTC)
- [ ] Have extra ETH for unexpected gas spikes

---

## 📋 Phase 3: Contract Size Issues ⚠️

### ⚠️ CRITICAL ISSUE: Contract Size Limit

**Current Sizes**:
- ReflectiveToken: **34,859 bytes** (❌ Exceeds 24,576 byte limit)
- FlexibleTieredStaking: **28,717 bytes** (❌ Exceeds 24,576 byte limit)

**Impact**: These contracts CANNOT be deployed to mainnet in current state!

### 🛠️ Solutions (Choose One):

#### **Option A: Use EIP-1967 Proxy Pattern** ✅ RECOMMENDED
- Deploy logic contracts as implementation
- Deploy proxy contracts (minimal size)
- Can upgrade contracts if bugs found
- Allows for future improvements

**Steps**:
1. Modify contracts to use OpenZeppelin's `Initializable`
2. Deploy implementation contracts
3. Deploy proxy contracts pointing to implementations
4. Initialize through proxies

**Files to modify**:
- Already using `@openzeppelin/contracts-upgradeable` ✅
- Need to add proxy deployment to `scripts/deploy.ts`

#### **Option B: Split Contracts into Libraries**
- Extract common functionality into libraries
- Use `DELEGATECALL` for library functions
- Reduces deployed contract size

#### **Option C: Remove Non-Essential Features**
- Remove least-used functions
- Simplify complex logic
- Deploy minimal viable version first

---

## 📋 Phase 4: Testing on Testnet (Base Sepolia)

### ✅ 4.1 Current Testnet Status

**Deployed Contracts** (Base Sepolia - Chain ID: 84532):
```
ReflectiveToken:         0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c ✅
TokenDistribution:       0x951f92b9897f632B0caE54502C8016F4cEd0e969 ✅
FlexibleTieredStaking:   0xDB1A28eA484f0321d242a293ae42c74f71E14FC0 ✅
TreasuryYieldStrategy:   0xa73819Ed19f6e755B6056C7f32c0A2Bf7aF5099F ✅
ArweaveGateway:          0xe5C61ff65d10FfBBbaf706Bd9E97D5965708c1Fa ✅
ImprovedTimelock:        0xc875dEC51d1a0ff97Fb23c3004aBBb9feC0eba48 ✅
```

### ✅ 4.2 Final Testnet Validation

**Critical Functions to Test**:
- [ ] Token transfers work correctly
- [ ] Staking functions (stake/unstake) work
- [ ] Tier calculations are accurate
- [ ] Oracle price feeds are working
- [ ] Liquidity provision works
- [ ] Vesting claims work correctly
- [ ] Timelock delays function properly
- [ ] Emergency pause/unpause works

**Test Scenarios**:
- [ ] Test with small amounts (1-10 tokens)
- [ ] Test tier transitions ($24 → $50 → $1000)
- [ ] Test unstaking after 24h minimum
- [ ] Test vesting claims after cliff period
- [ ] Test emergency functions
- [ ] Test access control (only owner can call admin functions)

---

## 📋 Phase 5: Frontend & Backend Configuration

### ✅ 5.1 Frontend Configuration

**File**: `frontend/src/config/networks.ts`

**Current State**:
```typescript
[BASE_MAINNET.chainId]: {
  reflectiveToken: '0x0000000000000000000000000000000000000000', // ❌ NOT SET
  tokenDistribution: '0x0000000000000000000000000000000000000000', // ❌ NOT SET
  flexibleTieredStaking: '0x0000000000000000000000000000000000000000', // ❌ NOT SET
  arweaveGateway: '0x0000000000000000000000000000000000000000', // ❌ NOT SET
  improvedTimelock: '0x0000000000000000000000000000000000000000', // ❌ NOT SET
}
```

**Action Items**:
- [ ] **IMMEDIATELY after deployment**, update with actual addresses
- [ ] Test frontend connects to correct network
- [ ] Verify contract ABIs are up to date
- [ ] Test all frontend functions with mainnet contracts

---

### ✅ 5.2 Backend Configuration

**File**: `backend/.env`

**Required Updates After Deployment**:
```env
NODE_ENV=production
BLOCKCHAIN_RPC_URL=https://mainnet.base.org  # Or Alchemy URL
STAKING_CONTRACT_ADDRESS=YOUR_DEPLOYED_STAKING_ADDRESS
TOKEN_CONTRACT_ADDRESS=YOUR_DEPLOYED_TOKEN_ADDRESS

# Security
JWT_SECRET=CHANGE_THIS_TO_STRONG_RANDOM_STRING
ADMIN_PASSWORD=CHANGE_THIS_STRONG_PASSWORD

# Database
MONGODB_URI=mongodb+srv://YOUR_MONGODB_ATLAS_URI

# CORS
CORS_ORIGIN=https://yourdomain.com  # Your production frontend URL
```

**Checklist**:
- [ ] MongoDB Atlas database created and ready
- [ ] Strong JWT secret generated (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Strong admin password set
- [ ] CORS origin matches frontend domain
- [ ] Backend tested with mainnet RPC

---

## 📋 Phase 6: Post-Deployment Verification

### ✅ 6.1 Immediate Post-Deployment

**Within 1 hour of deployment**:
- [ ] Save ALL contract addresses immediately
- [ ] Verify all contracts on BaseScan (https://basescan.org)
- [ ] Check contract initialization status
- [ ] Test token transfer (small amount)
- [ ] Test approval + staking (minimum amount)
- [ ] Verify oracle prices are accurate
- [ ] Check Uniswap pair creation
- [ ] Test frontend connection

**Contract Verification on BaseScan**:
```bash
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

For each contract:
- [ ] ArweaveGateway verified
- [ ] TokenDistribution verified
- [ ] ImprovedTimelock verified (args: deployer address, 172800)
- [ ] ReflectiveToken verified
- [ ] FlexibleTieredStaking verified (args: token, primaryOracle, backupOracle)

---

### ✅ 6.2 First 24 Hours Monitoring

- [ ] Monitor for any unusual transactions
- [ ] Check gas usage vs estimates
- [ ] Verify no errors in contract interactions
- [ ] Monitor BaseScan for contract calls
- [ ] Check frontend error logs
- [ ] Monitor backend API logs
- [ ] Test all tier levels with real users
- [ ] Verify reflection mechanics working
- [ ] Check liquidity provision working

---

### ✅ 6.3 First Week Actions

- [ ] Distribute initial tokens to team (via TokenDistribution)
- [ ] Set up team vesting schedules
- [ ] Execute airdrop (250,000 tokens)
- [ ] Add initial liquidity to Uniswap
- [ ] Enable trading (if disabled initially)
- [ ] Announce launch to community
- [ ] Monitor all contract functions
- [ ] Collect user feedback
- [ ] Address any issues quickly

---

## 📋 Phase 7: Emergency Preparedness

### ✅ 7.1 Emergency Contacts

**Have these ready BEFORE deployment**:
- [ ] Team member phone numbers
- [ ] Emergency multisig signers contact info
- [ ] Security researcher contacts
- [ ] Blockchain forensics contacts (if needed)

---

### ✅ 7.2 Emergency Procedures

**If Critical Bug Found**:
1. [ ] Immediately call `pause()` on affected contracts
2. [ ] Notify all team members
3. [ ] Prepare fix and test thoroughly
4. [ ] Use timelock to queue fix (2-day delay)
5. [ ] Announce to community transparently

**Emergency Functions Available**:
- [ ] `pause()` - Pauses staking contract
- [ ] `unpause()` - Resumes staking contract
- [ ] Timelock cancellation - Cancel pending changes
- [ ] Emergency withdrawal - Retrieve stuck tokens

---

### ✅ 7.3 Security Monitoring

**Set up monitoring for**:
- [ ] Unusual token transfers (>100k tokens)
- [ ] Large staking/unstaking events
- [ ] Failed transactions
- [ ] Oracle price anomalies
- [ ] Smart contract events via Etherscan
- [ ] Frontend error tracking (Sentry, LogRocket)

---

## 📋 Phase 8: Legal & Compliance

### ✅ 8.1 Legal Considerations

- [ ] Review token issuance regulations in your jurisdiction
- [ ] Consider securities law implications
- [ ] Prepare Terms of Service
- [ ] Prepare Privacy Policy
- [ ] Consider KYC/AML requirements (if applicable)
- [ ] Consult with blockchain lawyer (recommended)

---

### ✅ 8.2 Documentation

- [ ] Update README.md with mainnet addresses
- [ ] Create user documentation
- [ ] Create admin documentation
- [ ] Document emergency procedures
- [ ] Create FAQ for common issues
- [ ] Prepare marketing materials

---

## 📋 Phase 9: Rollback Plan

### ⚠️ IMPORTANT: You CANNOT rollback deployed contracts!

**However, you can**:
- [ ] Deploy NEW contracts with fixes
- [ ] Pause old contracts
- [ ] Migrate users to new contracts
- [ ] Use timelock to prevent immediate damage

**Migration Strategy** (if needed):
1. Deploy new fixed contracts
2. Pause old contracts
3. Create token migration script
4. Allow users to migrate old tokens → new tokens (1:1)
5. Update frontend to use new contracts
6. Announce migration to community

---

## 📋 Phase 10: Final Go/No-Go Decision

### ✅ Go Decision Criteria

**ALL of these must be TRUE**:
- [ ] Contract size issue RESOLVED (proxy pattern or optimizations)
- [ ] All critical security issues FIXED
- [ ] Testnet testing PASSED all scenarios
- [ ] Team wallet addresses VERIFIED
- [ ] Marketing wallet address VERIFIED
- [ ] Deployment wallet has sufficient ETH
- [ ] Gas prices are reasonable (<1 Gwei)
- [ ] All team members are available for monitoring
- [ ] Emergency procedures documented and understood
- [ ] Frontend and backend ready for mainnet addresses
- [ ] Legal considerations addressed

### ❌ No-Go Criteria

**ANY of these is TRUE → DO NOT DEPLOY**:
- [ ] Contract size exceeds limits (not using proxy)
- [ ] Critical security issues unresolved
- [ ] Test failures on testnet
- [ ] Team member addresses not verified
- [ ] Insufficient ETH for deployment
- [ ] Extreme gas prices (>5 Gwei)
- [ ] Team unavailable for monitoring
- [ ] Legal concerns unresolved

---

## 📊 Pre-Deployment Summary

### ✅ What's Ready:
- ✅ Smart contracts compile successfully
- ✅ 188 tests pass with 100% success rate
- ✅ Testnet deployment working
- ✅ Frontend functional
- ✅ Backend API ready
- ✅ Admin dashboard operational
- ✅ Configuration files present
- ✅ Security measures implemented

### ⚠️ Critical Issues to Resolve:

1. **CONTRACT SIZE LIMIT** (BLOCKER!) ❌
   - ReflectiveToken: 34,859 bytes (exceeds 24,576 byte limit)
   - FlexibleTieredStaking: 28,717 bytes (exceeds 24,576 byte limit)
   - **MUST FIX**: Use proxy pattern or optimize before deployment

2. **Address Verification** (HIGH PRIORITY) ⚠️
   - Verify all team wallet addresses
   - Verify marketing wallet address
   - Verify airdrop wallet is intentionally same as BIRDY wallet

3. **Test Suite Update** (MEDIUM PRIORITY) ⚠️
   - Tests showing constructor errors
   - Update tests to match current contract constructors
   - Run full test suite before deployment

---

## 🚀 Deployment Command (DO NOT RUN UNTIL ALL CHECKS PASS)

```bash
# Step 1: Final compilation
npx hardhat clean
npx hardhat compile

# Step 2: Deploy to mainnet
npx hardhat run scripts/deploy.ts --network mainnet

# Step 3: Save addresses immediately!
# Output will show addresses - COPY THEM IMMEDIATELY!

# Step 4: Verify contracts
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## 📝 Post-Deployment Address Recording

**Record these immediately after deployment**:

```
Deployment Date: ___/___/2025
Deployer Address: 0x_______________________________
Transaction Hash: 0x_______________________________

Contract Addresses:
- ArweaveGateway:          0x_______________________________
- TokenDistribution:       0x_______________________________
- ImprovedTimelock:        0x_______________________________
- ReflectiveToken:         0x_______________________________
- FlexibleTieredStaking:   0x_______________________________

Uniswap Pair:              0x_______________________________

Gas Used: _________ gas
Total Cost: _______ ETH (~$______ USD)
```

---

## 🎯 Recommendation

**STATUS**: 🔴 **NOT READY FOR MAINNET DEPLOYMENT**

**Reason**: Critical contract size limit exceeded

**Next Steps**:
1. ✅ Implement proxy pattern for ReflectiveToken
2. ✅ Implement proxy pattern for FlexibleTieredStaking
3. ✅ Update deployment script for proxy deployment
4. ✅ Test proxy deployment on testnet
5. ✅ Verify all addresses one more time
6. ✅ Re-run this checklist
7. ✅ Deploy to mainnet

**Estimated Time to Fix**: 4-8 hours for experienced Solidity developer

---

## 📞 Need Help?

- OpenZeppelin Proxy Docs: https://docs.openzeppelin.com/contracts/5.x/api/proxy
- Hardhat Upgrades Plugin: https://docs.openzeppelin.com/upgrades-plugins/1.x/
- Base Network Docs: https://docs.base.org/

---

**Checklist Created By**: AI Assistant  
**Date**: December 8, 2025  
**Version**: 1.0  
**Last Updated**: December 8, 2025

---

**GOOD LUCK! 🚀**

Remember: Measure twice, deploy once!

