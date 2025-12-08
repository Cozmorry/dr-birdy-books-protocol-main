import { ethers } from "hardhat";

/**
 * Disable unstaking waiting time for testing
 */
async function main() {
  const STAKING_ADDRESS = "0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822"; // Latest testnet deployment

  const [deployer] = await ethers.getSigners();
  console.log("⏱️  Disabling Unstaking Waiting Time\n");
  console.log("Deployer:", deployer.address);

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

