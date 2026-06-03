/**
 * Check New Auction Status
 * 
 * Quick check to verify the new auction is properly set up
 */

import { ethers } from "hardhat";

async function main() {
  const TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6";
  const CURRENCY_ADDRESS = "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B";
  const NEW_AUCTION_ADDRESS = "0xD78444e0E752676fF5673eC5422eB72CB65e0338";

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", CURRENCY_ADDRESS);
  const auction = await ethers.getContractAt("ContinuousClearingAuction", NEW_AUCTION_ADDRESS);

  console.log("📊 New Auction Status Check\n");

  // Check auction DBBPT balance
  const auctionBalance = await token.balanceOf(NEW_AUCTION_ADDRESS);
  console.log("Auction DBBPT Balance:", ethers.formatEther(auctionBalance), "DBBPT");
  
  // Check expected amount
  const expectedAmount = await auction.tokenAmount();
  console.log("Expected Amount:      ", ethers.formatEther(expectedAmount), "DBBPT");
  
  // Check if properly funded
  if (auctionBalance >= expectedAmount) {
    console.log("✅ Auction is properly funded!");
  } else {
    console.log("⚠️ Auction needs more tokens!");
    const needed = expectedAmount - auctionBalance;
    console.log("   Still needs:", ethers.formatEther(needed), "DBBPT");
  }

  // Check blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  const startBlock = await auction.startBlock();
  const endBlock = await auction.endBlock();
  
  console.log("\n⏰ Timeline:");
  console.log("Current Block:", currentBlock);
  console.log("Start Block:  ", startBlock.toString());
  console.log("End Block:    ", endBlock.toString());
  
  if (currentBlock < Number(startBlock)) {
    console.log("Status: Pending Start (", Number(startBlock) - currentBlock, "blocks to go)");
  } else if (currentBlock < Number(endBlock)) {
    console.log("Status: ✅ ACTIVE - Bidding open!");
  } else {
    console.log("Status: ENDED");
  }

  // Check your balances
  const [deployer] = await ethers.getSigners();
  const yourDBBPT = await token.balanceOf(deployer.address);
  const yourUSDC = await usdc.balanceOf(deployer.address);
  
  console.log("\n💰 Your Balances:");
  console.log("DBBPT:", ethers.formatEther(yourDBBPT));
  console.log("USDC: ", ethers.formatUnits(yourUSDC, 6));
}

main().then(() => process.exit(0)).catch(console.error);
