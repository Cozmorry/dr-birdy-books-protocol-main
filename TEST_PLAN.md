# 🧪 Comprehensive Test Plan
# Dr. Birdy Books Protocol - Pre-Mainnet Testing

**Created**: December 8, 2025  
**Status**: Tests need updates before running  
**Priority**: HIGH - Must fix before mainnet deployment

---

## 🔴 Current Issue: Test Suite Broken

### **Problem Identified**:

The test suite is failing because:

1. **ReflectiveToken** has NO constructor (uses upgradeable pattern with `initialize()`)
2. **FlexibleTieredStaking** HAS a constructor requiring 3 arguments:
   - `_stakingToken` (address)
   - `_primaryPriceOracle` (address)
   - `_backupPriceOracle` (address)
3. Tests are trying to deploy contracts with wrong arguments

### **Error Message**:
```
Error: incorrect number of arguments to constructor
```

---

## 📋 Test Files Status

| Test File | Status | Lines | Issues |
|-----------|--------|-------|--------|
| `ArweaveGateway.test.ts` | ❓ Unknown | - | Need to check |
| `FlexibleTieredStaking.test.ts` | ❌ Broken | - | Constructor args missing |
| `ImprovedTimelock.test.ts` | ❓ Unknown | - | Need to check |
| `MockContracts.test.ts` | ❓ Unknown | - | Need to check |
| `PerformanceTest.test.ts` | ❓ Unknown | - | Need to check |
| `ReflectiveToken.test.ts` | ❌ BROKEN | 671 | Constructor mismatch |
| `TokenDistribution.test.ts` | ❓ Unknown | - | Need to check |

---

## 🛠️ How to Fix

### Fix #1: ReflectiveToken.test.ts

**Current (Line 58-59):**
```typescript
Staking.deploy(),
Token.deploy(),
```

**Should be:**
```typescript
// Deploy with constructor arguments
Staking.deploy(
  await tokenInstance.getAddress(),  // token address
  await mockOracleInstance.getAddress(),  // primary oracle
  await mockOracleInstance.getAddress()   // backup oracle
),
Token.deploy(),  // NO constructor arguments - ReflectiveToken has empty constructor
```

**Note**: ReflectiveToken uses `initialize()` function, NOT constructor!

### Fix #2: FlexibleTieredStaking.test.ts

Need to add constructor arguments when deploying staking contract:
```typescript
const staking = await Staking.deploy(
  tokenAddress,
  primaryOracleAddress,
  backupOracleAddress
);
```

---

## 📝 Complete Test Checklist

### Phase 1: Fix Test Files ✅

- [ ] **Task 1.1**: Fix `ReflectiveToken.test.ts`
  - [ ] Update Staking deployment with constructor args
  - [ ] Verify Token deployment (no args needed)
  - [ ] Update initialization calls
  - [ ] Run: `npx hardhat test test/ReflectiveToken.test.ts`

- [ ] **Task 1.2**: Fix `FlexibleTieredStaking.test.ts`
  - [ ] Add constructor arguments to staking deployment
  - [ ] Verify token address is correct
  - [ ] Verify oracle addresses are correct
  - [ ] Run: `npx hardhat test test/FlexibleTieredStaking.test.ts`

---

### Phase 2: Run Individual Test Suites ✅

#### Test 2.1: ArweaveGateway Tests
```bash
npx hardhat test test/ArweaveGateway.test.ts
```

**Expected Tests (25 total)**:
- [ ] Contract deployment
- [ ] Transaction management (add/remove/update)
- [ ] Access control (owner-only operations)
- [ ] Event emissions
- [ ] Edge cases (empty strings, duplicates)
- [ ] Batch operations
- [ ] Integration tests

**Expected Result**: All 25 tests pass

---

#### Test 2.2: FlexibleTieredStaking Tests
```bash
npx hardhat test test/FlexibleTieredStaking.test.ts
```

**Expected Tests (45 total)**:
- [ ] Deployment with correct constructor args
- [ ] Tier management (add, update, remove)
- [ ] Staking functions (stake, unstake, batch)
- [ ] Access control (tier-based permissions)
- [ ] File management (add files to tiers)
- [ ] Oracle management (primary/backup)
- [ ] Pause/unpause functionality
- [ ] Admin functions
- [ ] Utility functions
- [ ] Integration tests

**Expected Result**: All 45 tests pass

---

#### Test 2.3: ImprovedTimelock Tests
```bash
npx hardhat test test/ImprovedTimelock.test.ts
```

**Expected Tests (20 total)**:
- [ ] Deployment with admin and delay
- [ ] Queue transaction (with validations)
- [ ] Execute transaction (after delay)
- [ ] Cancel transaction
- [ ] Get transaction hash
- [ ] Edge cases (invalid params, early execution)
- [ ] Integration tests

**Expected Result**: All 20 tests pass

---

#### Test 2.4: TokenDistribution Tests
```bash
npx hardhat test test/TokenDistribution.test.ts
```

**Expected Tests (20 total)**:
- [ ] Deployment and initialization
- [ ] Vesting setup (1-year, 3-month cliff)
- [ ] Token distribution to team
- [ ] Vesting claims (time-locked)
- [ ] Access control (team members only)
- [ ] Emergency functions
- [ ] Token burning
- [ ] Integration tests

**Expected Result**: All 20 tests pass

---

#### Test 2.5: ReflectiveToken Tests (After Fix)
```bash
npx hardhat test test/ReflectiveToken.test.ts
```

**Expected Tests (45 total)**:
- [ ] Deployment (empty constructor)
- [ ] Initialization with dependencies
- [ ] Token transfers with reflection
- [ ] Fee management (timelock updates)
- [ ] Marketing wallet management
- [ ] Arweave gateway integration
- [ ] Token burning
- [ ] Distribution functions
- [ ] Access control
- [ ] Blacklist functionality
- [ ] Trading control
- [ ] Slippage management
- [ ] Emergency functions
- [ ] Utility functions
- [ ] Integration tests

**Expected Result**: All 45 tests pass

---

#### Test 2.6: MockContracts Tests
```bash
npx hardhat test test/MockContracts.test.ts
```

**Expected Tests (25 total)**:
- [ ] MockPriceOracle functionality
- [ ] MockUniswapRouter functionality
- [ ] Mock contract integration
- [ ] Edge cases

**Expected Result**: All 25 tests pass

---

#### Test 2.7: Performance Tests
```bash
npx hardhat test test/PerformanceTest.test.ts
```

**Expected Tests (2 total)**:
- [ ] Basic performance metrics
- [ ] Parallel deployment efficiency

**Expected Result**: All 2 tests pass

---

### Phase 3: Full Test Suite ✅

After fixing individual tests, run complete suite:

```bash
npx hardhat test
```

**Expected Result**:
```
188 passing (14s)
0 failing
```

---

## 🔧 Test Fixes Needed

### File: `test/ReflectiveToken.test.ts`

**Lines to change**: 58-59

**Before:**
```typescript
Staking.deploy(),
Token.deploy(),
```

**After:**
```typescript
// Note: We need token address first, so split deployment
Token.deploy(),
```

Then later (after token is deployed):
```typescript
// Deploy staking with correct constructor args
const stakingInstance = await Staking.deploy(
  await tokenInstance.getAddress(),
  await mockOracleInstance.getAddress(),
  await mockOracleInstance.getAddress()  // using same oracle for backup
);
```

**Complete fix** (lines 44-80):
```typescript
// Deploy contracts in phases due to dependencies
const [
  Gateway,
  Distribution,
  Timelock,
  MockRouterFactory,
  MockOracleFactory,
  Token,
] = await Promise.all([
  ethers.getContractFactory("ArweaveGateway"),
  ethers.getContractFactory("TokenDistribution"),
  ethers.getContractFactory("ImprovedTimelock"),
  ethers.getContractFactory("MockUniswapRouter"),
  ethers.getContractFactory("MockPriceOracle"),
  ethers.getContractFactory("ReflectiveToken"),
]);

// Deploy contracts (except staking which needs token address)
const [
  gatewayInstance,
  distributionInstance,
  timelockInstance,
  mockRouterInstance,
  mockOracleInstance,
  tokenInstance,
] = await Promise.all([
  Gateway.deploy(),
  Distribution.deploy(),
  Timelock.deploy(owner.address, 86400),
  MockRouterFactory.deploy(),
  MockOracleFactory.deploy(),
  Token.deploy(),  // ReflectiveToken has empty constructor
]);

// Wait for deployments
await Promise.all([
  gatewayInstance.waitForDeployment(),
  distributionInstance.waitForDeployment(),
  timelockInstance.waitForDeployment(),
  mockRouterInstance.waitForDeployment(),
  mockOracleInstance.waitForDeployment(),
  tokenInstance.waitForDeployment(),
]);

// Now deploy staking with token address
const Staking = await ethers.getContractFactory("FlexibleTieredStaking");
const stakingInstance = await Staking.deploy(
  await tokenInstance.getAddress(),
  await mockOracleInstance.getAddress(),
  await mockOracleInstance.getAddress()
);
await stakingInstance.waitForDeployment();

// Assign instances
gateway = gatewayInstance;
distribution = distributionInstance;
timelock = timelockInstance;
mockRouter = mockRouterInstance;
mockOracle = mockOracleInstance;
staking = stakingInstance;
token = tokenInstance;
```

---

### File: `test/FlexibleTieredStaking.test.ts`

Need to check this file and ensure it deploys with constructor args.

**Expected pattern:**
```typescript
const token = await Token.deploy();
await token.waitForDeployment();

const oracle = await MockOracle.deploy();
await oracle.waitForDeployment();

const staking = await Staking.deploy(
  await token.getAddress(),
  await oracle.getAddress(),
  await oracle.getAddress()
);
await staking.waitForDeployment();
```

---

## 📊 Testing Strategy

### Step 1: Quick Smoke Test (5 minutes)
```bash
# Test one simple contract first
npx hardhat test test/ArweaveGateway.test.ts
```

If this passes, contracts compile correctly.

---

### Step 2: Fix Broken Tests (30-60 minutes)
1. Fix `ReflectiveToken.test.ts` (20 mins)
2. Fix `FlexibleTieredStaking.test.ts` (10 mins)
3. Run each fixed test individually (10 mins)

---

### Step 3: Run All Tests (10 minutes)
```bash
npx hardhat test
```

Expected output:
```
  ArweaveGateway
    ✓ Should deploy correctly (25 tests)
    
  FlexibleTieredStaking
    ✓ Should handle staking correctly (45 tests)
    
  ImprovedTimelock
    ✓ Should queue and execute (20 tests)
    
  MockContracts
    ✓ Should mock correctly (25 tests)
    
  PerformanceTest
    ✓ Should be efficient (2 tests)
    
  ReflectiveToken
    ✓ Should reflect fees correctly (45 tests)
    
  TokenDistribution
    ✓ Should vest correctly (20 tests)

  182 passing (14s)
```

---

## 🎯 Success Criteria

### ✅ All Tests Must Pass

- [ ] **0 failing tests**
- [ ] **182+ passing tests**
- [ ] **No skipped tests**
- [ ] **Execution time < 30 seconds**
- [ ] **No console errors or warnings**

### ✅ Coverage Areas Verified

- [ ] Token transfers work
- [ ] Reflection mechanics work
- [ ] Staking/unstaking works
- [ ] Tier calculations accurate
- [ ] Oracle price feeds work
- [ ] Vesting schedules work
- [ ] Timelock delays work
- [ ] Access control works
- [ ] Emergency functions work
- [ ] Fee distribution works

---

## 🚨 If Tests Fail

### Debugging Steps:

1. **Read error message carefully**
   ```bash
   # Get detailed error output
   npx hardhat test --verbose
   ```

2. **Test one contract at a time**
   ```bash
   npx hardhat test test/CONTRACT_NAME.test.ts
   ```

3. **Check constructor arguments**
   - ReflectiveToken: NO arguments (empty constructor)
   - FlexibleTieredStaking: 3 arguments (token, oracle1, oracle2)
   - ImprovedTimelock: 2 arguments (admin, delay)
   - Others: Check contract files

4. **Verify contract compilation**
   ```bash
   npx hardhat clean
   npx hardhat compile
   ```

5. **Check for initialization**
   - ReflectiveToken uses `initialize()` after deployment
   - Other contracts initialize in constructor

---

## 📝 Test Execution Log Template

Use this to track your testing:

```
Date: ___/___/2025
Time Started: __:__ AM/PM
Tester: _______________

[ ] Step 1: Fixed ReflectiveToken.test.ts
    Result: _______________ (pass/fail)
    Notes: _______________

[ ] Step 2: Fixed FlexibleTieredStaking.test.ts
    Result: _______________ (pass/fail)
    Notes: _______________

[ ] Step 3: Ran ArweaveGateway tests
    Result: ___/25 passed
    Notes: _______________

[ ] Step 4: Ran FlexibleTieredStaking tests
    Result: ___/45 passed
    Notes: _______________

[ ] Step 5: Ran ImprovedTimelock tests
    Result: ___/20 passed
    Notes: _______________

[ ] Step 6: Ran TokenDistribution tests
    Result: ___/20 passed
    Notes: _______________

[ ] Step 7: Ran ReflectiveToken tests
    Result: ___/45 passed
    Notes: _______________

[ ] Step 8: Ran MockContracts tests
    Result: ___/25 passed
    Notes: _______________

[ ] Step 9: Ran PerformanceTest tests
    Result: ___/2 passed
    Notes: _______________

[ ] Step 10: Ran FULL test suite
    Result: ___/188 passed
    Time: ___ seconds
    Notes: _______________

FINAL RESULT: [ ] ALL PASS [ ] SOME FAIL
```

---

## 🎬 Quick Start Commands

```bash
# Clean and recompile
npx hardhat clean && npx hardhat compile

# Run individual test files
npx hardhat test test/ArweaveGateway.test.ts
npx hardhat test test/FlexibleTieredStaking.test.ts
npx hardhat test test/ImprovedTimelock.test.ts
npx hardhat test test/TokenDistribution.test.ts
npx hardhat test test/ReflectiveToken.test.ts
npx hardhat test test/MockContracts.test.ts
npx hardhat test test/PerformanceTest.test.ts

# Run all tests
npx hardhat test

# Run with gas reporting
npx hardhat test --gas-reporter

# Run with coverage
npx hardhat coverage
```

---

## ✅ Next Steps After Tests Pass

1. [ ] Document any test failures and fixes
2. [ ] Update test documentation
3. [ ] Run tests on testnet (live network)
4. [ ] Proceed with mainnet deployment preparation
5. [ ] Re-run tests before actual deployment

---

## 🔗 Related Documents

- `PRE_MAINNET_DEPLOYMENT_CHECKLIST.md` - Full deployment checklist
- `DEPLOYMENT_READINESS_REPORT.md` - Deployment status report
- `docs/TEST_RESULTS_SUMMARY.md` - Previous test results (188 passing)

---

**Priority**: 🔴 **HIGH - Fix immediately before mainnet**

**Estimated Time**: 1-2 hours to fix and run all tests

**Status**: 🔴 **BLOCKED - Tests must pass before deployment**

---

**Created by**: AI Assistant  
**Last Updated**: December 8, 2025  
**Version**: 1.0

