import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Script to transfer ownership of all contracts to the new owner
 * 
 * This script transfers ownership of:
 * - FlexibleTieredStaking
 * - ReflectiveToken (if it has ownership)
 * - TokenDistribution (if it has ownership)
 * - TreasuryYieldStrategy (if it has ownership)
 * - ImprovedTimelock admin (if applicable)
 * 
 * Usage:
 * npx hardhat run scripts/transfer-all-ownership.ts --network mainnet
 */

const NEW_OWNER_ADDRESS = "0x27799bb35820ecb2814ac2484ba34ad91bbda198";

async function main() {
  console.log("\n🔐 Transferring ownership of all contracts...\n");

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

  // 1. Transfer FlexibleTieredStaking ownership
  if (contractAddresses.flexibleTieredStaking) {
    try {
      console.log("\n📋 1. Transferring FlexibleTieredStaking ownership...");
      const staking = await ethers.getContractAt(
        "FlexibleTieredStaking",
        contractAddresses.flexibleTieredStaking
      );
      
      const currentOwner = await staking.owner();
      console.log("   Current owner:", currentOwner);
      
      if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
        const transferTx = await staking.transferOwnership(NEW_OWNER_ADDRESS);
        console.log("   Transaction hash:", transferTx.hash);
        const receipt = await transferTx.wait();
        console.log("   ✅ Confirmed in block:", receipt.blockNumber);
        
        const newOwner = await staking.owner();
        if (newOwner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase()) {
          results.push({
            contract: "FlexibleTieredStaking",
            success: true,
            message: `Ownership transferred to ${NEW_OWNER_ADDRESS}`
          });
        } else {
          results.push({
            contract: "FlexibleTieredStaking",
            success: false,
            message: `Transfer completed but verification failed. New owner: ${newOwner}`
          });
        }
      } else {
        results.push({
          contract: "FlexibleTieredStaking",
          success: false,
          message: `Current owner (${currentOwner}) is not deployer. Cannot transfer.`
        });
      }
    } catch (error: any) {
      results.push({
        contract: "FlexibleTieredStaking",
        success: false,
        message: error.message || "Transfer failed"
      });
      console.log("   ❌ Failed:", error.message);
    }
  }

  // 2. Transfer ReflectiveToken ownership (if it has ownership)
  if (contractAddresses.reflectiveToken) {
    try {
      console.log("\n📋 2. Transferring ReflectiveToken ownership...");
      const token = await ethers.getContractAt(
        "ReflectiveToken",
        contractAddresses.reflectiveToken
      );
      
      // Check if contract has owner() function
      try {
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
        // Contract might not have owner() function or it's a proxy
        results.push({
          contract: "ReflectiveToken",
          success: false,
          message: "Contract does not have transferable ownership (may be a proxy)"
        });
        console.log("   ⚠️  Contract may not have transferable ownership");
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

  // 3. Transfer TokenDistribution ownership
  if (contractAddresses.tokenDistribution) {
    try {
      console.log("\n📋 3. Transferring TokenDistribution ownership...");
      const distribution = await ethers.getContractAt(
        "TokenDistribution",
        contractAddresses.tokenDistribution
      );
      
      try {
        const currentOwner = await distribution.owner();
        console.log("   Current owner:", currentOwner);
        
        if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
          const transferTx = await distribution.transferOwnership(NEW_OWNER_ADDRESS);
          console.log("   Transaction hash:", transferTx.hash);
          const receipt = await transferTx.wait();
          console.log("   ✅ Confirmed in block:", receipt.blockNumber);
          
          const newOwner = await distribution.owner();
          if (newOwner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase()) {
            results.push({
              contract: "TokenDistribution",
              success: true,
              message: `Ownership transferred to ${NEW_OWNER_ADDRESS}`
            });
          } else {
            results.push({
              contract: "TokenDistribution",
              success: false,
              message: `Transfer completed but verification failed. New owner: ${newOwner}`
            });
          }
        } else {
          results.push({
            contract: "TokenDistribution",
            success: false,
            message: `Current owner (${currentOwner}) is not deployer. Cannot transfer.`
          });
        }
      } catch (error: any) {
        results.push({
          contract: "TokenDistribution",
          success: false,
          message: "Contract does not have transferable ownership"
        });
        console.log("   ⚠️  Contract may not have transferable ownership");
      }
    } catch (error: any) {
      results.push({
        contract: "TokenDistribution",
        success: false,
        message: error.message || "Transfer failed"
      });
      console.log("   ❌ Failed:", error.message);
    }
  }

  // 4. Transfer TreasuryYieldStrategy ownership
  if (contractAddresses.treasuryYieldStrategy) {
    try {
      console.log("\n📋 4. Transferring TreasuryYieldStrategy ownership...");
      const treasury = await ethers.getContractAt(
        "TreasuryYieldStrategy",
        contractAddresses.treasuryYieldStrategy
      );
      
      try {
        const currentOwner = await treasury.owner();
        console.log("   Current owner:", currentOwner);
        
        if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
          const transferTx = await treasury.transferOwnership(NEW_OWNER_ADDRESS);
          console.log("   Transaction hash:", transferTx.hash);
          const receipt = await transferTx.wait();
          console.log("   ✅ Confirmed in block:", receipt.blockNumber);
          
          const newOwner = await treasury.owner();
          if (newOwner.toLowerCase() === ethers.getAddress(NEW_OWNER_ADDRESS).toLowerCase()) {
            results.push({
              contract: "TreasuryYieldStrategy",
              success: true,
              message: `Ownership transferred to ${NEW_OWNER_ADDRESS}`
            });
          } else {
            results.push({
              contract: "TreasuryYieldStrategy",
              success: false,
              message: `Transfer completed but verification failed. New owner: ${newOwner}`
            });
          }
        } else {
          results.push({
            contract: "TreasuryYieldStrategy",
            success: false,
            message: `Current owner (${currentOwner}) is not deployer. Cannot transfer.`
          });
        }
      } catch (error: any) {
        results.push({
          contract: "TreasuryYieldStrategy",
          success: false,
          message: "Contract does not have transferable ownership"
        });
        console.log("   ⚠️  Contract may not have transferable ownership");
      }
    } catch (error: any) {
      results.push({
        contract: "TreasuryYieldStrategy",
        success: false,
        message: error.message || "Transfer failed"
      });
      console.log("   ❌ Failed:", error.message);
    }
  }

  // 5. Check ImprovedTimelock (admin role)
  if (contractAddresses.improvedTimelock) {
    try {
      console.log("\n📋 5. Checking ImprovedTimelock admin...");
      const timelock = await ethers.getContractAt(
        "ImprovedTimelock",
        contractAddresses.improvedTimelock
      );
      
      try {
        const currentAdmin = await timelock.admin();
        console.log("   Current admin:", currentAdmin);
        console.log("   ⚠️  Note: ImprovedTimelock admin is set in constructor and cannot be changed.");
        console.log("   If the staking contract is owned by Timelock, the new owner will need to");
        console.log("   queue transactions through the Timelock (with 2-day delay).");
        
        results.push({
          contract: "ImprovedTimelock",
          success: false,
          message: `Admin cannot be changed (set in constructor). Current admin: ${currentAdmin}`
        });
      } catch (error: any) {
        results.push({
          contract: "ImprovedTimelock",
          success: false,
          message: "Could not read admin"
        });
      }
    } catch (error: any) {
      results.push({
        contract: "ImprovedTimelock",
        success: false,
        message: error.message || "Check failed"
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TRANSFER SUMMARY");
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
    console.log("\n✅ All ownership transfers completed successfully!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

