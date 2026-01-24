import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check token balance and fix any issues after redeployment
 */

async function main() {
  console.log("\n🔍 Checking token balance and fixing issues...\n");

  const [deployer] = await ethers.getSigners();
  
  // Read latest deployment
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
  const newDistributionAddress = latestDeployment.contracts?.distribution || latestDeployment.distribution;
  const tokenAddress = latestDeployment.contracts?.token || latestDeployment.token;

  if (!newDistributionAddress || !tokenAddress) {
    throw new Error("Missing contract addresses");
  }

  console.log("📋 New TokenDistribution:", newDistributionAddress);
  console.log("📋 Token Contract:", tokenAddress);
  console.log("");

  const distribution = await ethers.getContractAt("TokenDistribution", newDistributionAddress);
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check balances
  const deployerBalance = await token.balanceOf(deployer.address);
  const contractBalance = await token.balanceOf(newDistributionAddress);
  const expectedBalance = ethers.parseEther("750000");

  console.log("💰 Token Balances:");
  console.log(`   Deployer: ${ethers.formatEther(deployerBalance)} DBBPT`);
  console.log(`   New Contract: ${ethers.formatEther(contractBalance)} DBBPT`);
  console.log(`   Expected in Contract: ${ethers.formatEther(expectedBalance)} DBBPT`);
  console.log("");

  // Check distribution status
  const distComplete = await distribution.isDistributionComplete();
  console.log("📊 Distribution Status:");
  console.log(`   Complete: ${distComplete ? "✅ Yes" : "❌ No"}`);
  console.log("");

  // Fix token balance if needed
  if (contractBalance < expectedBalance && deployerBalance >= expectedBalance) {
    console.log("⚠️  Tokens are in deployer wallet, transferring to contract...");
    const transferTx = await token.transfer(newDistributionAddress, expectedBalance);
    console.log("   ⏳ Transaction:", transferTx.hash);
    await transferTx.wait();
    
    const newContractBalance = await token.balanceOf(newDistributionAddress);
    console.log(`   ✅ Tokens transferred: ${ethers.formatEther(newContractBalance)} DBBPT`);
    console.log("");
  } else if (contractBalance < expectedBalance) {
    console.log("❌ Contract doesn't have enough tokens!");
    console.log(`   Missing: ${ethers.formatEther(expectedBalance - contractBalance)} DBBPT`);
    console.log("   You may need to transfer tokens manually.");
    console.log("");
  } else {
    console.log("✅ Contract has sufficient tokens!");
    console.log("");
  }

  // Fix distribution complete status if needed
  if (!distComplete) {
    console.log("⚠️  Distribution not marked as complete, fixing...");
    try {
      const completeTx = await distribution.markDistributionComplete();
      console.log("   ⏳ Transaction:", completeTx.hash);
      await completeTx.wait();
      
      const newDistComplete = await distribution.isDistributionComplete();
      console.log(`   ✅ Distribution complete: ${newDistComplete ? "Yes" : "No"}`);
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log("   You may need to check the contract state manually.");
    }
    console.log("");
  }

  // Final verification
  console.log("🔍 Final Verification:");
  const finalBalance = await token.balanceOf(newDistributionAddress);
  const finalDistComplete = await distribution.isDistributionComplete();
  const devVesting = await distribution.getVestingInfo("0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b");
  const [devTotal, devClaimed, devClaimable] = devVesting;

  console.log(`   Contract Balance: ${ethers.formatEther(finalBalance)} DBBPT`);
  console.log(`   Distribution Complete: ${finalDistComplete ? "✅ Yes" : "❌ No"}`);
  console.log(`   Developer Vesting Active: ${devTotal > 0n ? "✅ Yes" : "❌ No"}`);
  console.log(`   Developer Total: ${ethers.formatEther(devTotal)} DBBPT`);
  console.log(`   Developer Claimable: ${ethers.formatEther(devClaimable)} DBBPT`);
  console.log("");

  if (finalBalance >= expectedBalance && finalDistComplete && devTotal > 0n) {
    console.log("✅ Everything looks good!");
  } else {
    console.log("⚠️  Some issues remain. Please check manually.");
  }

  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
