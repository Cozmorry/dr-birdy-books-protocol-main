import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Complete the distribution transfer
 * Transfers the missing 50,000 tokens to make it 1,000,000 total
 */

async function main() {
  console.log("\n💰 Completing distribution transfer...\n");

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
  const contracts = latestDeployment.contracts || latestDeployment;
  const tokenAddress = contracts.token;
  const distributionAddress = contracts.distribution;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check current balance
  const currentBalance = await token.balanceOf(distributionAddress);
  const targetBalance = ethers.parseEther("1000000"); // 1M tokens
  const missingAmount = targetBalance - currentBalance;

  console.log("📊 Current State:");
  console.log("   Distribution Balance:", ethers.formatEther(currentBalance), "DBBPT");
  console.log("   Target Balance:", ethers.formatEther(targetBalance), "DBBPT");
  console.log("   Missing Amount:", ethers.formatEther(missingAmount), "DBBPT");
  console.log("");

  if (missingAmount <= 0n) {
    console.log("✅ Distribution contract already has 1,000,000 tokens or more!");
    return;
  }

  // Check deployer balance
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("   Your Balance:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("");

  if (deployerBalance < missingAmount) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(missingAmount)} DBBPT, have ${ethers.formatEther(deployerBalance)} DBBPT`);
  }

  // Verify distribution is excluded from fees
  console.log("🔍 Verifying distribution contract is excluded from fees...");
  try {
    const debugInfo = await token.debugReflection(distributionAddress);
    if (!debugInfo.isExcluded) {
      console.log("   ⚠️  Distribution contract is NOT excluded from fees!");
      console.log("   📝 Excluding it now...");
      const excludeTx = await token.excludeFromFee(distributionAddress, true);
      await excludeTx.wait();
      console.log("   ✅ Excluded from fees!");
    } else {
      console.log("   ✅ Distribution contract is excluded from fees");
    }
  } catch (err: any) {
    console.log("   ⚠️  Could not verify exclusion:", err.message);
    console.log("   ℹ️  Continuing anyway...");
  }

  // Transfer missing tokens
  console.log("\n📝 Transferring missing tokens...");
  try {
    const transferTx = await token.transfer(distributionAddress, missingAmount);
    console.log("   ⏳ Transaction:", transferTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await transferTx.wait();
    console.log("   ✅ Tokens transferred successfully!");
    
    // Verify final balance
    const finalBalance = await token.balanceOf(distributionAddress);
    console.log("\n✅ Final Balance:", ethers.formatEther(finalBalance), "DBBPT");
    
    if (finalBalance >= targetBalance) {
      console.log("   ✅ Distribution contract now has 1,000,000 tokens!");
    } else {
      console.log("   ⚠️  Still missing some tokens. Check if fees were charged.");
    }
  } catch (err: any) {
    if (err.message.includes("nonce too low")) {
      console.log("   ⚠️  Nonce issue. Waiting 5 seconds and retrying...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      const transferTx = await token.transfer(distributionAddress, missingAmount);
      await transferTx.wait();
      console.log("   ✅ Tokens transferred successfully!");
    } else {
      throw err;
    }
  }

  console.log("\n✅ Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
