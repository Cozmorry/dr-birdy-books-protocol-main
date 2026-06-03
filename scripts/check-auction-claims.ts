/**
 * Check Auction Claims Status
 * 
 * Shows:
 * - Total raised and splits
 * - Clearing price
 * - All bidders and their allocations
 * - Who has claimed and who hasn't
 * - Remaining tokens in auction
 * 
 * Usage:
 *   npx hardhat run scripts/check-auction-claims.ts --network testnet
 */

import { ethers } from "hardhat";

async function main() {
  const AUCTION_ADDRESS = "0x9178700d5980eFCF0aB9cAe0a78Ad5bb64344A83";
  const TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6";
  const USDC_ADDRESS = "0x76648Dec56c85E845286732DA1280F52D11b9575";
  
  const auction = await ethers.getContractAt("ContinuousClearingAuction", AUCTION_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  
  console.log("📊 Auction Claims Dashboard\n");
  console.log("Auction Address:", AUCTION_ADDRESS);
  console.log("═".repeat(80));
  
  // Get auction state
  const totalRaised = await auction.totalCurrencyContributed();
  const tokenAmount = await auction.tokenAmount();
  const floorPrice = await auction.floorPrice();
  const clearingPrice = await auction.clearingPrice();
  const totalTokensSold = await auction.totalTokensSold();
  const isFinalized = await auction.isFinalized();
  const fundsRecipient = await auction.fundsRecipient();
  const liquidityRecipient = await auction.liquidityRecipient();
  
  // Financial Summary
  console.log("\n💰 Financial Summary:");
  console.log("─".repeat(80));
  console.log(`   Total USDC Raised:        ${ethers.formatUnits(totalRaised, 6)} USDC`);
  console.log(`   Floor Price:              ${ethers.formatUnits(floorPrice, 6)} USDC per DBBPT`);
  console.log(`   Clearing Price:           ${ethers.formatUnits(clearingPrice, 18)} USDC per DBBPT`);
  console.log(`   Total DBBPT Allocated:    ${ethers.formatEther(totalTokensSold)} DBBPT`);
  console.log(`   Finalized:                ${isFinalized ? '✅ YES' : '❌ NO'}`);
  
  if (isFinalized && totalRaised > BigInt(0)) {
    const liquidityShare = totalRaised / BigInt(3); // 33.33%
    const fundsShare = totalRaised - liquidityShare; // 66.67%
    
    console.log("\n💸 USDC Distribution (After Finalization):");
    console.log("─".repeat(80));
    console.log(`   Funds Recipient (66.67%): ${ethers.formatUnits(fundsShare, 6)} USDC → ${fundsRecipient}`);
    console.log(`   Liquidity (33.33%):       ${ethers.formatUnits(liquidityShare, 6)} USDC → ${liquidityRecipient}`);
  }
  
  // Token balances
  const auctionDBBPTBalance = await token.balanceOf(AUCTION_ADDRESS);
  const auctionUSDCBalance = await usdc.balanceOf(AUCTION_ADDRESS);
  
  console.log("\n📦 Auction Contract Balances:");
  console.log("─".repeat(80));
  console.log(`   DBBPT Remaining:          ${ethers.formatEther(auctionDBBPTBalance)} DBBPT`);
  console.log(`   USDC Remaining:           ${ethers.formatUnits(auctionUSDCBalance, 6)} USDC`);
  
  if (isFinalized) {
    const expectedRemaining = tokenAmount - totalTokensSold;
    if (expectedRemaining > BigInt(0)) {
      console.log(`   Expected Unsold:          ${ethers.formatEther(expectedRemaining)} DBBPT`);
    }
  }
  
  // Query bidding events to find all bidders
  console.log("\n👥 Bidder Claim Status:");
  console.log("─".repeat(80));
  
  try {
    const filter = auction.filters.BidSubmitted();
    const currentBlock = await ethers.provider.getBlockNumber();
    const events = await auction.queryFilter(filter, Math.max(0, currentBlock - 150000), 'latest');
    
    // Aggregate bids by bidder
    const bidderMap = new Map<string, bigint>();
    for (const event of events) {
      const bidder = event.args![0] as string;
      const amount = event.args![1] as bigint;
      bidderMap.set(bidder, (bidderMap.get(bidder) || BigInt(0)) + amount);
    }
    
    console.log(`   Total Unique Bidders: ${bidderMap.size}\n`);
    
    let totalClaimed = BigInt(0);
    let claimedCount = 0;
    
    for (const [bidder, contribution] of bidderMap.entries()) {
      const hasClaimed = await auction.tokensClaimed(bidder);
      const tokensToReceive = (contribution * BigInt(1e18)) / clearingPrice;
      
      const shortAddr = `${bidder.substring(0, 6)}...${bidder.substring(38)}`;
      const status = hasClaimed ? '✅ CLAIMED' : '⏳ PENDING';
      
      console.log(`   ${shortAddr}`);
      console.log(`     Contributed:  ${ethers.formatUnits(contribution, 6)} USDC`);
      console.log(`     Allocation:   ${ethers.formatEther(tokensToReceive)} DBBPT`);
      console.log(`     Status:       ${status}`);
      console.log();
      
      if (hasClaimed) {
        totalClaimed += tokensToReceive;
        claimedCount++;
      }
    }
    
    // Summary stats
    console.log("─".repeat(80));
    console.log(`   ${claimedCount} of ${bidderMap.size} bidders have claimed`);
    console.log(`   Claimed:     ${ethers.formatEther(totalClaimed)} DBBPT`);
    console.log(`   Unclaimed:   ${ethers.formatEther(totalTokensSold - totalClaimed)} DBBPT`);
    
  } catch (err) {
    console.log("   ⚠️ Could not fetch bidding events (may need longer block range)");
  }
  
  // Instructions
  console.log("\n📝 How Bidders Claim:");
  console.log("─".repeat(80));
  console.log("   1. Go to auction page");
  console.log("   2. Connect wallet (must be the bidder's wallet)");
  console.log("   3. Click 'Claim Tokens' button");
  console.log("   4. Confirm transaction in wallet");
  console.log("   5. Receive DBBPT tokens (0% fee - auction is exempt)");
  
  console.log("\n🔧 Admin Tools:");
  console.log("─".repeat(80));
  if (isFinalized && auctionDBBPTBalance > totalTokensSold) {
    console.log("   ⚠️ Unsold tokens detected!");
    console.log("   Owner can withdraw unsold tokens:");
    console.log("   > await auction.withdrawUnsoldTokens()");
  } else {
    console.log("   ✅ All tokens have been allocated to bidders");
  }
  
  console.log("\n🔗 View on BaseScan:");
  console.log(`   https://sepolia.basescan.org/address/${AUCTION_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
