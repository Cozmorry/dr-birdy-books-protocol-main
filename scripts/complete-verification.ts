import { ethers } from "hardhat";

/**
 * Complete verification of staking setup
 */
async function main() {
  const STAKING_ADDRESS = "0x48466EdFD9935ad238F2354aF42D54f2fBeED509";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("🔍 Complete Staking Setup Verification\n");
  console.log("=".repeat(60));

  // 1. Check exclusion
  console.log("1. Checking fee exclusion...");
  try {
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("   ✅ Excluded from fees:", isExcluded);
    if (!isExcluded) {
      console.log("   🔧 Excluding now...");
      const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
      await excludeTx.wait();
      console.log("   ✅ Now excluded");
    }
  } catch (error: any) {
    console.log("   ⚠️  Could not check, trying to exclude...");
    try {
      const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
      await excludeTx.wait();
      console.log("   ✅ Excluded");
    } catch (e) {
      console.log("   ❌ Failed to exclude");
    }
  }

  // 2. Check staking token
  console.log("\n2. Checking staking token...");
  const stakingToken = await staking.stakingToken();
  console.log("   ✅ Staking token:", stakingToken);
  if (stakingToken.toLowerCase() !== TOKEN_ADDRESS.toLowerCase()) {
    console.log("   ❌ MISMATCH!");
  }

  // 3. Check oracle
  console.log("\n3. Checking oracle...");
  const primaryOracle = await staking.primaryPriceOracle();
  console.log("   ✅ Primary oracle:", primaryOracle);

  // 4. Check waiting time
  console.log("\n4. Checking waiting time override...");
  const override = await staking.minStakingDurationOverride();
  const enabled = await staking.minStakingDurationOverrideEnabled();
  console.log("   ✅ Override value:", override.toString(), "seconds");
  console.log("   ✅ Override enabled:", enabled);
  if (enabled && override === 0n) {
    console.log("   ✅ Waiting time is DISABLED");
  }

  // 5. Test a small stake
  console.log("\n5. Testing staking transaction...");
  const testAmount = ethers.parseEther("1");
  const balance = await token.balanceOf(USER_ADDRESS);
  console.log("   User balance:", ethers.formatEther(balance), "DBBPT");
  
  if (balance >= testAmount) {
    try {
      // Approve
      const approveTx = await token.approve(STAKING_ADDRESS, testAmount);
      await approveTx.wait();
      console.log("   ✅ Approved");
      
      // Try to stake
      const stakeTx = await staking.stake(testAmount);
      const receipt = await stakeTx.wait();
      console.log("   ✅ Staking SUCCESS!");
      console.log("   Gas used:", receipt.gasUsed.toString());
    } catch (error: any) {
      console.log("   ❌ Staking FAILED:", error.message);
      if (error.reason) {
        console.log("   Reason:", error.reason);
      }
    }
  } else {
    console.log("   ⚠️  Insufficient balance for test");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   Staking:", STAKING_ADDRESS);
  console.log("   Token:", TOKEN_ADDRESS);
  console.log("\n💡 Make sure your frontend .env file uses these addresses!");
}

main().catch(console.error);

