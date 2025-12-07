import { ethers } from "hardhat";

/**
 * Test unstaking
 */
async function main() {
  const STAKING_ADDRESS = "0x43617f658e99Ca8Bd754d2Db4C0e08Ad25Eed1cb";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🧪 Testing Unstaking\n");
  console.log("=".repeat(60));

  // Get user's staked amount
  const userStaked = await staking.userStakedTokens(USER_ADDRESS);
  console.log("👤 User Staked:", ethers.formatEther(userStaked), "DBBPT");

  if (userStaked === 0n) {
    console.log("\n⚠️  User has no staked tokens");
    console.log("   Staking some tokens first for testing...");
    
    const stakeAmount = ethers.parseEther("10");
    await token.approve(STAKING_ADDRESS, stakeAmount);
    const stakeTx = await staking.stake(stakeAmount);
    await stakeTx.wait();
    console.log("✅ Staked", ethers.formatEther(stakeAmount), "DBBPT");
    
    // Check again
    const newStaked = await staking.userStakedTokens(USER_ADDRESS);
    console.log("New Staked Amount:", ethers.formatEther(newStaked), "DBBPT");
    
    if (newStaked === 0n) {
      console.log("❌ Staking failed - no tokens staked");
      return;
    }
  }

  // Check balances before unstaking
  const stakingBalanceBefore = await token.balanceOf(STAKING_ADDRESS);
  const userBalanceBefore = await token.balanceOf(USER_ADDRESS);
  const [strategy, deployedShares] = await staking.getYieldInfo();
  const strategyBalanceBefore = await token.balanceOf(strategy);

  console.log("\n📊 Balances Before Unstaking:");
  console.log("   Staking Contract:", ethers.formatEther(stakingBalanceBefore), "DBBPT");
  console.log("   Strategy:", ethers.formatEther(strategyBalanceBefore), "DBBPT");
  console.log("   User Wallet:", ethers.formatEther(userBalanceBefore), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  // Get current staked amount
  const currentStaked = await staking.userStakedTokens(USER_ADDRESS);
  const unstakeAmount = currentStaked > ethers.parseEther("1") 
    ? ethers.parseEther("1") 
    : currentStaked;

  console.log("\n💰 Attempting to unstake", ethers.formatEther(unstakeAmount), "DBBPT...");

  try {
    const userStaking = staking.connect(await ethers.getSigner(USER_ADDRESS));
    const unstakeTx = await userStaking.unstake(unstakeAmount);
    console.log("   Transaction sent:", unstakeTx.hash);
    
    const receipt = await unstakeTx.wait();
    console.log("   ✅ Unstaking SUCCESS!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   Block:", receipt.blockNumber);

    // Check balances after
    const stakingBalanceAfter = await token.balanceOf(STAKING_ADDRESS);
    const userBalanceAfter = await token.balanceOf(USER_ADDRESS);
    const strategyBalanceAfter = await token.balanceOf(strategy);
    const [strategyAfter, deployedSharesAfter] = await staking.getYieldInfo();

    console.log("\n📊 Balances After Unstaking:");
    console.log("   Staking Contract:", ethers.formatEther(stakingBalanceAfter), "DBBPT");
    console.log("   Strategy:", ethers.formatEther(strategyBalanceAfter), "DBBPT");
    console.log("   User Wallet:", ethers.formatEther(userBalanceAfter), "DBBPT");
    console.log("   Deployed Shares:", ethers.formatEther(deployedSharesAfter), "DBBPT");

    // Calculate changes
    const userReceived = userBalanceAfter - userBalanceBefore;
    console.log("\n📈 Changes:");
    console.log("   User received:", ethers.formatEther(userReceived), "DBBPT");
    console.log("   Expected:", ethers.formatEther(unstakeAmount), "DBBPT");
    
    if (userReceived >= unstakeAmount) {
      console.log("   ✅ User received correct amount!");
    } else {
      console.log("   ⚠️  User received less than expected");
    }

    // Check if yield withdrawal happened
    if (deployedSharesAfter < deployedShares) {
      const withdrawn = deployedShares - deployedSharesAfter;
      console.log("   Yield withdrawn:", ethers.formatEther(withdrawn), "DBBPT");
    }

  } catch (error: any) {
    console.log("   ❌ Unstaking FAILED");
    console.log("   Error:", error.message);
    
    if (error.reason) {
      console.log("   Reason:", error.reason);
    }
    
    if (error.data) {
      console.log("   Data:", error.data);
    }

    // Try to get more details
    if (error.message.includes("Insufficient balance")) {
      console.log("\n   💡 Issue: Insufficient balance in staking contract");
      console.log("   💡 The yield withdrawal might have failed");
    } else if (error.message.includes("Token transfer failed")) {
      console.log("\n   💡 Issue: Token transfer is failing");
      console.log("   💡 Check if staking contract is excluded from fees");
    } else if (error.message.includes("Minimum staking duration")) {
      console.log("\n   💡 Issue: Waiting time check is still active");
      console.log("   💡 Check if override is enabled");
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

