/**
 * @title Check and Fix Distribution Setup
 * @notice Checks fee exclusions and completes distribution setup
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentFile = require("../deployments/deployment-mainnet-1765231331017.json");
  const TOKEN_PROXY = deploymentFile.token;
  const DISTRIBUTION = deploymentFile.distribution;

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_PROXY);
  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  console.log("\n🔍 CHECKING DISTRIBUTION SETUP");
  console.log("=".repeat(80));

  // Check if distribution is excluded from fees
  const isExcluded = await token.isExcludedFromFee(DISTRIBUTION);
  console.log("\n📋 Fee Exclusion Status:");
  console.log("  Distribution excluded from fees:", isExcluded);
  console.log("  Deployer excluded from fees:", await token.isExcludedFromFee(deployer.address));
  console.log("  Token contract excluded from fees:", await token.isExcludedFromFee(TOKEN_PROXY));

  // Check max transaction amount
  const maxTxAmount = await token.maxTxAmount();
  const totalNeeded = ethers.parseEther("1000000");
  console.log("\n📋 Transaction Limits:");
  console.log("  Max TX Amount:", ethers.formatEther(maxTxAmount), "DBBPT");
  console.log("  Required Amount:", ethers.formatEther(totalNeeded), "DBBPT");
  console.log("  Within Limit:", totalNeeded <= maxTxAmount);

  // Check balances
  const deployerBalance = await token.balanceOf(deployer.address);
  const tokenContractBalance = await token.balanceOf(TOKEN_PROXY);
  const distributionBalance = await token.balanceOf(DISTRIBUTION);

  console.log("\n📊 Balances:");
  console.log("  Deployer:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("  Token Contract:", ethers.formatEther(tokenContractBalance), "DBBPT");
  console.log("  Distribution:", ethers.formatEther(distributionBalance), "DBBPT");

  // Fix: Exclude distribution from fees if not excluded
  if (!isExcluded) {
    console.log("\n🔧 Fixing: Excluding distribution contract from fees...");
    const excludeTx = await token.excludeFromFee(DISTRIBUTION, true);
    await excludeTx.wait(2);
    console.log("✅ Distribution excluded from fees!");
    console.log("   TX:", excludeTx.hash);
  }

  // Now try the transfer
  if (distributionBalance < totalNeeded && deployerBalance >= totalNeeded) {
    console.log("\n📤 Transferring tokens to distribution...");
    
    // Check if we need to increase maxTxAmount
    if (totalNeeded > maxTxAmount) {
      console.log("⚠️  Required amount exceeds max transaction limit!");
      console.log("   Need to increase maxTxAmount or transfer in smaller chunks");
      return;
    }

    try {
      const transferTx = await token.transfer(DISTRIBUTION, totalNeeded);
      console.log("   ⏳ Waiting for confirmation...");
      await transferTx.wait(2);
      console.log("✅ Tokens transferred!");
      console.log("   TX:", transferTx.hash);
    } catch (error: any) {
      console.error("❌ Transfer failed:", error.message);
      console.log("\n💡 Alternative: Use token.initializeDistribution() which uses _transfer internally");
    }
  }

  // Complete distribution if tokens are there
  const finalDistributionBalance = await token.balanceOf(DISTRIBUTION);
  const distributionComplete = await distribution.isDistributionComplete();
  
  if (finalDistributionBalance >= totalNeeded && !distributionComplete) {
    console.log("\n📋 Completing distribution...");
    const distTx = await distribution.distributeInitialTokens();
    await distTx.wait(2);
    console.log("✅ Distribution complete!");
    console.log("   TX:", distTx.hash);
  }

  console.log("\n✅ Setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });

