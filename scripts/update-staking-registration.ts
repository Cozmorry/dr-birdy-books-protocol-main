import { ethers } from "hardhat";

/**
 * Update staking contract registration in token contract
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const NEW_STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("📋 Updating staking contract registration...");
  console.log("   Old staking:", await token.stakingContract());
  console.log("   New staking:", NEW_STAKING_ADDRESS);
  console.log("");

  // The token has a check to prevent changing if already set
  // Let's check if we can change it
  const currentStaking = await token.stakingContract();
  
  if (currentStaking === NEW_STAKING_ADDRESS) {
    console.log("✅ Already set to new address!");
  } else {
    console.log("Attempting to update...");
    try {
      const tx = await token.setStakingContract(NEW_STAKING_ADDRESS);
      await tx.wait();
      console.log("✅ Updated!");
    } catch (error: any) {
      console.log("❌ Cannot update - staking contract already set");
      console.log("   This is a security feature in the token contract");
      console.log("");
      console.log("⚠️ WORKAROUND: We'll need to use the old staking contract");
      console.log("   Or deploy a new token contract for mainnet");
    }
  }
}

main().catch(console.error);

