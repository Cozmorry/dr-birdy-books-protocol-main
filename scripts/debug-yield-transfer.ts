import { ethers } from "hardhat";

/**
 * Debug why tokens aren't being transferred to strategy
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Debugging Token Balances\n");
  
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = await token.balanceOf(STRATEGY_ADDRESS);
  const allowance = await token.allowance(STAKING_ADDRESS, STRATEGY_ADDRESS);
  
  console.log("Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("Strategy Contract Balance:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("Allowance (Staking -> Strategy):", ethers.formatEther(allowance), "DBBPT");
  console.log("");

  // Check if staking is excluded
  const isStakingExcluded = await token.isExcludedFromReward(STAKING_ADDRESS);
  const isStrategyExcluded = await token.isExcludedFromReward(STRATEGY_ADDRESS);
  
  console.log("Staking Excluded from Reward:", isStakingExcluded);
  console.log("Strategy Excluded from Reward:", isStrategyExcluded);
  console.log("");

  console.log("💡 Reflection tokens have special transfer requirements!");
  console.log("   The staking contract (excluded) transferring to strategy (non-excluded)");
  console.log("   may cause issues if not handled properly.");
}

main().catch(console.error);

