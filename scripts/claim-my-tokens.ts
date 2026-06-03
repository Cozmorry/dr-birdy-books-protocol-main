/**
 * Claim Your DBBPT Tokens from Auction
 * 
 * Usage:
 *   npx hardhat run scripts/claim-my-tokens.ts --network testnet
 */

import { ethers } from "hardhat";

async function main() {
  const [claimer] = await ethers.getSigners();
  const OLD_AUCTION = "0xD78444e0E752676fF5673eC5422eB72CB65e0338";
  
  console.log("🎁 Claiming Tokens from Auction");
  console.log("   Claimer:", claimer.address);
  console.log("   Auction:", OLD_AUCTION, "\n");
  
  const auction = await ethers.getContractAt("ContinuousClearingAuction", OLD_AUCTION);
  
  // Check status
  const yourContribution = await auction.currencyContributed(claimer.address);
  const hasClaimed = await auction.tokensClaimed(claimer.address);
  const clearingPrice = await auction.clearingPrice();
  
  if (hasClaimed) {
    console.log("❌ You have already claimed your tokens!");
    return;
  }
  
  if (yourContribution === BigInt(0)) {
    console.log("❌ You didn't bid in this auction!");
    return;
  }
  
  const tokensToReceive = (yourContribution * BigInt(1e18)) / clearingPrice;
  
  console.log("📊 Your Allocation:");
  console.log("   Contribution: ", ethers.formatUnits(yourContribution, 6), "USDC");
  console.log("   Tokens:       ", ethers.formatEther(tokensToReceive), "DBBPT");
  console.log("   Clearing Price:", ethers.formatUnits(clearingPrice, 18), "USDC per DBBPT\n");
  
  console.log("🔄 Claiming tokens...");
  const claimTx = await auction.claimTokens();
  console.log("   Transaction:", claimTx.hash);
  console.log("   Waiting for confirmation...");
  
  const receipt = await claimTx.wait();
  
  if (receipt && receipt.status === 1) {
    console.log("\n✅ CLAIM SUCCESSFUL!");
    console.log(`   You received ${ethers.formatEther(tokensToReceive)} DBBPT tokens!`);
    console.log(`   (0% fee - auction is fee-exempt)`);
    
    console.log("\n🔗 View transaction:");
    console.log(`   https://sepolia.basescan.org/tx/${claimTx.hash}`);
  } else {
    console.log("\n❌ Claim failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
