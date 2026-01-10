import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Script to check vesting claimable amounts for all team members
 * 
 * Usage: npx hardhat run scripts/check-vesting-claimable.ts --network localhost
 */

const TEAM_MEMBERS = {
  J: "0x4d8b10e7d6bff54c8c1c1c42240c74e173c5f8ed",
  A: "0xdd82052fbc8edc7091dafa1540f16c63c51cb2fb",
  D: "0x130678ed1594929c02da4c10ab11a848df727eea",
  M: "0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b",
  B: "0xad19c12098037b7d35009c7cc794769e1427cc2d",
};

async function main() {
  console.log("\n🔍 CHECKING VESTING CLAIMABLE AMOUNTS");
  console.log("=".repeat(80));
  
  // Load deployment addresses
  const deploymentFile = "deployment-localhost-20260110232000.json";
  const deploymentPath = path.join(__dirname, "..", "deployments", deploymentFile);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const distributionAddress = deployment.distribution;
  const tokenAddress = deployment.token;
  
  console.log(`\n📋 Contract Addresses:`);
  console.log(`   Distribution: ${distributionAddress}`);
  console.log(`   Token: ${tokenAddress}`);
  
  const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
  const distribution = TokenDistribution.attach(distributionAddress);
  
  const VESTING_CLIFF = await distribution.VESTING_CLIFF();
  const VESTING_DURATION = await distribution.VESTING_DURATION();
  const cliffDays = Number(VESTING_CLIFF) / (24 * 60 * 60);
  const durationDays = Number(VESTING_DURATION) / (24 * 60 * 60);
  
  // Get current block time
  const currentBlock = await ethers.provider.getBlock("latest");
  const currentTime = currentBlock?.timestamp || 0;
  
  console.log(`\n⏰ Current Block Time: ${new Date(currentTime * 1000).toISOString()}`);
  console.log(`   Vesting Cliff: ${cliffDays} days`);
  console.log(`   Vesting Duration: ${durationDays} days`);
  
  console.log(`\n📊 Team Member Vesting Status:`);
  console.log("=".repeat(80));
  
  for (const [name, address] of Object.entries(TEAM_MEMBERS)) {
    try {
      const vestingInfo = await distribution.vestingInfo(address);
      
      if (!vestingInfo.isActive) {
        console.log(`\n❌ ${name} (${address.slice(0, 10)}...): Not a team member`);
        continue;
      }
      
      const startTime = Number(vestingInfo.startTime);
      const totalAmount = vestingInfo.totalAmount;
      const claimed = vestingInfo.claimed;
      const claimable = await distribution.calculateClaimable(address);
      
      const cliffEndTime = startTime + Number(VESTING_CLIFF);
      const vestingEndTime = startTime + Number(VESTING_DURATION);
      const cliffPassed = currentTime >= cliffEndTime;
      
      const elapsed = currentTime - startTime;
      const elapsedDays = elapsed / (24 * 60 * 60);
      const vestingProgress = Math.min(100, (elapsed / Number(VESTING_DURATION)) * 100);
      
      console.log(`\n👤 ${name} (${address}):`);
      console.log(`   Total Allocated: ${ethers.formatEther(totalAmount)} DBBPT`);
      console.log(`   Claimed: ${ethers.formatEther(claimed)} DBBPT`);
      console.log(`   Claimable: ${ethers.formatEther(claimable)} DBBPT`);
      console.log(`   Start Time: ${new Date(startTime * 1000).toISOString()}`);
      console.log(`   Cliff End: ${new Date(cliffEndTime * 1000).toISOString()}`);
      console.log(`   Vesting End: ${new Date(vestingEndTime * 1000).toISOString()}`);
      console.log(`   Elapsed: ${elapsedDays.toFixed(2)} days (${vestingProgress.toFixed(1)}%)`);
      console.log(`   Cliff Passed: ${cliffPassed ? "✅ YES" : "❌ NO"}`);
      
      if (claimable > 0n) {
        console.log(`   🎉 Can claim ${ethers.formatEther(claimable)} DBBPT now!`);
      } else if (cliffPassed) {
        console.log(`   ⚠️  Cliff passed but no claimable tokens (all claimed?)`);
      } else {
        const daysRemaining = (cliffEndTime - currentTime) / (24 * 60 * 60);
        console.log(`   ⏳ Cliff not passed yet. ${daysRemaining.toFixed(1)} days remaining`);
      }
      
    } catch (error: any) {
      console.log(`\n❌ ${name} (${address.slice(0, 10)}...): Error - ${error.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("💡 To test claiming:");
  console.log("   1. Connect MetaMask with one of the team member addresses above");
  console.log("   2. Or use Hardhat's impersonateAccount feature to impersonate an address");
  console.log("   3. Go to the Vesting page in the UI and click 'Claim'");
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
