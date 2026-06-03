# Quick Auction Setup Guide

## ✅ DONE: Fee Exemption
The auction is already excluded from the 5% transfer fee! ✓

## 🚀 Next: Fund & Run Auction

### Step 1: Fund Auction (0% fee)
```bash
# Option A: Use frontend button
Click "Fund Auction (1.5M DBBPT)"

# Option B: Use Hardhat console
npx hardhat console --network testnet
> const token = await ethers.getContractAt("ReflectiveToken", "0xB49872C1aD8a052f1369ABDfC890264938647EB6");
> const auction = "0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d";
> await token.transfer(auction, ethers.parseEther("1500000"));
```

**Expected:** Auction receives exactly **1,500,000 DBBPT** (no 75k fee loss!)

### Step 2: Verify Balance
```bash
> await token.balanceOf(auction);
# Should show: 1500000000000000000000000 (1.5M * 10^18)
```

### Step 3: Run Auction

**Current Issue:** Auction already expired (end block passed)

**Solutions:**
1. **Deploy new auction** with future blocks
2. **Use owner controls** to test on expired auction:
   - Can still call `finalize()` if ended
   - Can test the finalization logic

### Step 4: Place Bids (If Not Expired)

**Option A: Use Frontend Bidding Simulator**
1. Enter bid amount in USDC
2. Click "Submit Bid"
3. Approve USDC spend
4. Bid submitted ✓

**Option B: Use Console**
```bash
> const usdc = await ethers.getContractAt("IERC20", "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B");
> const auctionContract = await ethers.getContractAt("ContinuousClearingAuction", auction);
> const amount = ethers.parseUnits("1000", 6); // 1000 USDC
> await usdc.approve(auction, amount);
> await auctionContract.bid(amount);
```

### Step 5: Finalize

**When:** After end block OR owner can end early

```bash
# End early (optional)
> await auctionContract.endAuctionEarly();

# Finalize
> await auctionContract.finalize();
```

**What happens:**
- Clearing price calculated
- Funds split 2/3 to owner, 1/3 to liquidity
- Unsold tokens returned to owner
- Bidders can now claim

### Step 6: Claim Tokens (0% fee)

**As a bidder:**
```bash
> await auctionContract.claimTokens();
```

**Expected:** Receive full token amount (no 5% fee loss!)

## 📊 Current Auction Info

```
Auction Address:    0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d
Token (DBBPT):      0xB49872C1aD8a052f1369ABDfC890264938647EB6
Currency (USDC):    0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B
Token Amount:       1,500,000 DBBPT
Floor Price:        0.1 USDC per DBBPT
Status:             EXPIRED (need new deployment for testing)
Fee Exemption:      ✅ ACTIVE (both methods)
```

## 🎯 Quick Commands

### Check Auction Balance
```bash
npx hardhat console --network testnet
> const token = await ethers.getContractAt("ReflectiveToken", "0xB49872C1aD8a052f1369ABDfC890264938647EB6");
> const balance = await token.balanceOf("0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d");
> console.log(ethers.formatEther(balance), "DBBPT");
```

### Check Fee Exemption Status
```bash
npx hardhat run scripts/check-fee-exemptions.ts --network testnet
```

### Exclude Auction from Fees (Already Done!)
```bash
npx hardhat run scripts/exclude-auction-from-fees.ts --network testnet
```

### Mint Mock USDC for Testing
```bash
npx hardhat console --network testnet
> const usdc = await ethers.getContractAt("MockERC20", "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B");
> await usdc.mint(yourAddress, ethers.parseUnits("100000", 6)); // 100k USDC
```

## ⚠️ Important Notes

1. ✅ **Fee exemption is DONE** - no need to do it again
2. ✅ **Both methods active** - maximum protection
3. ⚠️ **Current auction expired** - need new deployment to test bidding
4. ✅ **Can still test finalization** on expired auction
5. ✅ **Bidders will receive full amounts** (no fee loss)

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insufficient _rOwned balance" | Auction not funded - click "Fund Auction" |
| Transaction reverts | Check you're connected as owner (0xE409...a136) |
| Auction won't load | Verify network is Base Sepolia (84532) |
| Can't bid | Auction likely expired - check end block |

## 📚 More Info

- Full guide: `FEE_EXEMPTION_GUIDE.md`
- Status summary: `AUCTION_FEE_EXEMPTION_SUMMARY.md`
- Testing guide: `AUCTION_TESTING_GUIDE.md`
