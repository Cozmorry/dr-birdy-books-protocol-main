/**
 * @title Finalize Token Distribution
 * @notice Uses token.initializeDistribution() to complete setup
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentFile = require("../deployments/deployment-mainnet-1765231331017.json");
  const TOKEN_PROXY = deploymentFile.token;
  const DISTRIBUTION = deploymentFile.distribution;

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_PROXY);
  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  console.log("\n🚀 FINALIZING TOKEN DISTRIBUTION");
  console.log("=".repeat(80));

  // Check status
  const tokenContractBalance = await token.balanceOf(TOKEN_PROXY);
  const distributionBalance = await token.balanceOf(DISTRIBUTION);
  const distributionComplete = await distribution.isDistributionComplete();
  const vestingInitialized = await distribution.vestingInitialized();
  const totalNeeded = ethers.parseEther("1000000");

  console.log("\n📊 Current Status:");
  console.log("  Token Contract Balance:", ethers.formatEther(tokenContractBalance), "DBBPT");
  console.log("  Distribution Balance:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("  Vesting Initialized:", vestingInitialized);
  console.log("  Distribution Complete:", distributionComplete);

  if (distributionComplete) {
    console.log("\n✅ Distribution already complete!");
    return;
  }

  // Ensure token contract has balance
  if (tokenContractBalance < totalNeeded) {
    console.log("\n⚠️  Token contract needs", ethers.formatEther(totalNeeded - tokenContractBalance), "more tokens");
    console.log("   Please transfer tokens to token contract first");
    return;
  }

  // Try initializeDistribution
  console.log("\n📋 Attempting to initialize distribution via token contract...");
  console.log("   This will:");
  console.log("   - Transfer 1M tokens from token contract to distribution");
  console.log("   - Initialize vesting schedules");
  console.log("   - Distribute airdrop tokens");
  
  try {
    const initTx = await token.initializeDistribution();
    console.log("   ⏳ Waiting for confirmation...");
    await initTx.wait(2);
    console.log("✅ Distribution initialized successfully!");
    console.log("   TX:", initTx.hash);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 The error might be due to:");
    console.log("   - Distribution contract not excluded from fees");
    console.log("   - Vesting not initialized");
    console.log("   - Other contract restrictions");
    console.log("\n📝 Manual steps:");
    console.log("   1. Ensure distribution contract is excluded from fees");
    console.log("   2. Initialize vesting: distribution.initializeVesting()");
    console.log("   3. Transfer tokens manually if needed");
    console.log("   4. Complete: distribution.distributeInitialTokens()");
    throw error;
  }

  // Verify
  const finalComplete = await distribution.isDistributionComplete();
  const finalBalance = await token.balanceOf(DISTRIBUTION);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICATION");
  console.log("=".repeat(80));
  console.log("  Distribution Complete:", finalComplete);
  console.log("  Distribution Balance:", ethers.formatEther(finalBalance), "DBBPT");
  
  if (finalComplete) {
    console.log("\n🎉 Token distribution successfully completed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });

