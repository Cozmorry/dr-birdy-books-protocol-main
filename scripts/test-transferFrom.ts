import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0x9784a693Be660F8ab511EE1942e336A818c254f1";
  const stakingAddress = "0xB4E230B300523e58e72b8DC8934757BDFF1Cc320";

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("\n=== TESTING TRANSFERFROM ===");
  
  const amount = ethers.parseEther("50");
  
  // Check current allowance
  const currentAllowance = await token.allowance(deployer.address, stakingAddress);
  console.log("Current allowance:", ethers.formatEther(currentAllowance));
  
  // Approve if needed
  if (currentAllowance < amount) {
    console.log("Approving", ethers.formatEther(amount), "tokens...");
    const approveTx = await token.approve(stakingAddress, amount);
    await approveTx.wait();
    console.log("Approved!");
  }
  
  // Check balances before
  const balanceBefore = await token.balanceOf(deployer.address);
  const stakingBalanceBefore = await token.balanceOf(stakingAddress);
  console.log("\nBefore transfer:");
  console.log("Deployer balance:", ethers.formatEther(balanceBefore));
  console.log("Staking balance:", ethers.formatEther(stakingBalanceBefore));
  
  // Now try transferFrom AS IF we're the staking contract
  // We'll call it directly from the deployer to simulate what the staking contract does
  console.log("\nAttempting transferFrom (deployer -> staking)...");
  
  try {
    // This simulates what happens when the staking contract calls transferFrom
    const tx = await token.transferFrom(deployer.address, stakingAddress, amount);
    console.log("TransferFrom tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("TransferFrom successful! Gas used:", receipt?.gasUsed.toString());
    
    // Check balances after
    const balanceAfter = await token.balanceOf(deployer.address);
    const stakingBalanceAfter = await token.balanceOf(stakingAddress);
    console.log("\nAfter transfer:");
    console.log("Deployer balance:", ethers.formatEther(balanceAfter));
    console.log("Staking balance:", ethers.formatEther(stakingBalanceAfter));
    
    // Verify the amounts
    const expectedDeployerBalance = balanceBefore - amount;
    const expectedStakingBalance = stakingBalanceBefore + amount;
    console.log("\nExpected deployer balance:", ethers.formatEther(expectedDeployerBalance));
    console.log("Expected staking balance:", ethers.formatEther(expectedStakingBalance));
    
    if (balanceAfter === expectedDeployerBalance && stakingBalanceAfter === expectedStakingBalance) {
      console.log("✅ Balances match expected values!");
    } else {
      console.log("❌ Balance mismatch!");
    }
  } catch (error: any) {
    console.error("TransferFrom failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

