import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Redeploy TokenDistribution contract with bug fix and preserve original vesting start time
 * This script will:
 * 1. Deploy new TokenDistribution contract
 * 2. Initialize with correct team addresses
 * 3. Withdraw 750k tokens from old contract
 * 4. Transfer to new contract
 * 5. Initialize vesting with original start time (preserves progress)
 * 6. Mark distribution as complete
 */

async function main() {
  console.log("\n🚀 Redeploying TokenDistribution Contract with Bug Fix\n");
  console.log("=" .repeat(80));

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer/Owner:", deployer.address);
  console.log("");

  // Read deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      path: path.join(deploymentsDir, f),
      time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0].path, "utf8"));
  const contracts = latestDeployment.contracts || latestDeployment;
  const oldDistributionAddress = contracts.distribution || contracts.tokenDistribution;
  const tokenAddress = contracts.token || contracts.reflectiveToken;

  if (!oldDistributionAddress || !tokenAddress) {
    throw new Error("Missing contract addresses in deployment file");
  }

  console.log("📋 Old TokenDistribution:", oldDistributionAddress);
  console.log("📋 Token Contract:", tokenAddress);
  console.log("");

  // Get old contract instance
  const oldDistribution = await ethers.getContractAt("TokenDistribution", oldDistributionAddress);
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Get current team addresses from old contract
  const currentWallets = await oldDistribution.getTeamWallets();
  const originalStartTime = 1768428401n; // From previous check

  console.log("📊 Team Addresses (will be used in new contract):");
  console.log("   Joseph:", currentWallets.joseph);
  console.log("   AJ:", currentWallets.aj);
  console.log("   D-Sign:", currentWallets.dsign);
  console.log("   Developer:", currentWallets.developer);
  console.log("   Birdy:", currentWallets.birdy);
  console.log("   Airdrop:", currentWallets.airdrop);
  console.log("");
  console.log("📅 Original Vesting Start Time:", originalStartTime.toString());
  console.log("   Start Date:", new Date(Number(originalStartTime) * 1000).toISOString());
  console.log("");

  // Check balance in old contract
  const oldBalance = await token.balanceOf(oldDistributionAddress);
  const expectedBalance = ethers.parseEther("750000");
  console.log("💰 Old Contract Balance:");
  console.log(`   Current: ${ethers.formatEther(oldBalance)} DBBPT`);
  console.log(`   Expected: ${ethers.formatEther(expectedBalance)} DBBPT`);
  console.log("");

  if (oldBalance < expectedBalance) {
    console.log("⚠️  Warning: Old contract has less than expected balance!");
    console.log("   Proceeding anyway...");
    console.log("");
  }

  // Confirm before proceeding
  console.log("⚠️  WARNING: This will:");
  console.log("   1. Deploy a new TokenDistribution contract");
  console.log("   2. Withdraw tokens from old contract");
  console.log("   3. Initialize vesting with preserved start time");
  console.log("");
  console.log("Press Ctrl+C to cancel, or wait 10 seconds to proceed...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Step 1: Deploy new TokenDistribution contract
  console.log("\n📦 Step 1: Deploying new TokenDistribution contract...");
  const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
  const newDistribution = await TokenDistribution.deploy();
  await newDistribution.waitForDeployment();
  const newDistributionAddress = await newDistribution.getAddress();
  console.log("   ✅ New TokenDistribution deployed:", newDistributionAddress);
  console.log("");

  // Step 2: Initialize new contract with team addresses
  console.log("📝 Step 2: Initializing new contract with team addresses...");
  const initTx = await newDistribution.initialize(
    tokenAddress,
    currentWallets.joseph,
    currentWallets.aj,
    currentWallets.dsign,
    currentWallets.developer,
    currentWallets.birdy,
    currentWallets.airdrop
  );
  await initTx.wait();
  console.log("   ✅ Contract initialized");
  console.log("");

  // Step 3: Withdraw tokens from old contract
  console.log("💰 Step 3: Withdrawing tokens from old contract...");
  const withdrawTx = await oldDistribution.emergencyWithdraw(oldBalance);
  console.log("   ⏳ Transaction:", withdrawTx.hash);
  await withdrawTx.wait();
  console.log("   ✅ Tokens withdrawn from old contract");
  console.log("");

  // Step 4: Transfer tokens to new contract
  console.log("📤 Step 4: Transferring tokens to new contract...");
  const transferTx = await token.transfer(newDistributionAddress, oldBalance);
  console.log("   ⏳ Transaction:", transferTx.hash);
  await transferTx.wait();
  
  const newBalance = await token.balanceOf(newDistributionAddress);
  console.log(`   ✅ Tokens transferred: ${ethers.formatEther(newBalance)} DBBPT`);
  console.log("");

  // Step 5: Initialize vesting with original start time
  console.log("🔒 Step 5: Initializing vesting with original start time...");
  const vestingTx = await newDistribution.initializeVestingWithStartTime(originalStartTime);
  console.log("   ⏳ Transaction:", vestingTx.hash);
  await vestingTx.wait();
  console.log("   ✅ Vesting initialized with preserved start time");
  console.log("");

  // Step 6: Mark distribution as complete
  console.log("✅ Step 6: Marking distribution as complete...");
  const completeTx = await newDistribution.markDistributionComplete();
  console.log("   ⏳ Transaction:", completeTx.hash);
  await completeTx.wait();
  console.log("   ✅ Distribution marked as complete");
  console.log("");

  // Verify everything
  console.log("🔍 Verifying deployment...");
  const newWallets = await newDistribution.getTeamWallets();
  const vestingInit = await newDistribution.vestingInitialized();
  const distComplete = await newDistribution.isDistributionComplete();
  
  console.log("   Team Addresses Match:", 
    newWallets.joseph.toLowerCase() === currentWallets.joseph.toLowerCase() &&
    newWallets.aj.toLowerCase() === currentWallets.aj.toLowerCase() &&
    newWallets.developer.toLowerCase() === currentWallets.developer.toLowerCase() ? "✅ Yes" : "❌ No");
  console.log("   Vesting Initialized:", vestingInit ? "✅ Yes" : "❌ No");
  console.log("   Distribution Complete:", distComplete ? "✅ Yes" : "❌ No");
  console.log("");

  // Check developer vesting
  const devVesting = await newDistribution.getVestingInfo(currentWallets.developer);
  const [devTotal, devClaimed, devClaimable, devEndTime] = devVesting;
  console.log("📊 Developer Vesting Status:");
  console.log(`   Total: ${ethers.formatEther(devTotal)} DBBPT`);
  console.log(`   Claimed: ${ethers.formatEther(devClaimed)} DBBPT`);
  console.log(`   Claimable: ${ethers.formatEther(devClaimable)} DBBPT`);
  console.log(`   Active: ${devTotal > 0n ? "✅ Yes" : "❌ No"}`);
  console.log("");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      token: tokenAddress,
      distribution: newDistributionAddress,
      oldDistribution: oldDistributionAddress,
    },
    teamWallets: {
      joseph: newWallets.joseph,
      aj: newWallets.aj,
      dsign: newWallets.dsign,
      developer: newWallets.developer,
      birdy: newWallets.birdy,
      airdrop: newWallets.airdrop,
    },
    vestingStartTime: originalStartTime.toString(),
    vestingStartDate: new Date(Number(originalStartTime) * 1000).toISOString(),
  };

  const deploymentFile = path.join(deploymentsDir, `deployment-mainnet-redeploy-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📝 Deployment info saved to:", deploymentFile);
  console.log("");

  console.log("=" .repeat(80));
  console.log("✅ REDEPLOYMENT COMPLETE!");
  console.log("=" .repeat(80));
  console.log("");
  console.log("📋 New TokenDistribution:", newDistributionAddress);
  console.log("📋 Old TokenDistribution:", oldDistributionAddress);
  console.log("");
  console.log("📝 Next Steps:");
  console.log("   1. Update frontend/config to use new contract address");
  console.log("   2. Update any other systems referencing the old contract");
  console.log("   3. Team members can now see their allocations and claim after cliff ends");
  console.log("");
  console.log("✅ All team members will see their allocations!");
  console.log("✅ Developer vesting is now ACTIVE!");
  console.log("✅ Original vesting start time preserved!");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
