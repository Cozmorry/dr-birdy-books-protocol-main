import { ethers } from "hardhat";

/**
 * Fix TreasuryYieldStrategy to point to new staking contract
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  const NEW_STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const STRATEGY_ADDRESS = "0x763Bfb8752B96bd5Bd2229a08370C1333Fbfc3F1";

  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);

  console.log("📋 Fixing strategy staking contract registration...");
  console.log("   Strategy:", STRATEGY_ADDRESS);
  console.log("   Old staking:", await strategy.stakingContract());
  console.log("   New staking:", NEW_STAKING_ADDRESS);
  console.log("");

  // Check if we can update (depends on strategy implementation)
  console.log("Attempting to update...");
  try {
    const tx = await strategy.setStakingContract(NEW_STAKING_ADDRESS);
    await tx.wait();
    console.log("✅ Updated!");
    
    console.log("Verified:", await strategy.stakingContract());
  } catch (error: any) {
    console.log("❌ Error:", error.message.substring(0, 150));
    console.log("");
    console.log("   The strategy may have already been set");
    console.log("   Check TreasuryYieldStrategy.sol for setStakingContract requirements");
  }
}

main().catch(console.error);

