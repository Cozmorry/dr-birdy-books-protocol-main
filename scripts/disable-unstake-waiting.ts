import { ethers } from "hardhat";

/**
 * Disable unstaking waiting time for testing
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Get staking address from network config
  const { getContractAddresses } = require("../frontend/src/config/networks");
  const contractAddresses = getContractAddresses(chainId);
  const STAKING_ADDRESS = contractAddresses.flexibleTieredStaking;

  console.log("⏱️  Disabling Unstaking Waiting Time\n");
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("Staking Contract:", STAKING_ADDRESS);

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  // Disable waiting time by setting override to 0 with enabled = true
  console.log("\n🔧 Disabling waiting time (setting override to 0 seconds with enabled = true)...");
  const setTx = await staking.setMinStakingDurationOverride(0, true);
  await setTx.wait();
  console.log("✅ Override set successfully");

  console.log("\n✅ Unstaking waiting time is now DISABLED");
  console.log("   Users can unstake immediately after staking");
  
  console.log("\n💡 To re-enable waiting time:");
  console.log("   - Set enabled = false to use default 1 day waiting time");
  console.log("   - Or set a custom duration in seconds with enabled = true");
}

main().catch(console.error);

