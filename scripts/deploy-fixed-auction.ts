/**
 * Deploy Fixed Auction with Correct Mock USDC
 * 
 * This script:
 * 1. Deploys SimpleMockUSDC (fixed, no bugs)
 * 2. Deploys new ContinuousClearingAuction
 * 3. Excludes auction from fees
 * 4. Funds auction with DBBPT
 * 5. Mints test USDC
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-fixed-auction.ts --network testnet
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying Fixed Auction System");
  console.log("   Deployer:", deployer.address);

  const TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // DBBPT (keep existing)
  
  // Step 1: Deploy SimpleMockUSDC
  console.log("\n📝 Step 1: Deploying SimpleMockUSDC...");
  const MockUSDCFactory = await ethers.getContractFactory("SimpleMockUSDC");
  const mockUSDC = await MockUSDCFactory.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("   ✅ SimpleMockUSDC deployed:", usdcAddress);

  // Step 2: Deploy ContinuousClearingAuction
  console.log("\n📝 Step 2: Deploying ContinuousClearingAuction...");
  
  const currentBlock = await ethers.provider.getBlockNumber();
  const TOKEN_AMOUNT = ethers.parseEther("1500000"); // 1.5M DBBPT
  const FLOOR_PRICE = ethers.parseUnits("0.1", 6); // 0.1 USDC (6 decimals)
  const START_BLOCK = currentBlock + 50; // ~100 seconds
  const END_BLOCK = START_BLOCK + 10000; // ~5.5 hours
  
  const AuctionFactory = await ethers.getContractFactory("ContinuousClearingAuction");
  const auction = await AuctionFactory.deploy(
    TOKEN_ADDRESS,
    usdcAddress,
    TOKEN_AMOUNT,
    FLOOR_PRICE,
    START_BLOCK,
    END_BLOCK,
    deployer.address, // funds recipient
    deployer.address, // liquidity recipient
    deployer.address  // owner
  );
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("   ✅ Auction deployed:", auctionAddress);
  console.log("   Start Block:", START_BLOCK);
  console.log("   End Block:", END_BLOCK);

  // Step 3: Exclude auction from fees
  console.log("\n📝 Step 3: Excluding auction from 5% fees...");
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const excludeTx = await token.excludeFromFee(auctionAddress, true);
  await excludeTx.wait();
  console.log("   ✅ Auction excluded from fees");

  // Step 4: Fund auction with 1.5M DBBPT
  console.log("\n📝 Step 4: Funding auction with 1,500,000 DBBPT...");
  const fundTx = await token.transfer(auctionAddress, TOKEN_AMOUNT);
  await fundTx.wait();
  const auctionBalance = await token.balanceOf(auctionAddress);
  console.log("   ✅ Auction funded!");
  console.log("   Balance:", ethers.formatEther(auctionBalance), "DBBPT");

  // Step 5: Mint test USDC
  console.log("\n📝 Step 5: Minting 100,000 test USDC...");
  const mintAmount = ethers.parseUnits("100000", 6);
  const mintTx = await mockUSDC.mint(deployer.address, mintAmount);
  await mintTx.wait();
  const usdcBalance = await mockUSDC.balanceOf(deployer.address);
  console.log("   ✅ USDC minted!");
  console.log("   Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

  // Summary
  console.log("\n✅ DEPLOYMENT COMPLETE!");
  console.log("\n📋 Contract Addresses:");
  console.log("   DBBPT Token:       ", TOKEN_ADDRESS);
  console.log("   Mock USDC (NEW):   ", usdcAddress);
  console.log("   Auction (NEW):     ", auctionAddress);

  console.log("\n📝 Update frontend/.env:");
  console.log(`   REACT_APP_AUCTION_ADDRESS=${auctionAddress}`);
  console.log(`   REACT_APP_MOCK_USDC_ADDRESS=${usdcAddress}`);

  console.log("\n⏰ Auction Timeline:");
  console.log(`   Starts in:         ~${(START_BLOCK - currentBlock) * 2} seconds`);
  console.log(`   Duration:          ~${((END_BLOCK - START_BLOCK) * 2) / 3600} hours`);

  console.log("\n🎯 Next Steps:");
  console.log("   1. Update frontend/.env with addresses above");
  console.log("   2. Restart frontend: npm start");
  console.log("   3. Start bidding!");

  console.log("\n🔗 View on BaseScan:");
  console.log("   Auction:", `https://sepolia.basescan.org/address/${auctionAddress}`);
  console.log("   USDC:   ", `https://sepolia.basescan.org/address/${usdcAddress}`);

  // Save deployment info
  const deploymentInfo = {
    network: "Base Sepolia Testnet",
    chainId: 84532,
    tokenAddress: TOKEN_ADDRESS,
    mockUSDCAddress: usdcAddress,
    auctionAddress: auctionAddress,
    tokenAmount: TOKEN_AMOUNT.toString(),
    floorPrice: FLOOR_PRICE.toString(),
    startBlock: START_BLOCK,
    endBlock: END_BLOCK,
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  fs.writeFileSync(
    path.join(__dirname, "..", "deployments", "testnet-auction-fixed.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment saved to: deployments/testnet-auction-fixed.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
