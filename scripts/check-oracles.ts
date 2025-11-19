import { ethers } from "hardhat";

async function main() {
  console.log("\n🔍 Checking oracle configuration...");

  const stakingAddress = "0xa9c456E11403A5B222A11eE0573c8BF54227cDe4";
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);

  try {
    const oracleInfo = await staking.getOracleInfo();
    console.log("\n📊 Current Oracle Info:");
    console.log("- Primary Oracle:", oracleInfo.primaryOracle);
    console.log("- Backup Oracle:", oracleInfo.backupOracle);
    console.log("- Gas Refund Reward:", ethers.formatEther(oracleInfo.currentGasRefundReward));

    // Test if oracles are working
    console.log("\n🧪 Testing oracle calls...");
    
    try {
      const primaryOracle = await ethers.getContractAt("MockPriceOracle", oracleInfo.primaryOracle);
      const primaryPrice = await primaryOracle.latestAnswer();
      console.log("✅ Primary oracle price:", primaryPrice.toString());
    } catch (err: any) {
      console.log("❌ Primary oracle error:", err.message);
    }

    try {
      const backupOracle = await ethers.getContractAt("MockPriceOracle", oracleInfo.backupOracle);
      const backupPrice = await backupOracle.latestAnswer();
      console.log("✅ Backup oracle price:", backupPrice.toString());
    } catch (err: any) {
      console.log("❌ Backup oracle error:", err.message);
    }

    // Check contract status
    const contractStatus = await staking.getContractStatus();
    console.log("\n📋 Contract Status:");
    console.log("- Is paused:", contractStatus.isPaused);
    console.log("- Staking token set:", contractStatus.stakingTokenSet);
    console.log("- Primary oracle set:", contractStatus.primaryOracleSet);
    console.log("- Backup oracle set:", contractStatus.backupOracleSet);
    console.log("- Tier count:", contractStatus.tierCount.toString());

  } catch (err: any) {
    console.error("❌ Error checking oracles:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
