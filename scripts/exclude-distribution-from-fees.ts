import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔧 Excluding TokenDistribution contract from fees...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);

  console.log("📋 Token:", contractAddresses.reflectiveToken);
  console.log("📋 Distribution:", contractAddresses.tokenDistribution);
  console.log("");

  console.log("Excluding TokenDistribution from fees...");
  const tx = await token.excludeFromFee(contractAddresses.tokenDistribution, true);
  await tx.wait();
  console.log("✅ TokenDistribution excluded!");
  console.log(`   TX: ${tx.hash}`);
  console.log("\n💡 Now you can transfer tokens to the distribution contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

