import { ethers } from "hardhat";

/**
 * Quick verification
 */
async function main() {
  const STAKING_ADDRESS = "0xC93CfCBf7477A6FA6E8806b6D709e58B2bF60475";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  const override = await staking.minStakingDurationOverride();
  const [strategy] = await staking.getYieldInfo();

  console.log("✅ Unstaking Waiting Time Status\n");
  console.log("=".repeat(60));
  console.log("Override:", override.toString(), "seconds");
  console.log("Strategy:", strategy);
  
  if (override === 0n) {
    console.log("\n✅ Waiting time is DISABLED");
    console.log("   Users can unstake immediately after staking");
  } else {
    console.log("\n⚠️  Waiting time is ENABLED");
    console.log("   Override:", override.toString(), "seconds");
    console.log("   (0 = disabled, >0 = custom duration)");
  }
}

main().catch(console.error);

