import { ethers } from "hardhat";

/**
 * Connect new strategy and disable waiting time
 */
async function main() {
  const STAKING_ADDRESS = "0xbacF51eF78c7C3A3d373F19bab031FFeE412C94e";
  const NEW_STRATEGY_ADDRESS = "0x0000000000000000000000000000000000000000"; // Will be set by deploy script

  const [deployer] = await ethers.getSigners();
  console.log("🔧 Final Setup\n");
  console.log("Deployer:", deployer.address);

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  // Update strategy
  console.log("\n🔧 Updating yield strategy...");
  const setStrategyTx = await staking.setYieldStrategy(NEW_STRATEGY_ADDRESS);
  await setStrategyTx.wait();
  console.log("✅ Strategy updated");

  // Disable waiting time
  console.log("\n⏱️  Disabling unstaking waiting time...");
  const setOverrideTx = await staking.setMinStakingDurationOverride(0);
  await setOverrideTx.wait();
  console.log("✅ Waiting time disabled (set to 0)");

  // Verify
  const [strategyAddress] = await staking.getYieldInfo();
  const override = await staking.minStakingDurationOverride();

  console.log("\n✅ Verification:");
  console.log("   Strategy:", strategyAddress);
  console.log("   Override:", override.toString(), "seconds (0 = no waiting)");

  if (strategyAddress.toLowerCase() === NEW_STRATEGY_ADDRESS.toLowerCase() && override === 0n) {
    console.log("\n✅ All set! Unstaking waiting time is disabled.");
  }
}

main().catch(console.error);

