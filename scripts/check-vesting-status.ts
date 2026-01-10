import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Checking TokenDistribution contract state...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const distribution = await ethers.getContractAt("TokenDistribution", contractAddresses.tokenDistribution);

  console.log("📋 Token:", contractAddresses.reflectiveToken);
  console.log("📋 Distribution:", contractAddresses.tokenDistribution);
  console.log("");

  // Check if vesting is initialized
  const vestingInitialized = await distribution.vestingInitialized();
  console.log("✅ Vesting Initialized:", vestingInitialized);

  // Check distribution contract balance
  const distributionBalance = await token.balanceOf(contractAddresses.tokenDistribution);
  console.log("💰 Distribution Contract Balance:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("");

  if (distributionBalance === 0n) {
    console.log("⚠️  WARNING: Distribution contract has 0 tokens!");
    console.log("   The vesting system needs tokens in the distribution contract.");
    console.log("   You already distributed tokens directly to team members.");
    console.log("");
    console.log("💡 Options:");
    console.log("   1. Transfer tokens to distribution contract for vesting");
    console.log("   2. Keep current direct distribution (no vesting)");
    console.log("");
    
    // Show how much we'd need
    const TEAM_ALLOCATION_STANDARD = ethers.parseEther("162500");
    const TEAM_ALLOCATION_DEVELOPER = ethers.parseEther("100000");
    const AIRDROP_ALLOCATION = ethers.parseEther("250000");
    const totalNeeded = (TEAM_ALLOCATION_STANDARD * 4n) + TEAM_ALLOCATION_DEVELOPER + AIRDROP_ALLOCATION;
    
    console.log("📊 Tokens needed for vesting:");
    console.log(`   Total: ${ethers.formatEther(totalNeeded)} DBBPT`);
    console.log(`   - 4 team members @ 162,500 each = 650,000`);
    console.log(`   - 1 developer @ 100,000 = 100,000`);
    console.log(`   - Airdrop reserve = 250,000`);
    console.log(`   TOTAL = 1,000,000 DBBPT`);
    return;
  }

  // Check vesting info for each team member
  const josephWallet = await distribution.josephWallet();
  const ajWallet = await distribution.ajWallet();
  const birdyWallet = await distribution.birdyWallet();
  const developerWallet = await distribution.developerWallet();

  console.log("🔒 Vesting Information:");
  console.log("");

  const members = [
    { name: "Team Member 1 (J)", address: josephWallet },
    { name: "Team Member 2 (A)", address: ajWallet },
    { name: "Team Member 5 (B)", address: birdyWallet },
    { name: "Team Member 4 (Developer)", address: developerWallet },
  ];

  for (const member of members) {
    try {
      const info = await distribution.getVestingInfo(member.address);
      const claimable = await distribution.getClaimableAmount(member.address);
      
      console.log(`${member.name}:`);
      console.log(`  Address: ${member.address}`);
      console.log(`  Total Allocation: ${ethers.formatEther(info.totalAmount)} DBBPT`);
      console.log(`  Already Claimed: ${ethers.formatEther(info.claimed)} DBBPT`);
      console.log(`  Claimable Now: ${ethers.formatEther(claimable)} DBBPT`);
      console.log(`  Active: ${info.isActive}`);
      console.log("");
    } catch (error: any) {
      console.log(`${member.name}: Could not fetch vesting info`);
      console.log("");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

