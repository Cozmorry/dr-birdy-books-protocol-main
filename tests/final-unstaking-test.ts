import { ethers } from "hardhat";

/**
 * Complete test on new contract
 */
async function main() {
  const STAKING_ADDRESS = "0xDB1A28eA484f0321d242a293ae42c74f71E14FC0";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🧪 Complete Test on New Contract\n");
  console.log("=".repeat(60));

  // Setup
  const [strategy] = await staking.getYieldInfo();
  await token.excludeFromFee(STAKING_ADDRESS, true);
  await token.excludeFromFee(strategy, true);
  await staking.setMinStakingDurationOverride(0, true);
  console.log("✅ Setup complete");

  // Get user signer
  const signers = await ethers.getSigners();
  const userSigner = signers.find(s => s.address.toLowerCase() === USER_ADDRESS.toLowerCase()) || signers[0];
  const userToken = token.connect(userSigner);
  const userStaking = staking.connect(userSigner);

  // Stake
  const stakeAmount = ethers.parseEther("5");
  console.log("\n1. Staking", ethers.formatEther(stakeAmount), "DBBPT...");
  await userToken.approve(STAKING_ADDRESS, stakeAmount);
  const stakeTx = await userStaking.stake(stakeAmount);
  const stakeReceipt = await stakeTx.wait();
  console.log("   ✅ Staked - Gas:", stakeReceipt.gasUsed.toString());

  // Check
  const userStaked = await staking.userStakedTokens(userSigner.address);
  console.log("   User staked:", ethers.formatEther(userStaked), "DBBPT");

  if (userStaked === 0n) {
    console.log("   ❌ Staking not recorded!");
    return;
  }

  // Wait for yield
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check balances
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const strategyBalance = await token.balanceOf(strategy);
  const [strategyAddr, deployedShares] = await staking.getYieldInfo();
  console.log("\n2. Balances:");
  console.log("   Staking:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   Deployed:", ethers.formatEther(deployedShares), "DBBPT");

  // Unstake
  const unstakeAmount = ethers.parseEther("1");
  console.log("\n3. Unstaking", ethers.formatEther(unstakeAmount), "DBBPT...");
  
  try {
    const unstakeTx = await userStaking.unstake(unstakeAmount);
    const receipt = await unstakeTx.wait();
    console.log("   ✅ Unstaking SUCCESS!");
    console.log("   Transaction hash:", receipt.hash);
    console.log("   Gas used:", receipt.gasUsed.toString());

    const finalStaked = await staking.userStakedTokens(userSigner.address);
    const finalBalance = await token.balanceOf(userSigner.address);
    console.log("\n4. Final State:");
    console.log("   User staked:", ethers.formatEther(finalStaked), "DBBPT");
    console.log("   User balance:", ethers.formatEther(finalBalance), "DBBPT");
    console.log("   ✅ Unstaking works!");

  } catch (error: any) {
    console.log("   ❌ Unstaking FAILED");
    console.log("   Error:", error.message);
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

