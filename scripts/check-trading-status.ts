import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Checking token trading status...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = contractAddresses.reflectiveToken;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("📋 Token Address:", tokenAddress);
  console.log("👤 Your Address:", deployer.address);
  console.log("");

  // Check trading status
  const tradingEnabled = await token.tradingEnabled();
  console.log("🔓 Trading Enabled:", tradingEnabled);

  // Check if addresses are blacklisted
  const addressesToCheck = [
    { name: "Deployer Address", address: deployer.address },
    { name: "Team Member 1 (J)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.J },
    { name: "Team Member 2 (A)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.A },
    { name: "Team Member 5 (B)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.B },
    { name: "Airdrop", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.AIRDROP },
  ];

  console.log("\n🔒 Blacklist Status:");
  for (const addr of addressesToCheck) {
    try {
      const isBlacklisted = await token.isBlacklisted(addr.address);
      console.log(`   ${addr.name}: ${isBlacklisted ? "❌ BLACKLISTED" : "✅ Not blacklisted"}`);
    } catch (error) {
      console.log(`   ${addr.name}: ⚠️ Could not check`);
    }
  }

  console.log("\n💰 Balances:");
  for (const addr of addressesToCheck) {
    try {
      const balance = await token.balanceOf(addr.address);
      console.log(`   ${addr.name}: ${ethers.formatEther(balance)} DBBPT`);
    } catch (error) {
      console.log(`   ${addr.name}: ⚠️ Could not check`);
    }
  }

  console.log("\n🔧 Contract Settings:");
  const owner = await token.owner();
  console.log("   Owner:", owner);
  
  const swapEnabled = await token.swapEnabled();
  console.log("   Swap Enabled:", swapEnabled);
  
  const stakingContract = await token.stakingContract();
  console.log("   Staking Contract:", stakingContract);

  // Check if we can enable trading
  if (!tradingEnabled) {
    console.log("\n⚠️  Trading is DISABLED!");
    console.log("💡 To enable trading, run: token.postDeploymentInit()");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

