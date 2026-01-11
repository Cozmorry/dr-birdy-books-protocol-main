import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Calculate when next tokens will be claimable
 */

const TEAM_MEMBER = "0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b";

async function main() {
  const deploymentFile = "deployment-localhost-20260110232000.json";
  const deploymentPath = path.join(__dirname, "..", "deployments", deploymentFile);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
  const distribution = TokenDistribution.attach(deployment.distribution);
  
  const provider = ethers.provider;
  const currentBlock = await provider.getBlock("latest");
  const currentTime = currentBlock?.timestamp || 0;
  
  const vestingInfo = await distribution.vestingInfo(TEAM_MEMBER);
  const startTime = Number(vestingInfo.startTime);
  const totalAmount = Number(vestingInfo.totalAmount);
  const claimed = Number(vestingInfo.claimed);
  const duration = Number(vestingInfo.duration);
  
  const elapsed = currentTime - startTime;
  const vested = (totalAmount * elapsed) / duration;
  const claimable = vested - claimed;
  
  console.log("\n📊 Current Status:");
  console.log(`   Total: ${ethers.formatEther(totalAmount)} DBBPT`);
  console.log(`   Claimed: ${ethers.formatEther(claimed)} DBBPT`);
  console.log(`   Vested: ${ethers.formatEther(vested)} DBBPT`);
  console.log(`   Claimable: ${ethers.formatEther(claimable)} DBBPT`);
  
  if (claimable <= 0) {
    const tokensPerSecond = totalAmount / duration;
    const secondsNeeded = Math.ceil((claimed - vested) / tokensPerSecond);
    const nextClaimTime = currentTime + secondsNeeded;
    const nextClaimDate = new Date(nextClaimTime * 1000);
    
    console.log(`\n⏰ Next Claimable Tokens:`);
    console.log(`   Time needed: ${secondsNeeded} seconds`);
    console.log(`   In ${(secondsNeeded / 60).toFixed(1)} minutes`);
    console.log(`   In ${(secondsNeeded / 3600).toFixed(2)} hours`);
    console.log(`   At: ${nextClaimDate.toISOString()}`);
    console.log(`   Amount: ~${ethers.formatEther(tokensPerSecond * secondsNeeded)} DBBPT`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
