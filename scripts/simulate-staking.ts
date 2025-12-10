import { ethers } from "hardhat";

/**
 * Simulate staking transaction to find the error
 */
async function main() {
  const STAKING_ADDRESS = "0x0c2f1fb28A0b7f5Df733C2F3Ea1CD71be5720c9D";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const USER_ADDRESS = "0xE409c2F794647AC4940d7f1B6506790098bbA136";

  const [deployer] = await ethers.getSigners();
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Simulating Staking Transaction\n");
  console.log("=".repeat(60));

  const amount = ethers.parseEther("50");

  // Check all conditions
  console.log("1. Checking staking token...");
  const stakingToken = await staking.stakingToken();
  console.log("   ✅ Staking token:", stakingToken);

  console.log("\n2. Checking oracle...");
  const primaryOracle = await staking.primaryPriceOracle();
  console.log("   ✅ Primary oracle:", primaryOracle);

  console.log("\n3. Checking if paused...");
  const paused = await staking.paused();
  console.log("   ✅ Paused:", paused);

  console.log("\n4. Checking user balance...");
  const balance = await token.balanceOf(USER_ADDRESS);
  console.log("   ✅ Balance:", ethers.formatEther(balance), "DBBPT");

  console.log("\n5. Checking allowance...");
  const allowance = await token.allowance(USER_ADDRESS, STAKING_ADDRESS);
  console.log("   ✅ Allowance:", ethers.formatEther(allowance), "DBBPT");

  console.log("\n6. Checking if staking contract is excluded from fees...");
  try {
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("   ✅ Excluded from fees:", isExcluded);
  } catch (e) {
    console.log("   ⚠️  Could not check exclusion");
  }

  console.log("\n7. Testing transferFrom directly...");
  try {
    // Simulate as the user
    const userToken = token.connect(await ethers.getSigner(USER_ADDRESS));
    const estimate = await userToken.transferFrom.estimateGas(USER_ADDRESS, STAKING_ADDRESS, amount);
    console.log("   ✅ transferFrom would succeed (gas:", estimate.toString(), ")");
  } catch (error: any) {
    console.log("   ❌ transferFrom would fail:", error.message);
  }

  console.log("\n8. Testing stake function with callStatic...");
  try {
    // Use callStatic to simulate without actually executing
    const userStaking = staking.connect(await ethers.getSigner(USER_ADDRESS));
    await userStaking.stake.staticCall(amount);
    console.log("   ✅ Stake function would succeed");
  } catch (error: any) {
    console.log("   ❌ Stake function would fail");
    console.log("   Error:", error.message);
    
    // Try to decode the revert reason
    if (error.data) {
      console.log("   Error data:", error.data);
    }
    
    // Check if it's a specific require statement
    if (error.message.includes("Token transfer failed")) {
      console.log("   💡 Issue: Token transfer is failing");
    } else if (error.message.includes("Price oracle not set")) {
      console.log("   💡 Issue: Price oracle not set");
    } else if (error.message.includes("Staking token not set")) {
      console.log("   💡 Issue: Staking token not set");
    }
  }

  console.log("\n9. Testing with estimateGas...");
  try {
    const userStaking = staking.connect(await ethers.getSigner(USER_ADDRESS));
    const gasEstimate = await userStaking.stake.estimateGas(amount);
    console.log("   ✅ Gas estimate:", gasEstimate.toString());
  } catch (error: any) {
    console.log("   ❌ Gas estimation failed:", error.message);
    console.log("   This means the transaction would revert");
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

