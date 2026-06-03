/**
 * Debug Bid Issue
 * 
 * Check why the bid is failing
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const AUCTION_ADDRESS = "0xD78444e0E752676fF5673eC5422eB72CB65e0338";
  const USDC_ADDRESS = "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B";
  
  console.log("🔍 Debugging Bid Issue\n");
  console.log("Bidder:", deployer.address);
  console.log("Auction:", AUCTION_ADDRESS);
  
  const auction = await ethers.getContractAt("ContinuousClearingAuction", AUCTION_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  
  // Check auction state
  const isEnded = await auction.isEnded();
  const isCanceled = await auction.isCanceled();
  const startBlock = await auction.startBlock();
  const endBlock = await auction.endBlock();
  const currentBlock = await ethers.provider.getBlockNumber();
  
  console.log("\n📊 Auction State:");
  console.log("Is Ended?    ", isEnded);
  console.log("Is Canceled? ", isCanceled);
  console.log("Current Block:", currentBlock);
  console.log("Start Block:  ", startBlock.toString());
  console.log("End Block:    ", endBlock.toString());
  
  if (currentBlock < Number(startBlock)) {
    console.log("❌ PROBLEM: Auction hasn't started yet!");
    console.log("   Wait", Number(startBlock) - currentBlock, "blocks");
    return;
  }
  
  if (currentBlock >= Number(endBlock)) {
    console.log("❌ PROBLEM: Auction has ended!");
    return;
  }
  
  if (isEnded || isCanceled) {
    console.log("❌ PROBLEM: Auction is ended or canceled!");
    return;
  }
  
  // Check USDC balance
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("\n💰 Your USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
  
  // Check USDC allowance
  const allowance = await usdc.allowance(deployer.address, AUCTION_ADDRESS);
  console.log("USDC Allowance:      ", ethers.formatUnits(allowance, 6), "USDC");
  
  const bidAmount = ethers.parseUnits("10000", 6); // Trying to bid 10k USDC
  console.log("\nTrying to bid:       ", ethers.formatUnits(bidAmount, 6), "USDC");
  
  if (usdcBalance < bidAmount) {
    console.log("❌ PROBLEM: Insufficient USDC balance!");
    console.log("   You have:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("   You need:", ethers.formatUnits(bidAmount, 6), "USDC");
    return;
  }
  
  if (allowance < bidAmount) {
    console.log("⚠️  Need to approve USDC first");
    console.log("   Approving", ethers.formatUnits(bidAmount, 6), "USDC...");
    const approveTx = await usdc.approve(AUCTION_ADDRESS, bidAmount);
    await approveTx.wait();
    console.log("   ✅ Approved!");
  }
  
  // Try the bid
  console.log("\n🎯 Attempting bid...");
  try {
    const bidTx = await auction.bid(bidAmount);
    console.log("   Transaction sent:", bidTx.hash);
    await bidTx.wait();
    console.log("   ✅ BID SUCCESSFUL!");
  } catch (error: any) {
    console.log("   ❌ BID FAILED!");
    console.log("   Error:", error.message);
    
    // Try to decode the error
    if (error.data) {
      console.log("   Error data:", error.data);
    }
  }
  
  // Show total bids
  const totalRaised = await auction.totalCurrencyContributed();
  const yourContribution = await auction.currencyContributed(deployer.address);
  
  console.log("\n📊 After Bid Attempt:");
  console.log("Total Raised:        ", ethers.formatUnits(totalRaised, 6), "USDC");
  console.log("Your Contribution:   ", ethers.formatUnits(yourContribution, 6), "USDC");
}

main().then(() => process.exit(0)).catch(console.error);
