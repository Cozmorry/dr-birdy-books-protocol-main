import { ethers } from "hardhat";

/**
 * Check when user can unstake
 */
async function main() {
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("⏰ Unstaking Eligibility Check\n");
  console.log("=".repeat(60));

  // Get staking info
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  const stakeTimestamp = await staking.stakeTimestamp(USER_ADDRESS);
  const firstStakeTimestamp = await staking.firstStakeTimestamp(USER_ADDRESS);
  const MIN_STAKING_DURATION = await staking.MIN_STAKING_DURATION();

  console.log("👤 Your Staked Amount:", ethers.formatEther(userStaked), "DBBPT");
  console.log("\n📅 Staking Timestamps:");
  console.log("   First Stake:", new Date(Number(firstStakeTimestamp) * 1000).toLocaleString());
  console.log("   Last Stake:", new Date(Number(stakeTimestamp) * 1000).toLocaleString());
  
  const minDurationSeconds = Number(MIN_STAKING_DURATION);
  const minDurationHours = minDurationSeconds / 3600;
  console.log("\n⏱️  Minimum Staking Duration:", minDurationHours, "hours (24 hours)");

  // Calculate when they can unstake
  const canUnstakeAt = Number(stakeTimestamp) + minDurationSeconds;
  const canUnstakeDate = new Date(canUnstakeAt * 1000);
  const now = Date.now() / 1000;
  const timeUntilUnstake = canUnstakeAt - now;

  console.log("\n✅ Can Unstake At:", canUnstakeDate.toLocaleString());
  
  if (timeUntilUnstake > 0) {
    const hoursLeft = Math.floor(timeUntilUnstake / 3600);
    const minutesLeft = Math.floor((timeUntilUnstake % 3600) / 60);
    console.log("   ⏳ Time Remaining:", hoursLeft, "hours", minutesLeft, "minutes");
  } else {
    console.log("   ✅ You can unstake NOW!");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 What Happens When You Unstake 1,500 DBBPT:");
  console.log("   1. System checks staking contract balance (1,000 DBBPT)");
  console.log("   2. Needs 1,500, but only has 1,000");
  console.log("   3. Automatically withdraws 500 DBBPT from yield strategy");
  console.log("   4. Staking contract now has: 1,000 + 500 = 1,500 DBBPT");
  console.log("   5. Transfers 1,500 DBBPT to you");
  console.log("   6. Done! ✅");
  console.log("\n   No manual steps needed - it's all automatic!");
}

main().catch(console.error);

