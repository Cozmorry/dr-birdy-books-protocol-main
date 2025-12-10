import { ethers } from "hardhat";

/**
 * Re-enable unstaking waiting time (default 1 day)
 */
async function main() {
  const STAKING_ADDRESS = "0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822"; // Latest testnet deployment

  const [deployer] = await ethers.getSigners();
  console.log("⏱️  Re-enabling Unstaking Waiting Time\n");
  console.log("Deployer:", deployer.address);

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  // Re-enable waiting time by disabling the override (uses default 1 day)
  console.log("\n🔧 Re-enabling waiting time (disabling override to use default 1 day)...");
  const setTx = await staking.setMinStakingDurationOverride(0, false);
  await setTx.wait();
  console.log("✅ Override disabled successfully");

  console.log("\n✅ Unstaking waiting time is now ENABLED");
  console.log("   Users must wait 1 day (86400 seconds) after staking before they can unstake");
}

main().catch(console.error);

