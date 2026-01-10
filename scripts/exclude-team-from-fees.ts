import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

/**
 * Exclude team addresses from fees so they can receive tokens
 * This fixes the reflection overflow issue when transferring from deployer
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔧 Excluding team addresses from fees...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = contractAddresses.reflectiveToken;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("📋 Token Address:", tokenAddress);
  console.log("👤 Owner Address:", deployer.address);
  console.log("");

  // List of addresses to exclude
  const addressesToExclude = [
    { name: "Team Member 1 (J)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.J },
    { name: "Team Member 2 (A)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.A },
    { name: "Team Member 5 (B)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.B },
    { name: "Airdrop Wallet", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.AIRDROP },
  ];

  // Skip Team Member 3 (D) if not set
  if (DEPLOYMENT_CONFIG.TEAM_WALLETS.D !== "0x0000000000000000000000000000000000000000") {
    addressesToExclude.push({ 
      name: "Team Member 3 (D)", 
      address: DEPLOYMENT_CONFIG.TEAM_WALLETS.D 
    });
  }

  console.log("🔒 Excluding addresses from fees (so they can receive tokens):\n");

  for (const addr of addressesToExclude) {
    try {
      console.log(`Excluding ${addr.name}...`);
      const tx = await token.excludeFromFee(addr.address, true);
      await tx.wait();
      console.log(`✅ ${addr.name} excluded! TX: ${tx.hash}\n`);
    } catch (error: any) {
      console.log(`❌ Failed for ${addr.name}: ${error.message}\n`);
    }
  }

  console.log("=".repeat(60));
  console.log("✅ Team addresses excluded from fees!");
  console.log("=".repeat(60));
  console.log("\n💡 Now you can run the distribution script again.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

