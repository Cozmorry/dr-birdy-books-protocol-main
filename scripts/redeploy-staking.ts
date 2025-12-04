import { ethers } from "hardhat";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

async function main() {
  console.log("\n🔄 Redeploying FlexibleTieredStaking contract...\n");

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

  // Deploy new staking contract
  console.log("📦 Deploying new FlexibleTieredStaking...");
  const Staking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await Staking.deploy();
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ FlexibleTieredStaking deployed to:", stakingAddress);

  // Initialize the staking contract
  console.log("\n⚙️  Initializing staking contract...");
  
  // Set staking token
  console.log("   Setting staking token...");
  const setTokenTx = await staking.setStakingToken(tokenAddress);
  await setTokenTx.wait();
  console.log("   ✅ Staking token set");

  // Set price oracles
  console.log("   Setting price oracles...");
  if (oracleConfig.primaryOracle) {
    const setPrimaryTx = await staking.setPrimaryPriceOracle(oracleConfig.primaryOracle);
    await setPrimaryTx.wait();
    console.log("   ✅ Primary oracle set:", oracleConfig.primaryOracle);
  }
  
  if (oracleConfig.backupOracle) {
    const setBackupTx = await staking.setBackupPriceOracle(oracleConfig.backupOracle);
    await setBackupTx.wait();
    console.log("   ✅ Backup oracle set:", oracleConfig.backupOracle);
  }

  // Initialize tiers
  console.log("\n📊 Setting up tiers...");
  const tiers = DEPLOYMENT_CONFIG.TIER_CONFIG;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const addTierTx = await staking.addTier(tier.threshold, tier.name);
    await addTierTx.wait();
    console.log(`   ✅ Tier ${i + 1} added: ${tier.name} (${ethers.formatUnits(tier.threshold, 8)} USD)`);
  }

  // Transfer ownership to timelock if configured
  const timelockAddress = contractAddresses.improvedTimelock;
  if (timelockAddress && timelockAddress !== ethers.ZeroAddress) {
    console.log("\n🔐 Transferring ownership to Timelock...");
    const transferTx = await staking.transferOwnership(timelockAddress);
    await transferTx.wait();
    console.log("   ✅ Ownership transferred to:", timelockAddress);
  }

  // Update ReflectiveToken to set new staking contract
  console.log("\n🔗 Updating ReflectiveToken staking contract address...");
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const setStakingTx = await token.setStakingContract(stakingAddress);
  await setStakingTx.wait();
  console.log("   ✅ ReflectiveToken staking contract updated");

  console.log("\n✨ Redeployment complete!");
  console.log("\n📝 New contract addresses:");
  console.log("   FlexibleTieredStaking:", stakingAddress);
  console.log("\n⚠️  IMPORTANT: Update your frontend config with the new staking address!");
  console.log("   File: frontend/src/config/networks.ts");
  console.log(`   Update CONTRACT_ADDRESSES[${chainId}].flexibleTieredStaking = "${stakingAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

