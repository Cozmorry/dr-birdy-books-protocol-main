import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Fix the 2 addresses that failed to be excluded due to nonce issues
 */

async function main() {
  console.log("\n🔒 Fixing failed fee exclusions...\n");

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

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Addresses that failed
  const failedAddresses = [
    "0xdd82052fbc8edc7091dafa1540f16c63c51cb2fb", // Team A
    deployer.address, // Deployer/Owner
  ];

  console.log("📋 Fixing exclusions for:");
  failedAddresses.forEach((addr, i) => {
    const label = addr.toLowerCase() === deployer.address.toLowerCase() ? " (Deployer/Owner)" : " (Team A)";
    console.log(`   ${i + 1}. ${addr}${label}`);
  });
  console.log("");

  for (const addr of failedAddresses) {
    try {
      // Check if already excluded
      const debugInfo = await token.debugReflection(addr);
      if (debugInfo.isExcluded) {
        console.log(`✅ ${addr} is already excluded`);
        continue;
      }

      console.log(`📝 Excluding ${addr}...`);
      const tx = await token.excludeFromFee(addr, true);
      console.log(`   ⏳ TX: ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Excluded successfully`);
    } catch (err: any) {
      if (err.message.includes("nonce too low")) {
        console.log(`   ⚠️  Nonce issue. Waiting 5 seconds and retrying...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        const tx = await token.excludeFromFee(addr, true);
        await tx.wait();
        console.log(`   ✅ Excluded successfully`);
      } else {
        console.log(`   ⚠️  Error: ${err.message}`);
      }
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
