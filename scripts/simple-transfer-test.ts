import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0x08af7C62b0418b9f8B1F27525f606078A2E66450";
  const stakingAddress = "0x0072d69529c3ddAAB2A3805c0952458bF8e15868";

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("\n=== SIMPLE TRANSFER TEST ===");
  
  const amount = ethers.parseEther("10");
  
  // Check balances before
  const balanceBefore = await token.balanceOf(deployer.address);
  const stakingBalanceBefore = await token.balanceOf(stakingAddress);
  console.log("Deployer balance before:", ethers.formatEther(balanceBefore));
  console.log("Staking balance before:", ethers.formatEther(stakingBalanceBefore));
  
  // Try a simple transfer
  console.log("\nAttempting direct transfer of", ethers.formatEther(amount), "tokens...");
  
  try {
    const tx = await token.transfer(stakingAddress, amount);
    console.log("Transfer tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transfer successful! Gas used:", receipt?.gasUsed.toString());
    
    // Check balances after
    const balanceAfter = await token.balanceOf(deployer.address);
    const stakingBalanceAfter = await token.balanceOf(stakingAddress);
    console.log("\nDeployer balance after:", ethers.formatEther(balanceAfter));
    console.log("Staking balance after:", ethers.formatEther(stakingBalanceAfter));
  } catch (error: any) {
    console.error("❌ Transfer failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

