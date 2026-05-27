import { ethers } from "hardhat";

/**
 * Test withdrawal directly from strategy
 */
async function main() {
  const STAKING_ADDRESS = "0xa8568f2b6d06A4b2E92093e73C81759942ECd698";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Testing Yield Withdrawal\n");
  console.log("=".repeat(60));

  const [strategy, deployedShares] = await staking.getYieldInfo();
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = await token.balanceOf(strategy);

  console.log("📊 Current State:");
  console.log("   Staking Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy Balance:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  // Check if strategy is excluded
  try {
    const isExcluded = await token.isExcludedFromFee(strategy);
    console.log("\n🔒 Strategy excluded from fees:", isExcluded);
    if (!isExcluded) {
      console.log("   🔧 Excluding...");
      await token.excludeFromFee(strategy, true);
      console.log("   ✅ Excluded");
    }
  } catch (e) {
    console.log("\n⚠️  Could not check exclusion");
  }

  // Try to manually withdraw using owner function
  if (deployedShares > 0n) {
    const withdrawAmount = ethers.parseEther("1");
    console.log("\n💰 Testing manual withdrawal of", ethers.formatEther(withdrawAmount), "DBBPT...");
    
    try {
      const [deployer] = await ethers.getSigners();
      // Use owner function to withdraw
      const withdrawTx = await staking.connect(deployer).withdrawFromYield(withdrawAmount);
      await withdrawTx.wait();
      console.log("   ✅ Manual withdrawal SUCCESS!");
      
      // Check balances after
      const stakingBalanceAfter = await token.balanceOf(STAKING_ADDRESS);
      const strategyBalanceAfter = await token.balanceOf(strategy);
      console.log("\n📊 After Withdrawal:");
      console.log("   Staking Balance:", ethers.formatEther(stakingBalanceAfter), "DBBPT");
      console.log("   Strategy Balance:", ethers.formatEther(strategyBalanceAfter), "DBBPT");
      
      // Now try unstaking
      const userStaked = await staking.userStakedTokens(USER_ADDRESS);
      if (userStaked > 0n) {
        const unstakeAmount = ethers.parseEther("1");
        console.log("\n🧪 Testing unstake of", ethers.formatEther(unstakeAmount), "DBBPT...");
        
        const signers = await ethers.getSigners();
        const userSigner = signers.find(s => s.address.toLowerCase() === USER_ADDRESS.toLowerCase()) || signers[0];
        
        try {
          const unstakeTx = await staking.connect(userSigner).unstake(unstakeAmount);
          const receipt = await unstakeTx.wait();
          console.log("   ✅ Unstaking SUCCESS!");
          console.log("   Transaction hash:", receipt.hash);
        } catch (error: any) {
          console.log("   ❌ Unstaking FAILED:", error.message);
        }
      }
      
    } catch (error: any) {
      console.log("   ❌ Manual withdrawal FAILED");
      console.log("   Error:", error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

