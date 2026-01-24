import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check the current developer wallet address and vesting status
 */

async function main() {
  console.log("\n🔍 Checking developer wallet address and vesting status...\n");

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
  console.log("📋 Using deployment info from:", deploymentFiles[0].name);
  
  const contracts = latestDeployment.contracts || latestDeployment;
  const distributionAddress = contracts.distribution || contracts.tokenDistribution;

  if (!distributionAddress) {
    throw new Error("TokenDistribution address not found in deployment file");
  }

  console.log("   TokenDistribution:", distributionAddress);
  console.log("");

  // Get contract instance
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);

  // Check if deployer is the owner
  const owner = await distribution.owner();
  console.log("📊 Contract Owner:", owner);
  console.log("   Is deployer the owner?", owner.toLowerCase() === deployer.address.toLowerCase() ? "✅ Yes" : "❌ No");
  console.log("");

  // Get current team wallet addresses
  console.log("📊 Current Team Wallet Addresses:");
  const currentWallets = await distribution.getTeamWallets();
  
  console.log("   Joseph:", currentWallets.joseph);
  console.log("   AJ:", currentWallets.aj);
  console.log("   D-Sign:", currentWallets.dsign);
  console.log("   Developer:", currentWallets.developer);
  console.log("   Birdy:", currentWallets.birdy);
  console.log("   Airdrop:", currentWallets.airdrop);
  console.log("");

  // Check if developer wallet matches deployer
  const developerMatchesDeployer = currentWallets.developer.toLowerCase() === deployer.address.toLowerCase();
  console.log("🔍 Developer Wallet Check:");
  console.log("   Developer Wallet in Contract:", currentWallets.developer);
  console.log("   Your Wallet (Deployer):", deployer.address);
  console.log("   Match:", developerMatchesDeployer ? "✅ Yes" : "❌ No - This is the problem!");
  console.log("");

  // Check vesting status
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("📊 Vesting Status:");
  console.log("   Vesting Initialized:", vestingInitialized);
  console.log("");

  if (vestingInitialized) {
    // Check vesting info for current developer wallet
    console.log("📊 Vesting Info for Current Developer Wallet:");
    const currentDeveloperVesting = await distribution.getVestingInfo(currentWallets.developer);
    console.log("   Total Amount:", ethers.formatEther(currentDeveloperVesting.totalAmount), "DBBPT");
    console.log("   Claimed:", ethers.formatEther(currentDeveloperVesting.claimed), "DBBPT");
    console.log("   Claimable:", ethers.formatEther(currentDeveloperVesting.claimable), "DBBPT");
    console.log("   Active:", currentDeveloperVesting.totalAmount > 0 ? "Yes" : "No");
    console.log("");

    // Check vesting info for deployer's wallet
    console.log("📊 Vesting Info for Your Wallet (Deployer):");
    const deployerVesting = await distribution.getVestingInfo(deployer.address);
    console.log("   Total Amount:", ethers.formatEther(deployerVesting.totalAmount), "DBBPT");
    console.log("   Claimed:", ethers.formatEther(deployerVesting.claimed), "DBBPT");
    console.log("   Claimable:", ethers.formatEther(deployerVesting.claimable), "DBBPT");
    console.log("   Active:", deployerVesting.totalAmount > 0 ? "Yes" : "No");
    console.log("");

    if (!developerMatchesDeployer && currentDeveloperVesting.totalAmount > 0) {
      console.log("💡 Solution:");
      console.log("   You need to update the developer wallet address to your address.");
      console.log("   This will migrate the vesting data from the old developer address to your address.");
      console.log("   Run: npx hardhat run scripts/update-developer-wallet.ts --network <network>");
    }
  } else {
    console.log("⚠️  Vesting not initialized yet. No vesting data to migrate.");
  }

  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
