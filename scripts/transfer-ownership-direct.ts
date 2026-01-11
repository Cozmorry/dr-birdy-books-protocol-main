import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  console.log("\n🔐 Transferring ownership...\n");

  const [signer] = await ethers.getSigners();
  console.log("Caller:", signer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH\n");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);

  // Get contract address from command line or use default
  const contractAddress = process.argv[2] || contractAddresses.flexibleTieredStaking;
  const newOwnerAddress = process.argv[3] || "0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b";

  if (!contractAddress || contractAddress === ethers.ZeroAddress) {
    throw new Error("Contract address not provided or invalid");
  }

  console.log("Contract:", contractAddress);
  console.log("New owner:", newOwnerAddress);
  console.log("Network:", network.name, `(Chain ID: ${chainId})\n`);

  // Validate new owner address
  let checksummedNewOwner: string;
  try {
    checksummedNewOwner = ethers.getAddress(newOwnerAddress);
    console.log("Checksummed new owner:", checksummedNewOwner);
  } catch (error) {
    throw new Error(`Invalid new owner address: ${newOwnerAddress}`);
  }

  // Get contract
  const contract = await ethers.getContractAt("FlexibleTieredStaking", contractAddress);

  // Check current owner
  const currentOwner = await contract.owner();
  console.log("Current owner:", currentOwner);

  if (currentOwner.toLowerCase() === checksummedNewOwner.toLowerCase()) {
    console.log("\n⚠️  WARNING: New owner is the same as current owner!");
    console.log("   This transaction will still execute but won't change ownership.");
    console.log("   Do you want to proceed? (This is just informational - transaction will go through)\n");
  }

  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`You are not the owner! Current owner: ${currentOwner}, Your address: ${signer.address}`);
  }

  // Estimate gas first
  console.log("\n📊 Estimating gas...");
  let gasEstimate: bigint;
  try {
    gasEstimate = await contract.transferOwnership.estimateGas(checksummedNewOwner);
    console.log("   Gas estimate:", gasEstimate.toString());
    
    // Get gas price
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const totalCost = gasEstimate * gasPrice;
    console.log("   Estimated cost:", ethers.formatEther(totalCost), "ETH");
    
    const balance = await ethers.provider.getBalance(signer.address);
    if (balance < totalCost) {
      throw new Error(`Insufficient balance! Need ${ethers.formatEther(totalCost)} ETH, have ${ethers.formatEther(balance)} ETH`);
    }
  } catch (err: any) {
    console.log("   ❌ Gas estimation failed:", err.message);
    throw err;
  }

  // Execute transfer
  console.log("\n📝 Executing transferOwnership...");
  try {
    const tx = await contract.transferOwnership(checksummedNewOwner, {
      gasLimit: gasEstimate + 10000n, // Add 10k buffer
    });
    console.log("   Transaction hash:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("   ✅ Confirmed in block:", receipt?.blockNumber);
    
    // Verify
    const newOwner = await contract.owner();
    console.log("\n✅ Ownership transfer complete!");
    console.log("   New owner:", newOwner);
    
    if (newOwner.toLowerCase() !== checksummedNewOwner.toLowerCase()) {
      console.log("   ⚠️  Warning: Owner doesn't match expected address");
    } else {
      console.log("   ✅ Verified: Owner matches expected address");
    }
  } catch (err: any) {
    console.log("   ❌ Transaction failed:", err.message);
    
    // Try to decode revert reason
    if (err.data) {
      try {
        const reason = contract.interface.parseError(err.data);
        console.log("   Revert reason:", reason?.name);
      } catch {
        // Couldn't decode
      }
    }
    
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
