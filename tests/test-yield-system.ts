import { ethers } from "hardhat";

/**
 * Test yield generation system on testnet
 * Tests manual deployment, withdrawal, and automatic yield deployment
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🧪 Testing Yield System on Testnet\n");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Contract addresses
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const STRATEGY_ADDRESS = "0x763Bfb8752B96bd5Bd2229a08370C1333Fbfc3F1";

  // Get contract instances
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);

  console.log("📋 Contract Addresses:");
  console.log("   Token:", TOKEN_ADDRESS);
  console.log("   Staking:", STAKING_ADDRESS);
  console.log("   Strategy:", STRATEGY_ADDRESS);
  console.log("");

  // ==================== TEST 1: Check Initial State ====================
  console.log("=" .repeat(60));
  console.log("TEST 1: Check Initial State");
  console.log("=" .repeat(60));

  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("Your token balance:", ethers.formatEther(deployerBalance), "DBBPT");

  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  console.log("Staking contract balance:", ethers.formatEther(stakingBalance), "DBBPT");

  let yieldInfo = await staking.getYieldInfo();
  console.log("\nYield Info:");
  console.log("   Strategy:", yieldInfo.strategyAddress);
  console.log("   Deployed Shares:", yieldInfo.deployedShares.toString());
  console.log("   Total Value:", ethers.formatEther(yieldInfo.totalValue), "DBBPT");
  console.log("   Yield Enabled:", await staking.yieldEnabled());
  console.log("");

  // ==================== TEST 2: Stake Tokens ====================
  console.log("=" .repeat(60));
  console.log("TEST 2: Stake Tokens (without yield enabled)");
  console.log("=" .repeat(60));

  const stakeAmount = ethers.parseEther("1000"); // Stake 1000 tokens
  console.log("Staking", ethers.formatEther(stakeAmount), "DBBPT...");

  // Approve
  const approveTx = await token.approve(STAKING_ADDRESS, stakeAmount);
  await approveTx.wait();
  console.log("   ✅ Approved");

  // Stake
  const stakeTx = await staking.stake(stakeAmount);
  await stakeTx.wait();
  console.log("   ✅ Staked");

  const newStakingBalance = await token.balanceOf(STAKING_ADDRESS);
  console.log("   New staking balance:", ethers.formatEther(newStakingBalance), "DBBPT");
  console.log("");

  // ==================== TEST 3: Enable Yield ====================
  console.log("=" .repeat(60));
  console.log("TEST 3: Enable Yield Generation");
  console.log("=" .repeat(60));

  const enableTx = await staking.setYieldEnabled(true);
  await enableTx.wait();
  console.log("✅ Yield enabled!");
  console.log("");

  // ==================== TEST 4: Manual Deploy to Yield ====================
  console.log("=" .repeat(60));
  console.log("TEST 4: Manually Deploy to Yield");
  console.log("=" .repeat(60));

  const deployAmount = ethers.parseEther("500"); // Deploy 500 tokens
  console.log("Deploying", ethers.formatEther(deployAmount), "DBBPT to yield...");

  try {
    const deployTx = await staking.deployToYield(deployAmount);
    const receipt = await deployTx.wait();
    console.log("   ✅ Deployed to yield!");
    
    // Check for YieldDeposited event
    const depositEvent = receipt?.logs.find((log: any) => {
      try {
        return staking.interface.parseLog(log)?.name === "YieldDeposited";
      } catch {
        return false;
      }
    });
    
    if (depositEvent) {
      const parsed = staking.interface.parseLog(depositEvent);
      console.log("   Amount:", ethers.formatEther(parsed?.args.amount), "DBBPT");
      console.log("   Shares:", parsed?.args.shares.toString());
    }
  } catch (error: any) {
    console.log("   ❌ Error:", error.message);
  }

  yieldInfo = await staking.getYieldInfo();
  console.log("\nUpdated Yield Info:");
  console.log("   Deployed Shares:", yieldInfo.deployedShares.toString());
  console.log("   Total Value:", ethers.formatEther(yieldInfo.totalValue), "DBBPT");
  
  const strategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  console.log("   Strategy Token Balance:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("");

  // ==================== TEST 5: Withdraw from Yield ====================
  console.log("=" .repeat(60));
  console.log("TEST 5: Withdraw from Yield");
  console.log("=" .repeat(60));

  const withdrawShares = ethers.parseEther("250"); // Withdraw 250 shares
  console.log("Withdrawing", ethers.formatEther(withdrawShares), "shares from yield...");

  try {
    const withdrawTx = await staking.withdrawFromYield(withdrawShares);
    const receipt = await withdrawTx.wait();
    console.log("   ✅ Withdrawn from yield!");
    
    // Check for YieldWithdrawn event
    const withdrawEvent = receipt?.logs.find((log: any) => {
      try {
        return staking.interface.parseLog(log)?.name === "YieldWithdrawn";
      } catch {
        return false;
      }
    });
    
    if (withdrawEvent) {
      const parsed = staking.interface.parseLog(withdrawEvent);
      console.log("   Shares:", parsed?.args.shares.toString());
      console.log("   Amount:", ethers.formatEther(parsed?.args.amount), "DBBPT");
    }
  } catch (error: any) {
    console.log("   ❌ Error:", error.message);
  }

  yieldInfo = await staking.getYieldInfo();
  console.log("\nUpdated Yield Info:");
  console.log("   Deployed Shares:", yieldInfo.deployedShares.toString());
  console.log("   Total Value:", ethers.formatEther(yieldInfo.totalValue), "DBBPT");
  
  const newStrategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  console.log("   Strategy Token Balance:", ethers.formatEther(newStrategyBalance), "DBBPT");
  console.log("");

  // ==================== TEST 6: Stake More (Auto Deploy) ====================
  console.log("=" .repeat(60));
  console.log("TEST 6: Stake More Tokens (should auto-deploy to yield)");
  console.log("=" .repeat(60));

  const moreStake = ethers.parseEther("500");
  console.log("Staking", ethers.formatEther(moreStake), "DBBPT...");

  const approve2Tx = await token.approve(STAKING_ADDRESS, moreStake);
  await approve2Tx.wait();

  const stake2Tx = await staking.stake(moreStake);
  const receipt2 = await stake2Tx.wait();
  console.log("   ✅ Staked");

  // Check for YieldDeposited event (auto-deploy)
  const autoDepositEvent = receipt2?.logs.find((log: any) => {
    try {
      return staking.interface.parseLog(log)?.name === "YieldDeposited";
    } catch {
      return false;
    }
  });

  if (autoDepositEvent) {
    const parsed = staking.interface.parseLog(autoDepositEvent);
    console.log("   🎯 Auto-deployed to yield!");
    console.log("   Amount:", ethers.formatEther(parsed?.args.amount), "DBBPT");
    console.log("   Shares:", parsed?.args.shares.toString());
  } else {
    console.log("   ⚠️ No auto-deploy detected (may be at limit)");
  }

  yieldInfo = await staking.getYieldInfo();
  console.log("\nFinal Yield Info:");
  console.log("   Deployed Shares:", yieldInfo.deployedShares.toString());
  console.log("   Total Value:", ethers.formatEther(yieldInfo.totalValue), "DBBPT");
  console.log("");

  // ==================== SUMMARY ====================
  console.log("=" .repeat(60));
  console.log("SUMMARY");
  console.log("=" .repeat(60));
  
  const userStake = await staking.userStakedTokens(deployer.address);
  const finalStakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const finalStrategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  
  console.log("✅ Your Staked Amount:", ethers.formatEther(userStake), "DBBPT");
  console.log("✅ Staking Contract Balance:", ethers.formatEther(finalStakingBalance), "DBBPT");
  console.log("✅ Strategy Contract Balance:", ethers.formatEther(finalStrategyBalance), "DBBPT");
  console.log("✅ Deployed to Yield:", ethers.formatEther(yieldInfo.deployedShares), "DBBPT");
  console.log("");
  console.log("🎉 All tests completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

