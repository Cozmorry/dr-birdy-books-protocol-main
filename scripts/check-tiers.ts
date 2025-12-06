import { ethers } from "hardhat";

/**
 * Check current tiers in the staking contract
 */
async function main() {
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  
  console.log("📊 Current Tiers in Staking Contract\n");
  console.log("=".repeat(60));
  
  // Get total number of tiers
  const tierCount = await staking.getTierCount();
  console.log(`Total Tiers: ${tierCount}\n`);
  
  // Get each tier
  for (let i = 0; i < tierCount; i++) {
    const tier = await staking.getTier(i);
    const thresholdUsd = Number(tier.threshold) / 1e8; // Convert from 8 decimals to USD
    console.log(`Tier ${i}:`);
    console.log(`   Name: ${tier.name}`);
    console.log(`   Threshold: $${thresholdUsd}`);
    console.log("");
  }
  
  console.log("=".repeat(60));
  console.log("\n💡 Note:");
  console.log("   - Users get access to the HIGHEST tier they qualify for");
  console.log("   - Tiers are used for content access control");
  console.log("   - You can add/remove/modify tiers as owner");
}

main().catch(console.error);

