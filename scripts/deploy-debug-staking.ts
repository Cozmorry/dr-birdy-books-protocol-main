import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying FlexibleTieredStaking (DEBUG VERSION) with account:", deployer.address);

  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D";
  const primaryOracle = "0x71041dDDaD356F8F9546D0Ba93B54C0b4C458375";
  const backupOracle = "0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8";
  
  console.log("\n📦 Deploying FlexibleTieredStaking...");
  const FlexibleTieredStaking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await FlexibleTieredStaking.deploy(
    tokenAddress,
    primaryOracle,
    backupOracle
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ FlexibleTieredStaking deployed to:", stakingAddress);
  
  console.log("\n🎯 Testing stake function (without tier update)...");
  
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const amount = ethers.parseEther("50");
  
  console.log("Approving tokens...");
  const approveTx = await token.approve(stakingAddress, amount);
  await approveTx.wait();
  console.log("✅ Approved!");
  
  console.log("\nAttempting to stake", ethers.formatEther(amount), "tokens...");
  try {
    const stakeTx = await staking.stake(amount);
    console.log("Stake tx sent:", stakeTx.hash);
    const receipt = await stakeTx.wait();
    console.log("✅✅✅ STAKING SUCCESSFUL! ✅✅✅");
    console.log("Gas used:", receipt?.gasUsed.toString());
    
    const staked = await staking.getUserStakedTokens(deployer.address);
    console.log("Your staked amount:", ethers.formatEther(staked));
  } catch (error: any) {
    console.error("❌ Staking failed:", error.message);
  }
  
  console.log("\n🎯 Deployment Complete:");
  console.log("Token:", tokenAddress);
  console.log("FlexibleTieredStaking:", stakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

