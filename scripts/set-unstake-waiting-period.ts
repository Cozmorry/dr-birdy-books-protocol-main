import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Set unstake waiting period to 7 days
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await deployer.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Get staking address from network config
  const contractAddresses = getContractAddresses(chainId);
  const STAKING_ADDRESS = contractAddresses.flexibleTieredStaking;

  // 7 days in seconds
  const SEVEN_DAYS = 7 * 24 * 60 * 60; // 604800 seconds

  console.log("⏱️  Setting Unstaking Waiting Period to 7 Days\n");
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("Executing as:", deployer.address);
  console.log("Staking Contract:", STAKING_ADDRESS);
  console.log("Waiting Period: 7 days (604800 seconds)");

  if (!STAKING_ADDRESS || STAKING_ADDRESS === ethers.ZeroAddress) {
    throw new Error(`Staking contract not deployed on chain ${chainId}`);
  }

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  // Verify ownership
  try {
    const owner = await staking.owner();
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`⚠️  You are not the contract owner! Owner is: ${owner}`);
    }
    console.log("   ✅ You are the contract owner");
  } catch (error: any) {
    if (error.message.includes("not the contract owner")) {
      throw error;
    }
    console.warn("   ⚠️  Could not verify ownership");
  }

  // Set waiting period to 7 days
  console.log("\n🔧 Setting unstake waiting period to 7 days...");
  try {
    const setTx = await staking.setMinStakingDurationOverride(SEVEN_DAYS, true);
    console.log("   Transaction hash:", setTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await setTx.wait();
    console.log("   ✅ Waiting period set successfully!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    const gasPrice = receipt.gasPrice || await deployer.provider.getFeeData().then(f => f.gasPrice) || 0n;
    const gasCost = receipt.gasUsed * gasPrice;
    console.log("   Gas cost:", ethers.formatEther(gasCost), "ETH");

    // Verify the setting
    const override = await staking.minStakingDurationOverride();
    const enabled = await staking.minStakingDurationOverrideEnabled();
    
    console.log("\n📋 Verification:");
    console.log("   Override Duration:", override.toString(), "seconds");
    console.log("   Override Enabled:", enabled);
    console.log("   Expected: 604800 seconds (7 days)");
    
    if (override.toString() === SEVEN_DAYS.toString() && enabled) {
      console.log("\n✅ Success! Unstaking waiting period is now set to 7 days");
      console.log("   Users must wait 7 days after staking before they can unstake");
    } else {
      console.log("\n⚠️  Warning: Settings may not match expected values");
    }

  } catch (error: any) {
    console.error("\n❌ Failed to set waiting period:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

