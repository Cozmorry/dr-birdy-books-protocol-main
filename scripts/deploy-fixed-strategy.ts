import { ethers } from "hardhat";

/**
 * Deploy fixed TreasuryYieldStrategy and set it up
 */
async function main() {
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const OLD_STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";
  const UNISWAP_ROUTER = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24";

  const [deployer] = await ethers.getSigners();
  console.log("🔧 Deployer:", deployer.address);

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const oldStrategy = await ethers.getContractAt("TreasuryYieldStrategy", OLD_STRATEGY_ADDRESS);

  console.log("\n📊 Current State:");
  const oldStrategyBalance = await token.balanceOf(OLD_STRATEGY_ADDRESS);
  console.log("   Old Strategy Balance:", ethers.formatEther(oldStrategyBalance), "DBBPT");

  // Deploy new strategy
  console.log("\n🚀 Deploying NEW TreasuryYieldStrategy (with fix)...");
  const TreasuryYieldStrategy = await ethers.getContractFactory("TreasuryYieldStrategy");
  const newStrategy = await TreasuryYieldStrategy.deploy(
    TOKEN_ADDRESS,
    UNISWAP_ROUTER,
    deployer.address
  );
  await newStrategy.waitForDeployment();
  const newStrategyAddress = await newStrategy.getAddress();
  console.log("✅ New Strategy deployed to:", newStrategyAddress);

  // Set staking contract
  console.log("\n🔧 Setting staking contract...");
  const setStakingTx = await newStrategy.setStakingContract(STAKING_ADDRESS);
  await setStakingTx.wait();
  console.log("✅ Staking contract set");

  // Exclude strategy from fees
  console.log("\n🔧 Excluding strategy from fees...");
  const excludeTx = await token.excludeFromFee(newStrategyAddress, true);
  await excludeTx.wait();
  console.log("✅ Strategy excluded from fees");

  // Transfer tokens from old strategy to new one (if any)
  if (oldStrategyBalance > 0n) {
    console.log("\n💰 Transferring tokens from old strategy to new...");
    // We need to withdraw from old strategy first
    // But we can't do that easily since it requires the staking contract
    // Instead, we'll need to manually handle this or deploy tokens to new strategy
    console.log("   ⚠️  Old strategy has", ethers.formatEther(oldStrategyBalance), "DBBPT");
    console.log("   ⚠️  You may need to manually handle token migration");
  }

  // Update staking contract to use new strategy
  console.log("\n🔧 Updating staking contract to use new strategy...");
  const setYieldTx = await staking.setYieldStrategy(newStrategyAddress);
  await setYieldTx.wait();
  console.log("✅ Staking contract updated");

  // Deploy existing tokens to new strategy (if any in staking contract)
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  if (stakingBalance > 0n) {
    console.log("\n💰 Staking contract has", ethers.formatEther(stakingBalance), "DBBPT");
    console.log("   (Tokens will be auto-deployed to yield on next stake)");
  }

  console.log("\n✅ Setup Complete!");
  console.log("\n📋 New Strategy Address:", newStrategyAddress);
  console.log("   Update your config files with this address");
  
  console.log("\n⚠️  Note: Old strategy still has tokens.");
  console.log("   You may want to manually withdraw them or leave them there.");
}

main().catch(console.error);

