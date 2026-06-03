/**
 * @title Test Auction on Localhost
 * @notice Simulates bidding, early ending, and finalization
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer, bidder1, bidder2] = await ethers.getSigners();

  console.log("\n🧪 Testing Auction on Localhost");
  console.log("=================================");

  // Load deployment addresses
  const auctionDeployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "deployments", "localhost-auction-latest.json"),
      "utf8"
    )
  );

  const auctionAddress = auctionDeployment.auction;
  const mockUSDCAddress = auctionDeployment.mockUSDC;
  const tokenAddress = auctionDeployment.reflectiveToken;

  console.log("Auction Address:", auctionAddress);
  console.log("Mock USDC Address:", mockUSDCAddress);
  console.log("Token Address:", tokenAddress);
  console.log("");

  // Get contract instances
  const auction = await ethers.getContractAt("ContinuousClearingAuction", auctionAddress);
  const mockUSDC = await ethers.getContractAt("MockERC20", mockUSDCAddress);
  
  // Check auction status
  console.log("📊 Auction Status");
  console.log("=================");
  const startBlock = await auction.startBlock();
  const endBlock = await auction.endBlock();
  const currentBlock = await ethers.provider.getBlockNumber();
  const isEnded = await auction.isEnded();
  const isCanceled = await auction.isCanceled();
  const isFinalized = await auction.isFinalized();

  console.log("Current Block:", currentBlock);
  console.log("Start Block:", startBlock);
  console.log("End Block:", endBlock);
  console.log("Is Ended:", isEnded);
  console.log("Is Canceled:", isCanceled);
  console.log("Is Finalized:", isFinalized);
  console.log("");

  // Wait for auction to start if needed
  if (currentBlock < startBlock) {
    const blocksToWait = Number(startBlock - BigInt(currentBlock));
    console.log(`⏳ Waiting for auction to start (${blocksToWait} blocks)...`);
    for (let i = 0; i < blocksToWait; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    console.log("✅ Auction started!\n");
  }

  // Mint USDC to bidders
  console.log("💵 Minting USDC to bidders...");
  const bidAmount1 = ethers.parseUnits("50000", 6); // $50k
  const bidAmount2 = ethers.parseUnits("30000", 6); // $30k

  await (await mockUSDC.mint(bidder1.address, bidAmount1)).wait(1);
  await (await mockUSDC.mint(bidder2.address, bidAmount2)).wait(1);
  console.log("  ✅ Minted $50,000 USDC to bidder1:", bidder1.address);
  console.log("  ✅ Minted $30,000 USDC to bidder2:", bidder2.address);
  console.log("");

  // Bidder 1 places bid
  console.log("🎯 Bidder 1 placing bid...");
  await (await mockUSDC.connect(bidder1).approve(auctionAddress, bidAmount1)).wait(1);
  await (await auction.connect(bidder1).bid(bidAmount1)).wait(1);
  console.log("  ✅ Bidder 1 bid $50,000 USDC");

  // Bidder 2 places bid
  console.log("🎯 Bidder 2 placing bid...");
  await (await mockUSDC.connect(bidder2).approve(auctionAddress, bidAmount2)).wait(1);
  await (await auction.connect(bidder2).bid(bidAmount2)).wait(1);
  console.log("  ✅ Bidder 2 bid $30,000 USDC");
  console.log("");

  // Check total raised
  const totalRaised = await auction.totalCurrencyContributed();
  console.log("💰 Total Raised:", ethers.formatUnits(totalRaised, 6), "USDC");
  console.log("");

  // Owner ends auction early
  console.log("🛑 Owner ending auction early...");
  await (await auction.connect(deployer).endAuctionEarly()).wait(1);
  console.log("  ✅ Auction ended early");
  console.log("");

  // Owner finalizes auction
  console.log("🎬 Owner finalizing auction...");
  await (await auction.connect(deployer).finalize()).wait(1);
  console.log("  ✅ Auction finalized");

  const clearingPrice = await auction.clearingPrice();
  const totalTokensSold = await auction.totalTokensSold();
  console.log("  💵 Clearing Price:", ethers.formatUnits(clearingPrice, 6), "USDC per token");
  console.log("  📦 Total Tokens Sold:", ethers.formatEther(totalTokensSold), "DBBPT");
  console.log("");

  // Bidders claim tokens
  console.log("🎁 Bidders claiming tokens...");
  
  console.log("  Bidder 1 claiming...");
  await (await auction.connect(bidder1).claimTokens()).wait(1);
  console.log("  ✅ Bidder 1 claimed tokens");

  console.log("  Bidder 2 claiming...");
  await (await auction.connect(bidder2).claimTokens()).wait(1);
  console.log("  ✅ Bidder 2 claimed tokens");
  console.log("");

  console.log("✅ Auction test complete!");
  console.log("\n📝 Summary:");
  console.log("  Total Raised: $" + ethers.formatUnits(totalRaised, 6));
  console.log("  Clearing Price: $" + ethers.formatUnits(clearingPrice, 6));
  console.log("  Tokens Sold:", ethers.formatEther(totalTokensSold));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Test failed:", err.message ?? err);
    process.exit(1);
  });
