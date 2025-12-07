import { ethers } from "hardhat";

/**
 * Debug staking issue
 */
async function main() {
  const STAKING_ADDRESS = "0xC93CfCBf7477A6FA6E8806b6D709e58B2bF60475";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Debugging Staking Issue\n");
  console.log("=".repeat(60));

  // Check if staking contract is excluded
  try {
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("Staking contract excluded from fees:", isExcluded);
    if (!isExcluded) {
      console.log("❌ Staking contract NOT excluded - this could cause issues!");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check exclusion (function might not exist)");
  }

  // Check user's allowance
  const allowance = await token.allowance(USER_ADDRESS, STAKING_ADDRESS);
  console.log("\nUser Allowance:", ethers.formatEther(allowance), "DBBPT");

  // Check user's balance
  const balance = await token.balanceOf(USER_ADDRESS);
  console.log("User Balance:", ethers.formatEther(balance), "DBBPT");

  // Check if Uniswap pair is set (needed for tier calculation)
  try {
    const uniswapPair = await staking.uniswapPair();
    console.log("\nUniswap Pair:", uniswapPair);
    if (uniswapPair === ethers.ZeroAddress) {
      console.log("⚠️  Uniswap pair NOT set - tier calculation might fail!");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check Uniswap pair");
  }

  // Try to call _updateUserTier manually (simulate)
  console.log("\n🧪 Testing tier update...");
  try {
    // Check current tier
    const userTier = await staking.getUserTier(USER_ADDRESS);
    console.log("Current User Tier:", userTier.toString());
  } catch (error: any) {
    console.log("⚠️  Could not get user tier:", error.message);
  }

  // Check yield deployment function
  console.log("\n💰 Checking yield deployment...");
  try {
    const [strategy, deployedShares] = await staking.getYieldInfo();
    console.log("Strategy:", strategy);
    console.log("Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");
    
    const yieldEnabled = await staking.yieldEnabled();
    console.log("Yield Enabled:", yieldEnabled);
    
    if (yieldEnabled && strategy !== ethers.ZeroAddress) {
      console.log("⚠️  Yield is enabled - _deployToYieldIfPossible might be failing");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check yield info");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Most likely causes:");
  console.log("   1. Staking contract not excluded from fees");
  console.log("   2. Uniswap pair not set (tier calculation fails)");
  console.log("   3. Yield deployment function failing");
}

main().catch(console.error);

