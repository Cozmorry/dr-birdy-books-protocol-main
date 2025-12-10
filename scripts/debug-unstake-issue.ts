import { ethers } from "hardhat";

/**
 * Debug unstaking issue - check balances and yield status
 */
async function main() {
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);

  console.log("🔍 Unstaking Debug Analysis\n");
  console.log("=".repeat(60));

  // Check user staked amount
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  console.log("👤 User Staked:", ethers.formatEther(userStaked), "DBBPT");

  // Check staking contract balance
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  console.log("📦 Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");

  // Check yield info (returns tuple, not object)
  const [strategyAddress, deployedShares, totalValue, apyBps, isActive] = await staking.getYieldInfo();
  console.log("\n💰 Yield Strategy Info:");
  console.log("   Strategy Address:", strategyAddress);
  console.log("   Yield Active:", isActive);
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");
  console.log("   Total Value:", ethers.formatEther(totalValue), "DBBPT");
  console.log("   APY (BPS):", apyBps.toString());

  // Check strategy balance if it exists
  if (strategyAddress !== ethers.ZeroAddress) {
    const strategyBalance = await token.balanceOf(strategyAddress);
    console.log("   Strategy Balance:", ethers.formatEther(strategyBalance), "DBBPT");
    
    // Check if strategy can withdraw
    try {
      console.log("\n🔧 Strategy Status:");
      console.log("   Strategy isActive:", await strategy.isActive());
    } catch (e) {
      console.log("   ⚠️  Could not check strategy status");
    }
  }

  // Calculate what's needed
  const tryUnstakeAmount = userStaked; // Try to unstake all user has
  const tryUnstakeHalf = userStaked / 2n;
  
  console.log("\n📊 Unstaking Analysis:");
  console.log("   To unstake ALL tokens (", ethers.formatEther(tryUnstakeAmount), "DBBPT):");
  console.log("     - Staking contract has:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("     - Need from yield:", ethers.formatEther(tryUnstakeAmount - stakingBalance), "DBBPT");
  console.log("     - Available in yield:", ethers.formatEther(deployedShares), "DBBPT");
  
  if (stakingBalance >= tryUnstakeAmount) {
    console.log("     ✅ Should work - enough in staking contract");
  } else if (stakingBalance + deployedShares >= tryUnstakeAmount) {
    console.log("     ⚠️  Should work - need to withdraw from yield first");
    console.log("     ⚠️  BUT: The withdrawal might be failing silently!");
  } else {
    console.log("     ❌ Not enough total tokens");
  }

  console.log("\n   To unstake HALF (", ethers.formatEther(tryUnstakeHalf), "DBBPT):");
  if (stakingBalance >= tryUnstakeHalf) {
    console.log("     ✅ Should work - enough in staking contract");
  } else {
    console.log("     ❌ Not enough in staking contract");
  }
  
  // Check if yield is enabled
  const yieldEnabled = await staking.yieldEnabled();
  console.log("\n🔧 Yield Configuration:");
  console.log("   Yield Enabled:", yieldEnabled);
  console.log("   Yield Strategy Set:", strategyAddress !== ethers.ZeroAddress);

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

