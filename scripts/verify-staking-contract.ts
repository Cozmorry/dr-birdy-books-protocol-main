import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Verify staking contract is set correctly
 */

async function main() {
  console.log("\n🔍 Verifying staking contract...\n");

  const [deployer] = await ethers.getSigners();

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
  const expectedStaking = contracts.staking;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Try different ways to read the staking contract
  console.log("📋 Checking staking contract address...");
  console.log("   Expected:", expectedStaking);
  console.log("");

  try {
    const stakingContract = await token.stakingContract();
    console.log("   Current (stakingContract()):", stakingContract);
    
    if (stakingContract.toLowerCase() === expectedStaking.toLowerCase()) {
      console.log("   ✅ Staking contract is set correctly!");
    } else if (stakingContract === ethers.ZeroAddress) {
      console.log("   ⚠️  Staking contract is not set (zero address)");
      console.log("   📝 Setting it now...");
      
      const tx = await token.setStakingContract(expectedStaking);
      console.log("   ⏳ Transaction:", tx.hash);
      await tx.wait();
      console.log("   ✅ Staking contract set!");
      
      // Verify again
      const newStaking = await token.stakingContract();
      console.log("   ✅ Verified:", newStaking);
    } else {
      console.log("   ⚠️  Staking contract is set to a different address");
      console.log("   Current:", stakingContract);
      console.log("   Expected:", expectedStaking);
    }
  } catch (err: any) {
    console.log("   ❌ Error reading staking contract:", err.message);
  }

  console.log("\n✅ Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
