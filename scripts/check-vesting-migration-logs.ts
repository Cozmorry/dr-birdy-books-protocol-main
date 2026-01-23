import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Check the transaction logs to see if VestingMigrated events were emitted
 * This will help us understand what happened during the wallet update
 */

async function main() {
  console.log("\n🔍 Checking vesting migration logs from transaction...\n");

  // Transaction hash from the update
  const txHash = "0x9e437ab3c8926bd0e21cd440962764eb220c497c17833f295c7403dc49572d0b";

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

  console.log("📋 TokenDistribution Address:", distributionAddress);
  console.log("📋 Transaction Hash:", txHash);
  console.log("");

  // Get provider
  const provider = ethers.provider;
  
  // Get transaction receipt
  console.log("📥 Fetching transaction receipt...");
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.error("❌ Transaction not found!");
    process.exit(1);
  }

  console.log("✅ Transaction found!");
  console.log("   Block:", receipt.blockNumber);
  console.log("   Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("");

  // Get contract instance to decode events
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);
  
  // Parse events
  console.log("📊 Parsing events from transaction...\n");
  
  const teamWalletUpdatedEvents = [];
  const vestingMigratedEvents = [];
  
  for (const log of receipt.logs) {
    try {
      // Try to decode TeamWalletUpdated event
      try {
        const parsed = distribution.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        
        if (parsed && parsed.name === "TeamWalletUpdated") {
          teamWalletUpdatedEvents.push({
            oldWallet: parsed.args[0],
            newWallet: parsed.args[1],
            memberName: parsed.args[2],
          });
        }
        
        if (parsed && parsed.name === "VestingMigrated") {
          vestingMigratedEvents.push({
            oldWallet: parsed.args[0],
            newWallet: parsed.args[1],
            totalAmount: parsed.args[2].toString(),
            claimed: parsed.args[3].toString(),
          });
        }
      } catch (e) {
        // Not a TokenDistribution event, skip
      }
    } catch (e) {
      // Skip logs that can't be parsed
    }
  }

  console.log("📋 TeamWalletUpdated Events:", teamWalletUpdatedEvents.length);
  for (const event of teamWalletUpdatedEvents) {
    console.log(`   ${event.memberName}:`);
    console.log(`     Old: ${event.oldWallet}`);
    console.log(`     New: ${event.newWallet}`);
  }
  console.log("");

  console.log("📋 VestingMigrated Events:", vestingMigratedEvents.length);
  if (vestingMigratedEvents.length === 0) {
    console.log("   ⚠️  No VestingMigrated events found!");
    console.log("   This means vesting data was NOT migrated for any team member.");
    console.log("   Possible reasons:");
    console.log("     1. Vesting was not initialized before the update");
    console.log("     2. Old wallet addresses did not have active vesting");
  } else {
    for (const event of vestingMigratedEvents) {
      console.log(`   Migration:`);
      console.log(`     Old Wallet: ${event.oldWallet}`);
      console.log(`     New Wallet: ${event.newWallet}`);
      console.log(`     Total Amount: ${ethers.formatEther(event.totalAmount)} DBBPT`);
      console.log(`     Claimed: ${ethers.formatEther(event.claimed)} DBBPT`);
      console.log("");
    }
  }

  // Check current vesting status
  console.log("\n📊 Current Vesting Status:");
  const currentWallets = await distribution.getTeamWallets();
  
  const newJosephAddress = "0xf40df6189713FEc50AC39960e4874b75dfdeF35B";
  const newAjAddress = "0x4A44D33fb26F67348c4780aE286C736C5f0335C7";
  const oldJosephAddress = "0x4D8B10E7d6BFF54c8c1C1C42240c74e173C5F8ed";
  const oldAjAddress = "0xDD82052FBc8EDC7091dafa1540f16c63c51Cb2fB";

  console.log("\n   Joseph:");
  console.log("     Old Address:", oldJosephAddress);
  const oldJosephVesting = await distribution.getVestingInfo(oldJosephAddress);
  console.log("       Vesting Active:", oldJosephVesting.totalAmount > 0 ? "Yes" : "No");
  console.log("       Total Amount:", ethers.formatEther(oldJosephVesting.totalAmount), "DBBPT");
  
  console.log("     New Address:", newJosephAddress);
  const newJosephVesting = await distribution.getVestingInfo(newJosephAddress);
  console.log("       Vesting Active:", newJosephVesting.totalAmount > 0 ? "Yes" : "No");
  console.log("       Total Amount:", ethers.formatEther(newJosephVesting.totalAmount), "DBBPT");
  console.log("       Claimed:", ethers.formatEther(newJosephVesting.claimed), "DBBPT");

  console.log("\n   AJ:");
  console.log("     Old Address:", oldAjAddress);
  const oldAjVesting = await distribution.getVestingInfo(oldAjAddress);
  console.log("       Vesting Active:", oldAjVesting.totalAmount > 0 ? "Yes" : "No");
  console.log("       Total Amount:", ethers.formatEther(oldAjVesting.totalAmount), "DBBPT");
  
  console.log("     New Address:", newAjAddress);
  const newAjVesting = await distribution.getVestingInfo(newAjAddress);
  console.log("       Vesting Active:", newAjVesting.totalAmount > 0 ? "Yes" : "No");
  console.log("       Total Amount:", ethers.formatEther(newAjVesting.totalAmount), "DBBPT");
  console.log("       Claimed:", ethers.formatEther(newAjVesting.claimed), "DBBPT");

  // Check if vesting was initialized
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("\n📊 Vesting Initialized:", vestingInitialized);

  console.log("\n✅ Analysis complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
