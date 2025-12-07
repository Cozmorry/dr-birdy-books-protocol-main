import { ethers } from "hardhat";

/**
 * Verify staking contract is excluded from fees
 */
async function main() {
  const STAKING_ADDRESS = "0x48466EdFD9935ad238F2354aF42D54f2fBeED509";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";

  const [deployer] = await ethers.getSigners();
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Checking Staking Contract Exclusion\n");
  console.log("=".repeat(60));

  // Check if excluded
  try {
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("Staking contract excluded from fees:", isExcluded);
    
    if (!isExcluded) {
      console.log("\n❌ NOT EXCLUDED - This will cause balance issues!");
      console.log("🔧 Excluding now...");
      const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
      await excludeTx.wait();
      console.log("✅ Staking contract now excluded from fees");
    } else {
      console.log("✅ Already excluded from fees");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check exclusion");
    console.log("   Trying to exclude anyway...");
    try {
      const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
      await excludeTx.wait();
      console.log("✅ Excluded staking contract from fees");
    } catch (e: any) {
      console.log("❌ Could not exclude:", e.message);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

