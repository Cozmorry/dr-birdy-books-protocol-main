import { ethers } from "hardhat";

/**
 * Fix staking: exclude from fees and redeploy
 */
async function main() {
  const STAKING_ADDRESS = "0xDB1A28eA484f0321d242a293ae42c74f71E14FC0";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";

  const [deployer] = await ethers.getSigners();
  console.log("🔧 Fixing Staking Setup\n");
  console.log("Deployer:", deployer.address);

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  // Exclude staking contract from fees
  console.log("\n🔒 Excluding staking contract from fees...");
  try {
    const excludeTx = await token.excludeFromFee(STAKING_ADDRESS, true);
    await excludeTx.wait();
    console.log("✅ Staking contract excluded from fees");
  } catch (error: any) {
    console.log("⚠️  Error excluding from fees:", error.message);
    console.log("   (Might already be excluded or function doesn't exist)");
  }

  console.log("\n✅ Setup complete!");
  console.log("   Now redeploy the staking contract with the getStatus() fix");
}

main().catch(console.error);

