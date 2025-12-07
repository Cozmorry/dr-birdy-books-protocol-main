import { ethers } from "hardhat";

/**
 * Fix strategy exclusion and test unstaking
 */
async function main() {
  const STAKING_ADDRESS = "0x48466EdFD9935ad238F2354aF42D54f2fBeED509";
  const STRATEGY_ADDRESS = "0xba274Fa2656D81Edc901bA8fE0f1a57C41a64550";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("🔧 Fixing Strategy Exclusion\n");
  console.log("=".repeat(60));

  // Exclude strategy from fees
  console.log("1. Excluding strategy from fees...");
  try {
    const excludeTx = await token.excludeFromFee(STRATEGY_ADDRESS, true);
    await excludeTx.wait();
    console.log("   ✅ Strategy excluded from fees");
  } catch (error: any) {
    console.log("   ⚠️  Error:", error.message);
  }

  // Check balances
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);

  console.log("\n2. Current Balances:");
  console.log("   User Staked:", ethers.formatEther(userStaked), "DBBPT");
  console.log("   Staking Contract:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy:", ethers.formatEther(strategyBalance), "DBBPT");

  // Try to manually withdraw from strategy to staking contract
  if (strategyBalance > 0n && stakingBalance < userStaked) {
    const needed = userStaked - stakingBalance;
    const withdrawAmount = needed < strategyBalance ? needed : strategyBalance;
    
    console.log("\n3. Manually withdrawing", ethers.formatEther(withdrawAmount), "DBBPT from strategy...");
    try {
      const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);
      // We can't call withdraw directly, but we can check if it would work
      console.log("   ⚠️  Cannot withdraw directly (only staking contract can)");
      console.log("   💡 The _withdrawFromYieldIfNeeded should handle this");
    } catch (error: any) {
      console.log("   ❌ Error:", error.message);
    }
  }

  // Test unstaking
  if (userStaked > 0n) {
    const testAmount = ethers.parseEther("1");
    console.log("\n4. Testing unstake of", ethers.formatEther(testAmount), "DBBPT...");
    
    try {
      const userStaking = staking.connect(await ethers.getSigner(USER_ADDRESS));
      await userStaking.unstake.staticCall(testAmount);
      console.log("   ✅ Unstaking would succeed");
    } catch (error: any) {
      console.log("   ❌ Unstaking would fail");
      console.log("   Error:", error.message);
      
      // Check if it's a balance issue
      if (error.message.includes("Token transfer failed") || error.message.includes("Insufficient balance")) {
        console.log("\n   💡 The issue is in transferForUnstaking");
        console.log("   💡 It checks staking contract balance, but tokens are in strategy");
        console.log("   💡 _withdrawFromYieldIfNeeded should withdraw them first");
      }
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

