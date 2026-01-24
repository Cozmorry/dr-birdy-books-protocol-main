import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check raw vesting mapping data to see what's actually stored
 */

async function main() {
  console.log("\n🔍 Checking raw vesting mapping data...\n");

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
  
  console.log("📊 Current Developer Wallet:", currentWallets.developer);
  console.log("");

  // Check raw vesting mapping for current developer address
  console.log("📊 Raw Vesting Mapping Data for Current Developer Address:");
  try {
    const rawVesting = await distribution.vestingInfo(currentWallets.developer);
    console.log("   Raw Data:", rawVesting);
    
    if (Array.isArray(rawVesting)) {
      console.log("   totalAmount:", ethers.formatEther(rawVesting[0]), "DBBPT");
      console.log("   startTime:", rawVesting[1].toString());
      console.log("   duration:", rawVesting[2].toString());
      console.log("   claimed:", ethers.formatEther(rawVesting[3]), "DBBPT");
      console.log("   isActive:", rawVesting[4]);
    } else {
      console.log("   totalAmount:", ethers.formatEther(rawVesting.totalAmount), "DBBPT");
      console.log("   startTime:", rawVesting.startTime.toString());
      console.log("   duration:", rawVesting.duration.toString());
      console.log("   claimed:", ethers.formatEther(rawVesting.claimed), "DBBPT");
      console.log("   isActive:", rawVesting.isActive);
    }
  } catch (error: any) {
    console.log("   Error:", error.message);
  }
  console.log("");

  // Check getVestingInfo (which returns zeros if inactive)
  console.log("📊 getVestingInfo() Result (returns zeros if inactive):");
  try {
    const vestingInfo = await distribution.getVestingInfo(currentWallets.developer);
    const [totalAmount, claimed, claimable, vestingEndTime] = vestingInfo;
    console.log("   totalAmount:", ethers.formatEther(totalAmount), "DBBPT");
    console.log("   claimed:", ethers.formatEther(claimed), "DBBPT");
    console.log("   claimable:", ethers.formatEther(claimable), "DBBPT");
    console.log("   vestingEndTime:", vestingEndTime.toString());
  } catch (error: any) {
    console.log("   Error:", error.message);
  }
  console.log("");

  // Check config.ts for original developer address
  console.log("📋 Checking config.ts for original developer address...");
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
          const originalRawVesting = await distribution.vestingInfo(originalDeveloperAddress);
          console.log("   Raw Vesting Data:", originalRawVesting);
          
          if (Array.isArray(originalRawVesting)) {
            const isActive = originalRawVesting[4];
            const totalAmount = originalRawVesting[0];
            if (isActive && totalAmount > 0n) {
              console.log(`   ✅ FOUND! Original developer address has active vesting: ${ethers.formatEther(totalAmount)} DBBPT`);
              console.log("   This vesting needs to be migrated to your address.");
            } else {
              console.log("   ❌ Original address also has inactive/zero vesting.");
            }
          } else {
            if (originalRawVesting.isActive && originalRawVesting.totalAmount > 0n) {
              console.log(`   ✅ FOUND! Original developer address has active vesting: ${ethers.formatEther(originalRawVesting.totalAmount)} DBBPT`);
              console.log("   This vesting needs to be migrated to your address.");
            } else {
              console.log("   ❌ Original address also has inactive/zero vesting.");
            }
          }
        } catch (error: any) {
          console.log(`   Error checking original address: ${error.message}`);
        }
      } else {
        console.log("   ✅ Matches current developer wallet");
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
