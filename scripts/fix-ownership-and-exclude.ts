const { DEPLOYMENT_CONFIG } = require("./config");
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Fix Ownership and Exclude Addresses
 * 
 * This script attempts to fix the ownership issue and exclude addresses.
 * Since the owner is zero address, we need to check if there's a way to recover.
 */

async function main() {
  console.log(`\n🔧 Fixing ownership and excluding addresses on ${network.name}\n`);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");

  // Read the latest deployment file
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      path: path.join(deploymentsDir, f),
      time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0].path, "utf8"));
  const tokenAddress = latestDeployment.token;
  console.log("Token Address:", tokenAddress);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check current owner
  const currentOwner = await token.owner();
  console.log("Current Owner:", currentOwner);
  console.log("");

  if (currentOwner === ethers.ZeroAddress) {
    console.log("❌ CRITICAL: Owner is zero address!");
    console.log("");
    console.log("⚠️  The contract was deployed but ownership was not set correctly.");
    console.log("⚠️  This happened because the contract uses upgradeable patterns but was deployed directly.");
    console.log("");
    console.log("🔧 SOLUTION: You need to redeploy using the proxy pattern OR");
    console.log("   deploy a new contract with proper initialization.");
    console.log("");
    console.log("📝 Options:");
    console.log("   1. Redeploy using scripts/deploy-with-proxy.ts (recommended)");
    console.log("   2. Deploy a new non-upgradeable version");
    console.log("   3. Contact OpenZeppelin support if this is a critical production contract");
    console.log("");
    console.log("⚠️  WARNING: With zero address as owner, you cannot:");
    console.log("   - Exclude addresses from fees");
    console.log("   - Change any contract settings");
    console.log("   - Transfer ownership");
    console.log("   - Use any owner-only functions");
    console.log("");
    return;
  }

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("⚠️  WARNING: Deployer is not the owner!");
    console.log("   Owner:", currentOwner);
    console.log("   Deployer:", deployer.address);
    console.log("");
    console.log("You need to use the owner wallet to exclude addresses.");
    return;
  }

  // If we get here, owner is set and matches deployer
  console.log("✅ Owner is set correctly!");
  console.log("");

  // Now exclude addresses
  console.log("🔒 Excluding addresses from fees...\n");

  // Collect all addresses to exclude
  const addressesToExclude: string[] = [];

  // Add all team wallets
  const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS || {};
  for (const [key, wallet] of Object.entries(teamWallets)) {
    if (typeof wallet === "string" && wallet !== ethers.ZeroAddress) {
      addressesToExclude.push(wallet);
    }
  }

  // Add marketing wallet
  if (DEPLOYMENT_CONFIG.MARKETING_WALLET && DEPLOYMENT_CONFIG.MARKETING_WALLET !== ethers.ZeroAddress) {
    addressesToExclude.push(DEPLOYMENT_CONFIG.MARKETING_WALLET);
  }

  // Add all addresses from EXCLUDE_FROM_FEES array
  if (DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES && Array.isArray(DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES)) {
    for (const addr of DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES) {
      if (typeof addr === "string" && addr !== ethers.ZeroAddress) {
        addressesToExclude.push(addr);
      }
    }
  }

  // Add deployer address (owner)
  addressesToExclude.push(deployer.address);

  // Deduplicate addresses
  const uniqueAddresses = Array.from(
    new Set(addressesToExclude.map((addr) => ethers.getAddress(addr.toLowerCase())))
  );

  console.log(`📋 Found ${uniqueAddresses.length} unique addresses to exclude:\n`);
  uniqueAddresses.forEach((addr, index) => {
    let label = "";
    if (addr.toLowerCase() === deployer.address.toLowerCase()) {
      label = " (Deployer/Owner)";
    } else if (addr.toLowerCase() === DEPLOYMENT_CONFIG.MARKETING_WALLET?.toLowerCase()) {
      label = " (Marketing Wallet)";
    } else if (addr.toLowerCase() === teamWallets.AIRDROP?.toLowerCase()) {
      label = " (Airdrop Wallet)";
    } else if (addr.toLowerCase() === teamWallets.J?.toLowerCase()) {
      label = " (Team J)";
    } else if (addr.toLowerCase() === teamWallets.A?.toLowerCase()) {
      label = " (Team A)";
    } else if (addr.toLowerCase() === teamWallets.D?.toLowerCase()) {
      label = " (Team D)";
    } else if (addr.toLowerCase() === teamWallets.M?.toLowerCase()) {
      label = " (Team M)";
    } else if (addr.toLowerCase() === teamWallets.B?.toLowerCase()) {
      label = " (Team B)";
    }
    console.log(`   ${index + 1}. ${addr}${label}`);
  });

  console.log("");

  // Exclude each address
  let excludedCount = 0;
  let failedCount = 0;

  for (const addr of uniqueAddresses) {
    try {
      const checksummedAddr = ethers.getAddress(addr);
      
      // Check if already excluded
      try {
        const debugInfo = await token.debugReflection(checksummedAddr);
        if (debugInfo.isExcluded) {
          console.log(`⏭️  ${checksummedAddr} already excluded, skipping...`);
          excludedCount++;
          continue;
        }
      } catch (debugErr) {
        // Continue anyway
      }

      console.log(`Excluding ${checksummedAddr}...`);
      const excludeTx = await token.excludeFromFee(checksummedAddr, true);
      console.log("   ⏳ Waiting for confirmation...");
      const receipt = await excludeTx.wait();
      excludedCount++;
      console.log(`   ✅ Excluded successfully (TX: ${excludeTx.hash})\n`);
    } catch (err: any) {
      failedCount++;
      console.warn(`   ⚠️  Failed: ${err.message}\n`);
    }
  }

  console.log("=".repeat(60));
  console.log(`✅ Excluded: ${excludedCount}`);
  if (failedCount > 0) {
    console.log(`⚠️  Failed: ${failedCount}`);
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
