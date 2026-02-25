import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Check unstaking waiting time status (uses staking address from network config)
 */
async function main() {
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);
  const STAKING_ADDRESS = contractAddresses.flexibleTieredStaking;

  if (!STAKING_ADDRESS || STAKING_ADDRESS === ethers.ZeroAddress) {
    throw new Error(`Staking contract not deployed on chain ${chainId}`);
  }

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("⏱️  Unstaking Waiting Time Status\n");
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("Staking Contract:", STAKING_ADDRESS);
  console.log("=".repeat(60));

  let effectiveSeconds: bigint;
  try {
    const override = await staking.minStakingDurationOverride();
    const overrideEnabled = await staking.minStakingDurationOverrideEnabled();
    const defaultDuration = await staking.MIN_STAKING_DURATION();

    console.log("\n📋 Contract settings:");
    console.log("   MIN_STAKING_DURATION (default):", defaultDuration.toString(), "seconds =", Number(defaultDuration) / 86400, "days");
    console.log("   Override value:", override.toString(), "seconds");
    console.log("   Override enabled:", overrideEnabled);

    effectiveSeconds = overrideEnabled && override > 0n ? override : defaultDuration;
    const days = Number(effectiveSeconds) / 86400;
    const hours = Number(effectiveSeconds) / 3600;

    console.log("\n✅ Effective waiting period:");
    console.log("   ", effectiveSeconds.toString(), "seconds");
    console.log("   ", days.toFixed(2), "days");
    console.log("   ", hours.toFixed(1), "hours");
    console.log("\n   Users must wait this long after staking before they can unstake.");
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

