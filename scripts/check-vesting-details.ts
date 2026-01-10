import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 CHECKING VESTING DETAILS");
  console.log("=".repeat(80));
  console.log("Network:", (await ethers.provider.getNetwork()).name, "Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("=".repeat(80));

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const distribution = await ethers.getContractAt("TokenDistribution", contractAddresses.tokenDistribution);
  const { DEPLOYMENT_CONFIG } = require("./config");
  const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS;

  console.log("\n👥 TEAM MEMBER VESTING INFO:");
  console.log("-".repeat(80));

  for (const [name, address] of Object.entries(teamWallets)) {
    if (name === "AIRDROP") continue;
    
    try {
      const [totalAmount, claimed, claimable, vestingEndTime] = await distribution.getVestingInfo(address as string);
      const currentTime = Math.floor(Date.now() / 1000);
      const vestingStartTime = Number(vestingEndTime) - 365 * 24 * 60 * 60; // 365 days before end
      const daysElapsed = Math.floor((currentTime - vestingStartTime) / (24 * 60 * 60));
      const daysRemaining = Math.floor((Number(vestingEndTime) - currentTime) / (24 * 60 * 60));
      const cliffDate = new Date((vestingStartTime + 90 * 24 * 60 * 60) * 1000);
      const endDate = new Date(Number(vestingEndTime) * 1000);
      
      console.log(`\n${name} (${address}):`);
      console.log(`  Total Allocated: ${ethers.formatEther(totalAmount)} DBBPT`);
      console.log(`  Claimed: ${ethers.formatEther(claimed)} DBBPT`);
      console.log(`  Claimable Now: ${ethers.formatEther(claimable)} DBBPT`);
      console.log(`  Days Elapsed: ${daysElapsed} days`);
      console.log(`  Days Remaining: ${daysRemaining > 0 ? daysRemaining : 0} days`);
      console.log(`  Cliff Date: ${cliffDate.toLocaleDateString()}`);
      console.log(`  Vesting End: ${endDate.toLocaleDateString()}`);
      
      if (claimable > 0) {
        console.log(`  ✅ Can claim now!`);
      } else if (currentTime < vestingStartTime + 90 * 24 * 60 * 60) {
        console.log(`  ⏳ Waiting for cliff period (90 days from start)`);
      } else {
        console.log(`  ✅ Past cliff, can claim gradually`);
      }
    } catch (error: any) {
      console.log(`\n${name} (${address}):`);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Check airdrop
  const airdropWallet = await distribution.airdropWallet();
  const airdropBalance = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken).then(token => 
    token.balanceOf(airdropWallet)
  );
  console.log(`\n🎁 AIRDROP WALLET:`);
  console.log(`  Address: ${airdropWallet}`);
  console.log(`  Balance: ${ethers.formatEther(await airdropBalance)} DBBPT`);
  console.log(`  ✅ Already distributed (immediate)`);

  console.log("\n" + "=".repeat(80));
  console.log("✅ DISTRIBUTION SUMMARY:");
  console.log("=".repeat(80));
  console.log("  - 750,000 DBBPT: Team vesting (162.5k each for Team Members 1/2/3/5, 100k for Team Member 4)");
  console.log("  - 250,000 DBBPT: Airdrop (already distributed)");
  console.log("  - Team members can claim after 90-day cliff period");
  console.log("  - Full vesting over 365 days");
}

main().catch(console.error);

