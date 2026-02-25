import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check where the 37,500 DBBPT in fees went
 */

async function main() {
  console.log("\n💸 Checking fee distribution...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  console.log("");

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
  const tokenAddress = latestDeployment.contracts?.token || latestDeployment.token;

  console.log("📋 Token Contract:", tokenAddress);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Get fee structure
  console.log("💰 Fee Structure:");
  const taxFee = await token.taxFee();
  const liquidityFee = await token.liquidityFee();
  const marketingFee = await token.marketingFee();
  const totalFee = await token.totalFee();

  console.log(`   Tax Fee (Reflections): ${Number(taxFee) / 100}%`);
  console.log(`   Liquidity Fee: ${Number(liquidityFee) / 100}%`);
  console.log(`   Marketing Fee: ${Number(marketingFee) / 100}%`);
  console.log(`   Total Fee: ${Number(totalFee) / 100}%`);
  console.log("");

  // Calculate where 37,500 DBBPT went
  const feeAmount = 37500;
  const taxAmount = (feeAmount * Number(taxFee)) / Number(totalFee);
  const liquidityAmount = (feeAmount * Number(liquidityFee)) / Number(totalFee);
  const marketingAmount = (feeAmount * Number(marketingFee)) / Number(totalFee);

  console.log("📊 37,500 DBBPT Fee Distribution:");
  console.log(`   Tax (Reflections): ${taxAmount.toFixed(1)} DBBPT - Redistributed to all holders`);
  console.log(`   Liquidity: ${liquidityAmount.toFixed(1)} DBBPT - Held in token contract`);
  console.log(`   Marketing: ${marketingAmount.toFixed(1)} DBBPT - Sent to marketing wallet`);
  console.log("");

  // Get marketing wallet address
  const marketingWallet = await token.marketingWallet();
  console.log("👤 Marketing Wallet:", marketingWallet);
  
  // Check marketing wallet balance
  const marketingBalance = await token.balanceOf(marketingWallet);
  console.log(`   Balance: ${ethers.formatEther(marketingBalance)} DBBPT`);
  console.log("");

  // Check if marketing wallet is the deployer
  console.log("🔍 Marketing Wallet Info:");
  console.log(`   Is Deployer: ${marketingWallet.toLowerCase() === deployer.address.toLowerCase() ? "✅ Yes" : "❌ No"}`);
  
  // Check token contract balance (liquidity fees accumulate here)
  const tokenContractBalance = await token.balanceOf(tokenAddress);
  console.log("");
  console.log("💼 Token Contract Balance:");
  console.log(`   ${ethers.formatEther(tokenContractBalance)} DBBPT (liquidity fees)`);
  console.log("");

  // Check if yield strategy is set
  const yieldStrategy = await token.yieldStrategy();
  if (yieldStrategy !== ethers.ZeroAddress) {
    console.log("🏦 Yield Strategy:", yieldStrategy);
    const yieldBalance = await token.balanceOf(yieldStrategy);
    console.log(`   Balance: ${ethers.formatEther(yieldBalance)} DBBPT`);
    console.log("");
  }

  // Summary
  console.log("📋 Summary:");
  console.log("The 37,500 DBBPT in fees were distributed as:");
  console.log(`1. ${taxAmount.toFixed(1)} DBBPT - Reflected to all token holders (cannot be recovered)`);
  console.log(`2. ${liquidityAmount.toFixed(1)} DBBPT - Held in token contract for liquidity (owner can withdraw)`);
  console.log(`3. ${marketingAmount.toFixed(1)} DBBPT - Sent to marketing wallet (${marketingWallet})`);
  console.log("");

  if (marketingWallet.toLowerCase() === deployer.address.toLowerCase()) {
    console.log("✅ You control the marketing wallet!");
    console.log("   You can transfer the marketing fees back to the new distribution contract.");
  } else {
    console.log("⚠️  Marketing wallet is controlled by:", marketingWallet);
    console.log("   They would need to transfer the fees back.");
  }

  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
