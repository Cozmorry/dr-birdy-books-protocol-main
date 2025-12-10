/**
 * @title Complete Token Distribution
 * @notice Transfers 1M tokens to token contract and initializes distribution
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("\n🚀 COMPLETING TOKEN DISTRIBUTION");
  console.log("================================================================================");
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("================================================================================");

  // Get contract addresses
  const deploymentFile = require("../deployments/deployment-mainnet-1765231331017.json");
  const TOKEN_PROXY = deploymentFile.token;
  const DISTRIBUTION = deploymentFile.distribution;

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_PROXY);
  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  const deployerBalance = await token.balanceOf(deployer.address);
  const tokenContractBalance = await token.balanceOf(TOKEN_PROXY);
  const distributionBalance = await token.balanceOf(DISTRIBUTION);
  const totalNeeded = ethers.parseEther("1000000"); // 1M tokens

  console.log("\n📊 Current Balances:");
  console.log("  Deployer:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("  Token Contract:", ethers.formatEther(tokenContractBalance), "DBBPT");
  console.log("  Distribution Contract:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("  Required:", ethers.formatEther(totalNeeded), "DBBPT");

  // Check if distribution is already complete
  const distributionComplete = await distribution.isDistributionComplete();
  if (distributionComplete) {
    console.log("\n✅ Token distribution already complete!");
    return;
  }

  // Step 1: Transfer tokens to token contract if needed
  if (tokenContractBalance < totalNeeded) {
    const amountToTransfer = totalNeeded - tokenContractBalance;
    console.log("\n📤 Step 1: Transferring", ethers.formatEther(amountToTransfer), "DBBPT to token contract...");
    
    if (deployerBalance < amountToTransfer) {
      console.error("❌ Insufficient balance! Need", ethers.formatEther(amountToTransfer), "but have", ethers.formatEther(deployerBalance));
      return;
    }

    const transferTx = await token.transfer(TOKEN_PROXY, amountToTransfer);
    console.log("   ⏳ Waiting for confirmation...");
    await transferTx.wait(2);
    console.log("✅ Tokens transferred!");
    console.log("   TX:", transferTx.hash);
    
    const newBalance = await token.balanceOf(TOKEN_PROXY);
    console.log("   Token contract now has:", ethers.formatEther(newBalance), "DBBPT");
  } else {
    console.log("\n✅ Token contract already has enough tokens!");
  }

  // Step 2: Manual initialization (more reliable)
  console.log("\n📋 Step 2: Initializing token distribution manually...");
  
  // 2a: Initialize vesting if not done
  const vestingInitialized = await distribution.vestingInitialized();
  if (!vestingInitialized) {
    console.log("   📝 Initializing vesting schedules...");
    const vestingTx = await distribution.initializeVesting();
    console.log("   ⏳ Waiting for confirmation...");
    await vestingTx.wait(2);
    console.log("✅ Vesting initialized!");
    console.log("   TX:", vestingTx.hash);
  } else {
    console.log("✅ Vesting already initialized");
  }
  
  // 2b: Transfer tokens directly from deployer to distribution
  if (distributionBalance < totalNeeded) {
    console.log("\n   📤 Transferring", ethers.formatEther(totalNeeded), "DBBPT to distribution contract...");
    const transferTx = await token.transfer(DISTRIBUTION, totalNeeded);
    console.log("   ⏳ Waiting for confirmation...");
    await transferTx.wait(2);
    console.log("✅ Tokens transferred to distribution!");
    console.log("   TX:", transferTx.hash);
  } else {
    console.log("✅ Distribution contract already has enough tokens");
  }
  
  // 2c: Complete distribution
  if (!distributionComplete) {
    console.log("\n   📋 Completing distribution (distributing airdrop tokens)...");
    const distTx = await distribution.distributeInitialTokens();
    console.log("   ⏳ Waiting for confirmation...");
    await distTx.wait(2);
    console.log("✅ Distribution complete!");
    console.log("   TX:", distTx.hash);
  } else {
    console.log("✅ Distribution already complete");
  }

  // Verify
  const finalDistributionBalance = await token.balanceOf(DISTRIBUTION);
  const finalComplete = await distribution.isDistributionComplete();
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICATION");
  console.log("=".repeat(80));
  console.log("  Distribution Contract Balance:", ethers.formatEther(finalDistributionBalance), "DBBPT");
  console.log("  Distribution Complete:", finalComplete);
  
  if (finalComplete) {
    console.log("\n🎉 Token distribution successfully initialized!");
    console.log("   - 750,000 DBBPT allocated for team vesting (162.5k each for J/A/D/B, 100k for Developer)");
    console.log("   - 250,000 DBBPT distributed to airdrop wallet");
    console.log("   - Team members can claim vested tokens over 365 days");
  } else {
    console.log("\n⚠️  Distribution not complete. Please check the error above.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:");
    console.error(error);
    process.exit(1);
  });

