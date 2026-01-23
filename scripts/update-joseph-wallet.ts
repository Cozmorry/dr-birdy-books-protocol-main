import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Update Joseph's and AJ's wallet addresses in TokenDistribution contract
 * This script will:
 * 1. Get current team wallet addresses from the contract
 * 2. Update Joseph's and AJ's addresses while keeping all others the same
 * 3. If vesting is initialized, it will automatically migrate vesting data
 */

async function main() {
  console.log("\n🔄 Updating Joseph's and AJ's wallet addresses in TokenDistribution contract...\n");

  // Hardcoded new addresses
  const newJosephAddress = "0xf40df6189713FEc50AC39960e4874b75dfdeF35B";
  const newAjAddress = "0x4A44D33fb26F67348c4780aE286C736C5f0335C7";
  
  // Validate address formats
  if (!ethers.isAddress(newJosephAddress)) {
    console.error(`❌ Error: Invalid Joseph address format: ${newJosephAddress}`);
    process.exit(1);
  }
  
  if (!ethers.isAddress(newAjAddress)) {
    console.error(`❌ Error: Invalid AJ address format: ${newAjAddress}`);
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer/Owner:", deployer.address);
  console.log("📝 New Joseph Address:", newJosephAddress);
  console.log("📝 New AJ Address:", newAjAddress);
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

  // Check if new addresses are the same as current
  const josephChanged = currentWallets.joseph.toLowerCase() !== newJosephAddress.toLowerCase();
  const ajChanged = currentWallets.aj.toLowerCase() !== newAjAddress.toLowerCase();
  
  if (!josephChanged && !ajChanged) {
    console.log("⚠️  Warning: Both addresses are the same as current addresses!");
    console.log("   No update needed.");
    process.exit(0);
  }

  // Check vesting status
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("📊 Vesting Status:");
  console.log("   Vesting Initialized:", vestingInitialized);
  
  if (vestingInitialized) {
    if (josephChanged) {
      // Get current vesting info for Joseph
      const currentVestingInfo = await distribution.getVestingInfo(currentWallets.joseph);
      console.log("\n📊 Current Joseph Vesting Info:");
      console.log("   Total Amount:", ethers.formatEther(currentVestingInfo.totalAmount), "DBBPT");
      console.log("   Claimed:", ethers.formatEther(currentVestingInfo.claimed), "DBBPT");
      console.log("   Claimable:", ethers.formatEther(currentVestingInfo.claimable), "DBBPT");
      console.log("   ⚠️  Note: Vesting data will be migrated to new address");
    }
    
    if (ajChanged) {
      // Get current vesting info for AJ
      const currentAjVestingInfo = await distribution.getVestingInfo(currentWallets.aj);
      console.log("\n📊 Current AJ Vesting Info:");
      console.log("   Total Amount:", ethers.formatEther(currentAjVestingInfo.totalAmount), "DBBPT");
      console.log("   Claimed:", ethers.formatEther(currentAjVestingInfo.claimed), "DBBPT");
      console.log("   Claimable:", ethers.formatEther(currentAjVestingInfo.claimable), "DBBPT");
      console.log("   ⚠️  Note: Vesting data will be migrated to new address");
    }
  }
  console.log("");

  // Confirm before proceeding
  console.log("⚠️  WARNING: This will update wallet addresses!");
  if (josephChanged) {
    console.log("   Joseph - Old:", currentWallets.joseph);
    console.log("   Joseph - New:", newJosephAddress);
  }
  if (ajChanged) {
    console.log("   AJ - Old:", currentWallets.aj);
    console.log("   AJ - New:", newAjAddress);
  }
  console.log("");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Update team wallets (Joseph and AJ change, others stay the same)
  console.log("\n📝 Updating team wallets...");
  try {
    const updateTx = await distribution.updateTeamWallets(
      newJosephAddress,              // New Joseph address
      newAjAddress,                  // New AJ address
      currentWallets.dsign,           // Keep D-Sign the same
      currentWallets.developer,       // Keep Developer the same
      currentWallets.birdy,           // Keep Birdy the same
      currentWallets.airdrop          // Keep Airdrop the same
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
    
    let allVerified = true;
    
    if (josephChanged) {
      if (updatedWallets.joseph.toLowerCase() === newJosephAddress.toLowerCase()) {
        console.log("   ✅ Joseph's address updated successfully!");
        console.log("   New Joseph Address:", updatedWallets.joseph);
      } else {
        console.error("   ❌ Error: Joseph address update verification failed!");
        allVerified = false;
      }
    }
    
    if (ajChanged) {
      if (updatedWallets.aj.toLowerCase() === newAjAddress.toLowerCase()) {
        console.log("   ✅ AJ's address updated successfully!");
        console.log("   New AJ Address:", updatedWallets.aj);
      } else {
        console.error("   ❌ Error: AJ address update verification failed!");
        allVerified = false;
      }
    }
    
    if (!allVerified) {
      process.exit(1);
    }

    // If vesting was initialized, check the migration
    if (vestingInitialized) {
      console.log("\n📊 Checking vesting migration...");
      
      if (josephChanged) {
        const newJosephVestingInfo = await distribution.getVestingInfo(newJosephAddress);
        const oldJosephVestingInfo = await distribution.getVestingInfo(currentWallets.joseph);
        
        console.log("\n   Joseph - New Address Vesting Info:");
        console.log("     Total Amount:", ethers.formatEther(newJosephVestingInfo.totalAmount), "DBBPT");
        console.log("     Claimed:", ethers.formatEther(newJosephVestingInfo.claimed), "DBBPT");
        console.log("     Claimable:", ethers.formatEther(newJosephVestingInfo.claimable), "DBBPT");
        console.log("     Active:", newJosephVestingInfo.vestingEndTime > 0 ? "Yes" : "No");
        
        console.log("\n   Joseph - Old Address Vesting Info (should be inactive):");
        console.log("     Total Amount:", ethers.formatEther(oldJosephVestingInfo.totalAmount), "DBBPT");
        console.log("     Claimed:", ethers.formatEther(oldJosephVestingInfo.claimed), "DBBPT");
        console.log("     Active:", oldJosephVestingInfo.vestingEndTime > 0 ? "Yes" : "No");
        
        if (newJosephVestingInfo.totalAmount > 0 && oldJosephVestingInfo.totalAmount === 0) {
          console.log("\n   ✅ Joseph's vesting data migrated successfully!");
        } else {
          console.log("\n   ⚠️  Warning: Please verify Joseph's vesting migration manually");
        }
      }
      
      if (ajChanged) {
        const newAjVestingInfo = await distribution.getVestingInfo(newAjAddress);
        const oldAjVestingInfo = await distribution.getVestingInfo(currentWallets.aj);
        
        console.log("\n   AJ - New Address Vesting Info:");
        console.log("     Total Amount:", ethers.formatEther(newAjVestingInfo.totalAmount), "DBBPT");
        console.log("     Claimed:", ethers.formatEther(newAjVestingInfo.claimed), "DBBPT");
        console.log("     Claimable:", ethers.formatEther(newAjVestingInfo.claimable), "DBBPT");
        console.log("     Active:", newAjVestingInfo.vestingEndTime > 0 ? "Yes" : "No");
        
        console.log("\n   AJ - Old Address Vesting Info (should be inactive):");
        console.log("     Total Amount:", ethers.formatEther(oldAjVestingInfo.totalAmount), "DBBPT");
        console.log("     Claimed:", ethers.formatEther(oldAjVestingInfo.claimed), "DBBPT");
        console.log("     Active:", oldAjVestingInfo.vestingEndTime > 0 ? "Yes" : "No");
        
        if (newAjVestingInfo.totalAmount > 0 && oldAjVestingInfo.totalAmount === 0) {
          console.log("\n   ✅ AJ's vesting data migrated successfully!");
        } else {
          console.log("\n   ⚠️  Warning: Please verify AJ's vesting migration manually");
        }
      }
    }

    console.log("\n✅ Wallet addresses updated successfully!");
    console.log("\n📝 Summary:");
    if (josephChanged) {
      console.log("   Joseph - Old:", currentWallets.joseph);
      console.log("   Joseph - New:", newJosephAddress);
    }
    if (ajChanged) {
      console.log("   AJ - Old:", currentWallets.aj);
      console.log("   AJ - New:", newAjAddress);
    }
    console.log("   Transaction:", updateTx.hash);
    console.log("   Block:", receipt.blockNumber);
    
  } catch (error: any) {
    console.error("\n❌ Error updating wallet address:", error.message);
    if (error.data) {
      console.error("   Error data:", error.data);
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
