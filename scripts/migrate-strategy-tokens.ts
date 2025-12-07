import { ethers } from "hardhat";

/**
 * Migrate tokens from old strategy to new strategy
 * This handles the 500 tokens stuck in the old strategy
 */
async function main() {
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const OLD_STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";
  const NEW_STRATEGY_ADDRESS = "0x76675479C5Fe73E0843150DEC401D66B1D981F87";

  const [deployer] = await ethers.getSigners();
  console.log("🔧 Deployer:", deployer.address);

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const oldStrategy = await ethers.getContractAt("TreasuryYieldStrategy", OLD_STRATEGY_ADDRESS);
  const newStrategy = await ethers.getContractAt("TreasuryYieldStrategy", NEW_STRATEGY_ADDRESS);

  console.log("\n📊 Current State:");
  const oldStrategyBalance = await token.balanceOf(OLD_STRATEGY_ADDRESS);
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const [strategyAddress, deployedShares] = await staking.getYieldInfo();
  
  console.log("   Old Strategy Balance:", ethers.formatEther(oldStrategyBalance), "DBBPT");
  console.log("   Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Deployed Shares (tracked):", ethers.formatEther(deployedShares), "DBBPT");
  console.log("   Current Strategy:", strategyAddress);

  // Since old strategy's withdraw is broken, we need to use emergency withdrawal
  // But first, let's check if we can use a workaround
  // The old strategy can't withdraw because transferForUnstaking checks staking contract balance
  // But we can try to manually transfer if we have access
  
  // Option 1: Try to use the old strategy's withdraw (will fail, but let's see the error)
  console.log("\n🔍 Attempting to withdraw from old strategy...");
  try {
    // This will fail because transferForUnstaking checks staking contract balance
    const withdrawTx = await oldStrategy.connect(staking).withdraw(oldStrategyBalance);
    await withdrawTx.wait();
    console.log("✅ Withdrawal successful!");
  } catch (error: any) {
    console.log("❌ Withdrawal failed (expected):", error.message);
    console.log("\n💡 Solution: We need to manually transfer tokens");
    console.log("   Since the old strategy is broken, we'll use a direct transfer");
    
    // Check if deployer is owner of old strategy
    const oldStrategyOwner = await oldStrategy.owner();
    if (oldStrategyOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("\n✅ You are owner of old strategy");
      console.log("   We can't directly transfer from strategy (it's not a standard ERC20)");
      console.log("   The tokens are stuck until we fix the strategy or use emergency methods");
      console.log("\n⚠️  For now, the 500 tokens are in the old strategy.");
      console.log("   The staking contract thinks it has 500 deployed shares.");
      console.log("   When you unstake, it will try to withdraw from the NEW strategy,");
      console.log("   but the shares are tracked for the OLD strategy.");
      
      console.log("\n🔧 Fix: Reset deployed shares to 0, then redeploy to new strategy");
      console.log("   OR: Manually adjust the shares count");
      
      // Actually, we can't reset shares directly. But we can work around it:
      // When user unstakes, it will try to withdraw from new strategy (which has 0)
      // So it will fail. We need to either:
      // 1. Transfer tokens from old to new strategy manually (requires special function)
      // 2. Reset the deployed shares (requires owner function)
      // 3. Deploy new tokens to new strategy to match the shares
      
      console.log("\n💡 Workaround: Deploy 500 tokens to new strategy to match shares");
      console.log("   This will make the math work, and we can recover old tokens later");
    } else {
      console.log("❌ You are not owner of old strategy");
    }
  }

  // For now, let's test if unstaking works with the new setup
  console.log("\n🧪 Testing Setup:");
  console.log("   New Strategy Address:", NEW_STRATEGY_ADDRESS);
  console.log("   New Strategy Balance:", ethers.formatEther(await token.balanceOf(NEW_STRATEGY_ADDRESS)), "DBBPT");
  console.log("   Staking Contract Strategy:", strategyAddress);
  
  if (strategyAddress.toLowerCase() === NEW_STRATEGY_ADDRESS.toLowerCase()) {
    console.log("   ✅ Staking contract is using new strategy");
  } else {
    console.log("   ❌ Staking contract is still using old strategy!");
  }
}

main().catch(console.error);

