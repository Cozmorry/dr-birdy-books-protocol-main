import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Set distribution contract on token
 * Fixes the nonce issue from deployment
 */

async function main() {
  console.log("\n🔧 Setting distribution contract on token...\n");

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
  console.log("   Token:", latestDeployment.contracts?.token || latestDeployment.token);
  console.log("   Distribution:", latestDeployment.contracts?.distribution || latestDeployment.distribution);
  console.log("");

  const tokenAddress = latestDeployment.contracts?.token || latestDeployment.token;
  const distributionAddress = latestDeployment.contracts?.distribution || latestDeployment.distribution;

  if (!tokenAddress || !distributionAddress) {
    throw new Error("Token or distribution address not found in deployment file");
  }

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check current distribution contract
  try {
    const currentDistribution = await token.tokenDistribution();
    if (currentDistribution.toLowerCase() === distributionAddress.toLowerCase()) {
      console.log("✅ Distribution contract already set!");
      return;
    }
    console.log("   Current:", currentDistribution);
    console.log("   Setting to:", distributionAddress);
  } catch (err: any) {
    console.log("   No distribution contract set yet");
  }

  // Set distribution contract
  console.log("\n📝 Setting distribution contract...");
  try {
    const tx = await token.setDistributionContract(distributionAddress);
    console.log("   ⏳ Transaction:", tx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("   ✅ Distribution contract set successfully!");
    
    // Verify
    const newDistribution = await token.tokenDistribution();
    console.log("   ✅ Verified:", newDistribution);
  } catch (err: any) {
    if (err.message.includes("nonce too low")) {
      console.log("   ⚠️  Nonce issue detected. Waiting 5 seconds and retrying...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const tx = await token.setDistributionContract(distributionAddress);
      console.log("   ⏳ Retry Transaction:", tx.hash);
      await tx.wait();
      console.log("   ✅ Distribution contract set successfully!");
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
