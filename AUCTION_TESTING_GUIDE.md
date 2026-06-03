# 🎯 Auction Testing Guide - Localhost

## ✅ Deployment Complete!

Your Continuous Clearing Auction has been successfully deployed to localhost (ChainId 31337).

### 📝 Deployed Contracts

| Contract | Address |
|----------|---------|
| **Mock USDC** (Currency) | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| **Auction Contract** | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| **ReflectiveToken (DBBPT)** | `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318` |

### 🚀 Quick Start - Testing via Frontend

1. **Restart your frontend** (to load the new environment variables):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:3000/admin/auction
   ```

3. **Connect your wallet**:
   - Make sure MetaMask is on "Hardhat Localhost" (Chain ID 31337)
   - Account: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - You should see 10,000 ETH

4. **The auction page should automatically load** your deployed auction at:
   ```
   0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   ```

---

## 🧪 Testing Workflow

### Step 1: Fund the Auction with DBBPT Tokens

The auction needs 1,500,000 DBBPT tokens to function. Transfer them from your account:

**Option A: Via Browser Console**
```javascript
// Open browser console (F12) while on the auction page
const tokenAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
const auctionAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const amount = ethers.parseEther("1500000");

const tokenABI = ["function transfer(address to, uint256 amount) returns (bool)"];
const signer = await provider.getSigner();
const token = new ethers.Contract(tokenAddress, tokenABI, signer);

const tx = await token.transfer(auctionAddress, amount);
await tx.wait();
console.log("✅ Funded auction with 1.5M DBBPT!");
```

**Option B: Via Hardhat Script**
```bash
npx hardhat run scripts/fund-auction-localhost.ts --network localhost
```

### Step 2: Get Mock USDC for Bidding

You need Mock USDC to place bids. Mint some to your account:

```javascript
// In browser console
const mockUSDCAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const mockUSDCABI = [
  "function mint(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const mockUSDC = new ethers.Contract(mockUSDCAddress, mockUSDCABI, await provider.getSigner());

// Mint 100,000 USDC (6 decimals)
const mintAmount = ethers.parseUnits("100000", 6);
const tx = await mockUSDC.mint("YOUR_ADDRESS_HERE", mintAmount);
await tx.wait();

// Check balance
const balance = await mockUSDC.balanceOf("YOUR_ADDRESS_HERE");
console.log("Balance:", ethers.formatUnits(balance, 6), "USDC");
```

### Step 3: Wait for Auction to Start

The auction starts in a few blocks. You can see the status on the auction page:
- **Pending Start**: Auction hasn't started yet
- **Active**: Bidding is open
- **Ended**: Bidding closed, awaiting finalization

### Step 4: Place a Bid

Use the "Interactive Bid Simulator" section on the auction page:

1. Enter bid amount (e.g., `50000` for $50,000)
2. Click "Submit Simulation Bid"
3. Approve USDC spending in MetaMask
4. Confirm the bid transaction

### Step 5: Test Owner Actions

As the auction owner, you can:

#### **End Auction Early**
- Click "End Auction Early" button
- This freezes bidding immediately

#### **Finalize Auction**
- Click "Finalize Auction" button
- This calculates the clearing price and distributes funds:
  - 33.33% → Liquidity Recipient
  - 66.67% → Funds Recipient
- Unsold tokens (if any) are returned to owner

#### **Cancel Auction** (if needed)
- Click "Cancel Auction" button
- All bidders can claim 100% refunds
- All DBBPT tokens returned to owner

### Step 6: Bypass Transfer Fees (Important!)

**Before finalizing**, you need to exempt the auction from the 5% Reflective fee:

1. On the auction page, find the "Fee Exemption" section
2. Click **"Set Auction as Staking Contract"**
3. Confirm the transaction

This makes token claims 100% fee-free for bidders.

**After all claims are done**, restore the original staking contract:
1. Click **"Restore Original Staking Contract"**

### Step 7: Claim Tokens

After finalization, bidders can claim their tokens:

1. Navigate to the auction page
2. Click "Claim My Tokens"
3. Tokens are distributed based on the clearing price

---

## 📊 Auction Metrics to Monitor

The auction page shows real-time data:

- **Total Raised**: Total USDC contributed
- **Clearing Price**: Current calculated price per DBBPT
- **Tokens Sold**: Number of DBBPT tokens allocated
- **Blocks Remaining**: Time until auction ends
- **Bid History**: Recent bids with addresses and amounts

---

## 🐛 Troubleshooting

### "Insufficient balance" when funding auction
- Check your DBBPT balance is >= 1,500,000 tokens
- Use the first Hardhat account (0xf39...9266) which has all the tokens

### "Approval required" when bidding
- This is normal - approve the USDC spending first
- The frontend handles this automatically

### Auction page shows "Invalid address"
- Make sure you're on Hardhat Localhost network (Chain ID 31337)
- Verify the auction address: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

### Transfer fees still applied when claiming
- Make sure you called `setStakingContract(auctionAddress)` before finalization
- Check the "Current Staking Contract" field shows the auction address

---

## 🎓 Advanced: Full Automated Test

Run the complete test suite:

```bash
npx hardhat run scripts/test-auction-localhost.ts --network localhost
```

This will:
1. Wait for auction to start
2. Mint USDC to 2 test bidders
3. Submit bids from both accounts
4. End auction early (as owner)
5. Finalize auction
6. Claim tokens for both bidders

---

## 📚 Contract Functions Reference

### Auction Contract

```solidity
// View Functions
function token() view returns (address)
function currency() view returns (address)
function tokenAmount() view returns (uint256)
function floorPrice() view returns (uint256)
function startBlock() view returns (uint256)
function endBlock() view returns (uint256)
function totalCurrencyContributed() view returns (uint256)
function clearingPrice() view returns (uint256)
function totalTokensSold() view returns (uint256)
function isEnded() view returns (bool)
function isCanceled() view returns (bool)
function isFinalized() view returns (bool)

// User Functions
function bid(uint256 amount) external
function claimTokens() external
function claimRefund() external  // Only if canceled

// Owner Functions
function endAuctionEarly() external
function cancelAuction() external
function finalize() external
function withdrawUnsoldTokens() external
```

---

## 🎉 Success Checklist

- [ ] Frontend connected to localhost
- [ ] Auction contract loaded on `/admin/auction`
- [ ] Auction funded with 1.5M DBBPT tokens
- [ ] Mock USDC minted for testing
- [ ] Bids successfully submitted
- [ ] Owner controls tested (end early, finalize)
- [ ] Fee exemption configured
- [ ] Tokens claimed successfully
- [ ] Original staking contract restored

---

**Happy Testing! 🚀**

For issues or questions, check the browser console (F12) for detailed error messages.
