const { DEPLOYMENT_CONFIG } = require("./config");
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Complete Mainnet Deployment
 * 
 * This script completes the initialization and fee exclusions for already-deployed contracts.
 * Use this if deployment succeeded but initialization failed.
 */

async function main() {
  console.log(`\n🔧 Completing Dr. Birdy Books Protocol deployment on ${network.name}\n`);

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Read the latest deployment file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error("Deployments directory not found. Please deploy contracts first.");
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
    throw new Error("No deployment files found. Please deploy contracts first.");
  }

  const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0].path, "utf8"));
  console.log("📋 Using deployment info from:", deploymentFiles[0].name);
  console.log("   Token:", latestDeployment.token);
  console.log("   Staking:", latestDeployment.staking);
  console.log("   Distribution:", latestDeployment.distribution);
  console.log("   Timelock:", latestDeployment.timelock);
  console.log("   Gateway:", latestDeployment.gateway);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", latestDeployment.token);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", latestDeployment.staking);
  const distribution = await ethers.getContractAt("TokenDistribution", latestDeployment.distribution);
  const timelock = await ethers.getContractAt("ImprovedTimelock", latestDeployment.timelock);

  // ===============================
  // STEP 1: Initialize ReflectiveToken
  // ===============================

  console.log("🔧 Step 1: Initializing ReflectiveToken...");

  try {
    // Check if already initialized
    const name = await token.name().catch(() => null);
    if (name) {
      console.log("   ✅ Token already initialized (name:", name, ")");
    } else {
      const tx = await token.initialize(
        DEPLOYMENT_CONFIG.UNISWAP_ROUTER,
        DEPLOYMENT_CONFIG.MARKETING_WALLET,
        latestDeployment.staking,
        latestDeployment.gateway,
        DEPLOYMENT_CONFIG.PRIMARY_ORACLE,
        { gasLimit: 10_000_000 }
      );
      console.log("   ⏳ Waiting for initialization transaction...");
      await tx.wait();
      console.log("   ✅ ReflectiveToken initialized successfully! (TX:", tx.hash, ")");
    }
  } catch (err: any) {
    if (err.message.includes("already initialized") || err.message.includes("Initializable: contract is already initialized")) {
      console.log("   ✅ Token already initialized");
    } else {
      throw err;
    }
  }

  // ===============================
  // STEP 2: Post-Deployment Setup
  // ===============================

  console.log("\n🔧 Step 2: Setting up post-deployment configurations...");

  // Set timelock contract
  try {
    const currentTimelock = await token.timelock().catch(() => ethers.ZeroAddress);
    if (currentTimelock === ethers.ZeroAddress || currentTimelock.toLowerCase() !== latestDeployment.timelock.toLowerCase()) {
      const setTimelockTx = await token.setTimelock(latestDeployment.timelock);
      await setTimelockTx.wait();
      console.log("   ✅ Timelock contract set (TX:", setTimelockTx.hash, ")");
    } else {
      console.log("   ✅ Timelock contract already set");
    }
  } catch (err: any) {
    console.warn("   ⚠️  Failed to set timelock:", err.message);
  }

  // Set distribution contract
  try {
    const currentDistribution = await token.tokenDistribution().catch(() => ethers.ZeroAddress);
    if (currentDistribution === ethers.ZeroAddress || currentDistribution.toLowerCase() !== latestDeployment.distribution.toLowerCase()) {
      const setDistributionTx = await token.setDistributionContract(latestDeployment.distribution);
      await setDistributionTx.wait();
      console.log("   ✅ Distribution contract set (TX:", setDistributionTx.hash, ")");
    } else {
      console.log("   ✅ Distribution contract already set");
    }
  } catch (err: any) {
    console.warn("   ⚠️  Failed to set distribution contract:", err.message);
  }

  // Create Uniswap pair
  try {
    const pairAddress = await token.pairAddress().catch(() => ethers.ZeroAddress);
    if (pairAddress === ethers.ZeroAddress) {
      const createPairTx = await token.createUniswapPair();
      await createPairTx.wait();
      console.log("   ✅ Uniswap pair created (TX:", createPairTx.hash, ")");
    } else {
      console.log("   ✅ Uniswap pair already exists:", pairAddress);
    }
  } catch (err: any) {
    console.warn("   ⚠️  Failed to create Uniswap pair:", err.message);
  }

  // ===============================
  // STEP 3: Exclude All Addresses From Fees
  // ===============================

  console.log("\n🔒 Step 3: Excluding addresses from fees...");

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

  // Deduplicate addresses (case-insensitive)
  const uniqueAddresses = Array.from(
    new Set(addressesToExclude.map((addr) => ethers.getAddress(addr.toLowerCase())))
  );

  console.log(`\n📋 Found ${uniqueAddresses.length} unique addresses to exclude:`);
  uniqueAddresses.forEach((addr, index) => {
    // Try to identify the address
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

  // Exclude each address
  let excludedCount = 0;
  let failedCount = 0;
  const excludedAddresses: string[] = [];
  const failedAddresses: string[] = [];

  for (const addr of uniqueAddresses) {
    try {
      const checksummedAddr = ethers.getAddress(addr);
      
      // Check if already excluded using debugReflection (optional check)
      let alreadyExcluded = false;
      try {
        const debugInfo = await token.debugReflection(checksummedAddr);
        alreadyExcluded = debugInfo.isExcluded;
      } catch (debugErr) {
        // If debugReflection fails, just try to exclude anyway
      }

      if (alreadyExcluded) {
        console.log(`\n   ⏭️  ${checksummedAddr} already excluded, skipping...`);
        excludedCount++;
        excludedAddresses.push(checksummedAddr);
        continue;
      }

      console.log(`\n   Excluding ${checksummedAddr}...`);
      const excludeTx = await token.excludeFromFee(checksummedAddr, true);
      console.log("   ⏳ Waiting for confirmation...");
      const receipt = await excludeTx.wait();
      
      // Check if transaction actually did something (gas used > 21000 means it executed)
      if (receipt.gasUsed > 21000n) {
        excludedCount++;
        excludedAddresses.push(checksummedAddr);
        console.log(`   ✅ Excluded successfully (TX: ${excludeTx.hash})`);
      } else {
        // Low gas means it was a no-op (already excluded)
        excludedCount++;
        excludedAddresses.push(checksummedAddr);
        console.log(`   ⏭️  Already excluded (no-op, TX: ${excludeTx.hash})`);
      }
    } catch (err: any) {
      failedCount++;
      failedAddresses.push(addr);
      console.warn(`   ⚠️  Failed to exclude ${addr}: ${err.message}`);
    }
  }

  console.log(`\n✅ Fee exclusion complete:`);
  console.log(`   ✅ ${excludedCount} addresses excluded`);
  if (failedCount > 0) {
    console.log(`   ⚠️  ${failedCount} addresses failed to exclude`);
  }

  // ===============================
  // STEP 4: Verify Setup
  // ===============================

  console.log("\n🔍 Step 4: Verifying setup...");

  try {
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    console.log(`   ✅ Token: ${name} (${symbol})`);
    console.log(`   ✅ Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);

    // Verify some exclusions
    console.log("\n   Verifying fee exclusions:");
    for (const addr of excludedAddresses.slice(0, 3)) {
      try {
        const debugInfo = await token.debugReflection(addr);
        console.log(`   ${debugInfo.isExcluded ? "✅" : "❌"} ${addr}: ${debugInfo.isExcluded ? "EXCLUDED" : "NOT EXCLUDED"}`);
      } catch (err) {
        console.log(`   ⚠️  ${addr}: Could not verify`);
      }
    }
  } catch (err: any) {
    console.warn("   ⚠️  Verification failed:", err.message);
  }

  console.log("\n🎉 Deployment completion finished!");
  console.log("\n📝 Summary:");
  console.log("   Token Address:", latestDeployment.token);
  console.log("   Staking Address:", latestDeployment.staking);
  console.log("   Distribution Address:", latestDeployment.distribution);
  console.log("   Timelock Address:", latestDeployment.timelock);
  console.log("   Gateway Address:", latestDeployment.gateway);
  console.log(`\n   ✅ ${excludedCount} addresses excluded from fees`);
  if (failedAddresses.length > 0) {
    console.log(`\n   ⚠️  Failed addresses (run manually if needed):`);
    failedAddresses.forEach((addr) => console.log(`      - ${addr}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
