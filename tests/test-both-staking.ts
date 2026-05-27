import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D";
  const simpleStakingAddress = "0x8e32639a810641f2a7B5c10d13F32a428746C2F3"; // SimpleStakingV2
  const flexStakingAddress = "0x378b569f04ff22c1c2F7f1f203D92110dcd7F598"; // FlexibleTieredStaking

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const simpleStaking = await ethers.getContractAt("SimpleStakingV2", simpleStakingAddress);
  const flexStaking = await ethers.getContractAt("FlexibleTieredStaking", flexStakingAddress);

  console.log("\n=== TESTING SIMPLE STAKING (KNOWN TO WORK) ===");
  
  const amount1 = ethers.parseEther("10");
  
  // Approve
  console.log("Approving tokens for SimpleStaking...");
  const approveTx1 = await token.approve(simpleStakingAddress, amount1);
  await approveTx1.wait();
  console.log("✅ Approved!");
  
  // Stake
  console.log("\nAttempting to stake", ethers.formatEther(amount1), "tokens...");
  try {
    const stakeTx = await simpleStaking.stake(amount1);
    console.log("Stake tx sent:", stakeTx.hash);
    const receipt = await stakeTx.wait();
    console.log("✅ SimpleStaking WORKS! Gas used:", receipt?.gasUsed.toString());
  } catch (error: any) {
    console.error("❌ SimpleStaking failed:", error.message);
  }
  
  console.log("\n\n=== TESTING FLEXIBLE TIERED STAKING ===");
  
  const amount2 = ethers.parseEther("50");
  
  // Approve
  console.log("Approving tokens for FlexibleTieredStaking...");
  const approveTx2 = await token.approve(flexStakingAddress, amount2);
  await approveTx2.wait();
  console.log("✅ Approved!");
  
  // Check if paused
  const isPaused = await flexStaking.paused();
  console.log("Is paused:", isPaused);
  
  // Check staking token
  const stakingToken = await flexStaking.stakingToken();
  console.log("Staking token:", stakingToken);
  
  // Check oracle
  const oracle = await flexStaking.primaryPriceOracle();
  console.log("Primary oracle:", oracle);
  
  // Stake
  console.log("\nAttempting to stake", ethers.formatEther(amount2), "tokens...");
  try {
    const stakeTx = await flexStaking.stake(amount2);
    console.log("Stake tx sent:", stakeTx.hash);
    const receipt = await stakeTx.wait();
    console.log("✅✅✅ FlexibleTieredStaking WORKS! ✅✅✅");
    console.log("Gas used:", receipt?.gasUsed.toString());
  } catch (error: any) {
    console.error("❌ FlexibleTieredStaking failed:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

