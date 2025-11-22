import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0x9784a693Be660F8ab511EE1942e336A818c254f1";
  const stakingAddress = "0xB4E230B300523e58e72b8DC8934757BDFF1Cc320";

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("\n=== BALANCE CHECK AFTER PREVIOUS TRANSFER ===");
  
  const deployerReflection = await token.debugReflection(deployer.address);
  console.log("Deployer _tOwned:", ethers.formatEther(deployerReflection.tOwned));
  console.log("Deployer balance (balanceOf):", ethers.formatEther(await token.balanceOf(deployer.address)));
  
  const stakingReflection = await token.debugReflection(stakingAddress);
  console.log("\nStaking _tOwned:", ethers.formatEther(stakingReflection.tOwned));
  console.log("Staking balance (balanceOf):", ethers.formatEther(await token.balanceOf(stakingAddress)));
  
  const totalSupply = await token.totalSupply();
  console.log("\nTotal supply:", ethers.formatEther(totalSupply));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

