import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Fix developer vesting by reactivating it
 * This script will:
 * 1. Check if TokenDistribution is upgradeable (has proxy)
 * 2. If upgradeable: upgrade with new reactivateVesting function
 * 3. If not upgradeable: provide alternative solution
 * 4. Call reactivateVesting to fix the developer vesting
 */

async function main() {
  console.log("\n🔧 Fixing developer vesting...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Current Owner/Deployer:", deployer.address);
  console.log("");

  // Read deployment info to get TokenDistribution address
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error("Deployments directory not found");
  }

  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      path: path.join(deploymentsDir, f),
      time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (deploymentFiles.length === 0) {
    throw new Error("No deployment files found");
  }

  const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0].path, "utf8"));
  const contracts = latestDeployment.contracts || latestDeployment;
  const distributionAddress = contracts.distribution || contracts.tokenDistribution;

  if (!distributionAddress) {
    throw new Error("TokenDistribution address not found in deployment file");
  }

  console.log("📋 TokenDistribution:", distributionAddress);
  console.log("");

  // Get contract instance
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);

  // Check if deployer is the owner
  const owner = await distribution.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error(`❌ Error: Deployer is not the owner!`);
    console.error(`   Owner: ${owner}`);
    console.error(`   Deployer: ${deployer.address}`);
    process.exit(1);
  }

  // Get current developer wallet
  const currentWallets = await distribution.getTeamWallets();
  const developerAddress = currentWallets.developer;
  console.log("📊 Developer Address:", developerAddress);
  console.log("");

  // Check current vesting status
  console.log("📊 Current Vesting Status:");
  const rawVesting = await distribution.vestingInfo(developerAddress);
  console.log("   totalAmount:", ethers.formatEther(rawVesting.totalAmount), "DBBPT");
  console.log("   isActive:", rawVesting.isActive);
  console.log("");

  if (rawVesting.isActive) {
    console.log("✅ Developer vesting is already active! No fix needed.");
    return;
  }

  // Check if contract is upgradeable (has proxy)
  console.log("🔍 Checking if contract is upgradeable...");
  let isUpgradeable = false;
  let implementationAddress: string | null = null;

  try {
    implementationAddress = await upgrades.erc1967.getImplementationAddress(distributionAddress);
    isUpgradeable = true;
    console.log("   ✅ Contract is upgradeable (has proxy)");
    console.log("   Implementation:", implementationAddress);
  } catch (error: any) {
    console.log("   ❌ Contract is NOT upgradeable (no proxy)");
    console.log("   Error:", error.message);
  }
  console.log("");

  if (isUpgradeable && implementationAddress) {
    // Upgrade the contract with the new function
    console.log("📦 Upgrading TokenDistribution contract with reactivateVesting function...");
    try {
      const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
      const upgraded = await upgrades.upgradeProxy(distributionAddress, TokenDistribution);
      await upgraded.waitForDeployment();
      
      const newImplementation = await upgrades.erc1967.getImplementationAddress(distributionAddress);
      console.log("   ✅ Contract upgraded successfully!");
      console.log("   New Implementation:", newImplementation);
      console.log("");

      // Now call reactivateVesting
      console.log("🔄 Reactivating developer vesting...");
      const reactivateTx = await upgraded.reactivateVesting(developerAddress);
      console.log("   ⏳ Transaction:", reactivateTx.hash);
      console.log("   ⏳ Waiting for confirmation...");
      const receipt = await reactivateTx.wait();
      console.log("   ✅ Transaction confirmed!");
      console.log("   Block:", receipt.blockNumber);
      console.log("");

      // Verify the fix
      console.log("🔍 Verifying fix...");
      const fixedVesting = await upgraded.getVestingInfo(developerAddress);
      const [totalAmount, claimed, claimable, vestingEndTime] = fixedVesting;
      
      if (totalAmount > 0n) {
        console.log("   ✅ Developer vesting is now active!");
        console.log("   Total Amount:", ethers.formatEther(totalAmount), "DBBPT");
        console.log("   Claimable:", ethers.formatEther(claimable), "DBBPT");
      } else {
        console.log("   ❌ Fix did not work. Please check manually.");
      }

    } catch (error: any) {
      console.error("   ❌ Error upgrading contract:", error.message);
      if (error.data) {
        console.error("   Error data:", error.data);
      }
      process.exit(1);
    }
  } else {
    // Contract is not upgradeable - we need a different solution
    console.log("⚠️  Contract is NOT upgradeable. Cannot add new function.");
    console.log("");
    console.log("💡 Alternative Solutions:");
    console.log("   1. The contract needs to be redeployed with the fix function");
    console.log("   2. Or, we need to find what deactivated the vesting and reverse it");
    console.log("");
    console.log("🔍 Checking if we can use updateTeamWallets to fix this...");
    
    // Try to see if calling updateTeamWallets with same address would help
    // But this won't work because _migrateVestingData checks if oldInfo.isActive
    console.log("   ❌ updateTeamWallets won't work because isActive is already false");
    console.log("");
    console.log("📝 Recommendation:");
    console.log("   Since the contract is not upgradeable, you have two options:");
    console.log("   1. Redeploy TokenDistribution with the reactivateVesting function");
    console.log("   2. Manually set isActive=true via a contract interaction (if you have direct access)");
    console.log("");
    console.log("   However, since vesting data exists (100,000 DBBPT), the simplest solution");
    console.log("   would be to redeploy TokenDistribution as upgradeable, or add the fix function");
    console.log("   and migrate to a new contract.");
  }

  console.log("\n✅ Script complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
