import { ethers } from "hardhat";
import { DEPLOYMENT_CONFIG } from "./config";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";

/**
 * Complete cleanup: Redeploy staking contract with fixes and reset everything
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🧹 Complete Cleanup: Redeploying Staking Contract\n");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Get network config
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const oracleConfig = getOracleConfig(chainId);

  const TOKEN_ADDRESS = contractAddresses.reflectiveToken || "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const NEW_STRATEGY_ADDRESS = "0x76675479C5Fe73E0843150DEC401D66B1D981F87";
  
  // Get oracles with proper checksum
  let PRIMARY_ORACLE: string;
  let BACKUP_ORACLE: string;
  
  try {
    PRIMARY_ORACLE = oracleConfig.primaryOracle || DEPLOYMENT_CONFIG.PRIMARY_ORACLE;
    PRIMARY_ORACLE = ethers.getAddress(PRIMARY_ORACLE.toLowerCase());
  } catch (e) {
    PRIMARY_ORACLE = DEPLOYMENT_CONFIG.PRIMARY_ORACLE;
  }
  
  try {
    BACKUP_ORACLE = oracleConfig.backupOracle || DEPLOYMENT_CONFIG.BACKUP_ORACLE;
    if (BACKUP_ORACLE && BACKUP_ORACLE !== ethers.ZeroAddress) {
      BACKUP_ORACLE = ethers.getAddress(BACKUP_ORACLE.toLowerCase());
    } else {
      BACKUP_ORACLE = ethers.ZeroAddress;
    }
  } catch (e) {
    BACKUP_ORACLE = DEPLOYMENT_CONFIG.BACKUP_ORACLE || ethers.ZeroAddress;
  }

  console.log("📋 Configuration:");
  console.log("   Token:", TOKEN_ADDRESS);
  console.log("   New Strategy:", NEW_STRATEGY_ADDRESS);
  console.log("   Primary Oracle:", PRIMARY_ORACLE);
  console.log("   Backup Oracle:", BACKUP_ORACLE);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const newStrategy = await ethers.getContractAt("TreasuryYieldStrategy", NEW_STRATEGY_ADDRESS);

  // Step 1: Deploy new staking contract
  console.log("🔨 Step 1: Deploying new FlexibleTieredStaking...");
  const FlexibleTieredStaking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await FlexibleTieredStaking.deploy(
    TOKEN_ADDRESS,
    PRIMARY_ORACLE,
    BACKUP_ORACLE || ethers.ZeroAddress
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ New staking contract deployed:", stakingAddress);

  // Step 2: Set staking token (if needed)
  console.log("\n🔧 Step 2: Setting staking token...");
  try {
    const setTokenTx = await staking.setStakingToken(TOKEN_ADDRESS);
    await setTokenTx.wait();
    console.log("✅ Staking token set");
  } catch (error: any) {
    if (error.message.includes("already set")) {
      console.log("✅ Staking token already set");
    } else {
      throw error;
    }
  }

  // Step 3: Set Uniswap pair (if exists)
  console.log("\n🔧 Step 3: Setting Uniswap pair...");
  try {
    // Try to get pair address from token
    const uniswapFactory = DEPLOYMENT_CONFIG.UNISWAP_FACTORY;
    const WETH = DEPLOYMENT_CONFIG.WETH;
    
    // Calculate pair address (Uniswap V2 uses CREATE2)
    // For now, we'll skip this as it's optional
    console.log("   ⚠️  Skipping Uniswap pair setup (optional)");
  } catch (error) {
    console.log("   ⚠️  Could not set Uniswap pair (optional)");
  }

  // Step 4: Connect yield strategy
  console.log("\n🔧 Step 4: Connecting yield strategy...");
  const setStrategyTx = await staking.setYieldStrategy(NEW_STRATEGY_ADDRESS);
  await setStrategyTx.wait();
  console.log("✅ Yield strategy connected");

  // Step 5: Configure yield
  console.log("\n🔧 Step 5: Configuring yield...");
  const setMaxTx = await staking.setMaxYieldDeployment(5000); // 50%
  await setMaxTx.wait();
  console.log("✅ Max yield deployment set to 50%");

  const enableYieldTx = await staking.setYieldEnabled(true);
  await enableYieldTx.wait();
  console.log("✅ Yield enabled");

  // Step 6: Reset deployed shares to 0 (cleanup)
  console.log("\n🧹 Step 6: Cleaning up deployed shares...");
  try {
    const resetTx = await staking.setYieldDeployedShares(0);
    await resetTx.wait();
    console.log("✅ Deployed shares reset to 0");
  } catch (error: any) {
    console.log("   ⚠️  Could not reset shares:", error.message);
    console.log("   (This is okay if function doesn't exist yet)");
  }

  // Step 7: Verify tiers (should be set in constructor)
  console.log("\n🔧 Step 7: Verifying tiers...");
  const tierCount = await staking.getTierCount();
  console.log("   Tier count:", tierCount.toString());
  
  if (Number(tierCount) < 3) {
    console.log("   Adding default tiers...");
    const tier1Tx = await staking.addTier(2400000000, "Tier 1"); // $24
    await tier1Tx.wait();
    const tier2Tx = await staking.addTier(5000000000, "Tier 2"); // $50
    await tier2Tx.wait();
    const tier3Tx = await staking.addTier(100000000000, "Tier 3"); // $1000
    await tier3Tx.wait();
    console.log("✅ Default tiers added");
  } else {
    console.log("✅ Tiers already configured");
  }

  // Step 8: Verify everything
  console.log("\n✅ Step 8: Verifying setup...");
  const [strategyAddress, deployedShares] = await staking.getYieldInfo();
  const stakingToken = await staking.stakingToken();
  const yieldEnabled = await staking.yieldEnabled();

  console.log("   Staking Token:", stakingToken);
  console.log("   Yield Strategy:", strategyAddress);
  console.log("   Yield Enabled:", yieldEnabled);
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  if (stakingToken.toLowerCase() === TOKEN_ADDRESS.toLowerCase() &&
      strategyAddress.toLowerCase() === NEW_STRATEGY_ADDRESS.toLowerCase() &&
      yieldEnabled &&
      deployedShares === 0n) {
    console.log("\n✅ All checks passed!");
  } else {
    console.log("\n⚠️  Some checks failed - review above");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📋 New Contract Addresses:");
  console.log("   FlexibleTieredStaking:", stakingAddress);
  console.log("   TreasuryYieldStrategy:", NEW_STRATEGY_ADDRESS);
  console.log("   ReflectiveToken:", TOKEN_ADDRESS);
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Update frontend config with new staking address");
  console.log("   2. Test staking/unstaking");
  console.log("   3. Verify yield deployment works");

  return {
    stakingAddress,
    strategyAddress: NEW_STRATEGY_ADDRESS,
    tokenAddress: TOKEN_ADDRESS
  };
}

main()
  .then((result) => {
    console.log("\n🎉 Cleanup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  });

