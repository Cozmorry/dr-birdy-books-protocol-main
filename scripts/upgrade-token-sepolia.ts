import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting Sepolia Proxy Upgrade for ReflectiveToken...");

  // The deployed proxy address on Sepolia
  const PROXY_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6";
  
  // Recompile first
  console.log("🔨 Compiling contracts...");
  await require("hardhat").run("compile");

  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
  console.log(`🔧 Preparing to upgrade proxy at ${PROXY_ADDRESS}...`);

  // Force import the existing proxy to rebuild OpenZeppelin's local network file if missing
  console.log("📥 Registering existing proxy...");
  try {
    await upgrades.forceImport(PROXY_ADDRESS, ReflectiveToken, { kind: 'transparent' });
  } catch (e: any) {
    console.log("   (forceImport skipped or already registered)");
  }

  // Upgrade the proxy
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, ReflectiveToken, { 
    unsafeAllow: ["constructor"] 
  });
  
  // Wait for the upgrade transaction to be mined
  const receipt = await upgraded.waitForDeployment();
  const address = await upgraded.getAddress();

  console.log("✅ Successfully upgraded ReflectiveToken!");
  console.log("   Proxy Address:", address);
  console.log("   (Implementation logic has been securely swapped!)");
}

main().catch((error) => {
  console.error("❌ Upgrade Failed:", error);
  process.exitCode = 1;
});
