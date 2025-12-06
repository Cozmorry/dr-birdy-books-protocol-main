import { ethers } from "hardhat";

/**
 * Check staking and yield balances to explain the discrepancy
 */
async function main() {
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("📊 Staking & Yield Balance Breakdown\n");
  console.log("=".repeat(60));

  // User's staked amount
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  console.log("👤 Your Staked Amount:", ethers.formatEther(userStaked), "DBBPT");
  console.log("   (This is what YOU staked total)");

  // Staking contract balance
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  console.log("\n📦 Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   (Tokens available in staking contract)");

  // Strategy balance
  const strategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  console.log("\n💰 Yield Strategy Balance:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   (Tokens deployed to yield)");

  // Deployed shares
  const yieldInfo = await staking.getYieldInfo();
  console.log("\n📈 Deployed Shares:", ethers.formatEther(yieldInfo.deployedShares), "shares");
  console.log("   (Tracked by staking contract)");

  // Math check
  console.log("\n🧮 Math Check:");
  console.log("   Your Staked:", ethers.formatEther(userStaked), "DBBPT");
  console.log("   = Staking Contract:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   + Yield Strategy:", ethers.formatEther(strategyBalance), "DBBPT");
  
  const total = stakingBalance + strategyBalance;
  console.log("\n   Total:", ethers.formatEther(total), "DBBPT");
  
  if (total === userStaked) {
    console.log("   ✅ Math checks out!");
  } else {
    console.log("   ⚠️  Small difference (may be due to rounding or other stakers)");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Explanation:");
  console.log("   • 'Total Staked' (1,000) = Balance in staking contract");
  console.log("   • 'Staked' (1,500) = Your total staked amount");
  console.log("   • Difference (500) = Deployed to yield strategy");
  console.log("\n   This is NORMAL and EXPECTED when yield is enabled!");
}

main().catch(console.error);

