/**
 * @title Debug Distribution Issue
 * @notice Checks why distributeInitialTokens is failing
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentFile = require("../deployments/deployment-mainnet-1765231331017.json");
  const DISTRIBUTION = deploymentFile.distribution;

  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  console.log("\n🔍 DEBUGGING DISTRIBUTION");
  console.log("=".repeat(80));

  // Check all requirements
  const owner = await distribution.owner();
  const vestingInitialized = await distribution.vestingInitialized();
  const distributionComplete = await distribution.isDistributionComplete();
  const token = await distribution.token();
  const tokenContract = await ethers.getContractAt("ReflectiveToken", token);
  const distributionBalance = await tokenContract.balanceOf(DISTRIBUTION);
  const totalNeeded = ethers.parseEther("1000000");

  const airdropWallet = await distribution.airdropWallet();

  console.log("\n📋 Requirements Check:");
  console.log("  Owner:", owner);
  console.log("  Deployer:", deployer.address);
  console.log("  Is Owner:", owner.toLowerCase() === deployer.address.toLowerCase());
  console.log("  Vesting Initialized:", vestingInitialized);
  console.log("  Distribution Complete:", distributionComplete);
  console.log("  Distribution Balance:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("  Required:", ethers.formatEther(totalNeeded), "DBBPT");
  console.log("  Has Enough:", distributionBalance >= totalNeeded);
  console.log("  Airdrop Wallet:", airdropWallet);
  console.log("  Airdrop Wallet Valid:", airdropWallet !== ethers.ZeroAddress);

  // Check airdrop wallet balance
  const airdropBalance = await tokenContract.balanceOf(airdropWallet);
  console.log("  Airdrop Wallet Balance:", ethers.formatEther(airdropBalance), "DBBPT");

  // Try to call distributeInitialTokens with static call to see the error
  console.log("\n📋 Testing distributeInitialTokens()...");
  try {
    await distribution.distributeInitialTokens.staticCall();
    console.log("✅ distributeInitialTokens() would succeed!");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("   Full error:", error);
  }

  // Check if we can transfer to airdrop wallet
  const AIRDROP_ALLOCATION = ethers.parseEther("250000");
  console.log("\n📋 Testing airdrop transfer...");
  try {
    const tokenDist = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", token);
    const allowance = await tokenDist.allowance(DISTRIBUTION, airdropWallet);
    console.log("  Allowance (not needed for safeTransfer):", ethers.formatEther(allowance));
    
    // Try static call to safeTransfer
    const distributionWithToken = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);
    // Can't easily test safeTransfer, but let's check if the issue is the airdrop wallet
    console.log("  Airdrop allocation:", ethers.formatEther(AIRDROP_ALLOCATION), "DBBPT");
    console.log("  Can transfer:", distributionBalance >= AIRDROP_ALLOCATION);
  } catch (error: any) {
    console.error("❌ Error checking transfer:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });

