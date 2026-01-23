import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Exclude distribution contract from fees
 * This should have been done during deployment but was missed
 */

async function main() {
  console.log("\n🔒 Excluding distribution contract from fees...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");

  // Read the latest deployment file
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
  const tokenAddress = contracts.token;
  const distributionAddress = contracts.distribution;

  if (!tokenAddress || !distributionAddress) {
    throw new Error("Token or distribution address not found in deployment file");
  }

  console.log("   Token:", tokenAddress);
  console.log("   Distribution:", distributionAddress);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check if already excluded
  try {
    const debugInfo = await token.debugReflection(distributionAddress);
    if (debugInfo.isExcluded) {
      console.log("✅ Distribution contract is already excluded from fees!");
      return;
    }
  } catch (err) {
    // Continue if check fails
  }

  // Exclude distribution contract from fees
  console.log("📝 Excluding distribution contract from fees...");
  try {
    const excludeTx = await token.excludeFromFee(distributionAddress, true);
    console.log("   ⏳ Transaction:", excludeTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await excludeTx.wait();
    console.log("   ✅ Distribution contract excluded from fees!");
    
    // Verify
    const debugInfo = await token.debugReflection(distributionAddress);
    console.log("   ✅ Verified - Is Excluded:", debugInfo.isExcluded);
  } catch (err: any) {
    if (err.message.includes("nonce too low")) {
      console.log("   ⚠️  Nonce issue. Waiting 5 seconds and retrying...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      const excludeTx = await token.excludeFromFee(distributionAddress, true);
      await excludeTx.wait();
      console.log("   ✅ Distribution contract excluded from fees!");
    } else {
      throw err;
    }
  }

  console.log("\n✅ Complete!");
  console.log("\n💡 Note: The distribution contract already received 950,000 tokens (50k fee was charged).");
  console.log("   You may want to transfer an additional 50,000 tokens to make it 1,000,000 total.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
