import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Investigate why developer vesting was deactivated
 * Check transaction history for updateTeamWallets calls
 */

async function main() {
  console.log("\n🔍 Investigating why developer vesting was deactivated...\n");

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

  console.log("📋 TokenDistribution:", distributionAddress);
  console.log("📊 Current Developer Address:", currentDeveloperAddress);
  console.log("");

  // Get contract creation block
  const contractCode = await ethers.provider.getCode(distributionAddress);
  if (contractCode === "0x") {
    throw new Error("Contract not found at address");
  }

  // Try to get contract creation transaction
  console.log("🔍 Checking for TeamWalletUpdated events...");
  console.log("   (This will show when updateTeamWallets was called)");
  console.log("");

  // Get filter for TeamWalletUpdated events
  const filter = distribution.filters.TeamWalletUpdated();
  
  // Get events from a reasonable block range (last 100k blocks or from deployment)
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 100000); // Last 100k blocks
  
  try {
    const events = await distribution.queryFilter(filter, fromBlock, currentBlock);
    
    if (events.length === 0) {
      console.log("   ⚠️  No TeamWalletUpdated events found in recent blocks");
      console.log("   This might mean:");
      console.log("     1. updateTeamWallets was never called");
      console.log("     2. Events are in older blocks");
    } else {
      console.log(`   ✅ Found ${events.length} TeamWalletUpdated event(s):`);
      console.log("");
      
      for (const event of events) {
        const args = event.args;
        if (!args) continue;
        
        const oldWallet = args[0];
        const newWallet = args[1];
        const memberName = args[2];
        
        console.log(`   📋 Event at block ${event.blockNumber}:`);
        console.log(`      Member: ${memberName}`);
        console.log(`      Old Wallet: ${oldWallet}`);
        console.log(`      New Wallet: ${newWallet}`);
        
        if (memberName === "Developer") {
          const isSameAddress = oldWallet.toLowerCase() === newWallet.toLowerCase();
          console.log(`      ⚠️  Same Address: ${isSameAddress ? "YES - THIS IS THE BUG!" : "No"}`);
          
          if (isSameAddress) {
            console.log(`      ❌ BUG FOUND: updateTeamWallets was called with the same developer address!`);
            console.log(`      This would have triggered _migrateVestingData() which deactivated the vesting.`);
          }
        }
        console.log("");
      }
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error querying events: ${error.message}`);
    console.log("   This might be due to RPC limitations or the events being too old.");
  }

  // Check for VestingMigrated events
  console.log("🔍 Checking for VestingMigrated events...");
  const vestingFilter = distribution.filters.VestingMigrated();
  
  try {
    const vestingEvents = await distribution.queryFilter(vestingFilter, fromBlock, currentBlock);
    
    if (vestingEvents.length === 0) {
      console.log("   ⚠️  No VestingMigrated events found");
    } else {
      console.log(`   ✅ Found ${vestingEvents.length} VestingMigrated event(s):`);
      console.log("");
      
      for (const event of vestingEvents) {
        const args = event.args;
        if (!args) continue;
        
        const oldWallet = args[0];
        const newWallet = args[1];
        const totalAmount = args[2];
        
        console.log(`   📋 Event at block ${event.blockNumber}:`);
        console.log(`      Old Wallet: ${oldWallet}`);
        console.log(`      New Wallet: ${newWallet}`);
        console.log(`      Total Amount: ${ethers.formatEther(totalAmount)} DBBPT`);
        
        if (oldWallet.toLowerCase() === currentDeveloperAddress.toLowerCase() || 
            newWallet.toLowerCase() === currentDeveloperAddress.toLowerCase()) {
          console.log(`      ⚠️  This event involves the current developer address!`);
        }
        console.log("");
      }
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error querying vesting events: ${error.message}`);
  }

  console.log("📝 Analysis:");
  console.log("");
  console.log("The bug in _migrateVestingData():");
  console.log("   When updateTeamWallets() is called, it ALWAYS calls _migrateVestingData()");
  console.log("   for all team members, even if the address didn't change.");
  console.log("");
  console.log("   If oldDeveloper == developerWallet (same address):");
  console.log("   1. _migrateVestingData(oldDeveloper, developerWallet) is called");
  console.log("   2. It checks if oldInfo.isActive is true (it is)");
  console.log("   3. It creates vestingInfo[developerWallet] with isActive=true");
  console.log("   4. It sets oldInfo.isActive = false");
  console.log("   5. Since oldDeveloper == developerWallet, this deactivates the same address!");
  console.log("");
  console.log("💡 This is why your vesting was deactivated!");

  console.log("\n✅ Investigation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
