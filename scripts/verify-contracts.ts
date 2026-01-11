import { ethers } from "hardhat";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";

/**
 * Verify contracts on Basescan
 * 
 * Usage:
 *   npx hardhat run scripts/verify-contracts.ts --network testnet
 *   npx hardhat run scripts/verify-contracts.ts --network mainnet
 */
async function main() {
  console.log("\n🔍 Verifying contracts on Basescan...\n");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);
  const oracleConfig = getOracleConfig(chainId);

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("");

  // Check if ETHERSCAN_API_KEY is set
  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("❌ ETHERSCAN_API_KEY not found in .env file");
    console.log("   Please add ETHERSCAN_API_KEY to your .env file");
    console.log("   Get your API key from: https://basescan.org/apis");
    process.exit(1);
  }

  // Get oracle addresses with proper checksum
  let primaryOracle: string;
  let backupOracle: string;
  
  try {
    primaryOracle = oracleConfig.primaryOracle 
      ? ethers.getAddress(oracleConfig.primaryOracle.toLowerCase()) 
      : ethers.ZeroAddress;
  } catch (e) {
    primaryOracle = oracleConfig.primaryOracle || ethers.ZeroAddress;
  }
  
  try {
    backupOracle = oracleConfig.backupOracle 
      ? ethers.getAddress(oracleConfig.backupOracle.toLowerCase()) 
      : ethers.ZeroAddress;
  } catch (e) {
    backupOracle = oracleConfig.backupOracle || ethers.ZeroAddress;
  }

  const contractsToVerify = [
    {
      name: "ReflectiveToken",
      address: contractAddresses.reflectiveToken,
      constructorArgs: [], // No constructor arguments
      file: "contracts/ReflectiveToken.sol",
    },
    {
      name: "FlexibleTieredStaking",
      address: contractAddresses.flexibleTieredStaking,
      constructorArgs: [
        contractAddresses.reflectiveToken,
        primaryOracle,
        backupOracle,
      ],
      file: "contracts/FlexibleTieredStaking.sol",
    },
    {
      name: "TokenDistribution",
      address: contractAddresses.tokenDistribution,
      constructorArgs: [],
      file: "contracts/TokenDistribution.sol",
    },
    {
      name: "ArweaveGateway",
      address: contractAddresses.arweaveGateway,
      constructorArgs: [],
      file: "contracts/ArweaveGateway.sol",
    },
    {
      name: "ImprovedTimelock",
      address: contractAddresses.improvedTimelock,
      constructorArgs: [
        "0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b", // Admin address (Morris/deployer)
        172800, // 2 days delay
      ],
      file: "contracts/ImprovedTimelock.sol",
    },
  ];

  for (const contract of contractsToVerify) {
    if (!contract.address || contract.address === ethers.ZeroAddress) {
      console.log(`⏭️  Skipping ${contract.name} - address not set`);
      continue;
    }

    try {
      console.log(`\n📝 Verifying ${contract.name}...`);
      console.log(`   Address: ${contract.address}`);

      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArgs,
      });

      console.log(`   ✅ ${contract.name} verified successfully!`);
      console.log(`   🔗 View on Basescan: https://${chainId === 84532 ? 'sepolia.' : ''}basescan.org/address/${contract.address}`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ✅ ${contract.name} is already verified`);
      } else {
        console.error(`   ❌ Failed to verify ${contract.name}:`, error.message);
      }
    }
  }

  console.log("\n✨ Verification process complete!");
  console.log("\n📋 Summary:");
  console.log("   Token Address:", contractAddresses.reflectiveToken);
  console.log("   Staking Address:", contractAddresses.flexibleTieredStaking);
  console.log("\n💡 After verification, you can search for 'DBBPT' on Basescan!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });

