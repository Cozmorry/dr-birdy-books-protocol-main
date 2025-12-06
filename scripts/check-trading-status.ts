import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

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
    { name: "Your Address (Morris)", address: deployer.address },
    { name: "Joseph (J)", address: "0x4d8b10e7d6bff54c8c1c1c42240c74e173c5f8ed" },
    { name: "AJ (A)", address: "0xdd82052fbc8edc7091dafa1540f16c63c51cb2fb" },
    { name: "Birdy (B)", address: "0xad19c12098037b7d35009c7cc794769e1427cc2d" },
    { name: "Airdrop", address: "0x0EE2C9C1c821c07fB1dD25De3D0f38d9db94Bb1e" },
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

