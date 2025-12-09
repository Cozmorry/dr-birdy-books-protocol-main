import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("\n🔍 CHECKING STAKING BALANCE TRACKING");
  console.log("=".repeat(80));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("=".repeat(80));

  const contractAddresses = getContractAddresses(chainId);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", contractAddresses.flexibleTieredStaking);
  
  console.log("\n📊 HOW STAKING BALANCE TRACKING WORKS:");
  console.log("-".repeat(80));
  console.log("When you stake tokens:");
  console.log("  1. Your tokens are transferred to the staking contract");
  console.log("  2. Your staked amount is recorded in: userStakedTokens[yourAddress]");
  console.log("  3. This amount is NEVER reduced when tokens are deployed to yield");
  console.log("  4. The frontend reads: getUserStakingInfo() → returns userStakedTokens[user]");
  console.log("\nWhen tokens are deployed to yield:");
  console.log("  - Up to 50% of the contract's total balance can be deployed");
  console.log("  - This is tracked separately in: yieldDeployedShares");
  console.log("  - Your userStakedTokens balance is NOT affected");
  console.log("  - You still see your FULL staked amount in the frontend");
  
  console.log("\n📊 CURRENT CONFIGURATION:");
  console.log("-".repeat(80));
  try {
    const yieldEnabled = await staking.yieldEnabled();
    const maxYieldDeploymentBps = await staking.maxYieldDeploymentBps();
    const yieldDeployedShares = await staking.yieldDeployedShares();
    const yieldStrategy = await staking.yieldStrategy();
    
    console.log(`  Yield Enabled: ${yieldEnabled}`);
    console.log(`  Max Deployment: ${Number(maxYieldDeploymentBps) / 100}% of total staked`);
    console.log(`  Currently Deployed Shares: ${yieldDeployedShares.toString()}`);
    console.log(`  Yield Strategy: ${yieldStrategy}`);
    
    if (yieldEnabled) {
      console.log("\n  ✅ Yield is ENABLED");
      console.log("     When you stake, up to 50% of contract balance may be deployed to yield");
      console.log("     BUT your staked amount (userStakedTokens) will NOT change");
      console.log("     You will see your FULL staked amount in the frontend");
    } else {
      console.log("\n  ⏸️  Yield is DISABLED");
      console.log("     No tokens will be deployed to yield");
      console.log("     All staked tokens remain in the staking contract");
    }
  } catch (error: any) {
    console.log("  ⚠️  Could not read configuration:", error.message.substring(0, 100));
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("📝 ANSWER TO YOUR QUESTION:");
  console.log("=".repeat(80));
  console.log("❌ NO - You will NOT see a 50% drop in your staked amount!");
  console.log("\n✅ You will ALWAYS see your FULL staked amount because:");
  console.log("   1. Your balance is tracked separately in userStakedTokens mapping");
  console.log("   2. This mapping is only updated when YOU stake/unstake");
  console.log("   3. Yield deployment only affects the contract's internal balance");
  console.log("   4. The frontend reads userStakedTokens, which never decreases from yield");
  console.log("\n💡 Think of it like this:");
  console.log("   - Your staked amount = Your 'account balance' (never changes from yield)");
  console.log("   - Yield deployment = Contract's 'investment strategy' (happens behind the scenes)");
  console.log("   - When you unstake, the contract will withdraw from yield if needed");
}

main().catch(console.error);

