import { ethers } from "hardhat";

/**
 * Debug unstaking balance issue
 */
async function main() {
  const STAKING_ADDRESS = "0x48466EdFD9935ad238F2354aF42D54f2fBeED509";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STRATEGY_ADDRESS = "0xba274Fa2656D81Edc901bA8fE0f1a57C41a64550";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Unstaking Balance Debug\n");
  console.log("=".repeat(60));

  // Check user's staked amount
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  console.log("👤 User Staked:", ethers.formatEther(userStaked), "DBBPT");

  // Check staking contract balance
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  console.log("📦 Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");

  // Check strategy balance
  const strategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  console.log("💰 Strategy Balance:", ethers.formatEther(strategyBalance), "DBBPT");

  // Check deployed shares
  const [strategy, deployedShares] = await staking.getYieldInfo();
  console.log("\n📊 Yield Info:");
  console.log("   Strategy Address:", strategy);
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  // Calculate total available
  const totalAvailable = stakingBalance + strategyBalance;
  console.log("\n🧮 Balance Analysis:");
  console.log("   User wants to unstake:", ethers.formatEther(userStaked), "DBBPT");
  console.log("   Available in staking:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Available in strategy:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   Total available:", ethers.formatEther(totalAvailable), "DBBPT");

  if (userStaked > totalAvailable) {
    console.log("\n❌ PROBLEM: User staked more than total available!");
    console.log("   Missing:", ethers.formatEther(userStaked - totalAvailable), "DBBPT");
  } else if (stakingBalance < userStaked) {
    const needed = userStaked - stakingBalance;
    console.log("\n⚠️  Staking contract needs", ethers.formatEther(needed), "DBBPT from strategy");
    console.log("   Strategy has:", ethers.formatEther(strategyBalance), "DBBPT");
    
    if (strategyBalance >= needed) {
      console.log("   ✅ Strategy has enough - withdrawal should work");
    } else {
      console.log("   ❌ Strategy doesn't have enough!");
    }
  } else {
    console.log("\n✅ Staking contract has enough tokens");
  }

  // Test unstaking
  if (userStaked > 0n) {
    const testAmount = userStaked > ethers.parseEther("1") ? ethers.parseEther("1") : userStaked;
    console.log("\n🧪 Testing unstake of", ethers.formatEther(testAmount), "DBBPT...");
    
    try {
      const [deployer] = await ethers.getSigners();
      const userStaking = staking.connect(await ethers.getSigner(USER_ADDRESS));
      await userStaking.unstake.staticCall(testAmount);
      console.log("   ✅ Unstaking would succeed");
    } catch (error: any) {
      console.log("   ❌ Unstaking would fail");
      console.log("   Error:", error.message);
      
      if (error.message.includes("Insufficient balance")) {
        console.log("\n   💡 Issue: Insufficient balance in staking contract");
        console.log("   💡 Solution: Withdraw from yield strategy first");
      } else if (error.message.includes("Token transfer failed")) {
        console.log("\n   💡 Issue: Token transfer is failing");
        console.log("   💡 Check if staking contract is excluded from fees");
      }
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

