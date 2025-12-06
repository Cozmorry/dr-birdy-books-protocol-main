import { ethers } from "hardhat";

/**
 * Setup yield system on testnet
 * Connects TreasuryYieldStrategy to FlexibleTieredStaking
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("⚙️ Setting up yield system on testnet...\n");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Contract addresses
  const NEW_STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83"; // NEW deployment with yield
  const STRATEGY_ADDRESS = "0x763Bfb8752B96bd5Bd2229a08370C1333Fbfc3F1";

  console.log("📋 Contract Addresses:");
  console.log("   Staking (NEW):", NEW_STAKING_ADDRESS);
  console.log("   Strategy:", STRATEGY_ADDRESS);
  console.log("");

  // Get contract instances
  const staking = await ethers.getContractAt("FlexibleTieredStaking", NEW_STAKING_ADDRESS);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);

  // Step 1: Update staking contract in strategy
  console.log("1️⃣ Updating staking contract address in strategy...");
  try {
    const tx1 = await strategy.setStakingContract(NEW_STAKING_ADDRESS);
    await tx1.wait();
    console.log("   ✅ Staking contract updated in strategy");
  } catch (error: any) {
    console.log("   ⚠️ Error or already set:", error.message);
  }

  // Step 2: Set yield strategy in staking contract
  console.log("\n2️⃣ Setting yield strategy in staking contract...");
  try {
    const tx2 = await staking.setYieldStrategy(STRATEGY_ADDRESS);
    await tx2.wait();
    console.log("   ✅ Yield strategy set in staking");
  } catch (error: any) {
    console.log("   ⚠️ Error or already set:", error.message);
  }

  // Step 3: Set max yield deployment (50%)
  console.log("\n3️⃣ Setting max yield deployment to 50%...");
  try {
    const tx3 = await staking.setMaxYieldDeployment(5000); // 5000 basis points = 50%
    await tx3.wait();
    console.log("   ✅ Max yield deployment set to 50%");
  } catch (error: any) {
    console.log("   ⚠️ Error:", error.message);
  }

  // Step 4: Check status (but DON'T enable yet)
  console.log("\n4️⃣ Checking yield system status...");
  const yieldInfo = await staking.getYieldInfo();
  console.log("   Strategy Address:", yieldInfo.strategyAddress);
  console.log("   Deployed Shares:", yieldInfo.deployedShares.toString());
  console.log("   Total Value:", ethers.formatEther(yieldInfo.totalValue), "DBBPT");
  console.log("   APY (bps):", yieldInfo.apyBps.toString());
  console.log("   Is Active:", yieldInfo.isActive);

  const yieldEnabled = await staking.yieldEnabled();
  console.log("   Yield Enabled:", yieldEnabled);

  const maxYieldBps = await staking.maxYieldDeploymentBps();
  console.log("   Max Deployment:", Number(maxYieldBps) / 100, "%");

  console.log("\n✅ Yield system configured!");
  console.log("\n📝 Next Steps:");
  console.log("   • Stake some tokens to test");
  console.log("   • Enable yield: staking.setYieldEnabled(true)");
  console.log("   • Manually deploy: staking.deployToYield(amount)");
  console.log("   • Or stake more tokens (auto-deploys if enabled)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });

