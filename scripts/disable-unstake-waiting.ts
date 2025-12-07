import { ethers } from "hardhat";

/**
 * Disable unstaking waiting time for testing
 */
async function main() {
  const STAKING_ADDRESS = "0x1D8CFeFc697b6CE93BF2304C5035922Bb2557e88";

  const [deployer] = await ethers.getSigners();
  console.log("⏱️  Disabling Unstaking Waiting Time\n");
  console.log("Deployer:", deployer.address);

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  // Check current override
  const currentOverride = await staking.minStakingDurationOverride();
  console.log("Current override:", currentOverride.toString(), "seconds");

  // Set to 0 to disable waiting time
  console.log("\n🔧 Setting override to 0 (no waiting time)...");
  const setTx = await staking.setMinStakingDurationOverride(0);
  await setTx.wait();
  console.log("✅ Override set to 0");

  // Verify
  const newOverride = await staking.minStakingDurationOverride();
  console.log("New override:", newOverride.toString(), "seconds");

  if (newOverride === 0n) {
    console.log("\n✅ Unstaking waiting time is now DISABLED");
    console.log("   Users can unstake immediately after staking");
  } else {
    console.log("\n❌ Failed to set override");
  }

  console.log("\n💡 To re-enable waiting time, set override to 0 (uses default 1 day)");
  console.log("   Or set a custom duration in seconds");
}

main().catch(console.error);

