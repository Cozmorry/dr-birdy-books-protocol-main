import { ethers } from "hardhat";

/**
 * Enable override and test unstaking
 */
async function main() {
  const STAKING_ADDRESS = "0xDB1A28eA484f0321d242a293ae42c74f71E14FC0";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔧 Enabling Override and Testing Unstaking\n");
  console.log("=".repeat(60));

  // Enable override with 0 seconds
  console.log("1. Enabling waiting time override (0 seconds)...");
  const setOverrideTx = await staking.setMinStakingDurationOverride(0, true);
  await setOverrideTx.wait();
  console.log("   ✅ Override enabled");

  // Verify
  const override = await staking.minStakingDurationOverride();
  const enabled = await staking.minStakingDurationOverrideEnabled();
  console.log("\n2. Override Status:");
  console.log("   Value:", override.toString(), "seconds");
  console.log("   Enabled:", enabled);

  // Get user's staked amount
  const signers = await ethers.getSigners();
  const userSigner = signers.find(s => s.address.toLowerCase() === USER_ADDRESS.toLowerCase()) || signers[0];
  const userStaked = await staking.userStakedTokens(userSigner.address);
  console.log("\n3. User Staked:", ethers.formatEther(userStaked), "DBBPT");

  if (userStaked === 0n) {
    console.log("   ⚠️  No tokens staked, staking some...");
    const stakeAmount = ethers.parseEther("5");
    await token.connect(userSigner).approve(STAKING_ADDRESS, stakeAmount);
    await staking.connect(userSigner).stake(stakeAmount);
    const newStaked = await staking.userStakedTokens(userSigner.address);
    console.log("   ✅ Staked", ethers.formatEther(newStaked), "DBBPT");
  }

  // Check balances
  const stakingBalance = await token.balanceOf(STAKING_ADDRESS);
  const [strategy] = await staking.getYieldInfo();
  const strategyBalance = await token.balanceOf(strategy);
  const [strategyAddr, deployedShares] = await staking.getYieldInfo();

  console.log("\n4. Current Balances:");
  console.log("   Staking Contract:", ethers.formatEther(stakingBalance), "DBBPT");
  console.log("   Strategy:", ethers.formatEther(strategyBalance), "DBBPT");
  console.log("   Deployed Shares:", ethers.formatEther(deployedShares), "DBBPT");

  // Exclude both from fees
  await token.excludeFromFee(STAKING_ADDRESS, true);
  await token.excludeFromFee(strategy, true);
  console.log("\n5. ✅ Both contracts excluded from fees");

  // Unstake
  const currentStaked = await staking.userStakedTokens(userSigner.address);
  const unstakeAmount = currentStaked > ethers.parseEther("1") ? ethers.parseEther("1") : currentStaked;
  console.log("\n6. Unstaking", ethers.formatEther(unstakeAmount), "DBBPT...");

  try {
    const unstakeTx = await staking.connect(userSigner).unstake(unstakeAmount);
    const receipt = await unstakeTx.wait();
    console.log("   ✅ Unstaking SUCCESS!");
    console.log("   Transaction hash:", receipt.hash);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Check final state
    const finalStaked = await staking.userStakedTokens(userSigner.address);
    const finalBalance = await token.balanceOf(userSigner.address);
    console.log("\n7. Final State:");
    console.log("   User staked:", ethers.formatEther(finalStaked), "DBBPT");
    console.log("   User balance:", ethers.formatEther(finalBalance), "DBBPT");
    console.log("   ✅ Unstaking works!");

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

