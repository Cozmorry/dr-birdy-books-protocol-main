import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Script to exclude addresses from fees
 * 
 * This excludes both:
 * 1. The deployer (you) - to avoid fees when transferring
 * 2. The owner address - to avoid fees when receiving tokens
 * 
 * This should be run BEFORE transferring tokens to the owner
 * to avoid the 5% fee on the transfer.
 * 
 * Usage:
 * npx hardhat run scripts/exclude-owner-from-fees.ts --network mainnet
 * 
 * Note: This must be run by the contract owner (the deployer)
 */

// Owner's wallet address to exclude from fees
const OWNER_ADDRESS = "0x27799bb35820ecb2814ac2484ba34ad91bbda198";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Excluding owner from fees...");
  console.log("Executing as:", signer.address);
  console.log("Network:", await signer.provider.getNetwork());

  // Get contract addresses for current network
  const network = await signer.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);
  
  const tokenAddress = contractAddresses.reflectiveToken;
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    throw new Error(`Token not deployed on chain ${chainId}`);
  }

  console.log("\n📋 Configuration:");
  console.log("   Token Address:", tokenAddress);
  console.log("   Owner Address to Exclude:", OWNER_ADDRESS);

  // Validate address
  if (!ethers.isAddress(OWNER_ADDRESS)) {
    throw new Error("⚠️  Invalid owner address!");
  }

  // Get token contract
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const tokenSymbol = await token.symbol();
  
  console.log("\n📊 Token Info:");
  console.log("   Symbol:", tokenSymbol);

  // Check if signer is the contract owner
  try {
    const contractOwner = await token.owner();
    console.log("   Contract Owner:", contractOwner);
    
    if (contractOwner.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`⚠️  You are not the contract owner! Owner is: ${contractOwner}`);
    }
    console.log("   ✅ You are the contract owner");
  } catch (error: any) {
    if (error.message.includes("not the contract owner")) {
      throw error;
    }
    console.warn("   ⚠️  Could not verify ownership (might be upgradeable proxy)");
  }

  // Check current exclusion status
  try {
    // Note: There's no public view function for isExcludedFromFee
    // We'll just proceed with the exclusion
    console.log("\n🔍 Checking current status...");
    console.log("   (Note: No public view function available, proceeding with exclusion)");
  } catch (error) {
    // Ignore - we'll proceed anyway
  }

  // Exclude both addresses from fees
  const addressesToExclude = [
    { address: signer.address, name: "Your address (deployer)" },
    { address: OWNER_ADDRESS, name: "Owner address" }
  ];

  console.log("\n🔐 Excluding addresses from fees...");
  
  for (const { address, name } of addressesToExclude) {
    try {
      console.log(`\n   Excluding ${name}: ${address}...`);
      const excludeTx = await token.excludeFromFee(address, true);
      console.log("   Transaction hash:", excludeTx.hash);
      console.log("   ⏳ Waiting for confirmation...");
      
      const receipt = await excludeTx.wait();
      console.log("   ✅ Excluded successfully!");
      console.log("   Block:", receipt.blockNumber);
      console.log("   Gas used:", receipt.gasUsed.toString());

      // Estimate gas cost
      const gasPrice = receipt.gasPrice || await signer.provider.getFeeData().then(f => f.gasPrice) || 0n;
      const gasCost = receipt.gasUsed * gasPrice;
      console.log("   Gas cost:", ethers.formatEther(gasCost), "ETH");

    } catch (error: any) {
      console.error(`\n❌ Failed to exclude ${name} from fees:`, error.message);
      
      if (error.message.includes("Ownable: caller is not the owner") || error.message.includes("not the owner")) {
        console.error("   ⚠️  Only the contract owner can exclude addresses from fees");
        console.error("   Make sure you're using the wallet that deployed the contract");
      } else if (error.message.includes("revert") || error.message.includes("execution reverted")) {
        console.error("   ⚠️  Transaction reverted. Check:");
        console.error("      - You are the contract owner");
        console.error("      - The address is valid");
        console.error("      - The contract is not paused");
      }
      
      throw error;
    }
  }

  console.log("\n✅ All exclusions complete!");
  console.log("\n📝 Summary:");
  console.log(`   ✅ ${signer.address} (you) - excluded from fees`);
  console.log(`   ✅ ${OWNER_ADDRESS} (owner) - excluded from fees`);
  console.log("\n📝 Next steps:");
  console.log("   1. Both addresses are now excluded from fees");
  console.log("   2. You can now transfer tokens without fees:");
  console.log("      npx hardhat run scripts/transfer-tokens-to-owner.ts --network mainnet");
  console.log("   3. The owner will receive the full 8M tokens (no 5% fee)");
  console.log("   4. You won't pay fees when transferring either");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

