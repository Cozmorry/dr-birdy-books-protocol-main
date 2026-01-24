import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check developer vesting timeline and cliff status
 */

async function main() {
  console.log("\n📅 Checking developer vesting timeline...\n");

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
  const developerAddress = currentWallets.developer;

  // Get vesting data
  const rawVesting = await distribution.vestingInfo(developerAddress);
  const cliffPeriod = await distribution.VESTING_CLIFF();
  const vestingDuration = await distribution.VESTING_DURATION();

  const startTime = Number(rawVesting.startTime);
  const cliffEndTime = startTime + Number(cliffPeriod);
  const vestingEndTime = startTime + Number(vestingDuration);
  
  // Get current blockchain time
  const currentBlock = await ethers.provider.getBlock('latest');
  const currentTime = currentBlock?.timestamp || Math.floor(Date.now() / 1000);

  const startDate = new Date(startTime * 1000);
  const cliffEndDate = new Date(cliffEndTime * 1000);
  const vestingEndDate = new Date(vestingEndTime * 1000);
  const currentDate = new Date(currentTime * 1000);

  console.log("📊 Developer Vesting Timeline:");
  console.log("   Developer Address:", developerAddress);
  console.log("");
  console.log("   Start Time:", startTime);
  console.log("   Start Date:", startDate.toISOString());
  console.log("");
  console.log("   Cliff Period: 90 days");
  console.log("   Cliff End Time:", cliffEndTime);
  console.log("   Cliff End Date:", cliffEndDate.toISOString());
  console.log("");
  console.log("   Vesting Duration: 365 days");
  console.log("   Vesting End Time:", vestingEndTime);
  console.log("   Vesting End Date:", vestingEndDate.toISOString());
  console.log("");
  console.log("   Current Time:", currentTime);
  console.log("   Current Date:", currentDate.toISOString());
  console.log("");

  // Calculate time differences
  const secondsSinceStart = currentTime - startTime;
  const daysSinceStart = secondsSinceStart / (24 * 60 * 60);
  const secondsUntilCliff = cliffEndTime - currentTime;
  const daysUntilCliff = secondsUntilCliff / (24 * 60 * 60);

  console.log("⏱️  Time Status:");
  console.log(`   Days since vesting started: ${daysSinceStart.toFixed(2)}`);
  
  if (currentTime >= cliffEndTime) {
    console.log(`   ✅ Cliff period has PASSED! (${Math.abs(daysUntilCliff).toFixed(2)} days ago)`);
    console.log("   You can claim tokens immediately after reactivation.");
  } else {
    console.log(`   ⏳ Cliff period has NOT passed yet.`);
    console.log(`   Days until cliff ends: ${daysUntilCliff.toFixed(2)}`);
    console.log("   You'll need to wait until the cliff period ends to claim.");
  }
  console.log("");

  // Calculate claimable amount (if active)
  if (rawVesting.isActive) {
    const claimable = await distribution.calculateClaimable(developerAddress);
    console.log("💰 Claimable Amount:", ethers.formatEther(claimable), "DBBPT");
  } else {
    console.log("⚠️  Vesting is currently INACTIVE");
    console.log("   After reactivation, you'll be able to claim based on the timeline above.");
  }

  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
