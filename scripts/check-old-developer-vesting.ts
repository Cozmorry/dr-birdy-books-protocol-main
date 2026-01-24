import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check if there's an old developer address with active vesting that we can migrate from
 */

async function main() {
  console.log("\n🔍 Checking for old developer address with active vesting...\n");

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
  const currentDeveloperAddress = currentWallets.developer;

  console.log("📊 Current Developer Address:", currentDeveloperAddress);
  console.log("");

  // Check config.ts for original developer address
  console.log("📋 Checking config.ts for original developer address...");
  const configPath = path.join(__dirname, "config.ts");
  const configContent = fs.readFileSync(configPath, "utf8");
  const match = configContent.match(/M:\s*"([^"]+)"/);
  
  if (match) {
    const configDeveloperAddress = match[1];
    console.log("   Config Developer Address:", configDeveloperAddress);
    
    if (configDeveloperAddress.toLowerCase() !== currentDeveloperAddress.toLowerCase()) {
      console.log("   ⚠️  Different from current! Checking if config address has active vesting...");
      
      try {
        const configVesting = await distribution.vestingInfo(configDeveloperAddress);
        const isActive = Array.isArray(configVesting) ? configVesting[4] : configVesting.isActive;
        const totalAmount = Array.isArray(configVesting) ? configVesting[0] : configVesting.totalAmount;
        
        if (isActive && totalAmount > 0n) {
          console.log(`   ✅ FOUND! Config address has ACTIVE vesting: ${ethers.formatEther(totalAmount)} DBBPT`);
          console.log("   💡 Solution: Call updateTeamWallets() to migrate from config address to current address");
          console.log("");
          console.log("   This will activate your vesting!");
          return;
        } else {
          console.log("   ❌ Config address also has inactive/zero vesting");
        }
      } catch (error: any) {
        console.log(`   Error checking config address: ${error.message}`);
      }
    } else {
      console.log("   ✅ Matches current developer address");
    }
  }
  console.log("");

  // Check all team members to see if any have the developer allocation
  console.log("📊 Checking all team members for developer allocation (100,000 DBBPT)...");
  const allTeamMembers = [
    { name: "Joseph", address: currentWallets.joseph },
    { name: "AJ", address: currentWallets.aj },
    { name: "D-Sign", address: currentWallets.dsign },
    { name: "Developer", address: currentWallets.developer },
    { name: "Birdy", address: currentWallets.birdy },
  ];

  const DEVELOPER_ALLOCATION = ethers.parseEther("100000");
  let foundActiveDeveloperVesting = false;

  for (const member of allTeamMembers) {
    try {
      const vesting = await distribution.vestingInfo(member.address);
      const isActive = Array.isArray(vesting) ? vesting[4] : vesting.isActive;
      const totalAmount = Array.isArray(vesting) ? vesting[0] : vesting.totalAmount;
      
      if (isActive && totalAmount === DEVELOPER_ALLOCATION) {
        console.log(`   ✅ FOUND! ${member.name} (${member.address}) has ACTIVE developer vesting!`);
        foundActiveDeveloperVesting = true;
        
        if (member.address.toLowerCase() !== currentDeveloperAddress.toLowerCase()) {
          console.log("   💡 Solution: Call updateTeamWallets() to migrate from this address to your address");
          console.log("   This will activate your vesting!");
        }
      }
    } catch (error: any) {
      // Skip errors
    }
  }

  if (!foundActiveDeveloperVesting) {
    console.log("   ❌ No active developer vesting found on any team member address");
    console.log("");
    console.log("📝 Conclusion:");
    console.log("   Your developer vesting is inactive and there's no active vesting to migrate from.");
    console.log("   Transferring ownership won't help because ownership doesn't affect storage state.");
    console.log("");
    console.log("💡 Real Solutions:");
    console.log("   1. Redeploy TokenDistribution with reactivateVesting() function");
    console.log("   2. Accept that the vesting is lost (not recommended)");
    console.log("   3. Manually transfer 100,000 tokens to your address (workaround, but loses vesting schedule)");
  }

  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
