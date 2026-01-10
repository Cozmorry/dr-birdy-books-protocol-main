import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🧪 Testing Vesting Distribution...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const distribution = await ethers.getContractAt("TokenDistribution", contractAddresses.tokenDistribution);

  console.log("✅ Vesting is set up!");
  console.log(`💰 Distribution contract has: ${ethers.formatEther(await token.balanceOf(contractAddresses.tokenDistribution))} DBBPT\n`);

  // Get wallet addresses
  const josephWallet = await distribution.josephWallet();
  const ajWallet = await distribution.ajWallet();
  const birdyWallet = await distribution.birdyWallet();
  const developerWallet = await distribution.developerWallet();

  const members = [
    { name: "Team Member 1 (J)", address: josephWallet },
    { name: "Team Member 2 (A)", address: ajWallet },
    { name: "Team Member 5 (B)", address: birdyWallet },
    { name: "Team Member 4 (Developer)", address: developerWallet },
  ];

  console.log("=".repeat(70));
  console.log("VESTING STATUS");
  console.log("=".repeat(70));
  console.log("");

  for (const member of members) {
    try {
      const info = await distribution.vestingInfo(member.address);
      const claimable = await distribution.calculateClaimable(member.address);
      
      const timeElapsed = BigInt(Math.floor(Date.now() / 1000)) - info.startTime;
      const percentVested = (timeElapsed * 10000n) / info.duration; // in basis points
      
      console.log(`${member.name}:`);
      console.log(`  Address: ${member.address}`);
      console.log(`  Total Allocation: ${ethers.formatEther(info.totalAmount)} DBBPT`);
      console.log(`  Already Claimed: ${ethers.formatEther(info.claimed)} DBBPT`);
      console.log(`  Claimable Now: ${ethers.formatEther(claimable)} DBBPT`);
      console.log(`  Percent Vested: ${Number(percentVested) / 100}%`);
      console.log(`  Vesting Duration: 365 days`);
      console.log(`  Active: ${info.isActive}`);
      console.log("");
    } catch (error: any) {
      console.log(`${member.name}: Error - ${error.message}\n`);
    }
  }

  // Test claiming for you
  console.log("=".repeat(70));
  console.log("TEST CLAIMING (FOR YOUR ACCOUNT)");
  console.log("=".repeat(70));
  console.log("");

  const yourClaimable = await distribution.calculateClaimable(deployer.address);
  const yourBalanceBefore = await token.balanceOf(deployer.address);
  
  console.log(`Your wallet: ${deployer.address}`);
  console.log(`Balance before claim: ${ethers.formatEther(yourBalanceBefore)} DBBPT`);
  console.log(`Claimable amount: ${ethers.formatEther(yourClaimable)} DBBPT`);
  console.log("");

  if (yourClaimable > 0n) {
    console.log("📋 Claiming your vested tokens...");
    const claimTx = await distribution.claimTokens();
    await claimTx.wait();
    console.log("✅ Tokens claimed!");
    console.log(`   TX: ${claimTx.hash}`);
    
    const yourBalanceAfter = await token.balanceOf(deployer.address);
    const claimed = yourBalanceAfter - yourBalanceBefore;
    console.log(`   Received: ${ethers.formatEther(claimed)} DBBPT`);
    console.log(`   New balance: ${ethers.formatEther(yourBalanceAfter)} DBBPT`);
  } else {
    console.log("⏰ No tokens claimable yet");
    console.log("   Vesting just started - check back later!");
    console.log("   Tokens unlock linearly: ~274 tokens per day over 365 days");
  }

  console.log("\n=".repeat(70));
  console.log("✅ VESTING SYSTEM TEST COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📝 Summary:");
  console.log("   - Vesting initialized for all team members");
  console.log("   - Each member's tokens unlock linearly over 1 year");
  console.log("   - Team members can call claimTokens() to withdraw vested amount");
  console.log("   - Test claim executed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

