import { ethers } from "hardhat";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";

async function main() {
  console.log("\n🔄 Redeploying FlexibleTieredStaking with new owner...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
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
  const newOwnerAddress = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198";

  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    throw new Error(`ReflectiveToken not found for chain ID ${chainId}`);
  }

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Token address:", tokenAddress);
  console.log("New owner address:", newOwnerAddress);
  console.log("\n⚠️  WARNING: This will redeploy the staking contract!");
  console.log("   All existing staking data will be lost.\n");

  // Get oracle addresses
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

  // Deploy new staking contract
  console.log("📦 Deploying FlexibleTieredStaking...");
  const Staking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await Staking.deploy(
    ethers.getAddress(tokenAddress),
    primaryOracle,
    backupOracle
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("   ✅ Deployed to:", stakingAddress);

  // Transfer ownership to new owner
  console.log("\n🔐 Transferring ownership to new owner...");
  const transferTx = await staking.transferOwnership(newOwnerAddress);
  await transferTx.wait();
  console.log("   ✅ Ownership transferred to:", newOwnerAddress);

  // Update ReflectiveToken
  console.log("\n🔗 Updating ReflectiveToken staking contract address...");
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const setStakingTx = await token.setStakingContract(stakingAddress);
  await setStakingTx.wait();
  console.log("   ✅ ReflectiveToken updated");

  console.log("\n✨ Redeployment complete!");
  console.log("\n📝 New contract address:");
  console.log("   FlexibleTieredStaking:", stakingAddress);
  console.log("   Owner:", newOwnerAddress);
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

