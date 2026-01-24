import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check original vesting start times from old contract
 */

async function main() {
  console.log("\n📅 Checking original vesting start times...\n");

  const [deployer] = await ethers.getSigners();
  
  // Read deployment info
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
  const contracts = latestDeployment.contracts || latestDeployment;
  const distributionAddress = contracts.distribution || contracts.tokenDistribution;

  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);
  const currentWallets = await distribution.getTeamWallets();
  const vestingInitialized = await distribution.vestingInitialized();

  if (!vestingInitialized) {
    console.log("⚠️  Vesting not initialized in old contract");
    return;
  }

  console.log("📊 Original Vesting Start Times:");
  console.log("");

  const members = [
    { name: "Joseph", address: currentWallets.joseph },
    { name: "AJ", address: currentWallets.aj },
    { name: "D-Sign", address: currentWallets.dsign },
    { name: "Developer", address: currentWallets.developer },
    { name: "Birdy", address: currentWallets.birdy },
  ];

  let originalStartTime: bigint | null = null;

  for (const member of members) {
    try {
      const vesting = await distribution.vestingInfo(member.address);
      const startTime = Array.isArray(vesting) ? vesting[1] : vesting.startTime;
      const isActive = Array.isArray(vesting) ? vesting[4] : vesting.isActive;
      
      if (startTime > 0n) {
        const startDate = new Date(Number(startTime) * 1000);
        console.log(`   ${member.name}:`);
        console.log(`     Start Time: ${startTime.toString()}`);
        console.log(`     Start Date: ${startDate.toISOString()}`);
        console.log(`     Active: ${isActive ? "✅ Yes" : "❌ No"}`);
        console.log("");
        
        if (!originalStartTime || startTime < originalStartTime) {
          originalStartTime = startTime;
        }
      }
    } catch (error: any) {
      console.log(`   ${member.name}: Error checking`);
    }
  }

  if (originalStartTime) {
    const originalStartDate = new Date(Number(originalStartTime) * 1000);
    const cliffEndTime = originalStartTime + BigInt(90 * 24 * 60 * 60); // 90 days
    const cliffEndDate = new Date(Number(cliffEndTime) * 1000);
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const daysSinceStart = Number(currentTime - originalStartTime) / (24 * 60 * 60);
    const daysUntilCliff = Number(cliffEndTime - currentTime) / (24 * 60 * 60);

    console.log("📅 Summary:");
    console.log(`   Original Start Time: ${originalStartTime.toString()}`);
    console.log(`   Original Start Date: ${originalStartDate.toISOString()}`);
    console.log(`   Cliff End Date: ${cliffEndDate.toISOString()}`);
    console.log(`   Days Since Start: ${daysSinceStart.toFixed(2)}`);
    
    if (currentTime >= cliffEndTime) {
      console.log(`   ✅ Cliff has PASSED (${Math.abs(daysUntilCliff).toFixed(2)} days ago)`);
      console.log("");
      console.log("💡 Recommendation:");
      console.log("   Since cliff has passed, you should preserve the original start time");
      console.log("   in the new contract so team members don't lose their progress.");
    } else {
      console.log(`   ⏳ Cliff has NOT passed yet (${daysUntilCliff.toFixed(2)} days remaining)`);
      console.log("");
      console.log("💡 Recommendation:");
      console.log("   You can use a new start time, or preserve the original.");
    }
  }

  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
