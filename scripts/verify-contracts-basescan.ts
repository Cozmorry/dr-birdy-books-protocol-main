import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Generate verification commands for BaseScan
 */

async function main() {
  console.log("\n🔍 Generating BaseScan verification commands...\n");

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
  const contracts = latestDeployment.contracts || latestDeployment;

  console.log("📋 Contract addresses from:", deploymentFiles[0].name);
  console.log("");

  const { DEPLOYMENT_CONFIG } = require("./config");

  // Generate verification commands
  console.log("🔍 BaseScan Verification Commands:\n");
  console.log("=".repeat(80));

  // 1. ArweaveGateway (simple contract, no constructor args)
  if (contracts.gateway) {
    console.log("\n1️⃣ ArweaveGateway:");
    console.log(`   npx hardhat verify --network mainnet ${contracts.gateway}`);
  }

  // 2. TokenDistribution (simple contract, no constructor args)
  if (contracts.distribution) {
    console.log("\n2️⃣ TokenDistribution:");
    console.log(`   npx hardhat verify --network mainnet ${contracts.distribution}`);
  }

  // 3. ImprovedTimelock (has constructor args: admin, delay)
  if (contracts.timelock) {
    const [deployer] = await ethers.getSigners();
    const delay = 172800; // 2 days
    console.log("\n3️⃣ ImprovedTimelock:");
    console.log(`   npx hardhat verify --network mainnet ${contracts.timelock} "${deployer.address}" "${delay}"`);
  }

  // 4. ReflectiveToken Implementation (verify implementation, not proxy)
  if (contracts.tokenImplementation) {
    const primaryOracle = DEPLOYMENT_CONFIG.PRIMARY_ORACLE;
    console.log("\n4️⃣ ReflectiveToken (Implementation):");
    console.log(`   npx hardhat verify --network mainnet ${contracts.tokenImplementation}`);
    console.log("   ⚠️  Note: This is the implementation contract. Proxy verification is different.");
  }

  // 5. ReflectiveToken Proxy (verify proxy with implementation)
  if (contracts.token && contracts.tokenImplementation) {
    console.log("\n5️⃣ ReflectiveToken (Proxy):");
    console.log(`   npx hardhat verify --network mainnet ${contracts.token}`);
    console.log("   ⚠️  Proxy verification: Use BaseScan's proxy verification tool");
    console.log("   📝 Steps:");
    console.log("      1. Go to BaseScan: https://basescan.org/address/" + contracts.token);
    console.log("      2. Click 'Contract' tab");
    console.log("      3. Click 'Verify and Publish'");
    console.log("      4. Select 'Proxy' contract type");
    console.log("      5. Enter implementation address:", contracts.tokenImplementation);
  }

  // 6. FlexibleTieredStaking (has constructor args: token, primaryOracle, backupOracle)
  if (contracts.staking) {
    const primaryOracle = DEPLOYMENT_CONFIG.PRIMARY_ORACLE;
    const backupOracle = DEPLOYMENT_CONFIG.BACKUP_ORACLE;
    console.log("\n6️⃣ FlexibleTieredStaking:");
    console.log(`   npx hardhat verify --network mainnet ${contracts.staking} "${contracts.token}" "${primaryOracle}" "${backupOracle}"`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Tips:");
  console.log("   • Make sure ETHERSCAN_API_KEY is set in your .env file");
  console.log("   • BaseScan uses the same API as Etherscan");
  console.log("   • Proxy contracts need special verification (use BaseScan UI)");
  console.log("   • Run these commands one at a time");
  console.log("");

  // Also save to a file for easy copy-paste
  const verifyFile = path.join(deploymentsDir, `verify-commands-${Date.now()}.txt`);
  const commands = [
    `# BaseScan Verification Commands`,
    `# Generated: ${new Date().toISOString()}`,
    ``,
    `# 1. ArweaveGateway`,
    `npx hardhat verify --network mainnet ${contracts.gateway}`,
    ``,
    `# 2. TokenDistribution`,
    `npx hardhat verify --network mainnet ${contracts.distribution}`,
    ``,
    `# 3. ImprovedTimelock`,
    `npx hardhat verify --network mainnet ${contracts.timelock} "${latestDeployment.deployer || 'YOUR_DEPLOYER_ADDRESS'}" "172800"`,
    ``,
    `# 4. ReflectiveToken Implementation`,
    `npx hardhat verify --network mainnet ${contracts.tokenImplementation || 'N/A'}`,
    ``,
    `# 5. FlexibleTieredStaking`,
    `npx hardhat verify --network mainnet ${contracts.staking} "${contracts.token}" "${DEPLOYMENT_CONFIG.PRIMARY_ORACLE}" "${DEPLOYMENT_CONFIG.BACKUP_ORACLE}"`,
    ``,
    `# 6. ReflectiveToken Proxy - Use BaseScan UI:`,
    `# https://basescan.org/address/${contracts.token}`,
    `# Implementation: ${contracts.tokenImplementation || 'N/A'}`,
  ].join("\n");

  fs.writeFileSync(verifyFile, commands);
  console.log(`💾 Verification commands saved to: ${verifyFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
