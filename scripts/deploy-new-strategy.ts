import { ethers } from "hardhat";
import { DEPLOYMENT_CONFIG } from "./config";

/**
 * Deploy NEW TreasuryYieldStrategy pointing to the NEW staking contract
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying NEW TreasuryYieldStrategy\n");
  console.log("Deployer:", deployer.address);

  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const NEW_STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const UNISWAP_ROUTER = DEPLOYMENT_CONFIG.UNISWAP_ROUTER;

  console.log("Configuration:");
  console.log("   Token:", TOKEN_ADDRESS);
  console.log("   Staking:", NEW_STAKING_ADDRESS);
  console.log("   Router:", UNISWAP_ROUTER);
  console.log("");

  // Deploy new strategy
  console.log("📦 Deploying TreasuryYieldStrategy...");
  const TreasuryYieldStrategy = await ethers.getContractFactory("TreasuryYieldStrategy");
  const strategy = await TreasuryYieldStrategy.deploy(
    TOKEN_ADDRESS,
    UNISWAP_ROUTER,
    deployer.address
  );
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  
  console.log("✅ NEW TreasuryYieldStrategy deployed:", strategyAddress);
  
  // Set staking contract
  console.log("\n🔧 Setting staking contract...");
  const tx = await strategy.setStakingContract(NEW_STAKING_ADDRESS);
  await tx.wait();
  console.log("✅ Staking contract set");
  console.log("");

  console.log("📝 Next Steps:");
  console.log("   1. Update staking contract to use this strategy");
  console.log("   2. Test yield deployment");
  
  console.log("\n📋 NEW Strategy Address:", strategyAddress);
  
  return strategyAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

