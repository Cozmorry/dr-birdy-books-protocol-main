/**
 * Check Old Auction (the one with buggy USDC that was finalized)
 */

import { ethers } from "hardhat";

async function main() {
  const OLD_AUCTION = "0xD78444e0E752676fF5673eC5422eB72CB65e0338";
  const OLD_USDC = "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B";
  const TOKEN = "0xB49872C1aD8a052f1369ABDfC890264938647EB6";
  
  const auction = await ethers.getContractAt("ContinuousClearingAuction", OLD_AUCTION);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN);
  
  console.log("📊 Old Auction Status (Finalized One)\n");
  
  const isFinalized = await auction.isFinalized();
  const totalRaised = await auction.totalCurrencyContributed();
  const clearingPrice = await auction.clearingPrice();
  const totalTokensSold = await auction.totalTokensSold();
  const auctionBalance = await token.balanceOf(OLD_AUCTION);
  
  console.log("Finalized:          ", isFinalized);
  console.log("Total Raised:       ", ethers.formatUnits(totalRaised, 6), "USDC");
  console.log("Clearing Price:     ", ethers.formatUnits(clearingPrice, 18), "USDC per DBBPT");
  console.log("Tokens Sold:        ", ethers.formatEther(totalTokensSold), "DBBPT");
  console.log("DBBPT in Auction:   ", ethers.formatEther(auctionBalance), "DBBPT");
  
  if (isFinalized && totalRaised > BigInt(0)) {
    const liquidityShare = totalRaised / BigInt(3);
    const fundsShare = totalRaised - liquidityShare;
    
    console.log("\n💸 USDC Split:");
    console.log("Funds (66.67%):     ", ethers.formatUnits(fundsShare, 6), "USDC");
    console.log("Liquidity (33.33%): ", ethers.formatUnits(liquidityShare, 6), "USDC");
    console.log("Total:              ", ethers.formatUnits(totalRaised, 6), "USDC");
  }
  
  // Check if you've claimed
  const [deployer] = await ethers.getSigners();
  const yourContribution = await auction.currencyContributed(deployer.address);
  const hasClaimed = await auction.tokensClaimed(deployer.address);
  
  console.log("\n👤 Your Status:");
  console.log("Your Contribution:  ", ethers.formatUnits(yourContribution, 6), "USDC");
  console.log("Have You Claimed:   ", hasClaimed ? "✅ YES" : "⏳ NO");
  
  if (!hasClaimed && yourContribution > BigInt(0)) {
    const yourTokens = (yourContribution * BigInt(1e18)) / clearingPrice;
    console.log("Tokens to Claim:    ", ethers.formatEther(yourTokens), "DBBPT");
    console.log("\n💡 To claim:");
    console.log("   > await auction.claimTokens()");
  }
}

main().then(() => process.exit(0)).catch(console.error);
