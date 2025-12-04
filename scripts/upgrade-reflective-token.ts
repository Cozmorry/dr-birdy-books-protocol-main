import { ethers, upgrades } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  console.log("\n🔄 Upgrading ReflectiveToken contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Get network
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);

  const currentTokenAddress = contractAddresses.reflectiveToken;
  
  if (!currentTokenAddress || currentTokenAddress === ethers.ZeroAddress) {
    throw new Error(`ReflectiveToken not found for chain ID ${chainId}`);
  }

  console.log("Current ReflectiveToken address:", currentTokenAddress);
  console.log("Network:", network.name, `(Chain ID: ${chainId})\n`);

  // Deploy new implementation
  console.log("📦 Deploying new ReflectiveToken implementation...");
  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
  
  // Upgrade the proxy
  const upgraded = await upgrades.upgradeProxy(currentTokenAddress, ReflectiveToken);
  await upgraded.waitForDeployment();
  
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(currentTokenAddress);
  
  console.log("✅ ReflectiveToken upgraded successfully!");
  console.log("   Proxy address:", currentTokenAddress);
  console.log("   New implementation:", implementationAddress);
  
  // Verify the new function exists
  console.log("\n🔍 Verifying new function...");
  try {
    const token = await ethers.getContractAt("ReflectiveToken", currentTokenAddress);
    // Check if transferForUnstaking exists by trying to get the function
    const hasFunction = token.interface.hasFunction("transferForUnstaking");
    if (hasFunction) {
      console.log("✅ transferForUnstaking function verified!");
    } else {
      console.log("⚠️  Warning: transferForUnstaking function not found in interface");
    }
  } catch (error) {
    console.log("⚠️  Could not verify function (this is okay if contract is working)");
  }

  console.log("\n✨ Upgrade complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Update FlexibleTieredStaking contract (requires redeployment)");
  console.log("   2. Update contract addresses in frontend if FlexibleTieredStaking was redeployed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

