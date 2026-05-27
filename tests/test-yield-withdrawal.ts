import { ethers } from "hardhat";

/**
 * Test yield withdrawal
 */
async function main() {
  const STAKING_ADDRESS = "0x48466EdFD9935ad238F2354aF42D54f2fBeED509";
  const STRATEGY_ADDRESS = "0xba274Fa2656D81Edc901bA8fE0f1a57C41a64550";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🧪 Testing Yield Withdrawal\n");
  console.log("=".repeat(60));

  // Check balances
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  const [strategyAddr, deployedShares] = await staking.getYieldInfo();

  console.log("📊 Current State:");
  console.log("   Staking Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy Balance:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  // Check if strategy is excluded
  try {
    const isExcluded = await token.isExcludedFromFee(STRATEGY_ADDRESS);
    console.log("\n🔒 Strategy excluded from fees:", isExcluded);
  } catch (e) {
    console.log("\n⚠️  Could not check strategy exclusion");
  }

  // Try to manually withdraw from strategy
  if (deployedShares > 0n) {
    const withdrawAmount = deployedShares > ethers.parseEther("1") ? ethers.parseEther("1") : deployedShares;
    console.log("\n🧪 Testing manual withdrawal of", ethers.formatEther(withdrawAmount), "DBBPT...");
    
    try {
      // This should be called by the staking contract
      const withdrawTx = await strategy.withdraw.staticCall(withdrawAmount);
      console.log("   ✅ Withdrawal would succeed");
    } catch (error: any) {
      console.log("   ❌ Withdrawal would fail");
      console.log("   Error:", error.message);
      
      if (error.message.includes("Only staking contract")) {
        console.log("   💡 This is expected - only staking contract can withdraw");
      }
    }

    // Test as staking contract
    console.log("\n🧪 Testing withdrawal as staking contract...");
    try {
      const stakingAsStrategy = strategy.connect(staking);
      const result = await stakingAsStrategy.withdraw.staticCall(withdrawAmount);
      console.log("   ✅ Withdrawal as staking contract would succeed");
      console.log("   Would return:", ethers.formatEther(result), "DBBPT");
    } catch (error: any) {
      console.log("   ❌ Withdrawal failed:", error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

