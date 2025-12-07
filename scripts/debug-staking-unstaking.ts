import { ethers } from "hardhat";

/**
 * Debug staking issue
 */
async function main() {
  const STAKING_ADDRESS = "0x43617f658e99Ca8Bd754d2Db4C0e08Ad25Eed1cb";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Debugging Staking Issue\n");
  console.log("=".repeat(60));

  // Check if staking contract is excluded
  try {
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("1. Staking contract excluded from fees:", isExcluded);
  } catch (e) {
    console.log("1. ⚠️  Could not check exclusion");
  }

  // Check balances
  const userBalance = await token.balanceOf(USER_ADDRESS);
  console.log("\n2. User balance:", ethers.formatEther(userBalance), "DBBPT");

  // Check allowance
  const allowance = await token.allowance(USER_ADDRESS, STAKING_ADDRESS);
  console.log("3. Allowance:", ethers.formatEther(allowance), "DBBPT");

  // Try to stake with detailed error
  const stakeAmount = ethers.parseEther("1");
  console.log("\n4. Attempting to stake", ethers.formatEther(stakeAmount), "DBBPT...");

  try {
    // Approve first
    if (allowance < stakeAmount) {
      console.log("   Approving tokens...");
      const approveTx = await token.approve(STAKING_ADDRESS, stakeAmount);
      await approveTx.wait();
      console.log("   ✅ Approved");
    }

    // Try to stake
    const stakeTx = await staking.stake(stakeAmount);
    const receipt = await stakeTx.wait();
    console.log("   ✅ Staking SUCCESS!");
    console.log("   Transaction hash:", receipt.hash);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Check if it was recorded
    const userStaked = await staking.userStakedTokens(USER_ADDRESS);
    console.log("\n5. User staked amount:", ethers.formatEther(userStaked), "DBBPT");
    
    if (userStaked > 0n) {
      console.log("   ✅ Staking recorded correctly!");
      
      // Now try unstaking
      console.log("\n6. Testing unstaking...");
      const unstakeTx = await staking.unstake(userStaked);
      const unstakeReceipt = await unstakeTx.wait();
      console.log("   ✅ Unstaking SUCCESS!");
      console.log("   Transaction hash:", unstakeReceipt.hash);
      console.log("   Gas used:", unstakeReceipt.gasUsed.toString());
      
      // Check final balance
      const finalStaked = await staking.userStakedTokens(USER_ADDRESS);
      const finalBalance = await token.balanceOf(USER_ADDRESS);
      console.log("\n7. Final state:");
      console.log("   User staked:", ethers.formatEther(finalStaked), "DBBPT");
      console.log("   User balance:", ethers.formatEther(finalBalance), "DBBPT");
    } else {
      console.log("   ❌ Staking not recorded!");
    }

  } catch (error: any) {
    console.log("   ❌ Staking FAILED");
    console.log("   Error:", error.message);
    
    if (error.reason) {
      console.log("   Reason:", error.reason);
    }
    
    // Try static call to see the exact error
    try {
      await staking.stake.staticCall(stakeAmount);
    } catch (staticError: any) {
      console.log("\n   Static call error:", staticError.message);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

