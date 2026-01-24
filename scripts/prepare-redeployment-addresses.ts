import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Get current team wallet addresses and prepare for redeployment confirmation
 */

async function main() {
  console.log("\n📋 Gathering all team wallet addresses for redeployment...\n");

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

  console.log("📋 Current TokenDistribution:", distributionAddress);
  console.log("");

  // Get contract instance
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);

  // Get current team wallet addresses from contract
  console.log("📊 Current Team Wallet Addresses (from deployed contract):");
  const currentWallets = await distribution.getTeamWallets();
  
  console.log("   Joseph (J):", currentWallets.joseph);
  console.log("   AJ (A):", currentWallets.aj);
  console.log("   D-Sign (D):", currentWallets.dsign);
  console.log("   Developer (M):", currentWallets.developer);
  console.log("   Birdy (B):", currentWallets.birdy);
  console.log("   Airdrop:", currentWallets.airdrop);
  console.log("");

  // Get addresses from config.ts
  const configPath = path.join(__dirname, "config.ts");
  const configContent = fs.readFileSync(configPath, "utf8");
  
  const josephMatch = configContent.match(/J:\s*"([^"]+)"/);
  const ajMatch = configContent.match(/A:\s*"([^"]+)"/);
  const dsignMatch = configContent.match(/D:\s*"([^"]+)"/);
  const developerMatch = configContent.match(/M:\s*"([^"]+)"/);
  const birdyMatch = configContent.match(/B:\s*"([^"]+)"/);
  const airdropMatch = configContent.match(/AIRDROP:\s*"([^"]+)"/);

  console.log("📋 Addresses from config.ts:");
  console.log("   Joseph (J):", josephMatch ? josephMatch[1] : "Not found");
  console.log("   AJ (A):", ajMatch ? ajMatch[1] : "Not found");
  console.log("   D-Sign (D):", dsignMatch ? dsignMatch[1] : "Not found");
  console.log("   Developer (M):", developerMatch ? developerMatch[1] : "Not found");
  console.log("   Birdy (B):", birdyMatch ? birdyMatch[1] : "Not found");
  console.log("   Airdrop:", airdropMatch ? airdropMatch[1] : "Not found");
  console.log("");

  // Prepare addresses for redeployment
  // Use current contract addresses (they're already correct except developer needs fixing)
  const josephAddress = currentWallets.joseph;
  const ajAddress = currentWallets.aj;
  const dsignAddress = currentWallets.dsign;
  const developerAddress = currentWallets.developer; // This is correct, just needs reactivation
  const birdyAddress = currentWallets.birdy;
  const airdropAddress = currentWallets.airdrop;

  console.log("=" .repeat(80));
  console.log("📝 ADDRESSES FOR REDEPLOYMENT - PLEASE CONFIRM:");
  console.log("=" .repeat(80));
  console.log("");
  console.log("Joseph (J) - 162,500 DBBPT (1.625%):");
  console.log(`  ${josephAddress}`);
  console.log("");
  console.log("AJ (A) - 162,500 DBBPT (1.625%):");
  console.log(`  ${ajAddress}`);
  console.log("");
  console.log("D-Sign (D) - 162,500 DBBPT (1.625%):");
  console.log(`  ${dsignAddress}`);
  console.log("");
  console.log("Developer (M) - 100,000 DBBPT (1%):");
  console.log(`  ${developerAddress}`);
  console.log("  ⚠️  Note: This address has inactive vesting that will be fixed in new contract");
  console.log("");
  console.log("Birdy (B) - 162,500 DBBPT (1.625%):");
  console.log(`  ${birdyAddress}`);
  console.log("");
  console.log("Airdrop - 250,000 DBBPT (2.5%):");
  console.log(`  ${airdropAddress}`);
  console.log("");
  console.log("=" .repeat(80));
  console.log("");

  // Check vesting status for each
  console.log("📊 Current Vesting Status:");
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("   Vesting Initialized:", vestingInitialized);
  console.log("");

  if (vestingInitialized) {
    const members = [
      { name: "Joseph", address: josephAddress },
      { name: "AJ", address: ajAddress },
      { name: "D-Sign", address: dsignAddress },
      { name: "Developer", address: developerAddress },
      { name: "Birdy", address: birdyAddress },
    ];

    for (const member of members) {
      try {
        const vesting = await distribution.vestingInfo(member.address);
        const isActive = Array.isArray(vesting) ? vesting[4] : vesting.isActive;
        const totalAmount = Array.isArray(vesting) ? vesting[0] : vesting.totalAmount;
        const claimed = Array.isArray(vesting) ? vesting[3] : vesting.claimed;
        
        console.log(`   ${member.name}:`);
        console.log(`     Active: ${isActive ? "✅ Yes" : "❌ No"}`);
        console.log(`     Total: ${ethers.formatEther(totalAmount)} DBBPT`);
        console.log(`     Claimed: ${ethers.formatEther(claimed)} DBBPT`);
      } catch (error: any) {
        console.log(`   ${member.name}: Error checking vesting`);
      }
    }
  }

  console.log("");
  console.log("✅ Address list ready for confirmation!");
  console.log("");
  console.log("💡 Next steps after confirmation:");
  console.log("   1. Redeploy TokenDistribution with fixed code");
  console.log("   2. Initialize with these addresses");
  console.log("   3. Initialize vesting (will activate all vesting correctly)");
  console.log("   4. Migrate tokens from old contract to new contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
