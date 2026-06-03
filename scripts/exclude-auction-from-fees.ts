/**
 * Exclude Auction Contract from ReflectiveToken Transfer Fees
 * 
 * This script excludes the ContinuousClearingAuction contract from the 5% transfer fee
 * in ReflectiveToken, allowing:
 * 1. Owner to fund auction with 0% fee
 * 2. Bidders to claim tokens with 0% fee
 * 
 * Usage:
 *   npx hardhat run scripts/exclude-auction-from-fees.ts --network testnet
 * 
 * Note: Requires the deployer to be the owner of ReflectiveToken
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔐 Excluding auction from fees with account:", deployer.address);

  // Testnet addresses
  const REFLECTIVE_TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // Base Sepolia DBBPT Proxy
  const AUCTION_ADDRESS = "0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d"; // Base Sepolia Auction

  console.log("\n📋 Configuration:");
  console.log("   ReflectiveToken:", REFLECTIVE_TOKEN_ADDRESS);
  console.log("   Auction Address:", AUCTION_ADDRESS);

  // Get ReflectiveToken contract
  const reflectiveToken = await ethers.getContractAt(
    "ReflectiveToken",
    REFLECTIVE_TOKEN_ADDRESS
  );

  // Check current owner
  const owner = await reflectiveToken.owner();
  console.log("\n👤 Current token owner:", owner);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("⚠️  WARNING: You are not the owner of ReflectiveToken!");
    console.log("   This transaction will likely fail.");
    return;
  }

  // Check if auction is current staking contract (legacy check)
  try {
    const stakingContract = await reflectiveToken.stakingContract();
    console.log("\n📊 Current staking contract:", stakingContract);
    if (stakingContract.toLowerCase() === AUCTION_ADDRESS.toLowerCase()) {
      console.log("   ✅ Auction is already set as staking contract (fee-exempt via legacy method)");
    }
  } catch (err) {
    console.log("   Could not read staking contract");
  }

  // Exclude auction from fees
  console.log("\n🔄 Excluding auction contract from 5% transfer fees...");
  console.log("   Calling excludeFromFee(", AUCTION_ADDRESS, ", true)");
  
  try {
    const tx = await reflectiveToken.excludeFromFee(AUCTION_ADDRESS, true);
    console.log("   Transaction sent:", tx.hash);
    
    console.log("   Waiting for confirmation...");
    const receipt = await tx.wait();
    
    if (receipt && receipt.status === 1) {
      console.log("\n✅ SUCCESS! Auction contract is now excluded from fees.");
      console.log(`   View transaction: https://sepolia.basescan.org/tx/${tx.hash}`);
      
      console.log("\n📝 Next Steps:");
      console.log("   1. Fund the auction contract with 1,500,000 DBBPT (0% fee)");
      console.log("   2. Run auction and finalize");
      console.log("   3. Bidders can claim tokens (0% fee)");
      console.log("   4. (Optional) After all claims, you can include auction back in fees");
    } else {
      console.log("\n❌ Transaction failed!");
    }
  } catch (error: any) {
    if (error.message && error.message.includes("revert")) {
      console.log("\n⚠️  Transaction reverted:");
      console.log("   ", error.message);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
