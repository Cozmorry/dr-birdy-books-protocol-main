/**
 * Check Auction Bids and State
 */

import { ethers } from "hardhat";

async function main() {
  const AUCTION_ADDRESS = "0xD78444e0E752676fF5673eC5422eB72CB65e0338";
  const [deployer] = await ethers.getSigners();
  
  const auction = await ethers.getContractAt("ContinuousClearingAuction", AUCTION_ADDRESS);
  
  console.log("📊 Detailed Auction State\n");
  
  const totalRaised = await auction.totalCurrencyContributed();
  const tokenAmount = await auction.tokenAmount();
  const floorPrice = await auction.floorPrice();
  const clearingPrice = await auction.clearingPrice();
  const totalTokensSold = await auction.totalTokensSold();
  const yourContribution = await auction.currencyContributed(deployer.address);
  
  console.log("Total USDC Raised:    ", ethers.formatUnits(totalRaised, 6), "USDC");
  console.log("Your Contribution:    ", ethers.formatUnits(yourContribution, 6), "USDC");
  console.log("Token Amount:         ", ethers.formatEther(tokenAmount), "DBBPT");
  console.log("Floor Price:          ", ethers.formatUnits(floorPrice, 6), "USDC per DBBPT");
  console.log("Clearing Price:       ", ethers.formatUnits(clearingPrice, 18), "USDC (finalized value)");
  console.log("Total Tokens Sold:    ", ethers.formatEther(totalTokensSold), "DBBPT");
  
  const isEnded = await auction.isEnded();
  const isCanceled = await auction.isCanceled();
  const isFinalized = await auction.isFinalized();
  
  console.log("\nStatus Flags:");
  console.log("Is Ended?             ", isEnded);
  console.log("Is Canceled?          ", isCanceled);
  console.log("Is Finalized?         ", isFinalized);
}

main().then(() => process.exit(0)).catch(console.error);
