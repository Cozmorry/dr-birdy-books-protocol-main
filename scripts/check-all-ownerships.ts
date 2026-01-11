import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  console.log("\n🔍 Checking ownership of all contracts...\n");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);

  console.log("Network:", network.name, `(Chain ID: ${chainId})\n`);

  const contracts = [
    { 
      name: "FlexibleTieredStaking", 
      address: contractAddresses.flexibleTieredStaking,
      abi: ["function owner() external view returns (address)"]
    },
    { 
      name: "ReflectiveToken", 
      address: contractAddresses.reflectiveToken,
      abi: ["function owner() external view returns (address)"]
    },
    { 
      name: "TokenDistribution", 
      address: contractAddresses.tokenDistribution,
      abi: ["function owner() external view returns (address)"]
    },
    { 
      name: "ArweaveGateway", 
      address: contractAddresses.arweaveGateway,
      abi: ["function owner() external view returns (address)"]
    },
    { 
      name: "ImprovedTimelock", 
      address: contractAddresses.improvedTimelock,
      abi: ["function admin() external view returns (address)"]
    },
  ];

  const ownershipMap = new Map<string, string[]>();

  for (const contract of contracts) {
    if (!contract.address || contract.address === ethers.ZeroAddress) {
      console.log(`❌ ${contract.name}: Not deployed or address not set\n`);
      continue;
    }

    try {
      const contractInstance = await ethers.getContractAt(contract.abi, contract.address);
      const ownerFunction = contract.name === "ImprovedTimelock" ? "admin" : "owner";
      const owner = await contractInstance[ownerFunction]();
      
      console.log(`📋 ${contract.name}:`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Owner: ${owner}`);
      
      // Group by owner
      const ownerLower = owner.toLowerCase();
      if (!ownershipMap.has(ownerLower)) {
        ownershipMap.set(ownerLower, []);
      }
      ownershipMap.get(ownerLower)!.push(contract.name);
      
      console.log();
    } catch (err: any) {
      if (err.message?.includes("owner()") || err.message?.includes("admin()")) {
        console.log(`ℹ️  ${contract.name}: Doesn't have owner/admin function`);
      } else {
        console.log(`❌ ${contract.name}: Error - ${err.message}`);
      }
      console.log();
    }
  }

  // Summary
  console.log("=".repeat(60));
  console.log("📊 OWNERSHIP SUMMARY:");
  console.log("=".repeat(60));
  
  for (const [owner, contracts] of ownershipMap.entries()) {
    console.log(`\n👤 Owner: ${owner}`);
    console.log(`   Contracts (${contracts.length}):`);
    contracts.forEach(contract => {
      console.log(`     - ${contract}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  
  // Identify unique owners
  const uniqueOwners = Array.from(ownershipMap.keys());
  if (uniqueOwners.length === 1) {
    console.log("\n✅ All contracts have the SAME owner");
  } else {
    console.log(`\n⚠️  Contracts have ${uniqueOwners.length} DIFFERENT owners`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
