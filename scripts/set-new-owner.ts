import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * This script sets a new owner for the FlexibleTieredStaking contract.
 * Since the contract is owned by Timelock, we'll need to either:
 * 1. Go through Timelock (requires 2-day delay)
 * 2. Or redeploy with new owner directly
 * 
 * For now, this script will attempt to transfer ownership directly.
 * If it fails (because owner is Timelock), you'll need to either:
 * - Wait for Timelock delay and execute through Timelock
 * - Or redeploy the staking contract with new owner
 */
async function main() {
  console.log("\n🔐 Setting new owner for FlexibleTieredStaking...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Get network
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);

  const stakingAddress = contractAddresses.flexibleTieredStaking;
  const newOwnerAddress = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198"; // Checksummed

  if (!stakingAddress || stakingAddress === ethers.ZeroAddress) {
    throw new Error(`FlexibleTieredStaking not found for chain ID ${chainId}`);
  }

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Staking contract:", stakingAddress);
  console.log("New owner address:", newOwnerAddress);

  // Get staking contract
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);
  
  // Check current owner
  const currentOwner = await staking.owner();
  console.log("\nCurrent owner:", currentOwner);
  
  // Try direct transfer (will work if deployer is owner, fail if Timelock is owner)
  try {
    console.log("\n📝 Attempting direct ownership transfer...");
    const transferTx = await staking.transferOwnership(newOwnerAddress);
    console.log("Transaction sent:", transferTx.hash);
    const receipt = await transferTx.wait();
    console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);
    
    // Verify new owner
    const newOwner = await staking.owner();
    console.log("\n✅ Ownership transferred successfully!");
    console.log("New owner:", newOwner);
  } catch (error: any) {
    console.log("\n❌ Direct transfer failed:", error.message);
    console.log("\n   The contract is likely owned by Timelock.");
    console.log("   To transfer ownership, you need to:");
    console.log("   1. Queue a transaction through Timelock (2-day delay)");
    console.log("   2. Or redeploy the staking contract with new owner");
    console.log("\n   Would you like to redeploy with the new owner?");
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

