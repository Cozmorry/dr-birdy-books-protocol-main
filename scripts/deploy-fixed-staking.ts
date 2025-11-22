import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying FlexibleTieredStaking (non-upgradeable) with account:", deployer.address);

  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D";
  const primaryOracle = "0x71041dDDaD356F8F9546D0Ba93B54C0b4C458375"; // ETH/USD on Base Sepolia
  const backupOracle = "0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8"; // Backup ETH/USD
  
  console.log("\n📦 Deploying FlexibleTieredStaking...");
  const FlexibleTieredStaking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await FlexibleTieredStaking.deploy(
    tokenAddress,
    primaryOracle,
    backupOracle
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ FlexibleTieredStaking deployed to:", stakingAddress);
  
  // Add default tiers
  console.log("\n🔧 Adding default tiers...");
  const tier1 = await staking.addTier(2400000000, "Tier 1"); // $24 with 8 decimals
  await tier1.wait();
  console.log("✅ Tier 1 added ($24)");
  
  const tier2 = await staking.addTier(5000000000, "Tier 2"); // $50 with 8 decimals
  await tier2.wait();
  console.log("✅ Tier 2 added ($50)");
  
  const tier3 = await staking.addTier(100000000000, "Tier 3"); // $1000 with 8 decimals
  await tier3.wait();
  console.log("✅ Tier 3 added ($1000)");
  
  console.log("\n🎯 Testing stake function...");
  
  // Get token contract
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  
  const amount = ethers.parseEther("50");
  
  // Approve
  console.log("Approving tokens...");
  const approveTx = await token.approve(stakingAddress, amount);
  await approveTx.wait();
  console.log("✅ Approved!");
  
  // Stake
  console.log("\nAttempting to stake", ethers.formatEther(amount), "tokens...");
  try {
    const stakeTx = await staking.stake(amount);
    console.log("Stake tx sent:", stakeTx.hash);
    const receipt = await stakeTx.wait();
    console.log("✅✅✅ STAKING SUCCESSFUL! ✅✅✅");
    console.log("Gas used:", receipt?.gasUsed.toString());
    
    // Check staked amount
    const staked = await staking.getUserStakedTokens(deployer.address);
    console.log("Your staked amount:", ethers.formatEther(staked));
    
    // Check tier
    const hasAccess = await staking.hasAccess(deployer.address);
    console.log("Has access:", hasAccess);
  } catch (error: any) {
    console.error("❌ Staking failed:", error.message);
  }
  
  console.log("\n🎯 Deployment Complete:");
  console.log("Token:", tokenAddress);
  console.log("FlexibleTieredStaking:", stakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

