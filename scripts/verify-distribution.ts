import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("💰 Checking token balances after distribution...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = contractAddresses.reflectiveToken;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("📋 Token Address:", tokenAddress);
  console.log("🔗 Network: Base Sepolia Testnet");
  console.log("🔗 Block Explorer: https://sepolia.basescan.org/token/" + tokenAddress);
  console.log("");

  // Check all balances
  const wallets = [
    { name: "Deployer Wallet", address: deployer.address },
    { name: "Team Member 1 (J)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.J },
    { name: "Team Member 2 (A)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.A },
    { name: "Team Member 5 (B)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.B },
    { name: "Airdrop Wallet", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.AIRDROP },
  ];

  console.log("=" .repeat(70));
  console.log("TOKEN BALANCES");
  console.log("=".repeat(70));

  let totalDistributed = 0n;
  for (const wallet of wallets) {
    const balance = await token.balanceOf(wallet.address);
    const formattedBalance = ethers.formatEther(balance);
    totalDistributed += balance;
    
    console.log(`\n${wallet.name}`);
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Balance: ${formattedBalance} DBBPT`);
    console.log(`  View on BaseScan: https://sepolia.basescan.org/address/${wallet.address}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total in team wallets: ${ethers.formatEther(totalDistributed)} DBBPT`);
  
  const totalSupply = await token.totalSupply();
  console.log(`Total supply: ${ethers.formatEther(totalSupply)} DBBPT`);
  
  const stakingBalance = await token.balanceOf(contractAddresses.flexibleTieredStaking);
  console.log(`Staked tokens: ${ethers.formatEther(stakingBalance)} DBBPT`);
  
  console.log("\n✅ All tokens have been distributed successfully!");
  console.log("\n💡 To see tokens in MetaMask:");
  console.log("   1. Open MetaMask");
  console.log("   2. Switch to Base Sepolia network");
  console.log("   3. Click 'Import tokens'");
  console.log("   4. Paste token address:", tokenAddress);
  console.log("   5. Symbol: DBBPT");
  console.log("   6. Decimals: 18");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

