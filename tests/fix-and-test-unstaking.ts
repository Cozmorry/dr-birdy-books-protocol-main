import { ethers } from "hardhat";

/**
 * Get current strategy and exclude it, then test unstaking
 */
async function main() {
  const STAKING_ADDRESS = "0x43617f658e99Ca8Bd754d2Db4C0e08Ad25Eed1cb";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔧 Final Fix: Exclude Strategy and Test\n");
  console.log("=".repeat(60));

  // Get current strategy
  const [strategy] = await staking.getYieldInfo();
  console.log("Strategy Address:", strategy);

  if (strategy !== ethers.ZeroAddress) {
    // Exclude strategy
    console.log("\n1. Excluding strategy from fees...");
    try {
      const excludeTx = await token.excludeFromFee(strategy, true);
      await excludeTx.wait();
      console.log("   ✅ Strategy excluded");
    } catch (error: any) {
      console.log("   ⚠️  Error:", error.message);
    }
  }

  // Exclude staking contract
  console.log("\n2. Excluding staking contract from fees...");
  try {
    const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
    await excludeTx.wait();
    console.log("   ✅ Staking contract excluded");
  } catch (error: any) {
    console.log("   ⚠️  Error:", error.message);
  }

  // Check balances
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = strategy !== ethers.ZeroAddress 
    ? await token.balanceOf(strategy) 
    : 0n;

  console.log("\n3. Current Balances:");
  console.log("   User Staked:", ethers.formatEther(userStaked), "DBBPT");
  console.log("   Staking Contract:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy:", ethers.formatEther(strategyBalance), "DBBPT");

  // Try unstaking
  if (userStaked > 0n) {
    const unstakeAmount = ethers.parseEther("1");
    console.log("\n4. Testing unstake of", ethers.formatEther(unstakeAmount), "DBBPT...");
    
    try {
      const signers = await ethers.getSigners();
      const userSigner = signers.find(s => s.address.toLowerCase() === USER_ADDRESS.toLowerCase()) || signers[0];
      const userStaking = staking.connect(userSigner);
      
      const unstakeTx = await userStaking.unstake(unstakeAmount);
      const receipt = await unstakeTx.wait();
      console.log("   ✅ Unstaking SUCCESS!");
      console.log("   Transaction hash:", receipt.hash);
      console.log("   Gas used:", receipt.gasUsed.toString());
      
      // Check final state
      const finalStaked = await staking.userStakedTokens(USER_ADDRESS);
      console.log("\n5. Final State:");
      console.log("   User staked:", ethers.formatEther(finalStaked), "DBBPT");
      console.log("   ✅ Unstaking works!");
      
    } catch (error: any) {
      console.log("   ❌ Unstaking FAILED");
      console.log("   Error:", error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

