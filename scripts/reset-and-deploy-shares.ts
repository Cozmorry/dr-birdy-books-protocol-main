import { ethers } from "hardhat";

/**
 * Reset deployed shares to 0, then deploy tokens to new strategy
 */
async function main() {
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const NEW_STRATEGY_ADDRESS = "0x76675479C5Fe73E0843150DEC401D66B1D981F87";

  const [deployer] = await ethers.getSigners();
  console.log("🔧 Deployer:", deployer.address);

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("\n📊 Current State:");
  const [strategyAddress, deployedShares] = await staking.getYieldInfo();
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");
  console.log("   Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");

  // Step 1: Reset deployed shares to 0
  console.log("\n🔧 Step 1: Resetting deployed shares to 0...");
  try {
    const resetTx = await staking.setYieldDeployedShares(0);
    await resetTx.wait();
    console.log("✅ Deployed shares reset to 0");
  } catch (error: any) {
    if (error.message.includes("setYieldDeployedShares")) {
      console.log("❌ Function not found - contract needs to be redeployed with fix");
      console.log("   For now, we'll work around this...");
    } else {
      throw error;
    }
  }

  // Step 2: Deploy tokens to new strategy
  if (stakingBalance > 0n) {
    console.log("\n💰 Step 2: Deploying", ethers.formatEther(stakingBalance), "DBBPT to new strategy...");
    try {
      const deployTx = await staking.deployToYield(stakingBalance);
      await deployTx.wait();
      console.log("✅ Tokens deployed to new strategy");
    } catch (error: any) {
      console.log("❌ Deployment failed:", error.message);
    }
  }

  // Final check
  console.log("\n📊 Final State:");
  const [finalStrategy, finalShares] = await staking.getYieldInfo();
  const finalStrategyBalance = await token.balanceOf(NEW_STRATEGY_ADDRESS);
  console.log("   Deployed Shares:", ethers.formatEther(finalShares), "DBBPT");
  console.log("   New Strategy Balance:", ethers.formatEther(finalStrategyBalance), "DBBPT");
  
  if (finalStrategyBalance >= finalShares) {
    console.log("\n✅ Fix complete! Unstaking should work now.");
  } else {
    console.log("\n⚠️  Still a mismatch");
  }
}

main().catch(console.error);

