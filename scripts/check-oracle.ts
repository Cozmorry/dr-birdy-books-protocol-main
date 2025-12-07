import { ethers } from "hardhat";

/**
 * Check oracle setup
 */
async function main() {
  const STAKING_ADDRESS = "0xC93CfCBf7477A6FA6E8806b6D709e58B2bF60475";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("🔍 Oracle Setup Check\n");
  console.log("=".repeat(60));

  try {
    const primaryOracle = await staking.primaryPriceOracle();
    console.log("Primary Oracle:", primaryOracle);
    
    if (primaryOracle === ethers.ZeroAddress) {
      console.log("❌ Primary oracle NOT SET!");
      console.log("   This is why staking is failing!");
    } else {
      console.log("✅ Primary oracle is set");
    }
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }

  try {
    const backupOracle = await staking.backupPriceOracle();
    console.log("\nBackup Oracle:", backupOracle);
  } catch (error: any) {
    console.log("⚠️  Could not check backup oracle");
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

