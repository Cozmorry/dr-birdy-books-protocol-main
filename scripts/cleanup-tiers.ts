import { ethers } from "hardhat";

/**
 * Clean up tiers - remove duplicates and keep only the 3 you need
 * This script removes all tiers and adds back only the ones you want
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  
  console.log("🧹 Cleaning Up Tiers\n");
  const currentCount = await staking.getTierCount();
  console.log("Current tiers:", currentCount.toString());
  console.log("");

  // Remove all existing tiers (remove from end to avoid index shifting)
  console.log("🗑️  Removing existing tiers...");
  const count = Number(currentCount);
  for (let i = count - 1; i >= 0; i--) {
    try {
      const tx = await staking.removeTier(i);
      await tx.wait();
      console.log(`   ✅ Removed tier ${i}`);
    } catch (error: any) {
      console.log(`   ⚠️  Error removing tier ${i}:`, error.message.substring(0, 100));
    }
  }
  
  console.log("\n✅ All tiers removed");
  console.log("\n📝 Adding your 3 content tiers...\n");
  
  // Add your 3 tiers for content unlocking
  // Adjust these values to match your needs!
  const yourTiers = [
    { threshold: ethers.parseUnits("24", 8), name: "Tier 1" },    // $24
    { threshold: ethers.parseUnits("50", 8), name: "Tier 2" },    // $50
    { threshold: ethers.parseUnits("1000", 8), name: "Tier 3" },    // $1000
  ];
  
  for (let i = 0; i < yourTiers.length; i++) {
    const tier = yourTiers[i];
    const tx = await staking.addTier(tier.threshold, tier.name);
    await tx.wait();
    console.log(`✅ Added ${tier.name}: $${Number(tier.threshold) / 1e8}`);
  }
  
  console.log("\n📊 Final Tier List:");
  const finalCount = await staking.getTierCount();
  const finalCountNum = Number(finalCount);
  for (let i = 0; i < finalCountNum; i++) {
    const tier = await staking.getTier(i);
    const thresholdUsd = Number(tier.threshold) / 1e8;
    console.log(`   Tier ${i}: ${tier.name} ($${thresholdUsd})`);
  }
  
  console.log("\n✅ Tier cleanup complete!");
  console.log("\n💡 You can modify these tiers anytime using:");
  console.log("   - staking.addTier(threshold, name)");
  console.log("   - staking.updateTier(index, newThreshold, newName)");
  console.log("   - staking.removeTier(index)");
}

main().catch(console.error);

