import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Contract addresses from latest deployment
  const tokenAddress = "0x9784a693Be660F8ab511EE1942e336A818c254f1";
  const stakingAddress = "0xB4E230B300523e58e72b8DC8934757BDFF1Cc320";

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);

  console.log("\n=== CHECKING TOKEN STATE ===");
  
  // Check deployer balance
  const balance = await token.balanceOf(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance));

  // Check reflection state
  const reflection = await token.debugReflection(deployer.address);
  console.log("Deployer _rOwned:", reflection.rOwned.toString());
  console.log("Deployer _tOwned:", ethers.formatEther(reflection.tOwned));
  console.log("Deployer isExcluded:", reflection.isExcluded);

  // Check staking contract reflection state
  const stakingReflection = await token.debugReflection(stakingAddress);
  console.log("\nStaking _rOwned:", stakingReflection.rOwned.toString());
  console.log("Staking _tOwned:", ethers.formatEther(stakingReflection.tOwned));
  console.log("Staking isExcluded:", stakingReflection.isExcluded);

  // Check total supply
  const totalSupply = await token.totalSupply();
  console.log("\nTotal supply:", ethers.formatEther(totalSupply));

  // Check reflection totals
  try {
    const reflectionInfo = await token.debugReflectionTotals();
    console.log("_rTotal:", reflectionInfo.rTotal.toString());
    console.log("_tTotal:", ethers.formatEther(reflectionInfo.tTotal));
    console.log("Current rate:", reflectionInfo.currentRate.toString());
  } catch (e) {
    console.log("Could not get reflection totals (function may not exist)");
  }

  console.log("\n=== ATTEMPTING TRANSFER ===");
  
  // Try a simple transfer first (not through staking)
  const testAmount = ethers.parseEther("10");
  console.log("Attempting to transfer", ethers.formatEther(testAmount), "tokens to staking contract...");
  
  try {
    const tx = await token.transfer(stakingAddress, testAmount);
    console.log("Transfer tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transfer successful! Gas used:", receipt?.gasUsed.toString());
    
    // Check balances after transfer
    const balanceAfter = await token.balanceOf(deployer.address);
    const stakingBalanceAfter = await token.balanceOf(stakingAddress);
    console.log("\nDeployer balance after:", ethers.formatEther(balanceAfter));
    console.log("Staking balance after:", ethers.formatEther(stakingBalanceAfter));
  } catch (error: any) {
    console.error("Transfer failed:", error.message);
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

