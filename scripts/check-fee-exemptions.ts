/**
 * Check Fee Exemption Status for Various Addresses
 * 
 * This script checks which addresses are excluded from ReflectiveToken's 5% transfer fee.
 * Useful for debugging and verifying fee exemption configuration.
 * 
 * Usage:
 *   npx hardhat run scripts/check-fee-exemptions.ts --network baseSepolia
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Checking fee exemption status...");
  console.log("   Connected account:", deployer.address);

  // Testnet addresses
  const REFLECTIVE_TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // Base Sepolia DBBPT Proxy
  const AUCTION_ADDRESS = "0x5a090F5062D97DC393835cFbe20f5b0eD04fE20d"; // Base Sepolia Auction
  const TOKEN_DISTRIBUTION = "0x59ff0451A0718237CAd0FDb0835338180C66580e"; // Base Sepolia Distribution
  const STAKING_CONTRACT = "0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822"; // Base Sepolia Staking

  console.log("\n📋 Configuration:");
  console.log("   ReflectiveToken:", REFLECTIVE_TOKEN_ADDRESS);

  // Get ReflectiveToken contract
  const reflectiveToken = await ethers.getContractAt(
    "ReflectiveToken",
    REFLECTIVE_TOKEN_ADDRESS
  );

  // Get owner and staking contract
  const owner = await reflectiveToken.owner();
  let currentStakingContract = ethers.ZeroAddress;
  try {
    currentStakingContract = await reflectiveToken.stakingContract();
  } catch {
    try {
      currentStakingContract = await reflectiveToken.getStakingContract();
    } catch (err) {
      console.log("   ⚠️ Could not read staking contract address");
    }
  }

  console.log("\n👤 Token Owner:", owner);
  console.log("🏦 Current Staking Contract:", currentStakingContract);

  // List of addresses to check
  const addressesToCheck = [
    { name: "Auction Contract", address: AUCTION_ADDRESS },
    { name: "Token Distribution", address: TOKEN_DISTRIBUTION },
    { name: "Staking Contract", address: STAKING_CONTRACT },
    { name: "Token Owner", address: owner },
    { name: "Your Account", address: deployer.address },
  ];

  console.log("\n📊 Fee Exemption Status:\n");
  console.log("┌─────────────────────────┬─────────────────────────────────────────────┬──────────┐");
  console.log("│ Contract                │ Address                                     │ Excluded │");
  console.log("├─────────────────────────┼─────────────────────────────────────────────┼──────────┤");

  for (const item of addressesToCheck) {
    const isExcluded = await reflectiveToken.isExcludedFromFee(item.address);
    const statusIcon = isExcluded ? "✅ YES" : "❌ NO ";
    const addressShort = `${item.address.substring(0, 6)}...${item.address.substring(38)}`;
    const namePadded = item.name.padEnd(23);
    const addressPadded = item.address.padEnd(43);
    
    console.log(`│ ${namePadded} │ ${addressPadded} │ ${statusIcon}  │`);
  }
  console.log("└─────────────────────────┴─────────────────────────────────────────────┴──────────┘");

  // Additional info about staking contract exemption
  console.log("\n💡 Note:");
  console.log("   • The 'stakingContract' address is automatically fee-exempt (legacy method)");
  console.log("   • Use excludeFromFee(address, true) for permanent exemptions (modern method)");
  console.log("   • You can exclude multiple addresses simultaneously with excludeFromFee");

  // Check auction balance
  console.log("\n💰 Auction Token Balance:");
  const auctionBalance = await reflectiveToken.balanceOf(AUCTION_ADDRESS);
  const formattedBalance = ethers.formatEther(auctionBalance);
  console.log(`   ${formattedBalance} DBBPT`);

  if (auctionBalance === BigInt(0)) {
    console.log("   ⚠️ Auction has no tokens! Fund it before running the auction.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
