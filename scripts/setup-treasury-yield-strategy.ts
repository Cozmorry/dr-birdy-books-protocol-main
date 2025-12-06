import { ethers, network } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Setup TreasuryYieldStrategy after deployment
 * 
 * This script:
 * 1. Sets the staking contract on TreasuryYieldStrategy
 * 2. Connects the strategy to FlexibleTieredStaking
 * 3. Enables yield on the staking contract
 * 
 * Usage:
 * npx hardhat run scripts/setup-treasury-yield-strategy.ts --network testnet
 * 
 * Note: Must be run by the owner address (0x27799bb35820Ecb2814Ac2484bA34AD91bbda198)
 */
async function main() {
  console.log(`\n🔧 Setting up TreasuryYieldStrategy on ${network.name}\n`);

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Get network config
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  // TreasuryYieldStrategy address (from deployment)
  const strategyAddress = "0xDfb6f0E9830E09C61E9F84dCc2a1605b044Fc914";
  const stakingAddress = contractAddresses.flexibleTieredStaking;

  // Owner address
  const ownerAddress = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198";

  // Verify addresses
  if (stakingAddress === ethers.ZeroAddress) {
    throw new Error("FlexibleTieredStaking not found in config");
  }

  console.log("Configuration:");
  console.log("  Strategy:", strategyAddress);
  console.log("  Staking:", stakingAddress);
  console.log("  Owner:", ownerAddress);
  console.log("  Network:", network.name, `(Chain ID: ${chainId})\n`);

  // Verify deployer is owner
  if (deployer.address.toLowerCase() !== ownerAddress.toLowerCase()) {
    console.log("⚠️  WARNING: Deployer is not the owner!");
    console.log("   Expected owner:", ownerAddress);
    console.log("   Current deployer:", deployer.address);
    console.log("   Some steps may fail if you're not the owner.\n");
  }

  // Get contracts
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", strategyAddress);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);

  // Step 1: Set staking contract on strategy
  console.log("📝 Step 1: Setting staking contract on TreasuryYieldStrategy...");
  try {
    const currentStakingContract = await strategy.stakingContract();
    if (currentStakingContract === ethers.ZeroAddress) {
      const tx1 = await strategy.setStakingContract(stakingAddress);
      console.log("   Transaction sent:", tx1.hash);
      await tx1.wait();
      console.log("   ✅ Staking contract set");
    } else {
      console.log("   ✅ Staking contract already set:", currentStakingContract);
    }
  } catch (err: any) {
    console.log("   ❌ Failed:", err.message);
    if (err.message.includes("onlyOwner")) {
      console.log("   ⚠️  You must be the owner to set the staking contract");
    }
    throw err;
  }

  // Step 2: Set yield strategy on staking contract
  console.log("\n📝 Step 2: Connecting strategy to FlexibleTieredStaking...");
  try {
    const currentStrategy = await staking.yieldStrategy();
    if (currentStrategy === ethers.ZeroAddress || 
        currentStrategy.toLowerCase() !== strategyAddress.toLowerCase()) {
      const tx2 = await staking.setYieldStrategy(strategyAddress);
      console.log("   Transaction sent:", tx2.hash);
      await tx2.wait();
      console.log("   ✅ Yield strategy set");
    } else {
      console.log("   ✅ Yield strategy already set:", currentStrategy);
    }
  } catch (err: any) {
    console.log("   ❌ Failed:", err.message);
    if (err.message.includes("onlyOwner")) {
      console.log("   ⚠️  You must be the owner to set the yield strategy");
    }
    throw err;
  }

  // Step 3: Enable yield
  console.log("\n📝 Step 3: Enabling yield on staking contract...");
  try {
    const yieldEnabled = await staking.yieldEnabled();
    if (!yieldEnabled) {
      const tx3 = await staking.setYieldEnabled(true);
      console.log("   Transaction sent:", tx3.hash);
      await tx3.wait();
      console.log("   ✅ Yield enabled");
    } else {
      console.log("   ✅ Yield already enabled");
    }
  } catch (err: any) {
    console.log("   ❌ Failed:", err.message);
    if (err.message.includes("onlyOwner")) {
      console.log("   ⚠️  You must be the owner to enable yield");
    }
    throw err;
  }

  // Verify setup
  console.log("\n📊 Verifying setup...");
  const strategyStaking = await strategy.stakingContract();
  const stakingStrategy = await staking.yieldStrategy();
  const isEnabled = await staking.yieldEnabled();
  const strategyStatus = await strategy.getStatus();

  console.log("  Strategy staking contract:", strategyStaking);
  console.log("  Staking yield strategy:", stakingStrategy);
  console.log("  Yield enabled:", isEnabled);
  console.log("  Strategy active:", strategyStatus[0]);
  console.log("  Strategy safe:", strategyStatus[1]);

  // Final verification
  if (strategyStaking.toLowerCase() === stakingAddress.toLowerCase() &&
      stakingStrategy.toLowerCase() === strategyAddress.toLowerCase() &&
      isEnabled) {
    console.log("\n✅ Setup complete! TreasuryYieldStrategy is ready to use.");
    console.log("\n📋 Summary:");
    console.log("  ✅ Staking contract set on strategy");
    console.log("  ✅ Strategy connected to staking contract");
    console.log("  ✅ Yield enabled");
    console.log("\n💡 Next steps:");
    console.log("  - Users can now stake tokens (will auto-deploy to yield)");
    console.log("  - To test buyback, send ETH to strategy and call executeBuyback()");
  } else {
    console.log("\n⚠️  Setup incomplete. Please check the configuration.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });

