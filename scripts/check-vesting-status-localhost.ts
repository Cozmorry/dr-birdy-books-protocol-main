import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Script to check vesting status on localhost
 * 
 * Usage: npx hardhat run scripts/check-vesting-status-localhost.ts --network localhost
 */

const TEAM_MEMBERS = {
  M: "0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b",
};

async function main() {
  console.log("\n🔍 CHECKING VESTING STATUS ON LOCALHOST");
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
  
  // Get current block time
  const provider = ethers.provider;
  const currentBlock = await provider.getBlock("latest");
  const currentTime = currentBlock?.timestamp || 0;
  const currentDate = new Date(currentTime * 1000);
  
  console.log(`\n⏰ Current Blockchain Time:`);
  console.log(`   Unix Timestamp: ${currentTime}`);
  console.log(`   Date: ${currentDate.toISOString()}`);
  console.log(`   Local Time: ${currentDate.toLocaleString()}`);
  
  // Check if vesting is initialized
  const vestingInitialized = await distribution.vestingInitialized();
  console.log(`\n📊 Vesting Status:`);
  console.log(`   Vesting Initialized: ${vestingInitialized ? "✅ YES" : "❌ NO"}`);
  
  if (!vestingInitialized) {
    console.log(`\n❌ ERROR: Vesting has not been initialized!`);
    console.log(`   You need to run the post-deployment script to initialize vesting.`);
    console.log(`   Command: npx hardhat run scripts/mainnet-post-deployment.ts --network localhost`);
    process.exit(1);
  }
  
  // Check distribution status
  const distributionComplete = await distribution.isDistributionComplete();
  console.log(`   Distribution Complete: ${distributionComplete ? "✅ YES" : "❌ NO"}`);
  
  // Get vesting constants
  const VESTING_CLIFF = await distribution.VESTING_CLIFF();
  const VESTING_DURATION = await distribution.VESTING_DURATION();
  const cliffSeconds = Number(VESTING_CLIFF);
  const durationSeconds = Number(VESTING_DURATION);
  const cliffDays = cliffSeconds / (24 * 60 * 60);
  const durationDays = durationSeconds / (24 * 60 * 60);
  
  console.log(`\n📅 Vesting Configuration:`);
  console.log(`   Cliff Period: ${cliffDays} days (${cliffSeconds} seconds)`);
  console.log(`   Vesting Duration: ${durationDays} days (${durationSeconds} seconds)`);
  
  // Check Morris's vesting
  for (const [name, address] of Object.entries(TEAM_MEMBERS)) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`👤 ${name} (${address}):`);
    console.log("=".repeat(80));
    
    try {
      const vestingInfo = await distribution.vestingInfo(address);
      
      if (!vestingInfo.isActive) {
        console.log(`❌ Not a team member with active vesting`);
        continue;
      }
      
      const startTime = Number(vestingInfo.startTime);
      const totalAmount = vestingInfo.totalAmount;
      const claimed = vestingInfo.claimed;
      const duration = Number(vestingInfo.duration);
      
      console.log(`\n📊 Vesting Details:`);
      console.log(`   Total Allocated: ${ethers.formatEther(totalAmount)} DBBPT`);
      console.log(`   Already Claimed: ${ethers.formatEther(claimed)} DBBPT`);
      console.log(`   Start Time: ${startTime}`);
      console.log(`   Start Date: ${new Date(startTime * 1000).toISOString()}`);
      console.log(`   Duration: ${duration / (24 * 60 * 60)} days`);
      
      // Calculate important dates
      const cliffEndTime = startTime + cliffSeconds;
      const vestingEndTime = startTime + durationSeconds;
      const cliffEndDate = new Date(cliffEndTime * 1000);
      const vestingEndDate = new Date(vestingEndTime * 1000);
      
      console.log(`\n📅 Important Dates:`);
      console.log(`   Cliff End: ${cliffEndDate.toISOString()}`);
      console.log(`   Vesting End: ${vestingEndDate.toISOString()}`);
      
      // Calculate elapsed time
      const elapsed = currentTime - startTime;
      const elapsedDays = elapsed / (24 * 60 * 60);
      const elapsedHours = elapsed / (3600);
      
      console.log(`\n⏱️  Time Elapsed:`);
      console.log(`   Seconds: ${elapsed}`);
      console.log(`   Hours: ${elapsedHours.toFixed(2)}`);
      console.log(`   Days: ${elapsedDays.toFixed(2)}`);
      
      // Check if cliff has passed
      const cliffPassed = currentTime >= cliffEndTime;
      const vestingComplete = currentTime >= vestingEndTime;
      
      console.log(`\n✅ Status Checks:`);
      console.log(`   Cliff Passed: ${cliffPassed ? "✅ YES" : "❌ NO"}`);
      if (!cliffPassed) {
        const remaining = cliffEndTime - currentTime;
        const remainingDays = remaining / (24 * 60 * 60);
        console.log(`   ⏳ Time until cliff: ${remainingDays.toFixed(2)} days`);
      }
      console.log(`   Vesting Complete: ${vestingComplete ? "✅ YES" : "❌ NO"}`);
      
      // Calculate claimable
      const claimable = await distribution.calculateClaimable(address);
      console.log(`\n💰 Claimable Amount:`);
      console.log(`   ${ethers.formatEther(claimable)} DBBPT`);
      
      if (claimable === 0n) {
        console.log(`\n❌ No tokens claimable. Reasons could be:`);
        if (!cliffPassed) {
          console.log(`   1. Cliff period has not passed yet`);
          console.log(`      Current time: ${currentDate.toISOString()}`);
          console.log(`      Cliff ends: ${cliffEndDate.toISOString()}`);
        }
        if (startTime === 0) {
          console.log(`   2. Start time is 0 (vesting not properly initialized)`);
        }
        if (claimed >= totalAmount) {
          console.log(`   3. All tokens already claimed`);
        }
      } else {
        console.log(`\n🎉 You have ${ethers.formatEther(claimable)} DBBPT available to claim!`);
        
        // Calculate how much unlocks per day
        const tokensPerDay = Number(totalAmount) / durationDays;
        console.log(`\n📈 Unlock Rate:`);
        console.log(`   ~${ethers.formatEther(ethers.parseEther(tokensPerDay.toString()))} DBBPT per day`);
        console.log(`   ~${ethers.formatEther(ethers.parseEther((tokensPerDay / 24).toString()))} DBBPT per hour`);
      }
      
      // Check contract balance
      const contractBalance = await distribution.getContractBalance();
      console.log(`\n💼 Distribution Contract Balance:`);
      console.log(`   ${ethers.formatEther(contractBalance)} DBBPT`);
      
      if (contractBalance < claimable) {
        console.log(`\n⚠️  WARNING: Contract balance is less than claimable amount!`);
        console.log(`   This means the contract doesn't have enough tokens to fulfill the claim.`);
      }
      
    } catch (error: any) {
      console.error(`\n❌ Error checking vesting for ${name}:`, error.message);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("💡 Troubleshooting Tips:");
  console.log("=".repeat(80));
  console.log("1. If startTime is 0, vesting wasn't initialized properly");
  console.log("2. If cliff hasn't passed, you need to wait or fast-forward time");
  console.log("3. If you restarted Hardhat node, time resets - use simulate-cliff-passed.ts");
  console.log("4. Make sure you ran the post-deployment script after deploying");
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
