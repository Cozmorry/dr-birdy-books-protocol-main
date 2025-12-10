import { ethers } from "hardhat";

/**
 * Test unstaking with correct account
 */
async function main() {
  const STAKING_ADDRESS = "0x43617f658e99Ca8Bd754d2Db4C0e08Ad25Eed1cb";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🧪 Testing Unstaking\n");
  console.log("=".repeat(60));

  // Check override
  const override = await staking.minStakingDurationOverride();
  const enabled = await staking.minStakingDurationOverrideEnabled();
  console.log("⏱️  Waiting Time Override:");
  console.log("   Value:", override.toString(), "seconds");
  console.log("   Enabled:", enabled);

  // Get user's staked amount
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  console.log("\n👤 User Staked:", ethers.formatEther(userStaked), "DBBPT");

  if (userStaked === 0n) {
    console.log("⚠️  No tokens staked");
    return;
  }

  // Get stake timestamp
  const stakeTimestamp = await staking.stakeTimestamp(USER_ADDRESS);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceStake = currentTime - Number(stakeTimestamp);
  console.log("\n📅 Staking Info:");
  console.log("   Stake Timestamp:", new Date(Number(stakeTimestamp) * 1000).toLocaleString());
  console.log("   Time Since Stake:", timeSinceStake, "seconds");

  // Try to unstake
  const unstakeAmount = userStaked > ethers.parseEther("1") 
    ? ethers.parseEther("1") 
    : userStaked;

  console.log("\n💰 Attempting to unstake", ethers.formatEther(unstakeAmount), "DBBPT...");

  try {
    // Get signer for user address
    const signers = await ethers.getSigners();
    let userSigner = signers[0]; // Default to first signer
    
    // Try to find the user's signer
    for (const signer of signers) {
      if (signer.address.toLowerCase() === USER_ADDRESS.toLowerCase()) {
        userSigner = signer;
        break;
      }
    }

    const userStaking = staking.connect(userSigner);
    const unstakeTx = await userStaking.unstake(unstakeAmount);
    console.log("   Transaction sent:", unstakeTx.hash);
    
    const receipt = await unstakeTx.wait();
    console.log("   ✅ Unstaking SUCCESS!");
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Check final state
    const finalStaked = await staking.userStakedTokens(USER_ADDRESS);
    const finalBalance = await token.balanceOf(USER_ADDRESS);
    
    console.log("\n📊 Final State:");
    console.log("   User staked:", ethers.formatEther(finalStaked), "DBBPT");
    console.log("   User balance:", ethers.formatEther(finalBalance), "DBBPT");
    console.log("   ✅ Unstaking completed successfully!");

  } catch (error: any) {
    console.log("   ❌ Unstaking FAILED");
    console.log("   Error:", error.message);
    
    if (error.message.includes("Minimum staking duration")) {
      console.log("\n   💡 The waiting time check is still active!");
      console.log("   💡 Override might not be working correctly");
      console.log("   💡 Let me check the contract code...");
    } else if (error.message.includes("Insufficient balance")) {
      console.log("\n   💡 Balance issue - yield withdrawal might have failed");
    } else if (error.message.includes("Token transfer failed")) {
      console.log("\n   💡 Token transfer is failing");
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

