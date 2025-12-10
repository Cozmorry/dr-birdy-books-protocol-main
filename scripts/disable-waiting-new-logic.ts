import { ethers } from "hardhat";

/**
 * Disable waiting time with new logic
 */
async function main() {
  const STAKING_ADDRESS = "0xa8568f2b6d06A4b2E92093e73C81759942ECd698";
  const STRATEGY_ADDRESS = "0x0000000000000000000000000000000000000000"; // Will be set

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  // Get strategy address
  const [strategy] = await staking.getYieldInfo();
  console.log("🔧 Setting up waiting time override\n");
  console.log("Strategy:", strategy);

  // Update strategy if needed
  if (strategy === ethers.ZeroAddress) {
    console.log("⚠️  Strategy not set, skipping...");
  }

  // Enable override with 0 seconds (no waiting)
  console.log("\n⏱️  Enabling override with 0 seconds (no waiting)...");
  const setOverrideTx = await staking.setMinStakingDurationOverride(0, true);
  await setOverrideTx.wait();
  console.log("✅ Override enabled with 0 seconds");

  // Verify
  const override = await staking.minStakingDurationOverride();
  const enabled = await staking.minStakingDurationOverrideEnabled();

  console.log("\n✅ Verification:");
  console.log("   Override Value:", override.toString(), "seconds");
  console.log("   Override Enabled:", enabled);

  if (enabled && override === 0n) {
    console.log("\n✅ Waiting time is DISABLED!");
    console.log("   Users can unstake immediately after staking");
  } else {
    console.log("\n⚠️  Waiting time status unclear");
  }
}

main().catch(console.error);

