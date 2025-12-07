import { ethers } from "hardhat";
import { DEPLOYMENT_CONFIG } from "./config";

/**
 * Deploy new strategy for new staking contract
 */
async function main() {
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const NEW_STAKING_ADDRESS = "0x1D8CFeFc697b6CE93BF2304C5035922Bb2557e88";
  const UNISWAP_ROUTER = DEPLOYMENT_CONFIG.UNISWAP_ROUTER;

  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying new strategy for new staking contract\n");
  console.log("Deployer:", deployer.address);

  // Deploy new strategy
  console.log("\n📦 Deploying TreasuryYieldStrategy...");
  const TreasuryYieldStrategy = await ethers.getContractFactory("TreasuryYieldStrategy");
  const strategy = await TreasuryYieldStrategy.deploy(
    TOKEN_ADDRESS,
    UNISWAP_ROUTER,
    deployer.address
  );
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  console.log("✅ Strategy deployed:", strategyAddress);

  // Set staking contract
  console.log("\n🔧 Setting staking contract...");
  const setStakingTx = await strategy.setStakingContract(NEW_STAKING_ADDRESS);
  await setStakingTx.wait();
  console.log("✅ Staking contract set");

  // Exclude strategy from fees
  console.log("\n🔧 Excluding strategy from fees...");
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const excludeTx = await token.excludeFromFee(strategyAddress, true);
  await excludeTx.wait();
  console.log("✅ Strategy excluded from fees");

  // Update staking contract to use new strategy
  console.log("\n🔧 Updating staking contract...");
  const staking = await ethers.getContractAt("FlexibleTieredStaking", NEW_STAKING_ADDRESS);
  const setStrategyTx = await staking.setYieldStrategy(strategyAddress);
  await setStrategyTx.wait();
  console.log("✅ Staking contract updated");

  // Verify
  console.log("\n✅ Verification:");
  const [stakingStrategy] = await staking.getYieldInfo();
  const strategyStaking = await strategy.stakingContract();
  
  console.log("   Staking's strategy:", stakingStrategy);
  console.log("   Strategy's staking:", strategyStaking);
  
  if (stakingStrategy.toLowerCase() === strategyAddress.toLowerCase() &&
      strategyStaking.toLowerCase() === NEW_STAKING_ADDRESS.toLowerCase()) {
    console.log("\n✅ All connections verified!");
  } else {
    console.log("\n❌ Connection mismatch!");
  }

  console.log("\n📋 Final Addresses:");
  console.log("   New Staking:", NEW_STAKING_ADDRESS);
  console.log("   New Strategy:", strategyAddress);
  console.log("   Token:", TOKEN_ADDRESS);
}

main().catch(console.error);

