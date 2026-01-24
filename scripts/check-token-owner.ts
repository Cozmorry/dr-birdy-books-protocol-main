import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check who owns the token contract and why exclusion failed
 */

async function main() {
  console.log("\n🔍 Checking token contract ownership...\n");

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

  // Check owner
  try {
    const owner = await token.owner();
    console.log("👤 Token Contract Owner:", owner);
    console.log(`   Is deployer the owner: ${owner.toLowerCase() === deployer.address.toLowerCase() ? "✅ Yes" : "❌ No"}`);
    console.log("");
  } catch (error: any) {
    console.log("   Error checking owner:", error.message);
    console.log("");
  }

  // Check if new distribution is already excluded
  try {
    const debugInfo = await token.debugReflection(newDistributionAddress);
    console.log("📊 New Distribution Contract Status:");
    console.log(`   rOwned: ${debugInfo.rOwned.toString()}`);
    console.log(`   tOwned: ${debugInfo.tOwned.toString()}`);
    console.log(`   Excluded: ${debugInfo.isExcluded ? "✅ Yes" : "❌ No"}`);
    console.log("");
  } catch (error: any) {
    console.log("   Error checking status:", error.message);
    console.log("");
  }

  // Check old distribution for comparison
  const oldDeployment = JSON.parse(fs.readFileSync(deploymentFiles[1].path, "utf8"));
  const oldDistributionAddress = oldDeployment.contracts?.distribution || oldDeployment.distribution;
  
  if (oldDistributionAddress) {
    console.log("📊 Old Distribution Contract Status:");
    console.log("   Address:", oldDistributionAddress);
    try {
      const oldDebugInfo = await token.debugReflection(oldDistributionAddress);
      console.log(`   Excluded: ${oldDebugInfo.isExcluded ? "✅ Yes" : "❌ No"}`);
    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
    }
    console.log("");
  }

  console.log("✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
