import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SimpleStakingV2 with account:", deployer.address);

  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D";
  
  console.log("\n📦 Deploying SimpleStakingV2...");
  const SimpleStakingV2 = await ethers.getContractFactory("SimpleStakingV2");
  const staking = await SimpleStakingV2.deploy(tokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ SimpleStakingV2 deployed to:", stakingAddress);
  
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
    const staked = await staking.getStakedAmount(deployer.address);
    console.log("Your staked amount:", ethers.formatEther(staked));
  } catch (error: any) {
    console.error("❌ Staking failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

