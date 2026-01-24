import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check all team member vesting info and find if developer vesting exists elsewhere
 */

async function main() {
  console.log("\n🔍 Checking all team member vesting info...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Current Owner/Deployer:", deployer.address);
  console.log("");

  // Read deployment info to get TokenDistribution address
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error("Deployments directory not found");
  }

  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      path: path.join(deploymentsDir, f),
      time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (deploymentFiles.length === 0) {
    throw new Error("No deployment files found");
  }

  const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0].path, "utf8"));
  const contracts = latestDeployment.contracts || latestDeployment;
  const distributionAddress = contracts.distribution || contracts.tokenDistribution;

  if (!distributionAddress) {
    throw new Error("TokenDistribution address not found in deployment file");
  }

  console.log("📋 TokenDistribution:", distributionAddress);
  console.log("");

  // Get contract instance
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);

  // Get current team wallet addresses
  const currentWallets = await distribution.getTeamWallets();
  
  console.log("📊 Current Team Wallet Addresses:");
  console.log("   Joseph:", currentWallets.joseph);
  console.log("   AJ:", currentWallets.aj);
  console.log("   D-Sign:", currentWallets.dsign);
  console.log("   Developer:", currentWallets.developer);
  console.log("   Birdy:", currentWallets.birdy);
  console.log("   Airdrop:", currentWallets.airdrop);
  console.log("");

  // Check vesting status
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("📊 Vesting Status:");
  console.log("   Vesting Initialized:", vestingInitialized);
  console.log("");

  if (!vestingInitialized) {
    console.log("⚠️  Vesting not initialized. You need to call initializeVesting() first.");
    return;
  }

  // Check vesting info for all team members
  console.log("📊 Vesting Info for All Team Members:\n");
  
  const members = [
    { name: "Joseph", address: currentWallets.joseph },
    { name: "AJ", address: currentWallets.aj },
    { name: "D-Sign", address: currentWallets.dsign },
    { name: "Developer", address: currentWallets.developer },
    { name: "Birdy", address: currentWallets.birdy },
  ];

  let totalAllocated = 0n;
  let developerVestingFound = false;

  for (const member of members) {
    try {
      const vestingInfo = await distribution.getVestingInfo(member.address);
      const [totalAmount, claimed, claimable, vestingEndTime] = vestingInfo;
      
      const totalAmountBN = BigInt(totalAmount.toString());
      totalAllocated += totalAmountBN;

      console.log(`   ${member.name} (${member.address}):`);
      console.log(`     Total Amount: ${ethers.formatEther(totalAmount)} DBBPT`);
      console.log(`     Claimed: ${ethers.formatEther(claimed)} DBBPT`);
      console.log(`     Claimable: ${ethers.formatEther(claimable)} DBBPT`);
      console.log(`     Active: ${totalAmountBN > 0n ? "✅ Yes" : "❌ No"}`);
      
      if (member.name === "Developer" && totalAmountBN > 0n) {
        developerVestingFound = true;
      }
      console.log("");
    } catch (error: any) {
      console.log(`   ${member.name}: Error - ${error.message}`);
      console.log("");
    }
  }

  console.log(`📊 Total Allocated: ${ethers.formatEther(totalAllocated)} DBBPT`);
  console.log("");

  // Check expected allocations
  const TEAM_ALLOCATION_STANDARD = ethers.parseEther("162500");
  const TEAM_ALLOCATION_DEVELOPER = ethers.parseEther("100000");
  const expectedTotal = (TEAM_ALLOCATION_STANDARD * 4n) + TEAM_ALLOCATION_DEVELOPER;
  
  console.log("📊 Expected Allocations:");
  console.log(`   Standard team members (4x): ${ethers.formatEther(TEAM_ALLOCATION_STANDARD * 4n)} DBBPT`);
  console.log(`   Developer: ${ethers.formatEther(TEAM_ALLOCATION_DEVELOPER)} DBBPT`);
  console.log(`   Expected Total: ${ethers.formatEther(expectedTotal)} DBBPT`);
  console.log("");

  if (!developerVestingFound) {
    console.log("❌ PROBLEM FOUND:");
    console.log("   Developer vesting shows 0.0 DBBPT!");
    console.log("");
    console.log("💡 Possible causes:");
    console.log("   1. Vesting was initialized before developer wallet was set to your address");
    console.log("   2. Developer wallet was changed after vesting initialization, but vesting wasn't migrated");
    console.log("   3. Developer vesting was never properly initialized");
    console.log("");
    console.log("🔧 Solution:");
    console.log("   We need to check if there's an old developer address with vesting data.");
    console.log("   If found, we can migrate it. Otherwise, we may need to manually initialize developer vesting.");
  } else {
    console.log("✅ Developer vesting is active!");
  }

  // Check config.ts for original developer address
  console.log("\n📋 Checking config.ts for original developer address...");
  try {
    const configPath = path.join(__dirname, "config.ts");
    const configContent = fs.readFileSync(configPath, "utf8");
    const match = configContent.match(/M:\s*"([^"]+)"/);
    if (match) {
      const originalDeveloperAddress = match[1];
      console.log(`   Original Developer Address (from config): ${originalDeveloperAddress}`);
      
      if (originalDeveloperAddress.toLowerCase() !== currentWallets.developer.toLowerCase()) {
        console.log("   ⚠️  Different from current developer wallet!");
        console.log("   Checking if original address has vesting...");
        
        try {
          const originalVesting = await distribution.getVestingInfo(originalDeveloperAddress);
          const [totalAmount] = originalVesting;
          const totalAmountBN = BigInt(totalAmount.toString());
          
          if (totalAmountBN > 0n) {
            console.log(`   ✅ FOUND! Original developer address has ${ethers.formatEther(totalAmount)} DBBPT vesting!`);
            console.log("   This vesting needs to be migrated to your address.");
          } else {
            console.log("   ❌ Original address also has 0 vesting.");
          }
        } catch (error: any) {
          console.log(`   Error checking original address: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    console.log(`   Could not read config.ts: ${error.message}`);
  }

  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
