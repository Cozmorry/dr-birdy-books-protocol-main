const { DEPLOYMENT_CONFIG } = require("./config");
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Diagnose why excludeFromFee is failing
 */

async function main() {
  console.log(`\n🔍 Diagnosing exclusion issue on ${network.name}\n`);

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

  // Check 1: Who is the owner?
  try {
    const owner = await token.owner();
    console.log("✅ Contract Owner:", owner);
    console.log("   Deployer Address:", deployer.address);
    console.log("   Match:", owner.toLowerCase() === deployer.address.toLowerCase() ? "✅ YES" : "❌ NO");
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("   ⚠️  WARNING: Deployer is not the owner!");
    }
  } catch (err: any) {
    console.log("❌ Could not get owner:", err.message);
  }

  // Check 2: Is trading enabled?
  try {
    const tradingEnabled = await token.tradingEnabled();
    console.log("\n✅ Trading Enabled:", tradingEnabled);
  } catch (err: any) {
    console.log("\n❌ Could not check trading:", err.message);
  }

  // Check 3: Is swap enabled?
  try {
    const swapEnabled = await token.swapEnabled();
    console.log("✅ Swap Enabled:", swapEnabled);
  } catch (err: any) {
    console.log("❌ Could not check swap:", err.message);
  }

  // Check 4: Try to get contract status
  try {
    const status = await (token as any).getContractStatus();
    console.log("\n📊 Contract Status:");
    console.log("   Trading Enabled:", status.isTradingEnabled);
    console.log("   Swap Enabled:", status.isSwapEnabled);
    console.log("   Pair Exists:", status.pairExists);
    console.log("   Timelock Exists:", status.timelockExists);
    console.log("   Distribution Exists:", status.distributionExists);
  } catch (err: any) {
    console.log("\n⚠️  Could not get contract status:", err.message);
  }

  // Check 5: Check if timelock is set and if it's required
  try {
    const timelock = await token.timelock();
    console.log("\n✅ Timelock Address:", timelock);
    if (timelock !== ethers.ZeroAddress) {
      const timelockDelay = await token.timelockDelay();
      console.log("   Timelock Delay:", timelockDelay.toString(), "seconds");
      console.log("   ⚠️  If timelock is set, changes might need to be queued");
    }
  } catch (err: any) {
    console.log("\n❌ Could not check timelock:", err.message);
  }

  // Check 6: Try a simple read operation
  try {
    const name = await token.name();
    console.log("\n✅ Token Name:", name);
  } catch (err: any) {
    console.log("\n❌ Could not read token name:", err.message);
  }

  // Check 7: Try to check if an address is already excluded
  const testAddress = DEPLOYMENT_CONFIG.TEAM_WALLETS.J;
  try {
    const debugInfo = await token.debugReflection(testAddress);
    console.log("\n📋 Test Address Exclusion Status:");
    console.log("   Address:", testAddress);
    console.log("   Is Excluded:", debugInfo.isExcluded);
    console.log("   rOwned:", debugInfo.rOwned.toString());
    console.log("   tOwned:", debugInfo.tOwned.toString());
  } catch (err: any) {
    console.log("\n❌ Could not check exclusion status:", err.message);
  }

  // Check 8: Try to estimate gas for excludeFromFee
  console.log("\n🔧 Testing excludeFromFee call...");
  try {
    const testAddr = DEPLOYMENT_CONFIG.TEAM_WALLETS.J;
    const gasEstimate = await token.excludeFromFee.estimateGas(testAddr, true);
    console.log("   ✅ Gas estimate successful:", gasEstimate.toString());
    console.log("   This means the function call should work!");
  } catch (err: any) {
    console.log("   ❌ Gas estimate failed:", err.message);
    console.log("   This means the transaction will revert");
    
    // Try to decode the error
    if (err.data) {
      console.log("   Error data:", err.data);
    }
    if (err.reason) {
      console.log("   Error reason:", err.reason);
    }
  }

  // Check 9: Check if contract is paused (if it has pause functionality)
  try {
    const paused = await token.paused();
    console.log("\n✅ Contract Paused:", paused);
    if (paused) {
      console.log("   ⚠️  Contract is paused - this might prevent exclusions");
    }
  } catch (err: any) {
    // Contract might not have pause functionality
    console.log("\n⚠️  Could not check pause status (might not be implemented)");
  }

  console.log("\n" + "=".repeat(60));
  console.log("Diagnosis complete!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
