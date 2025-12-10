import { ethers } from "hardhat";

/**
 * Check balances and test yield withdrawal
 */
async function main() {
  const STAKING_ADDRESS = "0x43617f658e99Ca8Bd754d2Db4C0e08Ad25Eed1cb";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Balance Check for Unstaking\n");
  console.log("=".repeat(60));

  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const [strategy, deployedShares] = await staking.getYieldInfo();
  const strategyBalance = strategy !== ethers.ZeroAddress 
    ? await token.balanceOf(strategy) 
    : 0n;

  console.log("📊 Current State:");
  console.log("   User Staked:", ethers.formatEther(userStaked), "DBBPT");
  console.log("   Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy Balance:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  const totalAvailable = stakingBalance + strategyBalance;
  console.log("\n🧮 Analysis:");
  console.log("   Total Available:", ethers.formatEther(totalAvailable), "DBBPT");
  console.log("   User Wants to Unstake:", ethers.formatEther(userStaked), "DBBPT");

  if (stakingBalance >= userStaked) {
    console.log("   ✅ Staking contract has enough - no withdrawal needed");
  } else {
    const needed = userStaked - stakingBalance;
    console.log("   ⚠️  Need", ethers.formatEther(needed), "DBBPT from strategy");
    console.log("   Strategy has:", ethers.formatEther(strategyBalance), "DBBPT");
    
    if (strategyBalance >= needed) {
      console.log("   ✅ Strategy has enough");
    } else {
      console.log("   ❌ Strategy doesn't have enough!");
    }
  }

  // Check if staking contract is excluded
  try {
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("\n🔒 Staking contract excluded from fees:", isExcluded);
    if (!isExcluded) {
      console.log("   ❌ NOT EXCLUDED - This will cause transfer failures!");
    }
  } catch (e) {
    console.log("\n⚠️  Could not check exclusion");
  }

  // Try a small unstake to see the exact error
  const testAmount = ethers.parseEther("0.1");
  if (userStaked >= testAmount) {
    console.log("\n🧪 Testing unstake of", ethers.formatEther(testAmount), "DBBPT...");
    try {
      const signers = await ethers.getSigners();
      const userSigner = signers.find(s => s.address.toLowerCase() === USER_ADDRESS.toLowerCase()) || signers[0];
      const userStaking = staking.connect(userSigner);
      
      await userStaking.unstake.staticCall(testAmount);
      console.log("   ✅ Would succeed");
    } catch (error: any) {
      console.log("   ❌ Would fail:", error.message);
      
      if (error.message.includes("Insufficient balance")) {
        console.log("   💡 The balance check is failing");
        console.log("   💡 _withdrawFromYieldIfNeeded might not be working");
      }
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

