import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Script to transfer ownership of remaining contracts to the new owner
 */

const NEW_OWNER_ADDRESS = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198";

async function main() {
  console.log("\n🔐 Transferring ownership of remaining contracts...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Current deployer:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Get network
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("New owner address:", NEW_OWNER_ADDRESS);

  // Validate new owner address
  try {
    const checksummedAddress = ethers.getAddress(NEW_OWNER_ADDRESS);
    console.log("Checksummed address:", checksummedAddress);
  } catch (error) {
    throw new Error(`Invalid address: ${NEW_OWNER_ADDRESS}`);
  }

  const results: Array<{ contract: string; success: boolean; message: string }> = [];

  // 1. Transfer ReflectiveToken ownership
  if (contractAddresses.reflectiveToken) {
    try {
      console.log("\n📋 1. Transferring ReflectiveToken ownership...");
      const token = await ethers.getContractAt(
        "ReflectiveToken",
        contractAddresses.reflectiveToken
      );

      const currentOwner = await token.owner();
      console.log("   Current owner:", currentOwner);

      if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
        const transferTx = await token.transferOwnership(NEW_OWNER_ADDRESS);
        console.log("   Transaction hash:", transferTx.hash);
        const receipt = await transferTx.wait();
        console.log("   ✅ Confirmed in block:", receipt.blockNumber);

        const newOwner = await token.owner();
        if (newOwner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase()) {
          results.push({
            contract: "ReflectiveToken",
            success: true,
            message: `Ownership transferred to ${NEW_OWNER_ADDRESS}`
          });
        } else {
          results.push({
            contract: "ReflectiveToken",
            success: false,
            message: `Transfer completed but verification failed. New owner: ${newOwner}`
          });
        }
      } else {
        results.push({
          contract: "ReflectiveToken",
          success: false,
          message: `Current owner (${currentOwner}) is not deployer. Cannot transfer.`
        });
      }
    } catch (error: any) {
      results.push({
        contract: "ReflectiveToken",
        success: false,
        message: error.message || "Transfer failed"
      });
      console.log("   ❌ Failed:", error.message);
    }
  }

  // 2. Transfer ArweaveGateway ownership
  if (contractAddresses.arweaveGateway) {
    try {
      console.log("\n📋 2. Transferring ArweaveGateway ownership...");
      const gateway = await ethers.getContractAt(
        "ArweaveGateway",
        contractAddresses.arweaveGateway
      );

      const currentOwner = await gateway.owner();
      console.log("   Current owner:", currentOwner);

      if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
        const transferTx = await gateway.transferOwnership(NEW_OWNER_ADDRESS);
        console.log("   Transaction hash:", transferTx.hash);
        const receipt = await transferTx.wait();
        console.log("   ✅ Confirmed in block:", receipt.blockNumber);

        const newOwner = await gateway.owner();
        if (newOwner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase()) {
          results.push({
            contract: "ArweaveGateway",
            success: true,
            message: `Ownership transferred to ${NEW_OWNER_ADDRESS}`
          });
        } else {
          results.push({
            contract: "ArweaveGateway",
            success: false,
            message: `Transfer completed but verification failed. New owner: ${newOwner}`
          });
        }
      } else {
        results.push({
          contract: "ArweaveGateway",
          success: false,
          message: `Current owner (${currentOwner}) is not deployer. Cannot transfer.`
        });
      }
    } catch (error: any) {
      results.push({
        contract: "ArweaveGateway",
        success: false,
        message: error.message || "Transfer failed"
      });
      console.log("   ❌ Failed:", error.message);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 REMAINING TRANSFER SUMMARY");
  console.log("=".repeat(60));

  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.contract}: ${result.message}`);
  });

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Successfully transferred: ${successCount}/${totalCount} contracts`);
  console.log("=".repeat(60));

  if (successCount < totalCount) {
    console.log("\n⚠️  Some transfers failed. Please review the errors above.");
  } else {
    console.log("\n✅ All remaining ownership transfers completed successfully!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });