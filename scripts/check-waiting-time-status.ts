import { ethers } from "hardhat";

/**
 * Check unstaking waiting time status
 */
async function main() {
  const STAKING_ADDRESS = "0x0c2f1fb28A0b7f5Df733C2F3Ea1CD71be5720c9D";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("⏱️  Unstaking Waiting Time Status\n");
  console.log("=".repeat(60));

  try {
    const override = await staking.minStakingDurationOverride();
    console.log("Override Value:", override.toString(), "seconds");
    
    if (override === 0n) {
      console.log("\n✅ Waiting time is DISABLED (0 seconds)");
      console.log("   Users can unstake immediately after staking");
    } else {
      const hours = Number(override) / 3600;
      console.log("\n⚠️  Waiting time is ENABLED");
      console.log("   Duration:", hours, "hours");
      console.log("   (", override.toString(), "seconds)");
    }
  } catch (error: any) {
    console.log("❌ Error checking override:", error.message);
    console.log("   The function might not exist in this contract");
  }

  // Check the constant
  try {
    const MIN_STAKING_DURATION = await staking.MIN_STAKING_DURATION();
    const hours = Number(MIN_STAKING_DURATION) / 3600;
    console.log("\n📋 Default MIN_STAKING_DURATION:", hours, "hours");
    console.log("   (", MIN_STAKING_DURATION.toString(), "seconds)");
  } catch (error: any) {
    console.log("\n⚠️  Could not check MIN_STAKING_DURATION constant");
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

