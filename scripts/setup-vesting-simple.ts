import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Simplified vesting setup:
 * 1. Transfer tokens from your wallet to distribution contract
 * 2. Initialize vesting
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Setting up vesting system (simplified approach)...\n");
  console.log("Deployer:", deployer.address);
  console.log("");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const distribution = await ethers.getContractAt("TokenDistribution", contractAddresses.tokenDistribution);

  // Check balances
  const yourBalance = await token.balanceOf(deployer.address);
  const distributionBalance = await token.balanceOf(contractAddresses.tokenDistribution);
  
  console.log("📊 Current Balances:");
  console.log(`   Your balance: ${ethers.formatEther(yourBalance)} DBBPT`);
  console.log(`   Distribution contract: ${ethers.formatEther(distributionBalance)} DBBPT`);
  console.log("");

  const totalNeeded = ethers.parseEther("1000000"); // 1M tokens

  // ============================================================
  // STEP 1: Transfer tokens from your wallet to distribution
  // ============================================================
  if (distributionBalance < totalNeeded) {
    console.log("============================================================");
    console.log("STEP 1: Transfer Tokens to Distribution Contract");
    console.log("============================================================\n");

    if (yourBalance >= totalNeeded) {
      console.log(`📤 Transferring ${ethers.formatEther(totalNeeded)} DBBPT to distribution contract...`);
      const transferTx = await token.transfer(contractAddresses.tokenDistribution, totalNeeded);
      await transferTx.wait();
      console.log("✅ Tokens transferred!");
      console.log(`   TX: ${transferTx.hash}`);
      
      const newBalance = await token.balanceOf(contractAddresses.tokenDistribution);
      console.log(`   Distribution now has: ${ethers.formatEther(newBalance)} DBBPT\n`);
    } else {
      console.log("❌ You don't have enough tokens!");
      console.log(`   You have: ${ethers.formatEther(yourBalance)}`);
      console.log(`   Need: ${ethers.formatEther(totalNeeded)}`);
      return;
    }
  } else {
    console.log("✅ Distribution contract already has enough tokens\n");
  }

  // ============================================================
  // STEP 2: Initialize vesting schedules
  // ============================================================
  console.log("============================================================");
  console.log("STEP 2: Initialize Vesting Schedules");
  console.log("============================================================\n");

  const vestingInitialized = await distribution.vestingInitialized();
  
  if (!vestingInitialized) {
    console.log("📋 Initializing vesting for all team members...");
    try {
      const vestingTx = await distribution.initializeVesting();
      await vestingTx.wait();
      console.log("✅ Vesting initialized!");
      console.log(`   TX: ${vestingTx.hash}\n`);
    } catch (error: any) {
      console.log("❌ Failed to initialize vesting:", error.message);
      return;
    }
  } else {
    console.log("✅ Vesting already initialized\n");
  }

  // ============================================================
  // STEP 3: Verify Setup and Test Claims
  // ============================================================
  console.log("============================================================");
  console.log("STEP 3: Verify Vesting Setup");
  console.log("============================================================\n");

  const josephWallet = await distribution.josephWallet();
  const ajWallet = await distribution.ajWallet();
  const birdyWallet = await distribution.birdyWallet();
  const developerWallet = await distribution.developerWallet();

  const members = [
    { name: "Joseph (J)", address: josephWallet },
    { name: "AJ (A)", address: ajWallet },
    { name: "Birdy (B)", address: birdyWallet },
    { name: "Developer (Morris - You)", address: developerWallet },
  ];

  console.log("🔒 Vesting Information:");
  console.log("");

  for (const member of members) {
    const info = await distribution.getVestingInfo(member.address);
    const claimable = await distribution.getClaimableAmount(member.address);
    
    console.log(`${member.name}:`);
    console.log(`  Address: ${member.address}`);
    console.log(`  Total Allocation: ${ethers.formatEther(info.totalAmount)} DBBPT`);
    console.log(`  Already Claimed: ${ethers.formatEther(info.claimed)} DBBPT`);
    console.log(`  Claimable Now: ${ethers.formatEther(claimable)} DBBPT`);
    console.log(`  Vesting Duration: 365 days`);
    console.log(`  Active: ${info.isActive}`);
    console.log("");
  }

  // ============================================================
  // STEP 4: Test claiming (you can claim your vested tokens)
  // ============================================================
  console.log("============================================================");
  console.log("STEP 4: Test Claiming Vested Tokens");
  console.log("============================================================\n");

  const yourClaimable = await distribution.getClaimableAmount(deployer.address);
  
  if (yourClaimable > 0n) {
    console.log(`💰 You have ${ethers.formatEther(yourClaimable)} DBBPT claimable now!`);
    console.log("\n⏰ Note: Tokens vest linearly over 365 days");
    console.log("   More tokens become claimable as time passes\n");
    
    // Uncomment to actually claim:
    // console.log("📋 Claiming tokens...");
    // const claimTx = await distribution.claimTokens();
    // await claimTx.wait();
    // console.log("✅ Tokens claimed!");
  } else {
    console.log("⏰ No tokens claimable yet (vesting just started)");
    console.log("   Tokens unlock linearly over 365 days");
  }

  console.log("\n✅ Vesting system setup complete!");
  console.log("\n📝 Summary:");
  console.log("   - Distribution contract funded with 1M tokens");
  console.log("   - Vesting schedules initialized for all team members");
  console.log("   - Tokens unlock linearly over 1 year");
  console.log("   - Team members can call claimTokens() to withdraw vested amount");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

