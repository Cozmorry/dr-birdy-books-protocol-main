import { ethers } from "hardhat";

/**
 * Script to simulate that the cliff period has passed
 * This fast-forwards time by 90 days + 1 day (VESTING_CLIFF + buffer)
 * 
 * Usage: npx hardhat run scripts/simulate-cliff-passed.ts --network localhost
 */

const VESTING_CLIFF = 90 * 24 * 60 * 60; // 90 days in seconds
const BUFFER_TIME = 1 * 24 * 60 * 60; // 1 day buffer to ensure cliff has passed

async function main() {
  console.log("\n⏰ SIMULATING CLIFF PERIOD PASSED");
  console.log("=".repeat(80));
  
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`\n📋 Current Network: ${network.name} (Chain ID: ${chainId})`);
  
  // Only allow this on localhost/testnet for safety
  if (chainId !== 31337 && chainId !== 84532) {
    console.error("\n❌ ERROR: This script can only be run on localhost (31337) or testnet (84532)");
    console.error("   For safety reasons, time manipulation is not allowed on mainnet");
    process.exit(1);
  }
  
  const currentBlock = await provider.getBlock("latest");
  const currentTime = currentBlock?.timestamp || 0;
  const currentDate = new Date(currentTime * 1000);
  
  console.log(`\n📅 Current Block Time: ${currentDate.toISOString()}`);
  console.log(`   Unix Timestamp: ${currentTime}`);
  
  // Calculate new time (cliff + buffer)
  const timeToIncrease = VESTING_CLIFF + BUFFER_TIME;
  const newTime = currentTime + timeToIncrease;
  const newDate = new Date(newTime * 1000);
  
  console.log(`\n⏩ Fast-forwarding time by ${timeToIncrease / (24 * 60 * 60)} days...`);
  console.log(`   New Block Time will be: ${newDate.toISOString()}`);
  
  try {
    // Fast-forward time
    console.log("\n⏳ Increasing EVM time...");
    await provider.send("evm_increaseTime", [timeToIncrease]);
    
    // Mine a new block to apply the time change
    console.log("⛏️  Mining a new block...");
    await provider.send("evm_mine", []);
    
    // Verify the time change
    const newBlock = await provider.getBlock("latest");
    const actualNewTime = newBlock?.timestamp || 0;
    const actualNewDate = new Date(actualNewTime * 1000);
    
    console.log(`\n✅ Time successfully fast-forwarded!`);
    console.log(`   New Block Time: ${actualNewDate.toISOString()}`);
    console.log(`   Unix Timestamp: ${actualNewTime}`);
    console.log(`   Time increased by: ${(actualNewTime - currentTime) / (24 * 60 * 60)} days`);
    
    // Check vesting status for deployer address (if they have vesting)
    const [deployer] = await ethers.getSigners();
    console.log(`\n📋 Deployer Address: ${deployer.address}`);
    
    // Try to check vesting info if distribution contract exists
    try {
      const deploymentFile = chainId === 31337 
        ? `deployment-localhost-20260110232000.json`
        : null;
      
      if (deploymentFile) {
        const fs = require("fs");
        const path = require("path");
        const deploymentPath = path.join(__dirname, "..", "deployments", deploymentFile);
        
        if (fs.existsSync(deploymentPath)) {
          const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
          const distributionAddress = deployment.distribution;
          
          if (distributionAddress) {
            const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
            const distribution = TokenDistribution.attach(distributionAddress);
            
            console.log(`\n🔍 Checking vesting status for ${deployer.address}...`);
            const vestingInfo = await distribution.vestingInfo(deployer.address);
            const claimable = await distribution.calculateClaimable(deployer.address);
            
            if (vestingInfo.isActive) {
              const startTime = Number(vestingInfo.startTime);
              const cliffEndTime = startTime + VESTING_CLIFF;
              const cliffEndDate = new Date(cliffEndTime * 1000);
              
              console.log(`\n📊 Vesting Status:`);
              console.log(`   Start Time: ${new Date(startTime * 1000).toISOString()}`);
              console.log(`   Cliff End Time: ${cliffEndDate.toISOString()}`);
              console.log(`   Current Time: ${actualNewDate.toISOString()}`);
              console.log(`   Cliff Passed: ${actualNewTime >= cliffEndTime ? "✅ YES" : "❌ NO"}`);
              console.log(`   Claimable Amount: ${ethers.formatEther(claimable)} DBBPT`);
              
              if (claimable > 0n) {
                console.log(`\n🎉 Cliff has passed! You can now claim tokens.`);
              } else {
                console.log(`\n⚠️  No tokens claimable yet. Check vesting start time.`);
              }
            } else {
              console.log(`\n⚠️  ${deployer.address} is not a team member with vesting.`);
            }
          }
        }
      }
    } catch (err: any) {
      console.log(`\n⚠️  Could not check vesting info: ${err.message}`);
      console.log(`   (This is okay if vesting hasn't been initialized yet)`);
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ CLIFF SIMULATION COMPLETE");
    console.log("=".repeat(80));
    console.log("\n💡 Next Steps:");
    console.log("   1. The cliff period (90 days) has now passed");
    console.log("   2. Team members can claim their vested tokens");
    console.log("   3. Test claiming in the UI or via the contract");
    console.log("\n⚠️  Note: Time changes only persist while the Hardhat node is running.");
    console.log("   Restarting the node will reset time to the current real time.\n");
    
  } catch (error: any) {
    console.error("\n❌ ERROR: Failed to fast-forward time");
    console.error("   Error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
