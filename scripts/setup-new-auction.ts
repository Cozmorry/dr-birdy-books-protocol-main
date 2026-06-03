/**
 * Setup New Auction - Complete Configuration
 * 
 * This script:
 * 1. Excludes the new auction from fees
 * 2. Funds the auction with 1.5M DBBPT
 * 3. Mints 100k USDC for testing
 * 
 * Usage:
 *   npx hardhat run scripts/setup-new-auction.ts --network testnet
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔧 Setting up new auction with account:", deployer.address);

  // Addresses
  const TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // DBBPT
  const CURRENCY_ADDRESS = "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B"; // Mock USDC
  const NEW_AUCTION_ADDRESS = "0xD78444e0E752676fF5673eC5422eB72CB65e0338"; // New auction

  console.log("\n📋 Configuration:");
  console.log("   Token (DBBPT):     ", TOKEN_ADDRESS);
  console.log("   Currency (USDC):   ", CURRENCY_ADDRESS);
  console.log("   New Auction:       ", NEW_AUCTION_ADDRESS);

  // Get contracts
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const usdc = await ethers.getContractAt("MockERC20", CURRENCY_ADDRESS);

  // Step 1: Exclude auction from fees
  console.log("\n🛡️ Step 1: Excluding auction from 5% transfer fees...");
  try {
    const excludeTx = await token.excludeFromFee(NEW_AUCTION_ADDRESS, true);
    console.log("   Transaction sent:", excludeTx.hash);
    await excludeTx.wait();
    console.log("   ✅ Auction excluded from fees!");
  } catch (error: any) {
    if (error.message && error.message.includes("already")) {
      console.log("   ℹ️ Auction already excluded from fees");
    } else {
      throw error;
    }
  }

  // Step 2: Fund auction with 1.5M DBBPT
  console.log("\n💰 Step 2: Funding auction with 1,500,000 DBBPT...");
  const fundAmount = ethers.parseEther("1500000");
  const fundTx = await token.transfer(NEW_AUCTION_ADDRESS, fundAmount);
  console.log("   Transaction sent:", fundTx.hash);
  await fundTx.wait();
  console.log("   ✅ Auction funded!");

  // Verify balance
  const auctionBalance = await token.balanceOf(NEW_AUCTION_ADDRESS);
  console.log("   Auction balance:", ethers.formatEther(auctionBalance), "DBBPT");

  // Step 3: Mint test USDC
  console.log("\n🪙 Step 3: Minting 100,000 test USDC...");
  const mintAmount = ethers.parseUnits("100000", 6);
  const mintTx = await usdc.mint(deployer.address, mintAmount);
  console.log("   Transaction sent:", mintTx.hash);
  await mintTx.wait();
  console.log("   ✅ USDC minted!");

  // Verify USDC balance
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("   Your USDC balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

  // Get auction details
  console.log("\n📊 Auction Status:");
  const auction = await ethers.getContractAt("ContinuousClearingAuction", NEW_AUCTION_ADDRESS);
  const startBlock = await auction.startBlock();
  const endBlock = await auction.endBlock();
  const currentBlock = await ethers.provider.getBlockNumber();
  
  console.log("   Current Block:     ", currentBlock);
  console.log("   Start Block:       ", startBlock.toString());
  console.log("   End Block:         ", endBlock.toString());
  
  if (currentBlock < Number(startBlock)) {
    const blocksUntilStart = Number(startBlock) - currentBlock;
    console.log("   ⏰ Starts in:       ", blocksUntilStart, "blocks (~", blocksUntilStart * 2, "seconds)");
  } else if (currentBlock < Number(endBlock)) {
    console.log("   ✅ Status:          ACTIVE - Bidding open!");
  } else {
    console.log("   ⚠️ Status:          ENDED");
  }

  console.log("\n✅ ALL SETUP COMPLETE!");
  console.log("\n📝 Summary:");
  console.log("   ✅ Auction excluded from fees (0% transfer fee)");
  console.log("   ✅ Auction funded with 1,500,000 DBBPT");
  console.log("   ✅ Test USDC minted (100,000 USDC)");
  console.log("\n🎯 Next Steps:");
  console.log("   1. Restart your frontend: npm start");
  console.log("   2. Open: http://localhost:3000/admin/auction");
  console.log("   3. Wait for start block if not active yet");
  console.log("   4. Start bidding!");

  console.log("\n🔗 View on BaseScan:");
  console.log("   ", `https://sepolia.basescan.org/address/${NEW_AUCTION_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
