import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Fix Joseph's vesting if it wasn't migrated properly
 * This script checks if Joseph's new address needs vesting initialized
 */

async function main() {
  console.log("\n🔧 Checking and fixing Joseph's vesting...\n");

  const newJosephAddress = "0xf40df6189713FEc50AC39960e4874b75dfdeF35B";
  const oldJosephAddress = "0x4D8B10E7d6BFF54c8c1C1C42240c74e173C5F8ed";

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer/Owner:", deployer.address);
  console.log("📝 Joseph New Address:", newJosephAddress);
  console.log("📝 Joseph Old Address:", oldJosephAddress);
  console.log("");

  // Read deployment info
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
    throw new Error("TokenDistribution address not found");
  }

  console.log("📋 TokenDistribution:", distributionAddress);
  console.log("");

  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);

  // Check ownership
  const owner = await distribution.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error(`❌ Error: Deployer is not the owner!`);
    console.error(`   Owner: ${owner}`);
    console.error(`   Deployer: ${deployer.address}`);
    process.exit(1);
  }

  // Check vesting status
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("📊 Vesting Status:");
  console.log("   Vesting Initialized:", vestingInitialized);
  console.log("");

  if (!vestingInitialized) {
    console.log("❌ Vesting is not initialized. Cannot fix Joseph's vesting.");
    console.log("   You need to initialize vesting first using initializeVesting()");
    process.exit(1);
  }

  // Check current vesting info
  console.log("📊 Checking vesting info...");
  const newJosephVesting = await distribution.getVestingInfo(newJosephAddress);
  const oldJosephVesting = await distribution.getVestingInfo(oldJosephAddress);

  console.log("\n   New Address Vesting:");
  console.log("     Total Amount:", ethers.formatEther(newJosephVesting.totalAmount), "DBBPT");
  console.log("     Claimed:", ethers.formatEther(newJosephVesting.claimed), "DBBPT");
  console.log("     Active:", newJosephVesting.totalAmount > 0 ? "Yes" : "No");

  console.log("\n   Old Address Vesting:");
  console.log("     Total Amount:", ethers.formatEther(oldJosephVesting.totalAmount), "DBBPT");
  console.log("     Claimed:", ethers.formatEther(oldJosephVesting.claimed), "DBBPT");
  console.log("     Active:", oldJosephVesting.totalAmount > 0 ? "Yes" : "No");

  // Check if new address already has vesting
  if (newJosephVesting.totalAmount > 0) {
    console.log("\n✅ Joseph's new address already has vesting!");
    console.log("   No action needed.");
    process.exit(0);
  }

  // Check if old address had vesting
  if (oldJosephVesting.totalAmount === 0) {
    console.log("\n⚠️  Old address does not have vesting data.");
    console.log("   This means vesting was never initialized for Joseph's old address.");
    console.log("   We need to manually initialize vesting for the new address.");
    console.log("");
    console.log("   However, the contract doesn't have a function to manually");
    console.log("   initialize vesting for a single address after initialization.");
    console.log("");
    console.log("   Options:");
    console.log("   1. If vesting was never initialized for Joseph, you may need to");
    console.log("      check if the vesting initialization was done correctly.");
    console.log("   2. If Joseph should have 162,500 tokens (1.625%), you may need");
    console.log("      to contact the contract owner to manually add vesting.");
    console.log("");
    console.log("   ⚠️  WARNING: The contract's updateTeamWallets() function only");
    console.log("      migrates vesting if the old address had active vesting.");
    process.exit(1);
  }

  // If old address has vesting but new doesn't, something went wrong
  console.log("\n❌ Error: Old address has vesting but new address doesn't!");
  console.log("   This shouldn't happen if migration worked correctly.");
  console.log("   Please check the transaction logs to see what happened.");
  process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
