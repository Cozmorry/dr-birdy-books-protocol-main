import { ethers } from "hardhat";

async function main() {
  console.log("\n🔍 Debugging staking function...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const stakingAddress = "0xa9c456E11403A5B222A11eE0573c8BF54227cDe4";
  const tokenAddress = "0x705f0380F17D8B45CF2D0E4Ef9c2052316f5385f";
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  try {
    // Check user balance
    const userBalance = await token.balanceOf(deployer.address);
    console.log("User token balance:", ethers.formatEther(userBalance));

    // Check allowance
    const allowance = await token.allowance(deployer.address, stakingAddress);
    console.log("Allowance:", ethers.formatEther(allowance));

    // Check contract status
    const contractStatus = await staking.getContractStatus();
    console.log("\nContract Status:");
    console.log("- Is paused:", contractStatus.isPaused);
    console.log("- Staking token set:", contractStatus.stakingTokenSet);
    console.log("- Primary oracle set:", contractStatus.primaryOracleSet);
    console.log("- Backup oracle set:", contractStatus.backupOracleSet);

    // Check oracle info
    const oracleInfo = await staking.getOracleInfo();
    console.log("\nOracle Info:");
    console.log("- Primary Oracle:", oracleInfo.primaryOracle);
    console.log("- Backup Oracle:", oracleInfo.backupOracle);

    // Test oracle calls
    console.log("\nTesting oracle calls...");
    try {
      const primaryOracle = await ethers.getContractAt("MockPriceOracle", oracleInfo.primaryOracle);
      const primaryPrice = await primaryOracle.latestAnswer();
      console.log("✅ Primary oracle price:", primaryPrice.toString());
    } catch (err: any) {
      console.log("❌ Primary oracle error:", err.message);
    }

    try {
      const backupOracle = await ethers.getContractAt("MockPriceOracle", oracleInfo.backupOracle);
      const backupPrice = await backupOracle.latestAnswer();
      console.log("✅ Backup oracle price:", backupPrice.toString());
    } catch (err: any) {
      console.log("❌ Backup oracle error:", err.message);
    }

    // Test getUserUsdValue
    console.log("\nTesting getUserUsdValue...");
    try {
      const usdValue = await staking.getUserUsdValue(deployer.address);
      console.log("✅ User USD value:", usdValue.toString());
    } catch (err: any) {
      console.log("❌ getUserUsdValue error:", err.message);
    }

    // Test getUserStakingInfo
    console.log("\nTesting getUserStakingInfo...");
    try {
      const stakingInfo = await staking.getUserStakingInfo(deployer.address);
      console.log("✅ User staking info:", stakingInfo);
    } catch (err: any) {
      console.log("❌ getUserStakingInfo error:", err.message);
    }

    // Test a small stake amount
    const stakeAmount = ethers.parseEther("1"); // 1 token
    console.log("\nTesting stake with 1 token...");
    
    // First, approve tokens
    console.log("Approving tokens...");
    const approveTx = await token.approve(stakingAddress, stakeAmount);
    await approveTx.wait();
    console.log("✅ Tokens approved");

    // Try to estimate gas for stake
    console.log("Estimating gas for stake...");
    try {
      const gasEstimate = await staking.stake.estimateGas(stakeAmount);
      console.log("✅ Gas estimate:", gasEstimate.toString());
    } catch (err: any) {
      console.log("❌ Gas estimate failed:", err.message);
      console.log("Error details:", err);
    }

    // Try to call stake
    console.log("Attempting to stake...");
    try {
      const stakeTx = await staking.stake(stakeAmount);
      console.log("✅ Stake transaction sent:", stakeTx.hash);
      const receipt = await stakeTx.wait();
      console.log("✅ Stake transaction confirmed:", receipt.status === 1 ? 'SUCCESS' : 'FAILED');
    } catch (err: any) {
      console.log("❌ Stake failed:", err.message);
      console.log("Error details:", err);
    }

  } catch (err: any) {
    console.error("❌ Debug error:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
