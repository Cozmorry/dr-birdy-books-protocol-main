/**
 * Test Complete Auction Flow
 * 
 * This tests:
 * 1. Place a bid
 * 2. End auction early
 * 3. Finalize
 * 4. Claim tokens
 */

import { ethers } from "hardhat";

async function main() {
  const [user] = await ethers.getSigners();
  const AUCTION = "0x8a621B5F11CEaCb7ca3b9A6f46072714abEFBcEb";
  const USDC = "0x53A87419b560861dEf8A3f675322835f2ad22Ce4";
  const TOKEN = "0xB49872C1aD8a052f1369ABDfC890264938647EB6";
  
  console.log("🧪 Testing Full Auction Flow");
  console.log("User:", user.address, "\n");
  
  const auction = await ethers.getContractAt("ContinuousClearingAuction", AUCTION);
  const usdc = await ethers.getContractAt("SimpleMockUSDC", USDC);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN);
  
  // Check status
  const isCanceled = await auction.isCanceled();
  const isFinalized = await auction.isFinalized();
  
  if (isCanceled) {
    console.log("❌ Auction is canceled. Deploy a new one.");
    return;
  }
  
  if (isFinalized) {
    console.log("❌ Auction already finalized. Deploy a new one.");
    return;
  }
  
  // Step 1: Place bid
  console.log("📝 Step 1: Placing bid...");
  const bidAmount = ethers.parseUnits("5000", 6); // 5000 USDC
  
  const usdcBalance = await usdc.balanceOf(user.address);
  if (usdcBalance < bidAmount) {
    console.log("   Minting USDC...");
    await (await usdc.mint(user.address, ethers.parseUnits("100000", 6))).wait();
  }
  
  const allowance = await usdc.allowance(user.address, AUCTION);
  if (allowance < bidAmount) {
    console.log("   Approving USDC...");
    await (await usdc.approve(AUCTION, bidAmount)).wait();
  }
  
  console.log("   Submitting bid...");
  await (await auction.bid(bidAmount)).wait();
  console.log("   ✅ Bid placed: 5,000 USDC\n");
  
  // Step 2: End early
  console.log("📝 Step 2: Ending auction early...");
  await (await auction.endAuctionEarly()).wait();
  console.log("   ✅ Auction ended\n");
  
  // Step 3: Finalize
  console.log("📝 Step 3: Finalizing...");
  await (await auction.finalize()).wait();
  console.log("   ✅ Finalized\n");
  
  const clearingPrice = await auction.clearingPrice();
  const totalRaised = await auction.totalCurrencyContributed();
  console.log("   Clearing Price:", ethers.formatUnits(clearingPrice, 18), "USDC per DBBPT");
  console.log("   Total Raised:", ethers.formatUnits(totalRaised, 6), "USDC\n");
  
  // Step 4: Claim
  console.log("📝 Step 4: Claiming tokens...");
  const balanceBefore = await token.balanceOf(user.address);
  await (await auction.claimTokens()).wait();
  const balanceAfter = await token.balanceOf(user.address);
  const received = balanceAfter - balanceBefore;
  console.log("   ✅ Claimed:", ethers.formatEther(received), "DBBPT\n");
  
  console.log("🎉 Full flow completed successfully!");
  console.log("\n📊 Summary:");
  console.log("   Bid:      5,000 USDC");
  console.log("   Received:", ethers.formatEther(received), "DBBPT");
  console.log("   Fee:      0% (auction is exempt)");
}

main().then(() => process.exit(0)).catch(console.error);
