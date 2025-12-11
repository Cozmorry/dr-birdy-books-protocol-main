import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

const NEW_OWNER_ADDRESS = "0x27799bb35820ecb2814ac2484ba34ad91bbda198";

async function main() {
  console.log("\n🔍 Verifying contract ownership...\n");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Expected new owner:", NEW_OWNER_ADDRESS);
  console.log("");

  // Check FlexibleTieredStaking
  if (contractAddresses.flexibleTieredStaking) {
    try {
      const staking = await ethers.getContractAt(
        "FlexibleTieredStaking",
        contractAddresses.flexibleTieredStaking
      );
      const owner = await staking.owner();
      const isNewOwner = owner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase();
      console.log(`FlexibleTieredStaking (${contractAddresses.flexibleTieredStaking}):`);
      console.log(`  Owner: ${owner}`);
      console.log(`  Status: ${isNewOwner ? "✅ Correct" : "❌ Still old owner"}`);
    } catch (error: any) {
      console.log(`FlexibleTieredStaking: ❌ Error - ${error.message}`);
    }
  }

  // Check ReflectiveToken
  if (contractAddresses.reflectiveToken) {
    try {
      const token = await ethers.getContractAt(
        "ReflectiveToken",
        contractAddresses.reflectiveToken
      );
      const owner = await token.owner();
      const isNewOwner = owner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase();
      console.log(`\nReflectiveToken (${contractAddresses.reflectiveToken}):`);
      console.log(`  Owner: ${owner}`);
      console.log(`  Status: ${isNewOwner ? "✅ Correct" : "❌ Still old owner"}`);
    } catch (error: any) {
      console.log(`\nReflectiveToken: ❌ Error - ${error.message}`);
    }
  }

  // Check TokenDistribution
  if (contractAddresses.tokenDistribution) {
    try {
      const distribution = await ethers.getContractAt(
        "TokenDistribution",
        contractAddresses.tokenDistribution
      );
      const owner = await distribution.owner();
      const isNewOwner = owner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase();
      console.log(`\nTokenDistribution (${contractAddresses.tokenDistribution}):`);
      console.log(`  Owner: ${owner}`);
      console.log(`  Status: ${isNewOwner ? "✅ Correct" : "❌ Still old owner"}`);
    } catch (error: any) {
      console.log(`\nTokenDistribution: ❌ Error - ${error.message}`);
    }
  }

  // Check TreasuryYieldStrategy
  if (contractAddresses.treasuryYieldStrategy) {
    try {
      const treasury = await ethers.getContractAt(
        "TreasuryYieldStrategy",
        contractAddresses.treasuryYieldStrategy
      );
      const owner = await treasury.owner();
      const isNewOwner = owner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase();
      console.log(`\nTreasuryYieldStrategy (${contractAddresses.treasuryYieldStrategy}):`);
      console.log(`  Owner: ${owner}`);
      console.log(`  Status: ${isNewOwner ? "✅ Correct" : "❌ Still old owner"}`);
    } catch (error: any) {
      console.log(`\nTreasuryYieldStrategy: ❌ Error - ${error.message}`);
    }
  }

  // Check ImprovedTimelock
  if (contractAddresses.improvedTimelock) {
    try {
      const timelock = await ethers.getContractAt(
        "ImprovedTimelock",
        contractAddresses.improvedTimelock
      );
      const admin = await timelock.admin();
      console.log(`\nImprovedTimelock (${contractAddresses.improvedTimelock}):`);
      console.log(`  Admin: ${admin}`);
      console.log(`  Status: ⚠️  Admin cannot be changed (set in constructor)`);
    } catch (error: any) {
      console.log(`\nImprovedTimelock: ❌ Error - ${error.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

