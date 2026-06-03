/**
 * Place a Test Bid on the Auction
 * 
 * This script places a bid on the active auction for testing purposes.
 * 
 * Usage:
 *   npx hardhat run scripts/place-test-bid.ts --network testnet
 */

import { ethers } from "hardhat";

async function main() {
  const [bidder] = await ethers.getSigners();
  
  // Configuration
  const AUCTION_ADDRESS = "0xD78444e0E752676fF5673eC5422eB72CB65e0338";
  const USDC_ADDRESS = "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B";
  const BID_AMOUNT = "1000"; // 1000 USDC
  
  console.log("🎯 Placing Test Bid");
  console.log("   Bidder:  ", bidder.address);
  console.log("   Auction: ", AUCTION_ADDRESS);
  console.log("   Amount:  ", BID_AMOUNT, "USDC\n");
  
  // Get contracts
  const auction = await ethers.getContractAt("ContinuousClearingAuction", AUCTION_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  
  // Pre-flight checks
  console.log("📋 Pre-flight Checks:");
  
  const currentBlock = await ethers.provider.getBlockNumber();
  const startBlock = await auction.startBlock();
  const endBlock = await auction.endBlock();
  const isEnded = await auction.isEnded();
  const isCanceled = await auction.isCanceled();
  
  console.log("   Current Block:", currentBlock);
  console.log("   Start Block:  ", startBlock.toString());
  console.log("   End Block:    ", endBlock.toString());
  console.log("   Is Ended?     ", isEnded);
  console.log("   Is Canceled?  ", isCanceled);
  
  // Check if auction is active
  if (currentBlock < Number(startBlock)) {
    console.log("\n❌ ERROR: Auction hasn't started yet!");
    console.log("   Wait", Number(startBlock) - currentBlock, "blocks");
    return;
  }
  
  if (currentBlock >= Number(endBlock)) {
    console.log("\n❌ ERROR: Auction has ended!");
    return;
  }
  
  if (isEnded || isCanceled) {
    console.log("\n❌ ERROR: Auction is ended or canceled!");
    return;
  }
  
  console.log("   ✅ Auction is ACTIVE\n");
  
  // Check USDC balance
  const usdcBalance = await usdc.balanceOf(bidder.address);
  const bidAmountWei = ethers.parseUnits(BID_AMOUNT, 6);
  
  console.log("💰 Balance Check:");
  console.log("   Your USDC:    ", ethers.formatUnits(usdcBalance, 6), "USDC");
  console.log("   Bid Amount:   ", BID_AMOUNT, "USDC");
  
  if (usdcBalance < bidAmountWei) {
    console.log("\n❌ ERROR: Insufficient USDC!");
    console.log("   Minting 100,000 USDC for testing...");
    const mockUsdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
    const mintTx = await mockUsdc.mint(bidder.address, ethers.parseUnits("100000", 6));
    await mintTx.wait();
    console.log("   ✅ USDC minted!\n");
  } else {
    console.log("   ✅ Sufficient balance\n");
  }
  
  // Check and approve if needed
  const allowance = await usdc.allowance(bidder.address, AUCTION_ADDRESS);
  
  console.log("🔐 Approval Check:");
  console.log("   Current Allowance:", ethers.formatUnits(allowance, 6), "USDC");
  
  if (allowance < bidAmountWei) {
    console.log("   Approving", BID_AMOUNT, "USDC...");
    const approveTx = await usdc.approve(AUCTION_ADDRESS, bidAmountWei);
    console.log("   Transaction:", approveTx.hash);
    await approveTx.wait();
    console.log("   ✅ Approved!\n");
  } else {
    console.log("   ✅ Already approved\n");
  }
  
  // Place the bid
  console.log("🎯 Placing Bid...");
  try {
    const bidTx = await auction.bid(bidAmountWei);
    console.log("   Transaction:", bidTx.hash);
    console.log("   Waiting for confirmation...");
    const receipt = await bidTx.wait();
    
    if (receipt && receipt.status === 1) {
      console.log("   ✅ BID SUCCESSFUL!\n");
    } else {
      console.log("   ❌ Transaction reverted\n");
      return;
    }
  } catch (error: any) {
    console.log("   ❌ BID FAILED!");
    console.log("   Error:", error.message);
    if (error.data) {
      console.log("   Data:", error.data);
    }
    return;
  }
  
  // Show updated auction state
  console.log("📊 Auction State After Bid:");
  const totalRaised = await auction.totalCurrencyContributed();
  const yourContribution = await auction.currencyContributed(bidder.address);
  const tokenAmount = await auction.tokenAmount();
  const floorPrice = await auction.floorPrice();
  
  console.log("   Total Raised:        ", ethers.formatUnits(totalRaised, 6), "USDC");
  console.log("   Your Contribution:   ", ethers.formatUnits(yourContribution, 6), "USDC");
  console.log("   Token Amount:        ", ethers.formatEther(tokenAmount), "DBBPT");
  console.log("   Floor Price:         ", ethers.formatUnits(floorPrice, 6), "USDC");
  
  // Calculate current clearing price
  if (totalRaised > BigInt(0)) {
    const calculatedPrice = (totalRaised * BigInt(1e18)) / tokenAmount;
    const clearingPrice = calculatedPrice < floorPrice ? floorPrice : calculatedPrice;
    console.log("   Current Clear Price: ", ethers.formatUnits(clearingPrice, 18), "USDC per DBBPT");
    
    // Calculate tokens you'd get
    const yourTokens = (yourContribution * BigInt(1e18)) / clearingPrice;
    console.log("   Your Tokens (est):   ", ethers.formatEther(yourTokens), "DBBPT");
  }
  
  console.log("\n✅ Test bid completed successfully!");
  console.log("\n🔗 View on BaseScan:");
  console.log("   https://sepolia.basescan.org/address/" + AUCTION_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
