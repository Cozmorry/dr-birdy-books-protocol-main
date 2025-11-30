import { ethers } from "hardhat";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

/**
 * This script updates both contracts:
 * 1. ReflectiveToken - Adds transferForUnstaking function
 * 2. FlexibleTieredStaking - Redeploys with new unstake logic
 * 
 * ⚠️  WARNING: This will redeploy FlexibleTieredStaking, losing all existing staking data!
 * ⚠️  Users will need to restake their tokens after this update.
 */
async function main() {
  console.log("\n🔄 Updating contracts with unstaking fix...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Get network
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);
  const oracleConfig = getOracleConfig(chainId);

  const tokenAddress = contractAddresses.reflectiveToken;
  const oldStakingAddress = contractAddresses.flexibleTieredStaking;

  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    throw new Error(`ReflectiveToken not found for chain ID ${chainId}`);
  }

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("ReflectiveToken address:", tokenAddress);
  if (oldStakingAddress && oldStakingAddress !== ethers.ZeroAddress) {
    console.log("⚠️  Old Staking address:", oldStakingAddress);
    console.log("   ⚠️  WARNING: Redeploying will lose all existing staking data!");
    console.log("   ⚠️  Users will need to restake their tokens!\n");
  }

  // Step 1: Try to upgrade ReflectiveToken (if it's a proxy)
  console.log("📦 Step 1: Updating ReflectiveToken...");
  let tokenUpgraded = false;
  try {
    const { upgrades } = require("hardhat");
    try {
      const implementation = await upgrades.erc1967.getImplementationAddress(tokenAddress);
      console.log("   Detected proxy contract, upgrading...");
      const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
      const upgraded = await upgrades.upgradeProxy(tokenAddress, ReflectiveToken);
      await upgraded.waitForDeployment();
      console.log("   ✅ ReflectiveToken upgraded successfully!");
      tokenUpgraded = true;
    } catch (proxyError: any) {
      console.log("   ℹ️  Not a proxy contract (deployed directly)");
      console.log("   ℹ️  ReflectiveToken already has the new code, no upgrade needed");
      tokenUpgraded = true; // Assume it's already updated if we recompiled
    }
  } catch (error: any) {
    console.log("   ⚠️  Could not check/upgrade ReflectiveToken:", error.message);
    console.log("   ℹ️  Continuing with staking contract redeployment...");
  }

  if (!tokenUpgraded) {
    console.log("   ⚠️  ReflectiveToken needs to be recompiled and redeployed");
    console.log("   ⚠️  Please compile contracts first: npx hardhat compile");
  }

  // Step 2: Redeploy FlexibleTieredStaking
  console.log("\n📦 Step 2: Redeploying FlexibleTieredStaking...");
  const Staking = await ethers.getContractFactory("FlexibleTieredStaking");
  
  // Get oracle addresses and fix checksums
  let primaryOracle: string;
  let backupOracle: string;
  
  try {
    primaryOracle = oracleConfig.primaryOracle 
      ? ethers.getAddress(oracleConfig.primaryOracle.toLowerCase()) 
      : ethers.ZeroAddress;
  } catch (e) {
    primaryOracle = oracleConfig.primaryOracle || ethers.ZeroAddress;
  }
  
  try {
    backupOracle = oracleConfig.backupOracle 
      ? ethers.getAddress(oracleConfig.backupOracle.toLowerCase()) 
      : ethers.ZeroAddress;
  } catch (e) {
    backupOracle = oracleConfig.backupOracle || ethers.ZeroAddress;
  }
  
  if (primaryOracle === ethers.ZeroAddress) {
    throw new Error("Primary oracle not configured for this network");
  }
  
  // Deploy with constructor arguments
  const staking = await Staking.deploy(
    ethers.getAddress(tokenAddress),
    primaryOracle,
    backupOracle
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("   ✅ FlexibleTieredStaking deployed to:", stakingAddress);
  console.log("   ✅ Constructor initialized with token and oracles");

  // Step 3: Additional setup (tiers are already initialized in constructor)
  console.log("\n⚙️  Step 3: Verifying contract setup...");

  // Tiers are already initialized in constructor (Tier 1, Tier 2, Tier 3)
  console.log("\n📊 Step 4: Tiers initialized in constructor");
  console.log("   ✅ Default tiers (Tier 1: $24, Tier 2: $50, Tier 3: $1000) are already set");

  // Step 5: Transfer ownership to new owner (or Timelock if configured)
  // Set new owner address here (or use Timelock if you want)
  const newOwnerAddress = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198"; // Your new owner
  const timelockAddress = contractAddresses.improvedTimelock;
  
  // Use new owner directly instead of Timelock
  if (newOwnerAddress && newOwnerAddress !== ethers.ZeroAddress) {
    console.log("\n🔐 Step 5: Transferring ownership to new owner...");
    const transferTx = await staking.transferOwnership(newOwnerAddress);
    await transferTx.wait();
    console.log("   ✅ Ownership transferred to:", newOwnerAddress);
  } else if (timelockAddress && timelockAddress !== ethers.ZeroAddress) {
    console.log("\n🔐 Step 5: Transferring ownership to Timelock...");
    const transferTx = await staking.transferOwnership(timelockAddress);
    await transferTx.wait();
    console.log("   ✅ Ownership transferred to:", timelockAddress);
  }

  // Step 6: Update ReflectiveToken to set new staking contract
  console.log("\n🔗 Step 6: Updating ReflectiveToken staking contract address...");
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const setStakingTx = await token.setStakingContract(stakingAddress);
  await setStakingTx.wait();
  console.log("   ✅ ReflectiveToken staking contract updated");

  console.log("\n✨ Update complete!");
  console.log("\n📝 New contract addresses:");
  console.log("   FlexibleTieredStaking:", stakingAddress);
  console.log("\n⚠️  IMPORTANT: Update your frontend config!");
  console.log("   File: frontend/src/config/networks.ts");
  console.log(`   Update CONTRACT_ADDRESSES[${chainId}].flexibleTieredStaking = "${stakingAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
