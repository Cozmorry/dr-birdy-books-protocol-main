import { ethers } from "hardhat";

/**
 * Verify ReflectiveToken contract only
 * This script verifies just the token contract with proper settings
 */
async function main() {
  console.log("\n🔍 Verifying ReflectiveToken on Basescan...\n");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  const tokenAddress = "0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D";

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Token Address:", tokenAddress);
  console.log("");

  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("❌ ETHERSCAN_API_KEY not found in .env file");
    process.exit(1);
  }

  try {
    console.log("📝 Verifying ReflectiveToken...");
    console.log("   Note: This contract has no constructor arguments");
    
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [],
    });

    console.log("   ✅ ReflectiveToken verified successfully!");
    console.log(`   🔗 View on Basescan: https://sepolia.basescan.org/address/${tokenAddress}`);
    console.log("\n💡 You can now search for 'DBBPT' on Basescan!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ✅ ReflectiveToken is already verified");
    } else if (error.message.includes("bytecode doesn't match")) {
      console.error("   ❌ Bytecode mismatch detected");
      console.log("\n   Possible solutions:");
      console.log("   1. The contract was compiled with different settings");
      console.log("   2. Try verifying manually on Basescan:");
      console.log(`      https://sepolia.basescan.org/address/${tokenAddress}#code`);
      console.log("   3. Check that compiler version is 0.8.28 with optimizer enabled (200 runs)");
    } else {
      console.error("   ❌ Failed to verify:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });

