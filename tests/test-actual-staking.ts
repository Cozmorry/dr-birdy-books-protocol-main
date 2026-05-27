import { ethers } from "hardhat";

/**
 * Check if staking contract is excluded and test actual staking
 */
async function main() {
  const STAKING_ADDRESS = "0x0c2f1fb28A0b7f5Df733C2F3Ea1CD71be5720c9D";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("🔍 Checking Staking Contract Exclusion\n");
  console.log("=".repeat(60));

  // Check exclusion using the _isExcludedFromFee mapping
  // We need to check the internal mapping
  try {
    // Try to call isExcludedFromFee if it exists
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("✅ Staking contract excluded from fees:", isExcluded);
    
    if (!isExcluded) {
      console.log("\n❌ PROBLEM: Staking contract is NOT excluded from fees!");
      console.log("   This will cause transferFrom to fail with reflection tokens");
      console.log("\n🔧 Fixing...");
      const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
      await excludeTx.wait();
      console.log("✅ Staking contract now excluded from fees");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check exclusion directly");
    console.log("   Trying to exclude anyway...");
    try {
      const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
      await excludeTx.wait();
      console.log("✅ Excluded staking contract from fees");
    } catch (e: any) {
      console.log("❌ Could not exclude:", e.message);
    }
  }

  // Now test actual staking with deployer's account
  console.log("\n🧪 Testing actual staking transaction...");
  const amount = ethers.parseEther("1"); // Small amount for testing
  
  // Approve first
  console.log("1. Approving tokens...");
  const approveTx = await token.approve(STAKING_ADDRESS, amount);
  await approveTx.wait();
  console.log("   ✅ Approved");

  // Try to stake
  console.log("\n2. Attempting to stake...");
  try {
    const stakeTx = await staking.stake(amount);
    const receipt = await stakeTx.wait();
    console.log("   ✅ Staking SUCCESS!");
    console.log("   Transaction hash:", receipt.hash);
    console.log("   Gas used:", receipt.gasUsed.toString());
  } catch (error: any) {
    console.log("   ❌ Staking FAILED");
    console.log("   Error:", error.message);
    
    if (error.reason) {
      console.log("   Reason:", error.reason);
    }
    if (error.data) {
      console.log("   Data:", error.data);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

