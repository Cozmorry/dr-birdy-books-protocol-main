import { ethers } from "hardhat";
import { DEPLOYMENT_CONFIG } from "./config";

/**
 * Redeploy ONLY the FlexibleTieredStaking contract with yield functions
 * This allows us to test yield without redeploying token/distribution
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Redeploying FlexibleTieredStaking with yield functions...\n");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Use existing token address
  const tokenAddress = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const primaryOracle = DEPLOYMENT_CONFIG.PRIMARY_ORACLE;
  const backupOracle = DEPLOYMENT_CONFIG.BACKUP_ORACLE;

  console.log("📋 Existing Contracts:");
  console.log("   Token:", tokenAddress);
  console.log("   Primary Oracle:", primaryOracle);
  console.log("   Backup Oracle:", backupOracle);
  console.log("");

  // Deploy new staking contract
  console.log("🔨 Deploying FlexibleTieredStaking (with yield functions)...");
  const FlexibleTieredStaking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await FlexibleTieredStaking.deploy(
    tokenAddress,
    primaryOracle,
    backupOracle
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ FlexibleTieredStaking deployed:", stakingAddress);

  // Set Uniswap pair (if you have one)
  // For now, we'll skip this as it's optional for yield testing
  console.log("\n⚙️ Configuring staking contract...");
  
  // Add tiers
  console.log("Adding tiers...");
  const tiers = [
    { threshold: 0, name: "Free" },
    { threshold: ethers.parseUnits("100", 8), name: "Bronze" }, // $100
    { threshold: ethers.parseUnits("500", 8), name: "Silver" }, // $500
    { threshold: ethers.parseUnits("1000", 8), name: "Gold" },  // $1000
  ];

  for (const tier of tiers) {
    const tx = await staking.addTier(tier.threshold, tier.name);
    await tx.wait();
    console.log(`   ✅ Added tier: ${tier.name}`);
  }

  console.log("\n✅ Deployment complete!");
  console.log("\n📋 New Contract Address:");
  console.log("   FlexibleTieredStaking:", stakingAddress);
  
  console.log("\n💾 Update frontend/src/config/networks.ts:");
  console.log(`   flexibleTieredStaking: '${stakingAddress}',`);

  console.log("\n📝 Next Steps:");
  console.log("1. Update frontend config with new staking address");
  console.log("2. Deploy TreasuryYieldStrategy");
  console.log("3. Connect yield strategy to staking");
  console.log("4. Test yield deployment");

  return {
    stakingAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

