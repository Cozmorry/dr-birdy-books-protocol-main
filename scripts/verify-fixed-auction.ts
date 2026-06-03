/**
 * Verify Fixed Auction Setup
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const AUCTION_ADDRESS = "0x9178700d5980eFCF0aB9cAe0a78Ad5bb64344A83";
  const USDC_ADDRESS = "0x76648Dec56c85E845286732DA1280F52D11b9575";
  const TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6";
  
  console.log("📊 Verifying Fixed Auction Setup\n");
  
  const auction = await ethers.getContractAt("ContinuousClearingAuction", AUCTION_ADDRESS);
  const usdc = await ethers.getContractAt("SimpleMockUSDC", USDC_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  
  // Check auction DBBPT balance
  const auctionDBBPT = await token.balanceOf(AUCTION_ADDRESS);
  console.log("✅ Auction DBBPT Balance:", ethers.formatEther(auctionDBBPT), "DBBPT");
  
  // Check your USDC balance
  const yourUSDC = await usdc.balanceOf(deployer.address);
  console.log("✅ Your USDC Balance:    ", ethers.formatUnits(yourUSDC, 6), "USDC");
  
  // Check auction state
  const totalRaised = await auction.totalCurrencyContributed();
  const tokenAmount = await auction.tokenAmount();
  const floorPrice = await auction.floorPrice();
  const currentBlock = await ethers.provider.getBlockNumber();
  const startBlock = await auction.startBlock();
  const endBlock = await auction.endBlock();
  
  console.log("\n📊 Auction State:");
  console.log("   Total Raised:       ", ethers.formatUnits(totalRaised, 6), "USDC");
  console.log("   Token Amount:       ", ethers.formatEther(tokenAmount), "DBBPT");
  console.log("   Floor Price:        ", ethers.formatUnits(floorPrice, 6), "USDC per DBBPT");
  console.log("   Current Block:      ", currentBlock);
  console.log("   Start Block:        ", startBlock.toString());
  console.log("   End Block:          ", endBlock.toString());
  
  if (currentBlock < Number(startBlock)) {
    console.log("   ⏰ Status:           Starts in", Number(startBlock) - currentBlock, "blocks");
  } else if (currentBlock < Number(endBlock)) {
    console.log("   ✅ Status:           ACTIVE");
  } else {
    console.log("   ⚠️ Status:           ENDED");
  }
  
  console.log("\n✅ All systems ready for testing!");
}

main().then(() => process.exit(0)).catch(console.error);
