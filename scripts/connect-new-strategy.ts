import { ethers } from "hardhat";

/**
 * Connect new strategy to staking contract
 */
async function main() {
  const NEW_STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const NEW_STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", NEW_STAKING_ADDRESS);

  console.log("⚙️ Connecting new strategy to staking...\n");
  console.log("   Staking:", NEW_STAKING_ADDRESS);
  console.log("   NEW Strategy:", NEW_STRATEGY_ADDRESS);
  console.log("");

  // Set new strategy
  console.log("1️⃣ Setting new yield strategy...");
  const tx = await staking.setYieldStrategy(NEW_STRATEGY_ADDRESS);
  await tx.wait();
  console.log("✅ New strategy set!");

  // Verify
  const yieldInfo = await staking.getYieldInfo();
  console.log("\n📊 Yield Info:");
  console.log("   Strategy Address:", yieldInfo.strategyAddress);
  console.log("   Is Active:", yieldInfo.isActive);
  console.log("   Yield Enabled:", await staking.yieldEnabled());
  console.log("");

  console.log("✅ Ready to test yield!");
}

main().catch(console.error);

