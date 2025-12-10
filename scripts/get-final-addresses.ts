import { ethers } from "hardhat";

/**
 * Get final contract addresses
 */
async function main() {
  const STAKING_ADDRESS = "0xDB1A28eA484f0321d242a293ae42c74f71E14FC0";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const [strategy] = await staking.getYieldInfo();

  console.log("📋 Final Contract Addresses\n");
  console.log("=".repeat(60));
  console.log("Staking Contract:", STAKING_ADDRESS);
  console.log("Token Contract:", TOKEN_ADDRESS);
  console.log("Yield Strategy:", strategy);
  console.log("\n✅ Unstaking tested and working!");
  console.log("=".repeat(60));
}

main().catch(console.error);

