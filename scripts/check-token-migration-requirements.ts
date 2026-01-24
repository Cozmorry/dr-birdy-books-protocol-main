import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check token balance in old TokenDistribution contract and migration options
 */

async function main() {
  console.log("\n💰 Checking token balance and migration requirements...\n");

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

  console.log("💰 Token Balance in Old Contract:");
  console.log(`   Current Balance: ${ethers.formatEther(distributionBalance)} DBBPT`);
  console.log(`   Expected Total: ${ethers.formatEther(expectedTotal)} DBBPT`);
  console.log("");

  // Check how much has been claimed
  const currentWallets = await distribution.getTeamWallets();
  const vestingInitialized = await distribution.vestingInitialized();
  
  let totalClaimed = 0n;
  if (vestingInitialized) {
    console.log("📊 Checking claimed amounts:");
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
        console.log(`   ${member.name}: ${ethers.formatEther(claimed)} DBBPT claimed`);
      } catch (error: any) {
        console.log(`   ${member.name}: Error checking`);
      }
    }
    console.log(`   Total Claimed: ${ethers.formatEther(totalClaimed)} DBBPT`);
    console.log("");
  }

  const remainingInContract = distributionBalance;
  const unclaimedAmount = expectedTotal - totalClaimed;

  console.log("📊 Migration Analysis:");
  console.log(`   Total Expected: ${ethers.formatEther(expectedTotal)} DBBPT`);
  console.log(`   Already Claimed: ${ethers.formatEther(totalClaimed)} DBBPT`);
  console.log(`   Unclaimed (should be in contract): ${ethers.formatEther(unclaimedAmount)} DBBPT`);
  console.log(`   Current Contract Balance: ${ethers.formatEther(remainingInContract)} DBBPT`);
  console.log("");

  // Check if owner can withdraw
  const owner = await distribution.owner();
  const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
  
  console.log("🔐 Contract Ownership:");
  console.log(`   Owner: ${owner}`);
  console.log(`   You are owner: ${isOwner ? "✅ Yes" : "❌ No"}`);
  console.log("");

  if (isOwner) {
    console.log("✅ GOOD NEWS: You can transfer tokens from old contract!");
    console.log("");
    console.log("💡 Migration Strategy:");
    console.log("   1. Deploy new TokenDistribution contract");
    console.log("   2. Use emergencyWithdraw() to withdraw tokens from old contract");
    console.log("   3. Transfer tokens to new contract");
    console.log("   4. Initialize vesting in new contract");
    console.log("");
    console.log("   This means you DON'T need fresh 1M tokens!");
    console.log("   You can reuse the tokens from the old contract.");
  } else {
    console.log("❌ You are not the owner of the old contract.");
    console.log("   You'll need fresh tokens OR the owner needs to transfer them.");
  }

  console.log("");
  console.log("📝 Token Migration Options:");
  console.log("");
  console.log("Option 1: Transfer from Old Contract (Recommended)");
  console.log("   ✅ No fresh tokens needed");
  console.log("   ✅ Reuses existing tokens");
  console.log("   ⚠️  Requires: Owner access to old contract");
  console.log("   Steps:");
  console.log("     1. emergencyWithdraw() from old contract");
  console.log("     2. Transfer to new contract");
  console.log("     3. Initialize vesting");
  console.log("");
  console.log("Option 2: Fresh Tokens");
  console.log("   ⚠️  Requires: 1M fresh tokens");
  console.log("   Steps:");
  console.log("     1. Get 1M tokens from token contract or deployer");
  console.log("     2. Transfer to new contract");
  console.log("     3. Initialize vesting");
  console.log("");

  if (remainingInContract >= unclaimedAmount) {
    console.log("✅ Contract has sufficient balance for migration!");
  } else {
    console.log("⚠️  Contract balance is less than expected unclaimed amount.");
    console.log("   You may need additional tokens.");
  }

  console.log("\n✅ Analysis complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
