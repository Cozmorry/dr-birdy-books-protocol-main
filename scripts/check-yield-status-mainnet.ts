import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 CHECKING YIELD STRATEGY STATUS ON MAINNET");
  console.log("=".repeat(80));
  console.log("Network:", (await ethers.provider.getNetwork()).name, "Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("=".repeat(80));

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", contractAddresses.flexibleTieredStaking);

  console.log("\n📊 REFLECTIVE TOKEN YIELD CONFIG:");
  console.log("-".repeat(80));
  const yieldStrategyAddress = await token.yieldStrategy();
  const yieldStrategyFeeBps = await token.yieldStrategyFeeBps();
  
  console.log(`  Yield Strategy Address: ${yieldStrategyAddress}`);
  console.log(`  Yield Strategy Fee BPS: ${yieldStrategyFeeBps} (${Number(yieldStrategyFeeBps) / 100}%)`);
  
  if (yieldStrategyAddress === ethers.ZeroAddress) {
    console.log("\n  ❌ Yield strategy NOT configured on ReflectiveToken");
    console.log("     Marketing fees are going 100% to marketing wallet");
  } else {
    console.log("\n  ✅ Yield strategy IS configured on ReflectiveToken");
    console.log("     Marketing fees are split between yield strategy and marketing wallet");
    
    // Check if the strategy contract exists
    const code = await ethers.provider.getCode(yieldStrategyAddress);
    if (code === "0x") {
      console.log("  ⚠️  WARNING: Strategy address has no code (contract not deployed)");
    } else {
      console.log("  ✅ Strategy contract exists at address");
      
      try {
        const strategy = await ethers.getContractAt("TreasuryYieldStrategy", yieldStrategyAddress);
        const isActive = await strategy.isActive();
        const autoBuybackEnabled = await strategy.autoBuybackEnabled();
        const minBuybackAmount = await strategy.minBuybackAmount();
        const totalBurned = await strategy.totalBurned();
        
        console.log("\n  📋 Strategy Details:");
        console.log(`     Active: ${isActive}`);
        console.log(`     Auto-Buyback Enabled: ${autoBuybackEnabled}`);
        console.log(`     Min Buyback Amount: ${ethers.formatEther(minBuybackAmount)} ETH`);
        console.log(`     Total Tokens Burned: ${ethers.formatEther(totalBurned)} DBBPT`);
      } catch (error: any) {
        console.log("  ⚠️  Could not read strategy contract:", error.message.substring(0, 100));
      }
    }
  }

  console.log("\n📊 STAKING CONTRACT YIELD CONFIG:");
  console.log("-".repeat(80));
  try {
    const [stakingStrategyAddress, , , , stakingYieldEnabled] = await staking.getYieldInfo();
    console.log(`  Yield Strategy Address: ${stakingStrategyAddress}`);
    console.log(`  Yield Enabled: ${stakingYieldEnabled}`);
    
    if (stakingStrategyAddress === ethers.ZeroAddress) {
      console.log("\n  ❌ Yield strategy NOT configured on FlexibleTieredStaking");
      console.log("     Staked tokens are NOT generating yield");
    } else {
      console.log("\n  ✅ Yield strategy IS configured on FlexibleTieredStaking");
      if (stakingYieldEnabled) {
        console.log("     Yield generation is ENABLED");
      } else {
        console.log("     Yield generation is DISABLED");
      }
    }
  } catch (error: any) {
    console.log("  ⚠️  Could not read staking yield info:", error.message.substring(0, 100));
  }

  console.log("\n" + "=".repeat(80));
  console.log("📝 SUMMARY:");
  console.log("=".repeat(80));
  
  if (yieldStrategyAddress === ethers.ZeroAddress) {
    console.log("❌ Yield strategy is NOT working on mainnet");
    console.log("\n💡 To enable yield strategy:");
    console.log("   1. Deploy TreasuryYieldStrategy contract");
    console.log("   2. Call token.setYieldStrategy(strategyAddress)");
    console.log("   3. Call token.setYieldStrategyFeeBps(5000) for 50% split");
    console.log("   4. Exclude strategy from fees: token.excludeFromFee(strategyAddress, true)");
  } else {
    console.log("✅ Yield strategy IS configured on ReflectiveToken");
    console.log("   Marketing fees are automatically split and sent to yield strategy");
    console.log("   Strategy will auto-execute buybacks when it receives ETH");
  }
}

main().catch(console.error);

