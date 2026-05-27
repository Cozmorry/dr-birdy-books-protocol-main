import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D";
  const stakingAddress = "0x753C202DB474033a586a48E450A97228ed52E90c";

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const staking = await ethers.getContractAt("SimpleStaking", stakingAddress);

  console.log("\n=== TESTING SIMPLE STAKING ===");
  
  const amount = ethers.parseEther("50");
  
  // Check if initialized
  const stakingTokenAddr = await staking.stakingToken();
  console.log("Staking token set to:", stakingTokenAddr);
  
  if (stakingTokenAddr === ethers.ZeroAddress) {
    console.log("Not initialized yet, initializing...");
    const initTx = await staking.initialize(tokenAddress);
    await initTx.wait();
    console.log("✅ Initialized!");
    
    const newStakingTokenAddr = await staking.stakingToken();
    console.log("Staking token now set to:", newStakingTokenAddr);
  }
  
  // Approve
  console.log("\nApproving tokens...");
  const approveTx = await token.approve(stakingAddress, amount);
  await approveTx.wait();
  console.log("✅ Approved!");
  
  // Check allowance
  const allowance = await token.allowance(deployer.address, stakingAddress);
  console.log("Allowance:", ethers.formatEther(allowance));
  
  // Stake
  console.log("\nAttempting to stake", ethers.formatEther(amount), "tokens...");
  try {
    const stakeTx = await staking.stake(amount);
    console.log("Stake tx sent:", stakeTx.hash);
    const receipt = await stakeTx.wait();
    console.log("✅ STAKING SUCCESSFUL! Gas used:", receipt?.gasUsed.toString());
    
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

