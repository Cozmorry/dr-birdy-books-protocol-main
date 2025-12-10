import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
import { getOracleConfig } from "../frontend/src/config/networks";
import { DEPLOYMENT_CONFIG } from "./config";

/**
 * Deploy and setup TreasuryYieldStrategy on Base Mainnet
 * 
 * This script:
 * 1. Deploys TreasuryYieldStrategy contract
 * 2. Configures it with staking contract
 * 3. Sets it on ReflectiveToken for automatic fee routing
 * 4. Excludes it from fees
 * 5. Optionally enables it on FlexibleTieredStaking
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("\n🚀 SETTING UP YIELD STRATEGY ON MAINNET");
  console.log("=".repeat(80));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("=".repeat(80));

  const contractAddresses = getContractAddresses(chainId);
  const oracleConfig = getOracleConfig(chainId);

  const tokenAddress = contractAddresses.reflectiveToken;
  const stakingAddress = contractAddresses.flexibleTieredStaking;
  const uniswapRouter = oracleConfig.uniswapRouter;

  console.log("\n📋 Configuration:");
  console.log("  Token:", tokenAddress);
  console.log("  Staking:", stakingAddress);
  console.log("  Uniswap Router:", uniswapRouter);
  console.log("  Owner:", deployer.address);

  // Get contracts
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);

  // Check current status
  console.log("\n📊 Current Status:");
  const currentYieldStrategy = await token.yieldStrategy();
  const currentFeeBps = await token.yieldStrategyFeeBps();
  console.log("  Current Yield Strategy:", currentYieldStrategy);
  console.log("  Current Fee BPS:", currentFeeBps.toString(), `(${Number(currentFeeBps) / 100}%)`);

  if (currentYieldStrategy !== ethers.ZeroAddress) {
    console.log("\n⚠️  Yield strategy already configured!");
    console.log("   If you want to deploy a new one, please update the script.");
    return;
  }

  // Step 1: Deploy TreasuryYieldStrategy
  console.log("\n📦 Step 1: Deploying TreasuryYieldStrategy...");
  const TreasuryYieldStrategy = await ethers.getContractFactory("TreasuryYieldStrategy");
  const strategy = await TreasuryYieldStrategy.deploy(
    tokenAddress,
    uniswapRouter,
    deployer.address // owner
  );
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  console.log("✅ TreasuryYieldStrategy deployed to:", strategyAddress);

  // Step 2: Set staking contract on strategy
  console.log("\n🔧 Step 2: Setting staking contract on strategy...");
  const setStakingTx = await strategy.setStakingContract(stakingAddress);
  await setStakingTx.wait();
  console.log("✅ Staking contract set");
  console.log("   TX:", setStakingTx.hash);

  // Step 3: Exclude strategy from fees on token
  console.log("\n🔧 Step 3: Excluding strategy from fees...");
  const excludeTx = await token.excludeFromFee(strategyAddress, true);
  await excludeTx.wait();
  console.log("✅ Strategy excluded from fees");
  console.log("   TX:", excludeTx.hash);

  // Step 4: Set yield strategy on token contract
  console.log("\n🔧 Step 4: Setting yield strategy on ReflectiveToken...");
  const setYieldTx = await token.setYieldStrategy(strategyAddress);
  await setYieldTx.wait();
  console.log("✅ Yield strategy set on token");
  console.log("   TX:", setYieldTx.hash);

  // Step 5: Set fee split (50% to yield, 50% to marketing)
  console.log("\n🔧 Step 5: Setting fee split (50% to yield, 50% to marketing)...");
  const feeBps = 5000; // 50%
  const setFeeBpsTx = await token.setYieldStrategyFeeBps(feeBps);
  await setFeeBpsTx.wait();
  console.log("✅ Fee split set to 50%");
  console.log("   TX:", setFeeBpsTx.hash);

  // Step 6: Enable auto-buyback on strategy (if not already enabled)
  console.log("\n🔧 Step 6: Enabling auto-buyback on strategy...");
  const autoBuybackEnabled = await strategy.autoBuybackEnabled();
  if (!autoBuybackEnabled) {
    const enableBuybackTx = await strategy.setAutoBuybackEnabled(true);
    await enableBuybackTx.wait();
    console.log("✅ Auto-buyback enabled");
    console.log("   TX:", enableBuybackTx.hash);
  } else {
    console.log("✅ Auto-buyback already enabled");
  }

  // Step 7: (Optional) Set yield strategy on staking contract
  console.log("\n🔧 Step 7: Setting yield strategy on FlexibleTieredStaking...");
  const [stakingStrategyAddress] = await staking.getYieldInfo();
  if (stakingStrategyAddress === ethers.ZeroAddress) {
    const setStakingYieldTx = await staking.setYieldStrategy(strategyAddress);
    await setStakingYieldTx.wait();
    console.log("✅ Yield strategy set on staking contract");
    console.log("   TX:", setStakingYieldTx.hash);
    
    // Enable yield on staking
    const enableYieldTx = await staking.setYieldEnabled(true);
    await enableYieldTx.wait();
    console.log("✅ Yield generation enabled on staking");
    console.log("   TX:", enableYieldTx.hash);
  } else {
    console.log("⚠️  Staking already has a yield strategy configured");
    console.log("   Current:", stakingStrategyAddress);
  }

  // Verification
  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICATION");
  console.log("=".repeat(80));
  
  const finalYieldStrategy = await token.yieldStrategy();
  const finalFeeBps = await token.yieldStrategyFeeBps();
  const isExcluded = await token.isExcludedFromFee(strategyAddress);
  const strategyIsActive = await strategy.isActive();
  const strategyAutoBuyback = await strategy.autoBuybackEnabled();
  
  console.log("  Token Yield Strategy:", finalYieldStrategy);
  console.log("  Token Fee BPS:", finalFeeBps.toString(), `(${Number(finalFeeBps) / 100}%)`);
  console.log("  Strategy Excluded from Fees:", isExcluded);
  console.log("  Strategy Active:", strategyIsActive);
  console.log("  Auto-Buyback Enabled:", strategyAutoBuyback);
  
  if (finalYieldStrategy === strategyAddress && isExcluded && strategyIsActive && strategyAutoBuyback) {
    console.log("\n✅ YIELD STRATEGY IS NOW FULLY CONFIGURED AND WORKING!");
    console.log("\n📝 How it works:");
    console.log("   1. Users trade tokens → Protocol collects 2% marketing fee");
    console.log("   2. Marketing fee ETH is split: 50% → Yield Strategy, 50% → Marketing Wallet");
    console.log("   3. Yield Strategy receives ETH → Auto-executes buyback");
    console.log("   4. ETH → Tokens → Burned → Supply decreases → Value increases! 🚀");
  } else {
    console.log("\n⚠️  Some configuration may be incomplete. Please check the output above.");
  }

  console.log("\n📋 Contract Addresses:");
  console.log("  TreasuryYieldStrategy:", strategyAddress);
  console.log("  ReflectiveToken:", tokenAddress);
  console.log("  FlexibleTieredStaking:", stakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

