import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D"; // TEST: removed nonReentrant from stake()
  const stakingAddress = "0x90AEA25a7e8EB95cF801239024860D02DB5fA9A6"; // TEST

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);

  console.log("\n=== TESTING STAKE FUNCTION ===");
  
  const amount = ethers.parseEther("50");
  
  // Check allowance
  const allowance = await token.allowance(deployer.address, stakingAddress);
  console.log("Current allowance:", ethers.formatEther(allowance));
  
  if (allowance < amount) {
    console.log("Approving", ethers.formatEther(amount), "tokens...");
    const approveTx = await token.approve(stakingAddress, amount);
    await approveTx.wait();
    console.log("Approved!");
  }
  
  // Check balances before
  const balanceBefore = await token.balanceOf(deployer.address);
  console.log("Balance before:", ethers.formatEther(balanceBefore));
  
  // Check if staking contract is paused
  try {
    const status = await staking.getContractStatus();
    console.log("\nStaking contract status:");
    console.log("isPaused:", status.isPaused);
    console.log("stakingTokenSet:", status.stakingTokenSet);
    console.log("primaryOracleSet:", status.primaryOracleSet);
    console.log("backupOracleSet:", status.backupOracleSet);
    console.log("tierCount:", status.tierCount.toString());
  } catch (e) {
    console.log("Could not get contract status");
  }
  
  // Try to stake
  console.log("\nAttempting to stake", ethers.formatEther(amount), "tokens...");
  
  try {
    const tx = await staking.stake(amount, { gasLimit: 500000 });
    console.log("Stake tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Stake successful! Gas used:", receipt?.gasUsed.toString());
    
    // Check balances after
    const balanceAfter = await token.balanceOf(deployer.address);
    const stakedAmount = await staking.userStakedTokens(deployer.address);
    console.log("\nAfter staking:");
    console.log("Token balance:", ethers.formatEther(balanceAfter));
    console.log("Staked amount:", ethers.formatEther(stakedAmount));
  } catch (error: any) {
    console.error("\n❌ Stake failed:", error.message);
    
    // Try to get more details
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    // Try to decode the error
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

