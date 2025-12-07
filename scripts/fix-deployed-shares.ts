import { ethers } from "hardhat";

/**
 * Fix the deployed shares mismatch by deploying tokens to new strategy
 * This makes the math work: deployed shares (500) = tokens in new strategy (500)
 */
async function main() {
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";
  const NEW_STRATEGY_ADDRESS = "0x76675479C5Fe73E0843150DEC401D66B1D981F87";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  console.log("🔧 Deployer:", deployer.address);

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const newStrategy = await ethers.getContractAt("TreasuryYieldStrategy", NEW_STRATEGY_ADDRESS);

  console.log("\n📊 Current State:");
  const [strategyAddress, deployedShares] = await staking.getYieldInfo();
  const newStrategyBalance = await token.balanceOf(NEW_STRATEGY_ADDRESS);
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  
  console.log("   User Staked:", ethers.formatEther(userStaked), "DBBPT");
  console.log("   Staking Contract Balance:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Deployed Shares (tracked):", ethers.formatEther(deployedShares), "DBBPT");
  console.log("   New Strategy Balance:", ethers.formatEther(newStrategyBalance), "DBBPT");

  // The issue: deployed shares = 500, but new strategy has 0
  // Solution: Deploy 500 tokens to new strategy to match
  
  if (deployedShares > 0n && newStrategyBalance === 0n) {
    console.log("\n🔧 Fixing mismatch...");
    console.log("   Need to deploy", ethers.formatEther(deployedShares), "DBBPT to new strategy");
    
    // Check if we have tokens to deploy
    // We need to get tokens into the staking contract first
    if (stakingBalance === 0n) {
      console.log("   ⚠️  Staking contract has no tokens");
      console.log("   ⚠️  We need to get tokens into staking contract first");
      console.log("\n💡 Solution: Transfer tokens to staking contract, then deploy to strategy");
      
      // Check deployer balance
      const deployerBalance = await token.balanceOf(deployer.address);
      console.log("   Deployer Balance:", ethers.formatEther(deployerBalance), "DBBPT");
      
      if (deployerBalance >= deployedShares) {
        console.log("\n✅ Deployer has enough tokens");
        console.log("   Transferring", ethers.formatEther(deployedShares), "DBBPT to staking contract...");
        
        const transferTx = await token.transfer(STAKING_ADDRESS, deployedShares);
        await transferTx.wait();
        console.log("✅ Tokens transferred to staking contract");
        
        // Now deploy to strategy
        console.log("\n💰 Deploying tokens to new strategy...");
        const deployTx = await staking.deployToYield(deployedShares);
        await deployTx.wait();
        console.log("✅ Tokens deployed to new strategy");
      } else {
        console.log("   ❌ Deployer doesn't have enough tokens");
        console.log("   💡 Alternative: Reset deployed shares to 0 (requires contract modification)");
        console.log("   💡 Or: Wait for user to stake more tokens, then deploy");
      }
    } else {
      // Staking contract has tokens, deploy them
      const amountToDeploy = stakingBalance < deployedShares ? stakingBalance : deployedShares;
      console.log("\n💰 Deploying", ethers.formatEther(amountToDeploy), "DBBPT to new strategy...");
      const deployTx = await staking.deployToYield(amountToDeploy);
      await deployTx.wait();
      console.log("✅ Tokens deployed to new strategy");
    }
  } else if (newStrategyBalance >= deployedShares) {
    console.log("\n✅ Math is correct - new strategy has enough tokens");
  }

  // Final check
  console.log("\n📊 Final State:");
  const finalStrategyBalance = await token.balanceOf(NEW_STRATEGY_ADDRESS);
  const [finalStrategy, finalShares] = await staking.getYieldInfo();
  console.log("   New Strategy Balance:", ethers.formatEther(finalStrategyBalance), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(finalShares), "DBBPT");
  
  if (finalStrategyBalance >= finalShares) {
    console.log("\n✅ Fix complete! Unstaking should work now.");
  } else {
    const difference = finalShares - finalStrategyBalance;
    console.log("\n⚠️  Still a mismatch of", ethers.formatEther(difference), "DBBPT");
    console.log("   You may need to manually adjust or wait for more tokens");
  }
}

main().catch(console.error);

