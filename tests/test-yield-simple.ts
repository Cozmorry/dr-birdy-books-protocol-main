import { ethers } from "hardhat";

/**
 * Test yield generation - simplified version
 * Starting from current state with 1500 DBBPT already staked
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🧪 Testing Yield System (Simplified)\n");

  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const NEW_STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", NEW_STRATEGY_ADDRESS);

  // Check current state
  console.log("📊 Current State:");
  const userStake = await staking.userStakedTokens(deployer.address);
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = await token.balanceOf(NEW_STRATEGY_ADDRESS);
  
  console.log("   Your Staked:", ethers.formatEther(userStake), "DBBPT");
  console.log("   Staking Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy Balance:", ethers.formatEther(strategyBalance), "DBBPT");
  
  const yieldInfo = await staking.getYieldInfo();
  console.log("   Strategy Address:", yieldInfo.strategyAddress);
  console.log("   Yield Enabled:", await staking.yieldEnabled());
  console.log("   Deployed Shares:", yieldInfo.deployedShares.toString());
  console.log("");

  // TEST: Manual deployment
  console.log("🧪 TEST: Manually deploy 500 DBBPT to yield");
  const deployAmount = ethers.parseEther("500");
  
  try {
    const tx = await staking.deployToYield(deployAmount);
    const receipt = await tx.wait();
    console.log("✅ Deployment successful!");
    
    // Check events
    for (const log of receipt?.logs || []) {
      try {
        const parsed = staking.interface.parseLog(log);
        if (parsed?.name === "YieldDeposited") {
          console.log("   📈 YieldDeposited Event:");
          console.log("      Amount:", ethers.formatEther(parsed.args.amount), "DBBPT");
          console.log("      Shares:", ethers.formatEther(parsed.args.shares), "shares");
        }
      } catch {}
    }
  } catch (error: any) {
    console.log("❌ Error:", error.message.substring(0, 150));
  }

  // Check final state
  console.log("\n📊 Final State:");
  const newStrategyBalance = await token.balanceOf(NEW_STRATEGY_ADDRESS);
  const newYieldInfo = await staking.getYieldInfo();
  
  console.log("   Staking Balance:", ethers.formatEther(await token.balanceOf(STAKING_ADDRESS)), "DBBPT");
  console.log("   Strategy Balance:", ethers.formatEther(newStrategyBalance), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(newYieldInfo.deployedShares), "shares");
  console.log("");

  if (Number(newStrategyBalance) > 0) {
    console.log("🎉 SUCCESS! Yield deployment working!");
  } else {
    console.log("⚠️ No tokens deployed to strategy");
  }
}

main().catch(console.error);

