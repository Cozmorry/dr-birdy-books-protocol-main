import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Set staking contract on token
 * Fixes the nonce issue from deployment
 */

async function main() {
  console.log("\n🔧 Setting staking contract on token...\n");

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
  console.log("   Staking:", latestDeployment.contracts?.staking || latestDeployment.staking);
  console.log("");

  const tokenAddress = latestDeployment.contracts?.token || latestDeployment.token;
  const stakingAddress = latestDeployment.contracts?.staking || latestDeployment.staking;

  if (!tokenAddress || !stakingAddress) {
    throw new Error("Token or staking address not found in deployment file");
  }

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check current staking contract
  try {
    const currentStaking = await token.stakingContract();
    if (currentStaking.toLowerCase() === stakingAddress.toLowerCase()) {
      console.log("✅ Staking contract already set!");
      return;
    }
    console.log("   Current:", currentStaking);
    console.log("   Setting to:", stakingAddress);
  } catch (err: any) {
    console.log("   No staking contract set yet");
  }

  // Set staking contract
  console.log("\n📝 Setting staking contract...");
  try {
    const tx = await token.setStakingContract(stakingAddress);
    console.log("   ⏳ Transaction:", tx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("   ✅ Staking contract set successfully!");
    
    // Verify
    const newStaking = await token.stakingContract();
    console.log("   ✅ Verified:", newStaking);
  } catch (err: any) {
    if (err.message.includes("nonce too low")) {
      console.log("   ⚠️  Nonce issue detected. Waiting 5 seconds and retrying...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const tx = await token.setStakingContract(stakingAddress);
      console.log("   ⏳ Retry Transaction:", tx.hash);
      await tx.wait();
      console.log("   ✅ Staking contract set successfully!");
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
