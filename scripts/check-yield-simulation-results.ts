import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("\n🔍 CHECKING YIELD SIMULATION RESULTS");
  console.log("=".repeat(80));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("=".repeat(80));

  const contractAddresses = getContractAddresses(chainId);
  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const strategyAddress = contractAddresses.treasuryYieldStrategy || "0x1eDa0B2c614890DD974336bBEdE5aB4F4a55666f";
  
  // Check current state
  console.log("\n📊 CURRENT STATE:");
  console.log("-".repeat(80));
  const contractBalance = await token.balanceOf(contractAddresses.reflectiveToken);
  const swapThreshold = await token.swapThreshold();
  const strategyEthBalance = await ethers.provider.getBalance(strategyAddress);
  const marketingWallet = await token.marketingWallet();
  const marketingEthBalance = await ethers.provider.getBalance(marketingWallet);
  
  console.log(`  Contract Balance: ${ethers.formatEther(contractBalance)} DBBPT`);
  console.log(`  Swap Threshold: ${ethers.formatEther(swapThreshold)} DBBPT`);
  console.log(`  Strategy ETH: ${ethers.formatEther(strategyEthBalance)} ETH`);
  console.log(`  Marketing ETH: ${ethers.formatEther(marketingEthBalance)} ETH`);
  
  // Check if deployer is excluded from fees
  console.log("\n📊 FEE EXCLUSION STATUS:");
  console.log("-".repeat(80));
  try {
    // Try to get account info (if function exists)
    const deployerInfo = await token.getAccountInfo(deployer.address).catch(() => null);
    if (deployerInfo) {
      const isExcluded = deployerInfo[2];
      console.log(`  Deployer excluded from fees: ${isExcluded}`);
      if (isExcluded) {
        console.log("  ⚠️  Deployer is excluded - transfers won't trigger fees!");
        console.log("  💡 Need to transfer between non-excluded addresses to test");
      }
    }
  } catch {
    console.log("  ⚠️  Could not check exclusion status");
  }
  
  // Check recent transactions
  console.log("\n📊 CHECKING RECENT TRANSACTIONS:");
  console.log("-".repeat(80));
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 100);
  
  try {
    const transferFilter = token.filters.Transfer();
    const transfers = await token.queryFilter(transferFilter, fromBlock, currentBlock);
    console.log(`  Found ${transfers.length} transfers in last 100 blocks`);
    
    // Check for YieldStrategyFeeSent events
    const feeSentFilter = token.filters.YieldStrategyFeeSent();
    const feeEvents = await token.queryFilter(feeSentFilter, fromBlock, currentBlock);
    console.log(`  YieldStrategyFeeSent events: ${feeEvents.length}`);
    
    if (feeEvents.length > 0) {
      console.log("\n  🎉 YIELD FEES HAVE BEEN DISTRIBUTED!");
      for (const event of feeEvents) {
        const ethAmount = event.args[0];
        console.log(`     Amount: ${ethers.formatEther(ethAmount)} ETH`);
        console.log(`     Block: ${event.blockNumber}`);
        console.log(`     TX: ${event.transactionHash}`);
      }
    }
  } catch (error: any) {
    console.log(`  ⚠️  Error checking events: ${error.message.substring(0, 100)}`);
  }
  
  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📝 SUMMARY:");
  console.log("=".repeat(80));
  
  if (strategyEthBalance > 0n) {
    console.log("✅ Yield strategy HAS received ETH!");
    console.log(`   Current balance: ${ethers.formatEther(strategyEthBalance)} ETH`);
    
    const strategy = await ethers.getContractAt("TreasuryYieldStrategy", strategyAddress);
    const minBuybackAmount = await strategy.minBuybackAmount();
    
    if (strategyEthBalance >= minBuybackAmount) {
      console.log("✅ Strategy has enough ETH to trigger buyback!");
      console.log("   Buyback should execute automatically");
    } else {
      const needed = minBuybackAmount - strategyEthBalance;
      console.log(`⏳ Need ${ethers.formatEther(needed)} more ETH to trigger buyback`);
    }
  } else {
    console.log("⏳ Yield strategy has not received ETH yet");
    console.log("   This is normal if:");
    console.log("   - No trades have occurred yet");
    console.log("   - Swap threshold not reached");
    console.log("   - Fees are still accumulating");
  }
  
  console.log("\n💡 To test yield system:");
  console.log("   1. Transfer tokens between two non-excluded addresses");
  console.log("   2. Wait for swap threshold to be reached");
  console.log("   3. Next transfer will trigger swap and fee distribution");
  console.log("   4. Strategy will receive 50% of marketing fees as ETH");
  console.log("   5. When strategy has ≥ 0.001 ETH, buyback will auto-execute");
}

main().catch(console.error);

