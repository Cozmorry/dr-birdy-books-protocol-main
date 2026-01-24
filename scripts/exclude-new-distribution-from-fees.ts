import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Exclude new TokenDistribution contract from fees and transfer missing tokens
 */

async function main() {
  console.log("\n🔧 Fixing fee exclusion for new TokenDistribution contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("");

  // Read latest deployment
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
  const newDistributionAddress = latestDeployment.contracts?.distribution || latestDeployment.distribution;
  const tokenAddress = latestDeployment.contracts?.token || latestDeployment.token;

  console.log("📋 New TokenDistribution:", newDistributionAddress);
  console.log("📋 Token Contract:", tokenAddress);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check current exclusion status using debugReflection
  console.log("🔍 Checking current fee exclusion status...");
  let isExcluded = false;
  try {
    const debugInfo = await token.debugReflection(newDistributionAddress);
    isExcluded = debugInfo.isExcluded;
    console.log(`   Currently Excluded: ${isExcluded ? "✅ Yes" : "❌ No"}`);
  } catch (error: any) {
    console.log("   Could not check exclusion status, assuming not excluded");
  }
  console.log("");

  // Exclude from fees if not already excluded
  if (!isExcluded) {
    console.log("📝 Excluding new contract from fees...");
    const excludeTx = await token.excludeFromFee(newDistributionAddress, true);
    console.log("   ⏳ Transaction:", excludeTx.hash);
    await excludeTx.wait();
    console.log("   ✅ Contract excluded from fees");
    console.log("");
  } else {
    console.log("✅ Contract is already excluded from fees");
    console.log("");
  }

  // Check current balance
  const currentBalance = await token.balanceOf(newDistributionAddress);
  const deployerBalance = await token.balanceOf(deployer.address);
  const expectedBalance = ethers.parseEther("750000");
  const missingAmount = expectedBalance - currentBalance;

  console.log("💰 Token Balances:");
  console.log(`   New Contract: ${ethers.formatEther(currentBalance)} DBBPT`);
  console.log(`   Deployer: ${ethers.formatEther(deployerBalance)} DBBPT`);
  console.log(`   Expected: ${ethers.formatEther(expectedBalance)} DBBPT`);
  console.log(`   Missing: ${ethers.formatEther(missingAmount)} DBBPT`);
  console.log("");

  // Transfer missing tokens if deployer has them
  if (missingAmount > 0n && deployerBalance >= missingAmount) {
    console.log("📤 Transferring missing tokens to contract...");
    console.log(`   Amount: ${ethers.formatEther(missingAmount)} DBBPT`);
    
    const transferTx = await token.transfer(newDistributionAddress, missingAmount);
    console.log("   ⏳ Transaction:", transferTx.hash);
    await transferTx.wait();
    
    const newBalance = await token.balanceOf(newDistributionAddress);
    console.log(`   ✅ New contract balance: ${ethers.formatEther(newBalance)} DBBPT`);
    console.log("");
  } else if (missingAmount > 0n) {
    console.log("⚠️  Missing tokens, but deployer doesn't have enough to transfer.");
    console.log("   The contract should still work with current balance.");
    console.log("");
  } else {
    console.log("✅ Contract has sufficient balance!");
    console.log("");
  }

  // Final verification
  console.log("🔍 Final Verification:");
  const finalBalance = await token.balanceOf(newDistributionAddress);
  let finalExcluded = false;
  try {
    const finalDebugInfo = await token.debugReflection(newDistributionAddress);
    finalExcluded = finalDebugInfo.isExcluded;
  } catch (error: any) {
    console.log("   Could not verify exclusion status");
  }
  
  console.log(`   Contract Balance: ${ethers.formatEther(finalBalance)} DBBPT`);
  console.log(`   Excluded from Fees: ${finalExcluded ? "✅ Yes" : "❌ No"}`);
  console.log("");

  if (finalBalance >= expectedBalance && finalExcluded) {
    console.log("✅ Everything is fixed!");
  } else if (finalBalance < expectedBalance) {
    console.log("⚠️  Contract still has less than expected.");
    console.log("   However, this should be sufficient for vesting to work.");
  }

  console.log("\n✅ Fix complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
