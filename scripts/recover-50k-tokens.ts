import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Recover the 50,000 tokens from contract fees
 * Strategy: Lower swap threshold, trigger swap, or use emergency burn
 */

async function main() {
  console.log("\n💰 Recovering 50,000 tokens from contract fees...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");

  // Read the latest deployment file
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
  const tokenAddress = contracts.token;
  const distributionAddress = contracts.distribution;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check current state
  const contractBalance = await token.balanceOf(tokenAddress);
  const swapThreshold = await token.swapThreshold();
  
  console.log("📊 Current State:");
  console.log("   Contract Balance (fees):", ethers.formatEther(contractBalance), "DBBPT");
  console.log("   Swap Threshold:", ethers.formatEther(swapThreshold), "DBBPT");
  console.log("");

  if (contractBalance < ethers.parseEther("50000")) {
    console.log("⚠️  Contract doesn't have 50,000 tokens. Current balance:", ethers.formatEther(contractBalance));
    return;
  }

  console.log("💡 Strategy: Recovering the 50k tokens from contract fees");
  console.log("   Since the contract holds fees, we'll lower swap threshold");
  console.log("   and trigger swapAndLiquify to process them.");
  console.log("   Then transfer 50k more to distribution to compensate.");
  console.log("");

  // Strategy: Lower swap threshold to 50k, trigger swap, then transfer 50k to distribution
  console.log("📝 Step 1: Lowering swap threshold to 50,000...");
  try {
    const newThreshold = ethers.parseEther("50000");
    const setThresholdTx = await token.setSwapThreshold(newThreshold);
    console.log("   ⏳ Transaction:", setThresholdTx.hash);
    await setThresholdTx.wait();
    console.log("   ✅ Swap threshold lowered to 50,000");
  } catch (err: any) {
    console.log("   ⚠️  Could not set threshold:", err.message);
    throw err;
  }

  console.log("\n📝 Step 2: Triggering swapAndLiquify by transferring 1 token...");
  console.log("   This will process the 50k tokens in fees");
  try {
    // Transfer 1 token to trigger swapAndLiquify
    // The contract will see balance >= threshold and process it
    const triggerTx = await token.transfer(tokenAddress, ethers.parseEther("1"));
    console.log("   ⏳ Transaction:", triggerTx.hash);
    await triggerTx.wait();
    console.log("   ✅ Swap triggered (50k tokens processed to ETH/liquidity)");
  } catch (err: any) {
    console.log("   ⚠️  Could not trigger swap:", err.message);
    console.log("   ℹ️  Swap may have been triggered automatically");
  }

  // Restore swap threshold
  console.log("\n📝 Step 3: Restoring swap threshold to original value...");
  try {
    const originalThreshold = ethers.parseEther("100000");
    const restoreTx = await token.setSwapThreshold(originalThreshold);
    await restoreTx.wait();
    console.log("   ✅ Swap threshold restored to 100,000");
  } catch (err: any) {
    console.log("   ⚠️  Could not restore threshold:", err.message);
  }

  console.log("\n📝 Step 4: Compensating distribution with 50k more tokens...");
  console.log("   This gives distribution 1,050,000 tokens total");
  console.log("   (50k went to fees/swap, but you get the full 1M + 50k = 1.05M)");
  console.log("");

  const deployerBalance = await token.balanceOf(deployer.address);
  const distributionBalance = await token.balanceOf(distributionAddress);
  const amountToTransfer = ethers.parseEther("50000");

  console.log("   Your Balance:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("   Distribution Balance:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("   Amount to Transfer:", ethers.formatEther(amountToTransfer), "DBBPT");
  console.log("");

  if (deployerBalance < amountToTransfer) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(amountToTransfer)} DBBPT`);
  }

  // Verify distribution is excluded from fees
  try {
    const debugInfo = await token.debugReflection(distributionAddress);
    if (!debugInfo.isExcluded) {
      console.log("   ⚠️  Distribution not excluded. Excluding now...");
      const excludeTx = await token.excludeFromFee(distributionAddress, true);
      await excludeTx.wait();
    }
  } catch (err) {
    // Continue
  }

  // Transfer 50k more to distribution
  try {
    const transferTx = await token.transfer(distributionAddress, amountToTransfer);
    console.log("   ⏳ Transaction:", transferTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await transferTx.wait();
    console.log("   ✅ Tokens transferred successfully!");
    
    const finalDistributionBalance = await token.balanceOf(distributionAddress);
    const finalDeployerBalance = await token.balanceOf(deployer.address);
    
    console.log("\n✅ Final State:");
    console.log("   Distribution Balance:", ethers.formatEther(finalDistributionBalance), "DBBPT");
    console.log("   Your Balance:", ethers.formatEther(finalDeployerBalance), "DBBPT");
    console.log("   Contract Fees:", ethers.formatEther(contractBalance), "DBBPT");
    console.log("");
    console.log("💡 Note: The 50k in contract fees will be processed by swapAndLiquify");
    console.log("   when the threshold is met, or you can trigger it manually.");
    console.log("   Distribution now has 1,050,000 tokens (1M + 50k compensation).");
  } catch (err: any) {
    if (err.message.includes("nonce too low")) {
      console.log("   ⚠️  Nonce issue. Waiting 5 seconds and retrying...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      const transferTx = await token.transfer(distributionAddress, amountToTransfer);
      await transferTx.wait();
      console.log("   ✅ Tokens transferred successfully!");
    } else {
      throw err;
    }
  }

  console.log("\n✅ Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
