import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0x9784a693Be660F8ab511EE1942e336A818c254f1";
  const stakingAddress = "0xB4E230B300523e58e72b8DC8934757BDFF1Cc320";

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("\n=== CHECKING ERC20 BASE CONTRACT STATE ===");
  
  // These are the base ERC20 functions
  const totalSupply = await token.totalSupply();
  console.log("totalSupply():", ethers.formatEther(totalSupply));
  
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("balanceOf(deployer):", ethers.formatEther(deployerBalance));
  
  const stakingBalance = await token.balanceOf(stakingAddress);
  console.log("balanceOf(staking):", ethers.formatEther(stakingBalance));
  
  // Check our custom mappings
  const deployerReflection = await token.debugReflection(deployer.address);
  console.log("\n=== CUSTOM REFLECTION STATE ===");
  console.log("deployer._tOwned:", ethers.formatEther(deployerReflection.tOwned));
  console.log("deployer._rOwned:", deployerReflection.rOwned.toString());
  console.log("deployer.isExcluded:", deployerReflection.isExcluded);
  
  const stakingReflection = await token.debugReflection(stakingAddress);
  console.log("\nstaking._tOwned:", ethers.formatEther(stakingReflection.tOwned));
  console.log("staking._rOwned:", stakingReflection.rOwned.toString());
  console.log("staking.isExcluded:", stakingReflection.isExcluded);
  
  // Sum up all _tOwned
  const totalTOwned = deployerReflection.tOwned + stakingReflection.tOwned;
  console.log("\n=== TOTALS ===");
  console.log("Sum of all _tOwned:", ethers.formatEther(totalTOwned));
  console.log("totalSupply:", ethers.formatEther(totalSupply));
  console.log("Match:", totalTOwned === totalSupply);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

