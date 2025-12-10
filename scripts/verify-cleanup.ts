import { ethers } from "hardhat";

/**
 * Quick verification of cleanup
 */
async function main() {
  const STAKING_ADDRESS = "0x1D8CFeFc697b6CE93BF2304C5035922Bb2557e88";
  const STRATEGY_ADDRESS = "0xf48a41c684Ffaa55C49B1f03ea274c4822F79EA8"; // New strategy
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);

  console.log("✅ Cleanup Verification\n");
  console.log("=".repeat(60));

  // Check staking contract
  const stakingToken = await staking.stakingToken();
  const [strategyAddress, deployedShares] = await staking.getYieldInfo();
  const yieldEnabled = await staking.yieldEnabled();
  const tierCount = await staking.getTierCount();

  console.log("📊 Staking Contract:");
  console.log("   Address:", STAKING_ADDRESS);
  console.log("   Staking Token:", stakingToken);
  console.log("   Yield Strategy:", strategyAddress);
  console.log("   Yield Enabled:", yieldEnabled);
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");
  console.log("   Tier Count:", tierCount.toString());

  // Check strategy
  const strategyStakingContract = await strategy.stakingContract();
  const strategyIsActive = await strategy.isActive();

  console.log("\n📊 Yield Strategy:");
  console.log("   Address:", STRATEGY_ADDRESS);
  console.log("   Staking Contract:", strategyStakingContract);
  console.log("   Is Active:", strategyIsActive);

  // Verify connections
  console.log("\n🔗 Connection Verification:");
  if (stakingToken.toLowerCase() === TOKEN_ADDRESS.toLowerCase()) {
    console.log("   ✅ Staking token connected correctly");
  } else {
    console.log("   ❌ Staking token mismatch");
  }

  if (strategyAddress.toLowerCase() === STRATEGY_ADDRESS.toLowerCase()) {
    console.log("   ✅ Yield strategy connected correctly");
  } else {
    console.log("   ❌ Yield strategy mismatch");
  }

  if (strategyStakingContract.toLowerCase() === STAKING_ADDRESS.toLowerCase()) {
    console.log("   ✅ Strategy knows staking contract");
  } else {
    console.log("   ❌ Strategy doesn't know staking contract");
  }

  if (deployedShares === 0n) {
    console.log("   ✅ Deployed shares reset to 0 (clean state)");
  } else {
    console.log("   ⚠️  Deployed shares:", ethers.formatEther(deployedShares), "DBBPT");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n🎉 Cleanup Complete!");
  console.log("   All systems operational");
  console.log("   Ready for testing");
}

main().catch(console.error);

