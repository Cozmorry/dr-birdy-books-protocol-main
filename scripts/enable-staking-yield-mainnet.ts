import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("\n🔧 ENABLING YIELD ON STAKING CONTRACT");
  console.log("=".repeat(80));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("=".repeat(80));

  const contractAddresses = getContractAddresses(chainId);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", contractAddresses.flexibleTieredStaking);

  // Check current status
  const [strategyAddress, , , , yieldEnabled] = await staking.getYieldInfo();
  console.log("\n📊 Current Status:");
  console.log("  Yield Strategy:", strategyAddress);
  console.log("  Yield Enabled:", yieldEnabled);

  if (yieldEnabled) {
    console.log("\n✅ Yield is already enabled on staking contract!");
    return;
  }

  if (strategyAddress === ethers.ZeroAddress) {
    console.log("\n❌ No yield strategy set on staking contract!");
    console.log("   Please set a yield strategy first.");
    return;
  }

  // Enable yield
  console.log("\n🔧 Enabling yield generation...");
  const enableTx = await staking.setYieldEnabled(true);
  await enableTx.wait();
  console.log("✅ Yield generation enabled!");
  console.log("   TX:", enableTx.hash);

  // Verify
  const [, , , , finalYieldEnabled] = await staking.getYieldInfo();
  console.log("\n✅ Verification:");
  console.log("  Yield Enabled:", finalYieldEnabled);
  
  if (finalYieldEnabled) {
    console.log("\n🎉 Yield generation is now ACTIVE on staking contract!");
    console.log("   Staked tokens can now generate yield automatically.");
  }
}

main().catch(console.error);

