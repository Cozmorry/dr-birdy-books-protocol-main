import { ethers } from "hardhat";

/**
 * Complete test: stake and unstake
 */
async function main() {
  const STAKING_ADDRESS = "0xa8568f2b6d06A4b2E92093e73C81759942ECd698";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🧪 Complete Staking/Unstaking Test\n");
  console.log("=".repeat(60));

  // Exclude strategy
  const [strategy] = await staking.getYieldInfo();
  if (strategy !== ethers.ZeroAddress) {
    await token.excludeFromFee(strategy, true);
    console.log("✅ Strategy excluded from fees");
  }

  // Exclude staking
  await token.excludeFromFee(STAKING_ADDRESS, true);
  console.log("✅ Staking excluded from fees");

  // Get user signer
  const signers = await ethers.getSigners();
  const userSigner = signers.find(s => s.address.toLowerCase() === USER_ADDRESS.toLowerCase()) || signers[0];
  const userToken = token.connect(userSigner);
  const userStaking = staking.connect(userSigner);

  // Stake some tokens as the user
  const stakeAmount = ethers.parseEther("10");
  console.log("\n1. Staking", ethers.formatEther(stakeAmount), "DBBPT as user...");
  await userToken.approve(STAKING_ADDRESS, stakeAmount);
  const stakeTx = await userStaking.stake(stakeAmount);
  await stakeTx.wait();
  console.log("   ✅ Staked successfully");

  // Check staked amount
  const userStaked = await staking.userStakedTokens(userSigner.address);
  console.log("   User staked:", ethers.formatEther(userStaked), "DBBPT");
  
  if (userStaked === 0n) {
    console.log("   ❌ Staking not recorded - checking what happened...");
    const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
    console.log("   Staking contract balance:", ethers.formatEther(stakingBalance), "DBBPT");
    return;
  }

  // Wait a moment for yield deployment
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check balances
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = await token.balanceOf(strategy);
  const [strategyAddr, deployedShares] = await staking.getYieldInfo();
  
  console.log("\n2. Balances after staking:");
  console.log("   Staking Contract:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  // Unstake
  const unstakeAmount = userStaked > ethers.parseEther("1") ? ethers.parseEther("1") : userStaked;
  console.log("\n3. Unstaking", ethers.formatEther(unstakeAmount), "DBBPT...");
  
  try {
    
    const unstakeTx = await userStaking.unstake(unstakeAmount);
    const receipt = await unstakeTx.wait();
    console.log("   ✅ Unstaking SUCCESS!");
    console.log("   Transaction hash:", receipt.hash);
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // Check final state
    const finalStaked = await staking.userStakedTokens(USER_ADDRESS);
    const finalBalance = await token.balanceOf(USER_ADDRESS);
    
    console.log("\n4. Final State:");
    console.log("   User staked:", ethers.formatEther(finalStaked), "DBBPT");
    console.log("   User balance:", ethers.formatEther(finalBalance), "DBBPT");
    console.log("   ✅ Unstaking works correctly!");
    
  } catch (error: any) {
    console.log("   ❌ Unstaking FAILED");
    console.log("   Error:", error.message);
    
    if (error.reason) {
      console.log("   Reason:", error.reason);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

