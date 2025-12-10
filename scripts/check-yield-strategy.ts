import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Check if TreasuryYieldStrategy was deployed and get its address
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Checking TreasuryYieldStrategy deployment...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  console.log("📋 Current Deployed Contracts:");
  console.log("   Token:", contractAddresses.reflectiveToken);
  console.log("   Distribution:", contractAddresses.tokenDistribution);
  console.log("   Staking:", contractAddresses.flexibleTieredStaking);
  console.log("");

  // The TreasuryYieldStrategy address should be in the deployment output
  // Let's check if we have it
  console.log("⚠️  TreasuryYieldStrategy address was not saved to networks.ts");
  console.log("   We need the address from the deployment output");
  console.log("");
  console.log("💡 Please provide the TreasuryYieldStrategy address from deployment");
  console.log("   Or we can redeploy it");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

