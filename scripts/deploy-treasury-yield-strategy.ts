import { ethers, network } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
import { getOracleConfig } from "../frontend/src/config/networks";

/**
 * Deploy TreasuryYieldStrategy to Base Sepolia for testing
 * 
 * Usage:
 * npx hardhat run scripts/deploy-treasury-yield-strategy.ts --network baseTestnet
 */
async function main() {
  console.log(`\n🚀 Deploying TreasuryYieldStrategy on ${network.name}\n`);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Get network config
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const oracleConfig = getOracleConfig(chainId);

  // Get required addresses
  const tokenAddress = contractAddresses.reflectiveToken;
  const stakingAddress = contractAddresses.flexibleTieredStaking;
  const uniswapRouter = oracleConfig.uniswapRouter;

  // Owner address (client's address)
  const ownerAddress = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198";

  // Validate addresses
  if (tokenAddress === ethers.ZeroAddress) {
    throw new Error("ReflectiveToken not deployed on this network");
  }
  if (stakingAddress === ethers.ZeroAddress) {
    throw new Error("FlexibleTieredStaking not deployed on this network");
  }
  if (uniswapRouter === ethers.ZeroAddress) {
    throw new Error("Uniswap router not configured for this network");
  }

  console.log("Configuration:");
  console.log("  Token:", tokenAddress);
  console.log("  Staking Contract:", stakingAddress);
  console.log("  Uniswap Router:", uniswapRouter);
  console.log("  Owner:", ownerAddress);
  console.log("  Network:", network.name, `(Chain ID: ${chainId})\n`);

  // Deploy TreasuryYieldStrategy
  console.log("📦 Deploying TreasuryYieldStrategy...");
  const TreasuryYieldStrategy = await ethers.getContractFactory("TreasuryYieldStrategy");
  
  const strategy = await TreasuryYieldStrategy.deploy(
    tokenAddress,
    uniswapRouter,
    ownerAddress
  );
  
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  
  console.log("✅ TreasuryYieldStrategy deployed to:", strategyAddress);
  console.log("   Block Explorer:", `https://sepolia.basescan.org/address/${strategyAddress}`);

  // Set staking contract (only owner can do this)
  console.log("\n🔧 Setting staking contract...");
  try {
    // Note: This will fail if deployer is not owner, which is expected
    // The owner will need to call this after deployment
    const setStakingTx = await strategy.setStakingContract(stakingAddress);
    await setStakingTx.wait();
    console.log("✅ Staking contract set");
  } catch (err: any) {
    console.log("⚠️  Could not set staking contract (expected if deployer is not owner)");
    console.log("   Owner must call: setStakingContract(", stakingAddress, ")");
  }

  // Verify deployment
  console.log("\n📊 Verifying deployment...");
  const token = await strategy.token();
  const router = await strategy.uniswapRouter();
  const owner = await strategy.owner();
  const isActive = await strategy.isActive();

  console.log("  Token:", token);
  console.log("  Router:", router);
  console.log("  Owner:", owner);
  console.log("  Active:", isActive);

  if (token.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error("Token address mismatch!");
  }
  if (router.toLowerCase() !== uniswapRouter.toLowerCase()) {
    throw new Error("Router address mismatch!");
  }
  if (owner.toLowerCase() !== ownerAddress.toLowerCase()) {
    throw new Error("Owner address mismatch!");
  }

  console.log("\n✅ Deployment verified successfully!");

  // Next steps
  console.log("\n📝 Next Steps:");
  console.log("1. Owner must call setStakingContract() if not already set");
  console.log("2. Owner must call setYieldStrategy() on FlexibleTieredStaking");
  console.log("3. Owner can then enable yield with setYieldEnabled(true)");
  console.log("4. To test buyback, send ETH to strategy and call executeBuyback()");

  console.log("\n📋 Contract Addresses:");
  console.log("  TreasuryYieldStrategy:", strategyAddress);
  console.log("  ReflectiveToken:", tokenAddress);
  console.log("  FlexibleTieredStaking:", stakingAddress);

  // Save to a file for reference
  console.log("\n💾 Save this address to your config files!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

