# Dr. Birdy Books Protocol - ContinuousClearingAuction Walkthrough

This document provides a complete guide to deploying, configuring, and managing the ContinuousClearingAuction system for DBBPT token sales.

---

## Table of Contents
1. [Overview](#overview)
2. [Smart Contract Architecture](#smart-contract-architecture)
3. [Deployment Guide](#deployment-guide)
4. [Frontend Admin Dashboard](#frontend-admin-dashboard)
5. [Operational Procedures](#operational-procedures)
6. [Testing](#testing)
7. [Mainnet Deployment Checklist](#mainnet-deployment-checklist)

---

## Overview

The **ContinuousClearingAuction** is a uniform-price clearing auction designed for selling DBBPT tokens. Key features include:

- **Dynamic Pricing**: Clearing price calculated based on total contributions divided by token supply
- **Floor Price Protection**: Minimum price of 0.1 USDC per DBBPT
- **Manual Control**: Owner can end early, cancel, or finalize at any time
- **Fund Splits**: Automatic distribution of 2/3 to operations, 1/3 to liquidity
- **Fee Bypass**: Bidders receive 100% of tokens (0% reflective fee) using fee exemption
- **Full Refunds**: 100% refund if auction is canceled

---

## Smart Contract Architecture

### Core Contracts

#### 1. **ContinuousClearingAuction.sol**
The main auction contract handling bidding, finalization, and claims.

**Key Functions:**
- `bid(uint256 amount)` - Submit a bid in USDC
- `endAuctionEarly()` - Owner-only: End auction before scheduled end block
- `cancelAuction()` - Owner-only: Cancel auction and enable refunds
- `finalize()` - Owner-only: Calculate clearing price and distribute funds
- `claimTokens()` - Bidder: Claim purchased DBBPT tokens
- `claimRefund()` - Bidder: Claim full refund if auction canceled
- `withdrawUnsoldTokens()` - Owner: Withdraw unsold tokens after cancellation

**State Variables:**
- `tokenAmount` - Total DBBPT tokens in auction (e.g., 1,500,000)
- `floorPrice` - Minimum price per DBBPT (0.1 USDC)
- `startBlock` / `endBlock` - Auction duration in blocks
- `fundsRecipient` - Receives 2/3 of raised funds (operations)
- `liquidityRecipient` - Receives 1/3 of raised funds (liquidity)
- `clearingPrice` - Final uniform price (calculated at finalization)
- `totalCurrencyContributed` - Total USDC raised
- `totalTokensSold` - Total DBBPT tokens sold

#### 2. **SimpleMockUSDC.sol**
A mock ERC20 token for testing on testnet.

#### 3. **ReflectiveToken.sol**
The DBBPT token contract with 5% reflective transfer fee (exempted for auction claims).

---

## Deployment Guide

### Prerequisites

1. **Environment Setup:**
```bash
npm install
```

2. **Configure `.env`:**
```env
PRIVATE_KEY=your_private_key_here
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

3. **Update `hardhat.config.ts` with network settings**

### Testnet Deployment (Base Sepolia)

Run the automated deployment script:

```bash
npx hardhat run scripts/deploy-fixed-auction.ts --network testnet
```

**This script automatically:**
1. Deploys SimpleMockUSDC (test currency)
2. Deploys ContinuousClearingAuction
3. Excludes auction from DBBPT transfer fees
4. Funds auction with 1,500,000 DBBPT
5. Mints 100,000 test USDC to deployer
6. Saves deployment addresses to `deployments/testnet-auction-fixed.json`

**Expected Output:**
```
✅ DEPLOYMENT COMPLETE!

📋 Contract Addresses:
   DBBPT Token:        0xB49872C1aD8a052f1369ABDfC890264938647EB6
   Mock USDC (NEW):    0x[new_usdc_address]
   Auction (NEW):      0x[new_auction_address]

💰 Fund Recipients:
   Operations (2/3):   0x[your_address]
   Liquidity (1/3):    0x[morris_address]
```

### Mainnet Deployment (Base)

1. **Update deployment script** `scripts/deploy-mainnet-auction.ts`:
   - Set `TOKEN_ADDRESS` to mainnet DBBPT: `0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B`
   - Set `CURRENCY_ADDRESS` to real USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - Configure `fundsRecipient` and `liquidityRecipient`
   - Set auction parameters (token amount, floor price, duration)

2. **Deploy:**
```bash
npx hardhat run scripts/deploy-mainnet-auction.ts --network mainnet
```

3. **Verify on BaseScan:**
```bash
npx hardhat verify --network mainnet <AUCTION_ADDRESS> \
  <TOKEN_ADDRESS> <USDC_ADDRESS> <TOKEN_AMOUNT> <FLOOR_PRICE> \
  <START_BLOCK> <END_BLOCK> <FUNDS_RECIPIENT> <LIQUIDITY_RECIPIENT> <OWNER>
```

---

## Frontend Admin Dashboard

### Setup

1. **Update `frontend/.env`:**
```env
REACT_APP_AUCTION_ADDRESS=0x[deployed_auction_address]
REACT_APP_MOCK_USDC_ADDRESS=0x[mock_usdc_address]  # Testnet only
```

2. **Start frontend:**
```bash
cd frontend
npm start
```

3. **Access Admin Panel:**
   - Navigate to `http://localhost:3000/admin/auction`
   - Connect MetaMask to Base network (mainnet or testnet)

### Dashboard Features

#### Real-Time Metrics
- **Auction Status**: Pending, Active, Ended, Canceled, or Finalized
- **Raise Progress**: Total USDC contributed
- **Clearing Price**: Calculated price per DBBPT
- **Token Supply**: Total tokens available and sold
- **Timeline**: Blocks remaining until end

#### Owner Controls
- **End Auction Early**: Stop accepting bids and allow finalization
- **Cancel Auction**: Abort auction and enable 100% refunds
- **Finalize Auction**: Calculate clearing price, distribute funds, return unsold tokens
- **Withdraw Unsold**: Recover remaining DBBPT after cancellation
- **Exclude/Restore Fees**: Manage fee exemption for claim transfers

#### Bidder Controls
- **Place Bid**: Submit USDC bids (with approval flow)
- **Claim My Tokens**: Receive purchased DBBPT after finalization
- **Claim Refund**: Get 100% USDC refund if auction canceled

#### Activity Logs
- **Bids Section**: Shows all bids with amounts, blocks, and transaction links
- **Claims Section**: Shows all token claims after finalization

#### Developer Sandbox (Testnet Only)
- Deploy test USDC contracts
- Deploy test auctions with custom parameters
- Quick testing without manual setup

---

## Operational Procedures

### Pre-Auction Checklist

1. ✅ **Deploy auction contract** with correct parameters
2. ✅ **Exclude auction from fees**: `token.excludeFromFee(auctionAddress, true)`
3. ✅ **Fund auction**: Transfer 1,500,000 DBBPT to auction contract
4. ✅ **Verify recipients**: Confirm `fundsRecipient` and `liquidityRecipient` addresses
5. ✅ **Communicate start time**: Notify community of start block/time
6. ✅ **Update frontend**: Deploy frontend with correct auction address

### During Auction

1. **Monitor bids** in real-time via admin dashboard
2. **Check clearing price** calculations
3. **Be available** to end early or cancel if needed
4. **Communicate updates** to community

### Ending the Auction

#### Option A: Natural End (Scheduled)
- Auction automatically ends at `endBlock`
- No action needed from owner
- Wait for finalization

#### Option B: Early End (Manual)
1. Click **"End Auction Early"** button
2. Confirm transaction in MetaMask
3. Auction status changes to "Ended"
4. Proceed to finalization

#### Option C: Cancellation
1. Click **"Cancel Auction"** button
2. Confirm transaction
3. All bidders can claim 100% refunds
4. Owner can withdraw all DBBPT tokens

### Finalization Process

1. **Ensure auction has ended** (naturally or early)
2. Click **"Finalize Auction"** button
3. Contract executes:
   - Calculates clearing price
   - Distributes USDC:
     - 33.33% → `liquidityRecipient`
     - 66.67% → `fundsRecipient`
   - Returns unsold tokens to owner
4. **Verify fund receipt** in recipient wallets
5. **Announce to bidders** that claims are now open

### Post-Finalization

1. **Bidders claim tokens** via "Claim My Tokens" button
2. **Monitor claim activity** in Claims section
3. **After all claims complete**:
   - Optionally restore staking contract: `token.setStakingContract(stakingAddress)`
   - This re-enables normal 5% transfer fees

---

## Testing

### Automated Test Suite

Run the comprehensive test suite:

```bash
npx hardhat test test/ContinuousClearingAuction.test.ts
```

**Test Coverage:**
- ✅ Deployment and initialization
- ✅ Bidding mechanics (single, multiple, multiple bidders)
- ✅ Early finalization
- ✅ Cancellation and refunds
- ✅ Clearing price calculations
- ✅ Fund splits (2/3 + 1/3)
- ✅ Token claims with 0% fee
- ✅ Double-claim prevention
- ✅ Edge cases (zero bids, all tokens sold, partial sales)

### Manual Testing on Testnet

1. **Deploy using sandbox** in admin dashboard
2. **Place test bids** from multiple wallets
3. **Test early end** functionality
4. **Finalize and verify** fund splits
5. **Claim tokens** and verify 0% fee
6. **Test cancellation** and refunds in separate auction

### Integration Testing

Test the full auction lifecycle:

```bash
# Place bids from test account
npx hardhat run scripts/place-test-bid.ts --network testnet

# End auction early
npx hardhat run scripts/end-auction-early.ts --network testnet

# Finalize
npx hardhat run scripts/finalize-auction.ts --network testnet

# Claim tokens
npx hardhat run scripts/claim-my-tokens.ts --network testnet

# Verify fund splits
npx hardhat run scripts/verify-fund-splits.ts --network testnet
```

---

## Mainnet Deployment Checklist

### Pre-Deployment

- [ ] Run full test suite: `npx hardhat test`
- [ ] Test on Base Sepolia testnet end-to-end
- [ ] Verify all recipient addresses are correct
- [ ] Confirm USDC contract address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- [ ] Confirm DBBPT token address: `0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B`
- [ ] Review auction parameters (token amount, floor price, duration)
- [ ] Prepare communication materials (start time, how to participate)

### Deployment

- [ ] Deploy auction contract to Base Mainnet
- [ ] Verify contract on BaseScan
- [ ] Exclude auction from DBBPT transfer fees
- [ ] Fund auction with DBBPT tokens
- [ ] Verify auction balance on-chain
- [ ] Update frontend `.env` with mainnet auction address
- [ ] Deploy frontend to production
- [ ] Test MetaMask connection on production site

### Launch

- [ ] Announce auction start time to community
- [ ] Share auction contract address (verified on BaseScan)
- [ ] Provide participation instructions
- [ ] Monitor first bids for issues
- [ ] Be available during entire auction period

### Post-Auction

- [ ] Finalize auction at appropriate time
- [ ] Verify fund splits in recipient wallets
- [ ] Announce claim period is open
- [ ] Monitor claim activity
- [ ] Restore staking contract after claims complete
- [ ] Document lessons learned for future auctions

---

## Contract Addresses

### Base Mainnet (Production)
- **DBBPT Token**: `0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B`
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **FlexibleTieredStaking**: `0x0106CbC32f3C10f68c4b58009D7054b31B99c264`
- **TokenDistribution**: `0xE1bABA07752ce8bD574eEa5aBe494521B3028638`
- **ContinuousClearingAuction**: *To be deployed*

### Base Sepolia (Testnet)
- **DBBPT Token**: `0xB49872C1aD8a052f1369ABDfC890264938647EB6`
- **MockUSDC**: *Deployed per auction test*
- **ContinuousClearingAuction**: *Deployed per test*

---

## Support & Resources

- **Repository**: [GitHub Link]
- **Documentation**: This walkthrough + `implementation_plan.md`
- **BaseScan**: https://basescan.org / https://sepolia.basescan.org
- **Base Docs**: https://docs.base.org

---

## Security Considerations

1. **Owner Key Security**: Protect private key with hardware wallet or multi-sig
2. **Recipient Address Verification**: Triple-check `fundsRecipient` and `liquidityRecipient`
3. **Fund Custody**: Funds are automatically transferred during finalization (not held in auction)
4. **Fee Exemption**: Only auction contract should be excluded from fees
5. **Front-Running**: Bidders can inspect mempool; clearing price protects against overpaying
6. **Smart Contract Audits**: Consider professional audit before mainnet deployment

---

## FAQ

**Q: Can bidders see the current clearing price before finalizing?**  
A: Yes, the frontend displays the estimated clearing price in real-time based on current bids.

**Q: What happens if no one bids?**  
A: Owner can cancel the auction and withdraw all DBBPT tokens, or finalize with 0 tokens sold.

**Q: Can the owner change parameters after deployment?**  
A: No, all parameters (token amount, floor price, recipients) are immutable after deployment.

**Q: Why do bidders receive 0% fee on claims?**  
A: The auction contract is excluded from the 5% reflective transfer fee, ensuring bidders receive exactly what they purchased.

**Q: Can the owner steal funds?**  
A: No, finalization automatically distributes funds to immutable recipient addresses. The owner cannot redirect or withhold funds.

**Q: What if a bidder never claims their tokens?**  
A: Unclaimed tokens remain in the auction contract indefinitely. Bidders can claim at any time after finalization.

---

**Last Updated**: January 2025  
**Version**: 1.0
