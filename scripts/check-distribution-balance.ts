import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check token balance in old TokenDistribution contract
 */

async function main() {
  console.log("\n💰 Checking token balance in old TokenDistribution contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Current Owner/Deployer:", deployer.address);
  console.log("");

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
  const tokenAddress = contracts.token || contracts.reflectiveToken;

  if (!distributionAddress) {
    throw new Error("TokenDistribution address not found");
  }
  if (!tokenAddress) {
    throw new Error("Token address not found");
  }

  console.log("📋 Current TokenDistribution:", distributionAddress);
  console.log("📋 Token Contract:", tokenAddress);
  console.log("");

  // Get contract instances
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check current balance in distribution contract
  const distributionBalance = await token.balanceOf(distributionAddress);
  const expectedTotal = ethers.parseEther("1000000"); // 1M tokens

  console.log("💰 Token Balance:");
  console.log(`   Current Balance: ${ethers.formatEther(distributionBalance)} DBBPT`);
  console.log(`   Expected Total: ${ethers.formatEther(expectedTotal)} DBBPT`);
  console.log("");

  // Check how much has been claimed
  const currentWallets = await distribution.getTeamWallets();
  const vestingInitialized = await distribution.vestingInitialized();
  
  let totalClaimed = 0n;
  if (vestingInitialized) {
    console.log("📊 Checking claimed amounts by team members:");
    const members = [
      { name: "Joseph", address: currentWallets.joseph },
      { name: "AJ", address: currentWallets.aj },
      { name: "D-Sign", address: currentWallets.dsign },
      { name: "Developer", address: currentWallets.developer },
      { name: "Birdy", address: currentWallets.birdy },
    ];

    for (const member of members) {
      try {
        const vesting = await distribution.vestingInfo(member.address);
        const claimed = Array.isArray(vesting) ? vesting[3] : vesting.claimed;
        totalClaimed += BigInt(claimed.toString());
        if (claimed > 0n) {
          console.log(`   ${member.name}: ${ethers.formatEther(claimed)} DBBPT claimed`);
        }
      } catch (error: any) {
        console.log(`   ${member.name}: Error checking`);
      }
    }
    console.log(`   Total Claimed: ${ethers.formatEther(totalClaimed)} DBBPT`);
    console.log("");
  } else {
    console.log("⚠️  Vesting not initialized yet");
    console.log("");
  }

  const unclaimedAmount = expectedTotal - totalClaimed;
  const difference = distributionBalance - unclaimedAmount;

  console.log("📊 Balance Analysis:");
  console.log(`   Expected Total: ${ethers.formatEther(expectedTotal)} DBBPT`);
  console.log(`   Already Claimed: ${ethers.formatEther(totalClaimed)} DBBPT`);
  console.log(`   Should be Unclaimed: ${ethers.formatEther(unclaimedAmount)} DBBPT`);
  console.log(`   Actual Contract Balance: ${ethers.formatEther(distributionBalance)} DBBPT`);
  console.log("");

  if (distributionBalance >= unclaimedAmount) {
    console.log("✅ Contract has sufficient balance for migration!");
    console.log(`   Available for migration: ${ethers.formatEther(distributionBalance)} DBBPT`);
  } else {
    const shortfall = unclaimedAmount - distributionBalance;
    console.log("⚠️  Contract balance is less than expected unclaimed amount.");
    console.log(`   Shortfall: ${ethers.formatEther(shortfall)} DBBPT`);
    console.log("   You may need additional tokens for migration.");
  }

  // Check if owner can withdraw
  const owner = await distribution.owner();
  const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
  
  console.log("");
  console.log("🔐 Contract Ownership:");
  console.log(`   Owner: ${owner}`);
  console.log(`   You are owner: ${isOwner ? "✅ Yes" : "❌ No"}`);
  console.log("");

  if (isOwner && distributionBalance > 0n) {
    console.log("✅ You can migrate tokens using emergencyWithdraw()!");
    console.log(`   You can withdraw: ${ethers.formatEther(distributionBalance)} DBBPT`);
  } else if (!isOwner) {
    console.log("❌ You are not the owner. Cannot withdraw tokens.");
  } else {
    console.log("⚠️  Contract has no tokens to migrate.");
  }

  console.log("\n✅ Balance check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
