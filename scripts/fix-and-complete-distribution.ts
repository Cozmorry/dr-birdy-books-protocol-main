/**
 * @title Fix and Complete Token Distribution
 * @notice Excludes distribution from fees and completes distribution setup
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentFile = require("../deployments/deployment-mainnet-1765231331017.json");
  const TOKEN_PROXY = deploymentFile.token;
  const DISTRIBUTION = deploymentFile.distribution;

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_PROXY);
  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  console.log("\n🔧 FIXING AND COMPLETING TOKEN DISTRIBUTION");
  console.log("=".repeat(80));

  // Step 1: Exclude distribution contract from fees
  console.log("\n📝 Step 1: Excluding distribution contract from fees...");
  try {
    const excludeTx = await token.excludeFromFee(DISTRIBUTION, true);
    console.log("   ⏳ Waiting for confirmation...");
    await excludeTx.wait(2);
    console.log("✅ Distribution excluded from fees!");
    console.log("   TX:", excludeTx.hash);
  } catch (error: any) {
    if (error.message.includes("already excluded") || error.message.includes("same value")) {
      console.log("✅ Distribution already excluded from fees");
    } else {
      console.error("❌ Error:", error.message);
      throw error;
    }
  }

  // Step 2: Check current state
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

  // Step 3: Transfer tokens from token contract to distribution
  if (distributionBalance < totalNeeded && tokenContractBalance >= totalNeeded) {
    console.log("\n📤 Step 2: Transferring 1M tokens from token contract to distribution...");
    console.log("   Using _transfer via initializeDistribution()...");
    
    try {
      const initTx = await token.initializeDistribution();
      console.log("   ⏳ Waiting for confirmation...");
      await initTx.wait(2);
      console.log("✅ Distribution initialized!");
      console.log("   TX:", initTx.hash);
    } catch (error: any) {
      console.error("❌ initializeDistribution() failed:", error.message);
      console.log("\n💡 Trying alternative: Direct transfer from deployer...");
      
      // Alternative: Transfer from deployer directly
      const deployerBalance = await token.balanceOf(deployer.address);
      if (deployerBalance >= totalNeeded) {
        console.log("   Transferring from deployer to distribution...");
        const transferTx = await token.transfer(DISTRIBUTION, totalNeeded);
        await transferTx.wait(2);
        console.log("✅ Tokens transferred!");
        console.log("   TX:", transferTx.hash);
        
        // Now complete distribution
        if (!distributionComplete && vestingInitialized) {
          console.log("\n📋 Step 3: Completing distribution...");
          const distTx = await distribution.distributeInitialTokens();
          await distTx.wait(2);
          console.log("✅ Distribution complete!");
          console.log("   TX:", distTx.hash);
        }
      } else {
        throw new Error("Insufficient balance in deployer wallet");
      }
    }
  } else if (distributionBalance >= totalNeeded && !distributionComplete) {
    console.log("\n📋 Step 2: Distribution has tokens, completing distribution...");
    const distTx = await distribution.distributeInitialTokens();
    await distTx.wait(2);
    console.log("✅ Distribution complete!");
    console.log("   TX:", distTx.hash);
  } else if (distributionComplete) {
    console.log("\n✅ Distribution already complete!");
  } else {
    console.log("\n⚠️  Need to transfer tokens first");
  }

  // Final verification
  const finalComplete = await distribution.isDistributionComplete();
  const finalBalance = await token.balanceOf(DISTRIBUTION);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ FINAL STATUS");
  console.log("=".repeat(80));
  console.log("  Distribution Complete:", finalComplete);
  console.log("  Distribution Balance:", ethers.formatEther(finalBalance), "DBBPT");
  
  if (finalComplete) {
    console.log("\n🎉 Token distribution successfully completed!");
    console.log("   - 750,000 DBBPT allocated for team vesting");
    console.log("   - 250,000 DBBPT distributed to airdrop wallet");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });

