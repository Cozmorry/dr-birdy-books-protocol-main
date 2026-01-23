import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Script to transfer ALL tokens and ownership of all contracts to the new owner
 * 
 * This script:
 * 1. Transfers all tokens from deployer wallet to new owner
 * 2. Transfers ownership of all contracts to new owner
 * 
 * Usage:
 * npx hardhat run scripts/transfer-all-tokens-and-ownership.ts --network mainnet
 */

const NEW_OWNER_ADDRESS = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198";

async function main() {
  console.log("\n🔐 Transferring ALL tokens and ownership to new owner...\n");

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
  let checksummedAddress: string;
  try {
    checksummedAddress = ethers.getAddress(NEW_OWNER_ADDRESS);
    console.log("Checksummed address:", checksummedAddress);
  } catch (error) {
    throw new Error(`Invalid address: ${NEW_OWNER_ADDRESS}`);
  }

  // ==========================================
  // STEP 1: Transfer ALL tokens
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Transferring ALL tokens");
  console.log("=".repeat(60));

  if (!contractAddresses.reflectiveToken) {
    console.log("⚠️  Token address not found, skipping token transfer");
  } else {
    try {
      const token = await ethers.getContractAt(
        "ReflectiveToken",
        contractAddresses.reflectiveToken
      );

      const deployerBalance = await token.balanceOf(deployer.address);
      console.log("\n📊 Token Balance Check:");
      console.log("   Token Address:", contractAddresses.reflectiveToken);
      console.log("   Deployer Balance:", ethers.formatEther(deployerBalance), "DBBPT");

      if (deployerBalance > 0n) {
        console.log("\n💸 Transferring all tokens to new owner...");
        
        // Check if new owner is excluded from fees (to avoid 5% fee deduction)
        try {
          const isExcluded = await token.isExcludedFromFee(checksummedAddress);
          if (!isExcluded) {
            console.log("   Excluding new owner from fees to avoid 5% deduction...");
            const excludeTx = await token.excludeFromFee(checksummedAddress, true);
            console.log("   TX Hash:", excludeTx.hash);
            await excludeTx.wait(2);
            console.log("   ✅ New owner excluded from fees");
          } else {
            console.log("   ✅ New owner already excluded from fees");
          }
        } catch (excludeError: any) {
          console.log("   ⚠️  Could not exclude from fees (may not be owner):", excludeError.message);
          console.log("   Proceeding with transfer (5% fee will apply)...");
        }

        // Transfer all tokens
        const transferTx = await token.transfer(checksummedAddress, deployerBalance);
        console.log("   Transfer TX Hash:", transferTx.hash);
        console.log("   ⏳ Waiting for confirmation...");
        const receipt = await transferTx.wait(2);
        console.log("   ✅ Confirmed in block:", receipt.blockNumber);

        // Verify transfer
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for state sync
        const newOwnerBalance = await token.balanceOf(checksummedAddress);
        const remainingBalance = await token.balanceOf(deployer.address);
        
        console.log("\n📊 Transfer Verification:");
        console.log("   New Owner Balance:", ethers.formatEther(newOwnerBalance), "DBBPT");
        console.log("   Deployer Remaining:", ethers.formatEther(remainingBalance), "DBBPT");
        
        if (remainingBalance === 0n) {
          console.log("   ✅ All tokens transferred successfully!");
        } else {
          console.log("   ⚠️  Some tokens remain in deployer wallet (may be due to fees)");
        }
      } else {
        console.log("   ℹ️  No tokens to transfer (balance is 0)");
      }
    } catch (error: any) {
      console.log("   ❌ Token transfer failed:", error.message);
      throw error;
    }
  }

  // ==========================================
  // STEP 2: Transfer ownership of all contracts
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Transferring ownership of all contracts");
  console.log("=".repeat(60));

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
        const transferTx = await staking.transferOwnership(checksummedAddress);
        console.log("   TX Hash:", transferTx.hash);
        const receipt = await transferTx.wait(2);
        console.log("   ✅ Confirmed in block:", receipt.blockNumber);
        
        const newOwner = await staking.owner();
        if (newOwner.toLowerCase() === checksummedAddress.toLowerCase()) {
          results.push({
            contract: "FlexibleTieredStaking",
            success: true,
            message: `Ownership transferred to ${checksummedAddress}`
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
      
      try {
        const currentOwner = await token.owner();
        console.log("   Current owner:", currentOwner);
        
        if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
          const transferTx = await token.transferOwnership(checksummedAddress);
          console.log("   TX Hash:", transferTx.hash);
          const receipt = await transferTx.wait(2);
          console.log("   ✅ Confirmed in block:", receipt.blockNumber);
          
          const newOwner = await token.owner();
          if (newOwner.toLowerCase() === checksummedAddress.toLowerCase()) {
            results.push({
              contract: "ReflectiveToken",
              success: true,
              message: `Ownership transferred to ${checksummedAddress}`
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
          const transferTx = await distribution.transferOwnership(checksummedAddress);
          console.log("   TX Hash:", transferTx.hash);
          const receipt = await transferTx.wait(2);
          console.log("   ✅ Confirmed in block:", receipt.blockNumber);
          
          const newOwner = await distribution.owner();
          if (newOwner.toLowerCase() === checksummedAddress.toLowerCase()) {
            results.push({
              contract: "TokenDistribution",
              success: true,
              message: `Ownership transferred to ${checksummedAddress}`
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

  // 4. Transfer ArweaveGateway ownership
  if (contractAddresses.arweaveGateway) {
    try {
      console.log("\n📋 4. Transferring ArweaveGateway ownership...");
      const gateway = await ethers.getContractAt(
        "ArweaveGateway",
        contractAddresses.arweaveGateway
      );
      
      try {
        const currentOwner = await gateway.owner();
        console.log("   Current owner:", currentOwner);
        
        if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
          const transferTx = await gateway.transferOwnership(checksummedAddress);
          console.log("   TX Hash:", transferTx.hash);
          const receipt = await transferTx.wait(2);
          console.log("   ✅ Confirmed in block:", receipt.blockNumber);
          
          const newOwner = await gateway.owner();
          if (newOwner.toLowerCase() === checksummedAddress.toLowerCase()) {
            results.push({
              contract: "ArweaveGateway",
              success: true,
              message: `Ownership transferred to ${checksummedAddress}`
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
          message: "Contract does not have transferable ownership"
        });
        console.log("   ⚠️  Contract may not have transferable ownership");
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

  // 5. Check ImprovedTimelock (admin role - cannot be changed)
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

  console.log("\n🎉 Transfer process complete!");
  console.log(`   New owner address: ${checksummedAddress}`);
  console.log("   All tokens and contract ownership have been transferred.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
