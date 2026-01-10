import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

/**
 * Simple token distribution - transfer tokens directly to team/airdrop wallets
 * This bypasses the complex vesting system for now
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Running token distribution with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = contractAddresses.reflectiveToken;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("📋 Token Address:", tokenAddress);
  console.log("");

  // Check deployer balance
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("Your balance:", ethers.formatEther(deployerBalance), "DBBPT\n");

  // Distribution amounts
  const TEAM_ALLOCATION_STANDARD = ethers.parseEther("162500"); // 162,500 tokens (1.625%)
  const TEAM_ALLOCATION_DEVELOPER = ethers.parseEther("100000"); // 100,000 tokens (1%)
  const AIRDROP_ALLOCATION = ethers.parseEther("250000"); // 250,000 tokens

  const distributions = [
    { name: "Team Member 1 (J)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.J, amount: TEAM_ALLOCATION_STANDARD },
    { name: "Team Member 2 (A)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.A, amount: TEAM_ALLOCATION_STANDARD },
    { name: "Team Member 5 (B)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.B, amount: TEAM_ALLOCATION_STANDARD },
    { name: "Team Member 4 (Developer)", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.M, amount: TEAM_ALLOCATION_DEVELOPER },
    { name: "Airdrop Wallet", address: DEPLOYMENT_CONFIG.TEAM_WALLETS.AIRDROP, amount: AIRDROP_ALLOCATION },
  ];

  // Skip Team Member 3 (D) if not set
  if (DEPLOYMENT_CONFIG.TEAM_WALLETS.D !== "0x0000000000000000000000000000000000000000") {
    distributions.push({ 
      name: "Team Member 3 (D)", 
      address: DEPLOYMENT_CONFIG.TEAM_WALLETS.D, 
      amount: TEAM_ALLOCATION_STANDARD 
    });
  } else {
    console.log("⚠️  Skipping Team Member 3 (D) - address not set yet\n");
  }

  // Calculate total
  const totalToDistribute = distributions.reduce((sum, d) => sum + d.amount, 0n);
  console.log("📊 Distribution Plan:");
  console.log("Total to distribute:", ethers.formatEther(totalToDistribute), "DBBPT");
  distributions.forEach(d => {
    console.log(`  - ${d.name}: ${ethers.formatEther(d.amount)} DBBPT`);
  });
  console.log("");

  // Check if we have enough balance
  if (deployerBalance < totalToDistribute) {
    console.log("❌ Error: Insufficient balance!");
    console.log("   Need:", ethers.formatEther(totalToDistribute), "DBBPT");
    console.log("   Have:", ethers.formatEther(deployerBalance), "DBBPT");
    return;
  }

  // Confirm
  console.log("⚠️  WARNING: This will transfer tokens directly (no vesting)");
  console.log("⚠️  If you want vesting, you need to use the TokenDistribution contract\n");
  console.log("Proceeding with distribution...\n");

  // Execute distributions
  let successCount = 0;
  for (const dist of distributions) {
    try {
      console.log(`Sending ${ethers.formatEther(dist.amount)} DBBPT to ${dist.name}...`);
      const tx = await token.transfer(dist.address, dist.amount);
      await tx.wait();
      console.log(`✅ Success! TX: ${tx.hash}`);
      successCount++;
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log("");
  }

  // Summary
  console.log("=".repeat(60));
  console.log("Distribution Complete!");
  console.log("=".repeat(60));
  console.log(`Successfully distributed to ${successCount}/${distributions.length} addresses`);
  
  const newBalance = await token.balanceOf(deployer.address);
  console.log(`Your remaining balance: ${ethers.formatEther(newBalance)} DBBPT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Distribution failed:");
    console.error(error);
    process.exit(1);
  });

