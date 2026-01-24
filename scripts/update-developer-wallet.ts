import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Update developer wallet address in TokenDistribution contract
 * This script will:
 * 1. Get current team wallet addresses from the contract
 * 2. Update developer address to the deployer's address while keeping all others the same
 * 3. If vesting is initialized, it will automatically migrate vesting data
 */

async function main() {
  console.log("\n🔄 Updating developer wallet address in TokenDistribution contract...\n");

  const [deployer] = await ethers.getSigners();
  const newDeveloperAddress = deployer.address; // Use deployer's address as new developer address
  
  // Validate address format
  if (!ethers.isAddress(newDeveloperAddress)) {
    console.error(`❌ Error: Invalid developer address format: ${newDeveloperAddress}`);
    process.exit(1);
  }

  console.log("📝 Deployer/Owner:", deployer.address);
  console.log("📝 New Developer Address:", newDeveloperAddress);
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
  console.log("📋 Using deployment info from:", deploymentFiles[0].name);
  
  const contracts = latestDeployment.contracts || latestDeployment;
  const distributionAddress = contracts.distribution || contracts.tokenDistribution;

  if (!distributionAddress) {
    throw new Error("TokenDistribution address not found in deployment file");
  }

  console.log("   TokenDistribution:", distributionAddress);
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

  // Get current team wallet addresses
  console.log("📊 Getting current team wallet addresses...");
  const currentWallets = await distribution.getTeamWallets();
  
  console.log("   Current Joseph:", currentWallets.joseph);
  console.log("   Current AJ:", currentWallets.aj);
  console.log("   Current D-Sign:", currentWallets.dsign);
  console.log("   Current Developer:", currentWallets.developer);
  console.log("   Current Birdy:", currentWallets.birdy);
  console.log("   Current Airdrop:", currentWallets.airdrop);
  console.log("");

  // Check if new address is the same as current
  const developerChanged = currentWallets.developer.toLowerCase() !== newDeveloperAddress.toLowerCase();
  
  if (!developerChanged) {
    console.log("⚠️  Warning: Developer address is the same as current address!");
    console.log("   No update needed.");
    process.exit(0);
  }

  // Check vesting status
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("📊 Vesting Status:");
  console.log("   Vesting Initialized:", vestingInitialized);
  
  if (vestingInitialized) {
    // Get current vesting info for developer
    const currentVestingInfo = await distribution.getVestingInfo(currentWallets.developer);
    console.log("\n📊 Current Developer Vesting Info (Old Address):");
    console.log("   Total Amount:", ethers.formatEther(currentVestingInfo.totalAmount), "DBBPT");
    console.log("   Claimed:", ethers.formatEther(currentVestingInfo.claimed), "DBBPT");
    console.log("   Claimable:", ethers.formatEther(currentVestingInfo.claimable), "DBBPT");
    console.log("   ⚠️  Note: Vesting data will be migrated to new address");
  }
  console.log("");

  // Confirm before proceeding
  console.log("⚠️  WARNING: This will update developer wallet address!");
  console.log("   Developer - Old:", currentWallets.developer);
  console.log("   Developer - New:", newDeveloperAddress);
  console.log("");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Update team wallets (Developer changes, others stay the same)
  console.log("\n📝 Updating team wallets...");
  try {
    const updateTx = await distribution.updateTeamWallets(
      currentWallets.joseph,        // Keep Joseph the same
      currentWallets.aj,              // Keep AJ the same
      currentWallets.dsign,          // Keep D-Sign the same
      newDeveloperAddress,            // Update Developer address
      currentWallets.birdy,          // Keep Birdy the same
      currentWallets.airdrop         // Keep Airdrop the same
    );
    
    console.log("   ⏳ Transaction:", updateTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    const receipt = await updateTx.wait();
    console.log("   ✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("");

    // Verify the update
    console.log("🔍 Verifying update...");
    const updatedWallets = await distribution.getTeamWallets();
    
    if (updatedWallets.developer.toLowerCase() === newDeveloperAddress.toLowerCase()) {
      console.log("   ✅ Developer address updated successfully!");
      console.log("   New Developer Address:", updatedWallets.developer);
    } else {
      console.error("   ❌ Error: Developer address update verification failed!");
      process.exit(1);
    }

    // If vesting was initialized, check the migration
    if (vestingInitialized) {
      console.log("\n📊 Checking vesting migration...");
      
      const newDeveloperVestingInfo = await distribution.getVestingInfo(newDeveloperAddress);
      const oldDeveloperVestingInfo = await distribution.getVestingInfo(currentWallets.developer);
      
      console.log("\n   Developer - New Address Vesting Info:");
      console.log("     Total Amount:", ethers.formatEther(newDeveloperVestingInfo.totalAmount), "DBBPT");
      console.log("     Claimed:", ethers.formatEther(newDeveloperVestingInfo.claimed), "DBBPT");
      console.log("     Claimable:", ethers.formatEther(newDeveloperVestingInfo.claimable), "DBBPT");
      console.log("     Active:", newDeveloperVestingInfo.totalAmount > 0 ? "Yes" : "No");
      
      console.log("\n   Developer - Old Address Vesting Info (should be inactive):");
      console.log("     Total Amount:", ethers.formatEther(oldDeveloperVestingInfo.totalAmount), "DBBPT");
      console.log("     Claimed:", ethers.formatEther(oldDeveloperVestingInfo.claimed), "DBBPT");
      console.log("     Active:", oldDeveloperVestingInfo.totalAmount > 0 ? "Yes" : "No");
      
      if (newDeveloperVestingInfo.totalAmount > 0 && oldDeveloperVestingInfo.totalAmount === 0) {
        console.log("\n   ✅ Developer vesting data migrated successfully!");
      } else if (newDeveloperVestingInfo.totalAmount > 0) {
        console.log("\n   ✅ Developer vesting data migrated successfully!");
        console.log("   (Old address may still show data temporarily)");
      } else {
        console.log("\n   ⚠️  Warning: Please verify developer vesting migration manually");
      }
    }

    console.log("\n✅ Developer wallet address updated successfully!");
    console.log("\n📝 Summary:");
    console.log("   Developer - Old:", currentWallets.developer);
    console.log("   Developer - New:", newDeveloperAddress);
    console.log("   Transaction:", updateTx.hash);
    console.log("   Block:", receipt.blockNumber);
    
  } catch (error: any) {
    console.error("\n❌ Error updating developer wallet address:", error.message);
    if (error.data) {
      console.error("   Error data:", error.data);
    }
    if (error.reason) {
      console.error("   Error reason:", error.reason);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
