import { ethers } from "hardhat";

async function main() {
  console.log("\n🔍 Testing staking 100 tokens...");

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
    console.log("Current allowance:", ethers.formatEther(allowance));

    // Test staking 100 tokens
    const stakeAmount = ethers.parseEther("100"); // 100 tokens
    console.log("Testing stake with 100 tokens...");
    
    // First, approve tokens
    console.log("Approving 100 tokens...");
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
      return;
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
