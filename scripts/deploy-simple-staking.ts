import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SimpleStaking with account:", deployer.address);

  // Use existing token
  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D";
  
  // Deploy SimpleStaking
  console.log("\n📦 Deploying SimpleStaking...");
  const SimpleStaking = await ethers.getContractFactory("SimpleStaking");
  const staking = await SimpleStaking.deploy();
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ SimpleStaking deployed to:", stakingAddress);
  
  // Initialize
  console.log("\n🔧 Initializing SimpleStaking...");
  const initTx = await staking.initialize(tokenAddress);
  await initTx.wait();
  console.log("✅ SimpleStaking initialized!");
  
  console.log("\n🎯 Deployment Complete:");
  console.log("Token:", tokenAddress);
  console.log("SimpleStaking:", stakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

