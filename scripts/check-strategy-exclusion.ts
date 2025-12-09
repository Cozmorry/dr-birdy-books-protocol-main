import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  const contractAddresses = getContractAddresses(chainId);
  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const strategyAddress = "0x1eDa0B2c614890DD974336bBEdE5aB4F4a55666f";
  
  console.log("🔍 Checking if strategy is excluded from fees...");
  console.log("Strategy:", strategyAddress);
  
  try {
    // Try getAccountInfo which returns (rOwned, tOwned, isExcluded)
    const accountInfo = await token.getAccountInfo(strategyAddress);
    const isExcluded = accountInfo[2];
    console.log("✅ Strategy excluded from fees:", isExcluded);
    
    if (!isExcluded) {
      console.log("\n⚠️  Strategy is NOT excluded from fees!");
      console.log("   This means strategy will pay fees when receiving tokens");
      console.log("   Should exclude it: token.excludeFromFee(strategyAddress, true)");
    } else {
      console.log("\n✅ Strategy IS excluded from fees - perfect!");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check:", error.message);
  }
}

main().catch(console.error);

