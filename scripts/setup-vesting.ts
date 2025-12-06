import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Set up vesting system:
 * 1. Transfer 1M tokens from token contract to distribution contract
 * 2. Initialize vesting for all team members
 * 3. Verify setup
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Setting up vesting system...\n");
  console.log("Deployer:", deployer.address);
  console.log("");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const distribution = await ethers.getContractAt("TokenDistribution", contractAddresses.tokenDistribution);

  // ============================================================
  // STEP 1: Check if distribution contract already has tokens
  // ============================================================
  console.log("============================================================");
  console.log("STEP 1: Check Token Balances");
  console.log("============================================================\n");

  const tokenContractBalance = await token.balanceOf(contractAddresses.reflectiveToken);
  const distributionBalance = await token.balanceOf(contractAddresses.tokenDistribution);
  
  console.log("Token Contract Balance:", ethers.formatEther(tokenContractBalance), "DBBPT");
  console.log("Distribution Contract Balance:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("");

  const totalNeeded = ethers.parseEther("1000000"); // 1M tokens

  // ============================================================
  // STEP 2: Transfer tokens to distribution contract if needed
  // ============================================================
  if (distributionBalance < totalNeeded) {
    console.log("============================================================");
    console.log("STEP 2: Transfer Tokens to Distribution Contract");
    console.log("============================================================\n");

    // Check if token contract has enough
    if (tokenContractBalance >= totalNeeded) {
      console.log(`📤 Transferring ${ethers.formatEther(totalNeeded)} DBBPT from token contract...`);
      
      // This requires calling from the token contract itself
      // We need to use initializeDistribution instead
      console.log("⚠️  Cannot transfer directly from token contract");
      console.log("   Need to use ReflectiveToken.initializeDistribution()");
      console.log("");
      
      // Check if distribution is set in token
      const tokenDistAddress = await token.tokenDistribution();
      if (tokenDistAddress === ethers.ZeroAddress) {
        console.log("📋 Setting distribution contract in token...");
        const setTx = await token.setTokenDistribution(contractAddresses.tokenDistribution);
        await setTx.wait();
        console.log("✅ Distribution contract set!");
      }

      console.log("📋 Calling initializeDistribution...");
      const initTx = await token.initializeDistribution();
      await initTx.wait();
      console.log("✅ Distribution initialized!");
      
      const newBalance = await token.balanceOf(contractAddresses.tokenDistribution);
      console.log(`   Distribution now has: ${ethers.formatEther(newBalance)} DBBPT`);
    } else {
      console.log("❌ Token contract doesn't have enough tokens!");
      console.log(`   Has: ${ethers.formatEther(tokenContractBalance)}`);
      console.log(`   Need: ${ethers.formatEther(totalNeeded)}`);
      return;
    }
  } else {
    console.log("✅ Distribution contract already has tokens");
  }

  // ============================================================
  // STEP 3: Initialize vesting schedules
  // ============================================================
  console.log("\n============================================================");
  console.log("STEP 3: Initialize Vesting Schedules");
  console.log("============================================================\n");

  const vestingInitialized = await distribution.vestingInitialized();
  
  if (!vestingInitialized) {
    console.log("📋 Initializing vesting for all team members...");
    const vestingTx = await distribution.initializeVesting();
    await vestingTx.wait();
    console.log("✅ Vesting initialized!");
  } else {
    console.log("✅ Vesting already initialized");
  }

  // ============================================================
  // STEP 4: Verify Setup
  // ============================================================
  console.log("\n============================================================");
  console.log("STEP 4: Verify Vesting Setup");
  console.log("============================================================\n");

  const josephWallet = await distribution.josephWallet();
  const ajWallet = await distribution.ajWallet();
  const birdyWallet = await distribution.birdyWallet();
  const developerWallet = await distribution.developerWallet();

  const members = [
    { name: "Joseph (J)", address: josephWallet },
    { name: "AJ (A)", address: ajWallet },
    { name: "Birdy (B)", address: birdyWallet },
    { name: "Developer (Morris)", address: developerWallet },
  ];

  for (const member of members) {
    const info = await distribution.getVestingInfo(member.address);
    const claimable = await distribution.getClaimableAmount(member.address);
    
    console.log(`${member.name}:`);
    console.log(`  Total: ${ethers.formatEther(info.totalAmount)} DBBPT`);
    console.log(`  Claimable now: ${ethers.formatEther(claimable)} DBBPT`);
    console.log(`  Active: ${info.isActive}`);
    console.log("");
  }

  console.log("✅ Vesting system is ready!");
  console.log("\n💡 Team members can now claim their vested tokens over 1 year");
  console.log("   Tokens unlock linearly over 365 days");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

