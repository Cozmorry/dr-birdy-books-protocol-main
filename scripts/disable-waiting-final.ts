import { ethers } from "hardhat";

/**
 * Disable waiting time on new staking contract
 */
async function main() {
  const STAKING_ADDRESS = "0xbacF51eF78c7C3A3d373F19bab031FFeE412C94e";
  const STRATEGY_ADDRESS = "0x2489Bb9FD6A57B0c0E8B2BD1404eebAEf2Ea8FF0";

  const [deployer] = await ethers.getSigners();
  console.log("🔧 Final Setup: Disable Waiting Time\n");
  console.log("Deployer:", deployer.address);

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  // Update strategy (in case it's not set)
  console.log("\n🔧 Updating yield strategy...");
  try {
    const setStrategyTx = await staking.setYieldStrategy(STRATEGY_ADDRESS);
    await setStrategyTx.wait();
    console.log("✅ Strategy updated");
  } catch (error: any) {
    if (error.message.includes("already set")) {
      console.log("✅ Strategy already set");
    } else {
      console.log("⚠️  Could not set strategy:", error.message);
    }
  }

  // Disable waiting time
  console.log("\n⏱️  Disabling unstaking waiting time...");
  const setOverrideTx = await staking.setMinStakingDurationOverride(0);
  await setOverrideTx.wait();
  console.log("✅ Waiting time disabled (set to 0)");

  // Verify
  const override = await staking.minStakingDurationOverride();
  const [strategy] = await staking.getYieldInfo();

  console.log("\n✅ Verification:");
  console.log("   Strategy:", strategy);
  console.log("   Override:", override.toString(), "seconds (0 = no waiting)");

  if (override === 0n) {
    console.log("\n✅ Waiting time is DISABLED!");
    console.log("   Users can unstake immediately after staking");
  } else {
    console.log("\n⚠️  Waiting time is still enabled");
  }
}

main().catch(console.error);

