import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Initialize token distribution
 * This transfers tokens to the distribution contract and sets up vesting
 */

async function main() {
  console.log("\n🎁 Initializing token distribution...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");

  // Read the latest deployment file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error("Deployments directory not found");
  }

  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      path: path.join(deploymentsDir, f),
      time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (deploymentFiles.length === 0) {
    throw new Error("No deployment files found");
  }

  const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0].path, "utf8"));
  console.log("📋 Using deployment info from:", deploymentFiles[0].name);
  
  const contracts = latestDeployment.contracts || latestDeployment;
  const tokenAddress = contracts.token;
  const distributionAddress = contracts.distribution;

  if (!tokenAddress || !distributionAddress) {
    throw new Error("Token or distribution address not found in deployment file");
  }

  console.log("   Token:", tokenAddress);
  console.log("   Distribution:", distributionAddress);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);

  // Check token balance
  const tokenBalance = await token.balanceOf(deployer.address);
  const totalSupply = await token.totalSupply();
  const distributionAmount = ethers.parseEther("1000000"); // 1M tokens (10% of supply)

  console.log("📊 Current State:");
  console.log("   Your Token Balance:", ethers.formatEther(tokenBalance), "DBBPT");
  console.log("   Total Supply:", ethers.formatEther(totalSupply), "DBBPT");
  console.log("   Distribution Amount:", ethers.formatEther(distributionAmount), "DBBPT");
  console.log("");

  if (tokenBalance < distributionAmount) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(distributionAmount)} DBBPT, have ${ethers.formatEther(tokenBalance)} DBBPT`);
  }

  // Check if distribution is already initialized
  try {
    const isComplete = await distribution.initialDistributionComplete();
    if (isComplete) {
      console.log("⚠️  Distribution already initialized!");
      console.log("   Skipping initialization...");
      return;
    }
  } catch (err) {
    // Continue if check fails
  }

  // Step 1: Transfer tokens to distribution contract
  console.log("📝 Step 1: Transferring tokens to distribution contract...");
  try {
    const transferTx = await token.transfer(distributionAddress, distributionAmount);
    console.log("   ⏳ Transaction:", transferTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await transferTx.wait();
    console.log("   ✅ Tokens transferred successfully!");
  } catch (err: any) {
    if (err.message.includes("nonce too low")) {
      console.log("   ⚠️  Nonce issue. Waiting 5 seconds and retrying...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      const transferTx = await token.transfer(distributionAddress, distributionAmount);
      await transferTx.wait();
      console.log("   ✅ Tokens transferred successfully!");
    } else {
      throw err;
    }
  }

  // Step 2: Initialize distribution contract
  console.log("\n📝 Step 2: Initializing distribution contract...");
  
  const { DEPLOYMENT_CONFIG } = require("./config");
  const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS;

  // Check if distribution contract is initialized
  try {
    // Try to read token address - if it fails, contract needs initialization
    const currentToken = await distribution.token();
    if (currentToken === ethers.ZeroAddress) {
      console.log("   📝 Distribution contract not initialized. Initializing...");
      
      // Initialize the distribution contract with team wallets
      const initTx = await distribution.initialize(
        tokenAddress,
        teamWallets.J,
        teamWallets.A,
        teamWallets.D,
        teamWallets.M,
        teamWallets.B,
        teamWallets.AIRDROP
      );
      console.log("   ⏳ Transaction:", initTx.hash);
      await initTx.wait();
      console.log("   ✅ Distribution contract initialized!");
    } else {
      console.log("   ✅ Distribution contract already initialized");
    }
  } catch (err: any) {
    if (err.message.includes("not initialized") || err.message.includes("Initializable")) {
      console.log("   📝 Distribution contract not initialized. Initializing...");
      const initTx = await distribution.initialize(
        tokenAddress,
        teamWallets.J,
        teamWallets.A,
        teamWallets.D,
        teamWallets.M,
        teamWallets.B,
        teamWallets.AIRDROP
      );
      console.log("   ⏳ Transaction:", initTx.hash);
      await initTx.wait();
      console.log("   ✅ Distribution contract initialized!");
    } else {
      console.log("   ⚠️  Could not check initialization:", err.message);
      console.log("   ℹ️  Contract may already be initialized");
    }
  }

  // Step 2B: Initialize vesting schedules
  console.log("\n📝 Step 2B: Initializing vesting schedules...");
  try {
    const vestingInitialized = await distribution.vestingInitialized();
    if (!vestingInitialized) {
      console.log("   📝 Setting up vesting schedules...");
      const vestingTx = await distribution.initializeVesting();
      console.log("   ⏳ Transaction:", vestingTx.hash);
      await vestingTx.wait();
      console.log("   ✅ Vesting schedules initialized!");
    } else {
      console.log("   ✅ Vesting already initialized");
    }
  } catch (err: any) {
    if (err.message.includes("already initialized")) {
      console.log("   ✅ Vesting already initialized");
    } else {
      console.log("   ⚠️  Could not initialize vesting:", err.message);
      console.log("   ℹ️  You may need to call initializeVesting() manually");
    }
  }

  // Step 3: Distribute initial tokens
  console.log("\n📝 Step 3: Distributing initial tokens...");
  try {
    const distributeTx = await distribution.distributeInitialTokens();
    console.log("   ⏳ Transaction:", distributeTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await distributeTx.wait();
    console.log("   ✅ Initial distribution complete!");
  } catch (err: any) {
    if (err.message.includes("already complete") || err.message.includes("already distributed")) {
      console.log("   ✅ Distribution already complete!");
    } else {
      console.log("   ⚠️  Could not distribute tokens:", err.message);
      console.log("   ℹ️  You may need to call distributeInitialTokens() manually");
    }
  }

  // Verify final state
  console.log("\n🔍 Verifying final state...");
  try {
    const distributionBalance = await token.balanceOf(distributionAddress);
    const isComplete = await distribution.initialDistributionComplete();
    
    console.log("   Distribution Contract Balance:", ethers.formatEther(distributionBalance), "DBBPT");
    console.log("   Distribution Complete:", isComplete);
    
    if (isComplete) {
      console.log("\n✅ Token distribution fully initialized!");
    } else {
      console.log("\n⚠️  Distribution not complete. Check contract state.");
    }
  } catch (err: any) {
    console.log("   ⚠️  Could not verify state:", err.message);
  }

  console.log("\n✅ Initialization script complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
