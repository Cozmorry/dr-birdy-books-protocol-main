/**
 * @title Fix Airdrop Wallet Transfer
 * @notice Excludes airdrop wallet from fees and checks blacklist status
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentFile = require("../deployments/deployment-mainnet-1765231331017.json");
  const TOKEN_PROXY = deploymentFile.token;
  const DISTRIBUTION = deploymentFile.distribution;

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_PROXY);
  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  const airdropWallet = await distribution.airdropWallet();

  console.log("\n🔧 FIXING AIRDROP WALLET TRANSFER");
  console.log("=".repeat(80));
  console.log("Airdrop Wallet:", airdropWallet);

  // Check if airdrop wallet is blacklisted
  try {
    const isBlacklisted = await token.isBlacklisted(airdropWallet);
    console.log("\n📋 Blacklist Status:");
    console.log("  Airdrop wallet blacklisted:", isBlacklisted);
    
    if (isBlacklisted) {
      console.log("\n🔧 Unblacklisting airdrop wallet...");
      const unblacklistTx = await token.unblacklist(airdropWallet);
      await unblacklistTx.wait(2);
      console.log("✅ Airdrop wallet unblacklisted!");
      console.log("   TX:", unblacklistTx.hash);
    }
  } catch (error: any) {
    console.log("⚠️  Could not check blacklist (function might not exist):", error.message);
  }

  // Exclude airdrop wallet from fees
  console.log("\n📝 Excluding airdrop wallet from fees...");
  try {
    const excludeTx = await token.excludeFromFee(airdropWallet, true);
    await excludeTx.wait(2);
    console.log("✅ Airdrop wallet excluded from fees!");
    console.log("   TX:", excludeTx.hash);
  } catch (error: any) {
    if (error.message.includes("already") || error.message.includes("same")) {
      console.log("✅ Airdrop wallet already excluded from fees");
    } else {
      console.error("❌ Error:", error.message);
    }
  }

  // Now try distributeInitialTokens again
  console.log("\n📋 Attempting distributeInitialTokens() again...");
  try {
    const distTx = await distribution.distributeInitialTokens();
    await distTx.wait(2);
    console.log("✅ Distribution complete!");
    console.log("   TX:", distTx.hash);
    
    // Verify
    const complete = await distribution.isDistributionComplete();
    const airdropBalance = await token.balanceOf(airdropWallet);
    console.log("\n✅ Verification:");
    console.log("  Distribution Complete:", complete);
    console.log("  Airdrop Wallet Balance:", ethers.formatEther(airdropBalance), "DBBPT");
  } catch (error: any) {
    console.error("❌ Still failing:", error.message);
    console.log("\n💡 The issue might be in the token contract's transfer logic");
    console.log("   Try manually transferring airdrop tokens:");
    console.log("   token.transfer(airdropWallet, 250000 ether)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });

