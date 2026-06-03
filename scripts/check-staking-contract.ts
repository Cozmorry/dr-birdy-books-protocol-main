/**
 * Check Current Staking Contract
 * 
 * Quick script to see what address is currently set as the staking contract
 * in ReflectiveToken (this address is automatically fee-exempt via legacy method).
 * 
 * Usage:
 *   npx hardhat run scripts/check-staking-contract.ts --network testnet
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Checking staking contract with account:", deployer.address);

  // Testnet addresses
  const REFLECTIVE_TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // Base Sepolia DBBPT Proxy
  const EXPECTED_STAKING = "0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822"; // FlexibleTieredStaking
  const AUCTION_ADDRESS = "0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d"; // Auction

  console.log("\n📋 Contract Addresses:");
  console.log("   ReflectiveToken:         ", REFLECTIVE_TOKEN_ADDRESS);
  console.log("   Expected Staking:        ", EXPECTED_STAKING);
  console.log("   Auction:                 ", AUCTION_ADDRESS);

  // Get ReflectiveToken contract
  const reflectiveToken = await ethers.getContractAt(
    "ReflectiveToken",
    REFLECTIVE_TOKEN_ADDRESS
  );

  // Get current staking contract
  let currentStaking = ethers.ZeroAddress;
  try {
    currentStaking = await reflectiveToken.stakingContract();
  } catch {
    try {
      currentStaking = await reflectiveToken.getStakingContract();
    } catch (err) {
      console.log("\n❌ Could not read staking contract from ReflectiveToken");
      return;
    }
  }

  console.log("\n📊 Current Staking Contract:");
  console.log("   Address:", currentStaking);

  // Compare and provide guidance
  if (currentStaking.toLowerCase() === AUCTION_ADDRESS.toLowerCase()) {
    console.log("\n✅ Status: Auction is set as staking contract");
    console.log("   ✓ Auction is fee-exempt (via legacy method)");
    console.log("   ✓ Transfers to/from auction have 0% fee");
    console.log("\n💡 Recommendation:");
    console.log("   After all bidders claim tokens, you can restore the original staking contract:");
    console.log(`   > await reflectiveToken.setStakingContract("${EXPECTED_STAKING}");`);
  } else if (currentStaking.toLowerCase() === EXPECTED_STAKING.toLowerCase()) {
    console.log("\n✅ Status: Original staking contract is active");
    console.log("   ✓ FlexibleTieredStaking is fee-exempt");
    console.log("\n⚠️ Warning:");
    console.log("   Auction is NOT the current staking contract.");
    console.log("   If you haven't used excludeFromFee(), the auction will incur 5% fees!");
    console.log("\n💡 Recommendation:");
    console.log("   Run: npx hardhat run scripts/exclude-auction-from-fees.ts --network testnet");
  } else {
    console.log("\n⚠️ Status: Unknown staking contract");
    console.log("   Neither the expected staking contract nor the auction is set.");
    console.log("\n💡 Options:");
    console.log("   1. Set auction as staking (legacy):");
    console.log(`      > await reflectiveToken.setStakingContract("${AUCTION_ADDRESS}");`);
    console.log("   2. Exclude auction from fees (modern, recommended):");
    console.log("      > npx hardhat run scripts/exclude-auction-from-fees.ts --network testnet");
  }

  // Get owner
  const owner = await reflectiveToken.owner();
  console.log("\n👤 Token Owner:", owner);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("   ⚠️ You are NOT the owner. Only owner can change staking contract.");
  } else {
    console.log("   ✅ You are the owner. You can change the staking contract.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
