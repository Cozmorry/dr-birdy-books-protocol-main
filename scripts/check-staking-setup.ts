import { ethers } from "hardhat";

/**
 * Check staking contract setup
 */
async function main() {
  const STAKING_ADDRESS = "0xC93CfCBf7477A6FA6E8806b6D709e58B2bF60475";
  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);

  console.log("🔍 Staking Contract Setup Check\n");
  console.log("=".repeat(60));

  // Check staking token
  try {
    const stakingToken = await staking.stakingToken();
    console.log("✅ Staking Token:", stakingToken);
    
    if (stakingToken.toLowerCase() !== TOKEN_ADDRESS.toLowerCase()) {
      console.log("❌ MISMATCH! Expected:", TOKEN_ADDRESS);
      console.log("   Need to set staking token!");
    } else {
      console.log("✅ Staking token matches");
    }
  } catch (error: any) {
    console.log("❌ Error getting staking token:", error.message);
  }

  // Check if contract is paused
  try {
    const paused = await staking.paused();
    console.log("\n⏸️  Contract Paused:", paused);
    if (paused) {
      console.log("❌ Contract is PAUSED - need to unpause!");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check pause status");
  }

  // Check yield strategy
  try {
    const [strategy] = await staking.getYieldInfo();
    console.log("\n💰 Yield Strategy:", strategy);
  } catch (error: any) {
    console.log("⚠️  Could not check yield strategy");
  }

  // Check if token is excluded from fees
  try {
    const isExcluded = await token.isExcludedFromFee(STAKING_ADDRESS);
    console.log("\n🔒 Staking contract excluded from fees:", isExcluded);
    if (!isExcluded) {
      console.log("⚠️  Staking contract should be excluded from fees");
    }
  } catch (error: any) {
    console.log("⚠️  Could not check exclusion status");
  }

  // Try to simulate a stake call
  console.log("\n🧪 Testing stake function...");
  try {
    const amount = ethers.parseEther("1");
    // This will fail if there's an issue, but we can see the error
    const estimate = await staking.stake.estimateGas(amount);
    console.log("✅ Stake function callable (gas estimate:", estimate.toString(), ")");
  } catch (error: any) {
    console.log("❌ Stake function error:", error.message);
    if (error.data) {
      console.log("   Error data:", error.data);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

