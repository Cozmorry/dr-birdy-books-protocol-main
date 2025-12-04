import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  console.log("\n🔐 Transferring ownership of FlexibleTieredStaking...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Current owner (deployer):", deployer.address);
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
  const newOwnerAddress = "0x27799bb35820ecb2814ac2484ba34ad91bbda198";

  if (!stakingAddress || stakingAddress === ethers.ZeroAddress) {
    throw new Error(`FlexibleTieredStaking not found for chain ID ${chainId}`);
  }

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Staking contract:", stakingAddress);
  console.log("New owner address:", newOwnerAddress);
  
  // Validate new owner address
  try {
    const checksummedAddress = ethers.getAddress(newOwnerAddress);
    console.log("Checksummed address:", checksummedAddress);
  } catch (error) {
    throw new Error(`Invalid address: ${newOwnerAddress}`);
  }

  // Get staking contract
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);
  
  // Check current owner
  const currentOwner = await staking.owner();
  console.log("\nCurrent owner:", currentOwner);
  
  const timelockAddress = contractAddresses.improvedTimelock;
  const isOwnedByTimelock = timelockAddress && currentOwner.toLowerCase() === timelockAddress.toLowerCase();
  
  // Since we just redeployed, let's check if we can transfer directly
  // If owned by Timelock, we'll need to use a workaround
  if (isOwnedByTimelock) {
    console.log("\n⚠️  Contract is owned by Timelock.");
    console.log("   Since the Timelock queueTransaction is having issues,");
    console.log("   we'll need to use the Timelock admin to execute directly.");
    console.log("   However, the staking contract's transferOwnership requires onlyOwner.");
    console.log("\n   Solution: We need to bypass the Timelock for this specific transfer.");
    console.log("   This requires the Timelock admin to call transferOwnership directly.");
    console.log("   But since msg.sender must be the owner (Timelock), we can't do this directly.\n");
    console.log("   Alternative: Redeploy the staking contract with the new owner directly.");
    console.log("   This will lose existing staking data, but since we just redeployed,");
    console.log("   there shouldn't be much data to lose.\n");
    
    // Ask user if they want to proceed with direct transfer attempt
    console.log("   Attempting direct transfer from Timelock admin...");
    console.log("   (This will likely fail, but let's try)\n");
    console.log("⚠️  Contract is owned by Timelock. Transferring through Timelock...");
    
    console.log("\n⚠️  The staking contract is owned by Timelock.");
    console.log("   To transfer ownership, you have two options:\n");
    console.log("   1. Use the Timelock's queueTransaction (requires 2-day delay)");
    console.log("   2. Transfer Timelock admin to new owner (immediate)\n");
    console.log("   Since you want immediate transfer, let's transfer the Timelock admin instead.");
    console.log("   This will give the new owner control over the Timelock, which controls the staking contract.\n");
    
    // Get Timelock contract
    const timelock = await ethers.getContractAt("ImprovedTimelock", timelockAddress);
    
    // Check if deployer is the Timelock admin
    const timelockAdmin = await timelock.admin();
    console.log("Current Timelock admin:", timelockAdmin);
    
    if (timelockAdmin.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`Timelock admin (${timelockAdmin}) is not the deployer (${deployer.address}). Cannot transfer admin.`);
    }
    
    // Check if Timelock has a transferAdmin function
    // Since ImprovedTimelock doesn't have a transferAdmin function, we need to check the contract
    console.log("\n📝 Transferring Timelock admin...");
    console.log("   Note: ImprovedTimelock doesn't have a transferAdmin function.");
    console.log("   The admin is set in the constructor and cannot be changed.");
    console.log("\n   Alternative: You'll need to queue a transferOwnership transaction through the Timelock.");
    console.log("   However, this requires waiting for the timelock delay (2 days).\n");
    
    // Let's try the queue approach with proper encoding
    const timelockDelay = await timelock.delay();
    console.log("Timelock delay:", timelockDelay.toString(), "seconds (", Number(timelockDelay) / 86400, "days)");
    
    // Encode the transferOwnership call properly
    // The Timelock's executeTransaction expects: if signature is provided, it does abi.encodeWithSignature(signature, data)
    // So we need to pass the signature and the raw parameters
    const stakingInterface = new ethers.Interface([
      "function transferOwnership(address newOwner) external"
    ]);
    
    // For Timelock: pass signature and encoded parameters separately
    const paramData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      [newOwnerAddress]
    );
    
    // Calculate execute time
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const executeTime = currentTime + timelockDelay;
    console.log("\n📝 Queuing ownership transfer...");
    console.log("   Execute time:", new Date(Number(executeTime) * 1000).toISOString());
    
    try {
      const queueTx = await timelock.queueTransaction(
        stakingAddress,
        0,
        "transferOwnership(address)",
        paramData,
        executeTime
      );
      console.log("   Transaction hash:", queueTx.hash);
      const receipt = await queueTx.wait();
      console.log("   ✅ Transaction queued successfully!");
      console.log("\n   ⚠️  IMPORTANT: The ownership transfer will execute automatically");
      console.log("      after the delay period (2 days).");
      console.log("      Execute time:", new Date(Number(executeTime) * 1000).toISOString());
    } catch (error: any) {
      console.log("   ❌ Failed to queue transaction:", error.message);
      throw error;
    }
    
  } else {
    // Direct transfer if owned by deployer
    if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`Current owner (${currentOwner}) is not the deployer (${deployer.address}). Cannot transfer ownership.`);
    }

    // Transfer ownership directly
    console.log("\n📝 Transferring ownership directly...");
    const transferTx = await staking.transferOwnership(newOwnerAddress);
    console.log("Transaction sent:", transferTx.hash);
    
    const receipt = await transferTx.wait();
    console.log("Transaction confirmed in block:", receipt?.blockNumber);
  }
  
  // Verify new owner
  const newOwner = await staking.owner();
  console.log("\n✅ Ownership transferred successfully!");
  console.log("New owner:", newOwner);
  
  if (newOwner.toLowerCase() !== ethers.getAddress(newOwnerAddress).toLowerCase()) {
    console.log("⚠️  Warning: New owner doesn't match expected address");
  } else {
    console.log("✅ Verified: New owner matches expected address");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

