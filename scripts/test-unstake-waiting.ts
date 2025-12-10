import { ethers } from "hardhat";

/**
 * Test unstaking to verify waiting time is disabled
 */
async function main() {
  const STAKING_ADDRESS = "0xbacF51eF78c7C3A3d373F19bab031FFeE412C94e";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🧪 Testing Unstaking with Waiting Time Disabled\n");
  console.log("=".repeat(60));

  // Check user's staked amount
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  console.log("User Staked:", ethers.formatEther(userStaked), "DBBPT");

  if (userStaked === 0n) {
    console.log("\n⚠️  User has no staked tokens");
    console.log("   Staking some tokens first...");
    
    const stakeAmount = ethers.parseEther("10");
    await token.approve(STAKING_ADDRESS, stakeAmount);
    const stakeTx = await staking.stake(stakeAmount);
    await stakeTx.wait();
    console.log("✅ Staked", ethers.formatEther(stakeAmount), "DBBPT");
    
    // Check again
    const newStaked = await staking.userStakedTokens(USER_ADDRESS);
    console.log("New Staked Amount:", ethers.formatEther(newStaked), "DBBPT");
  }

  // Check stake timestamp
  const stakeTimestamp = await staking.stakeTimestamp(USER_ADDRESS);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceStake = currentTime - Number(stakeTimestamp);
  
  console.log("\n📅 Staking Info:");
  console.log("   Stake Timestamp:", new Date(Number(stakeTimestamp) * 1000).toLocaleString());
  console.log("   Current Time:", new Date(currentTime * 1000).toLocaleString());
  console.log("   Time Since Stake:", timeSinceStake, "seconds (", (timeSinceStake / 3600).toFixed(2), "hours)");

  // Check override
  const override = await staking.minStakingDurationOverride();
  console.log("\n⏱️  Waiting Time Override:", override.toString(), "seconds");
  
  // Calculate what duration is being used
  const MIN_STAKING_DURATION = await staking.MIN_STAKING_DURATION();
  const effectiveDuration = override > 0n ? override : MIN_STAKING_DURATION;
  console.log("   Effective Duration:", effectiveDuration.toString(), "seconds");
  
  if (effectiveDuration === 0n) {
    console.log("   ✅ No waiting required - can unstake immediately!");
  } else {
    const hours = Number(effectiveDuration) / 3600;
    console.log("   ⚠️  Waiting required:", hours, "hours");
  }

  // Try to unstake a small amount
  const unstakeAmount = ethers.parseEther("1");
  console.log("\n🧪 Testing unstake of", ethers.formatEther(unstakeAmount), "DBBPT...");
  
  try {
    // Use staticCall to simulate without actually executing
    const userStaking = staking.connect(await ethers.getSigner(USER_ADDRESS));
    await userStaking.unstake.staticCall(unstakeAmount);
    console.log("   ✅ Unstaking would succeed (no waiting time required)");
  } catch (error: any) {
    console.log("   ❌ Unstaking would fail");
    console.log("   Error:", error.message);
    
    if (error.message.includes("Minimum staking duration not met")) {
      console.log("\n   💡 The waiting time check is still active!");
      console.log("   This means the override might not be working correctly");
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

