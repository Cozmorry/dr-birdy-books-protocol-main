import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("\n🔍 CHECKING FEE ACCUMULATION AND SWAP STATUS");
  console.log("=".repeat(80));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("=".repeat(80));

  const contractAddresses = getContractAddresses(chainId);
  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  
  console.log("\n📊 TOKEN CONTRACT STATE:");
  console.log("-".repeat(80));
  
  try {
    const contractBalance = await token.balanceOf(contractAddresses.reflectiveToken);
    const swapThreshold = await token.swapThreshold();
    const swapEnabled = await token.swapEnabled();
    const tradingEnabled = await token.tradingEnabled();
    const totalSupply = await token.totalSupply();
    
    console.log(`  Contract Token Balance: ${ethers.formatEther(contractBalance)} DBBPT`);
    console.log(`  Swap Threshold: ${ethers.formatEther(swapThreshold)} DBBPT`);
    console.log(`  Swap Enabled: ${swapEnabled}`);
    console.log(`  Trading Enabled: ${tradingEnabled}`);
    console.log(`  Total Supply: ${ethers.formatEther(totalSupply)} DBBPT`);
    
    const percentage = (Number(contractBalance) / Number(totalSupply)) * 100;
    console.log(`  Contract Balance % of Supply: ${percentage.toFixed(4)}%`);
    
    if (contractBalance >= swapThreshold) {
      console.log("\n  ✅ Swap threshold REACHED!");
      console.log("     Fees should be swapped and distributed on next transaction");
      console.log("     You can manually trigger: token.swapAndLiquify()");
    } else {
      const needed = swapThreshold - contractBalance;
      console.log(`\n  ⏳ Swap threshold NOT reached yet`);
      console.log(`     Need ${ethers.formatEther(needed)} more DBBPT to trigger swap`);
      console.log("     Fees will accumulate until threshold is reached");
    }
    
    // Check recent transfers to see fee accumulation
    console.log("\n📊 CHECKING RECENT TRANSFERS (last 1000 blocks):");
    console.log("-".repeat(80));
    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);
    
    const transferFilter = token.filters.Transfer();
    const transfers = await token.queryFilter(transferFilter, fromBlock, currentBlock);
    
    console.log(`  Found ${transfers.length} transfers in blocks ${fromBlock} to ${currentBlock}`);
    
    // Count transfers to contract (fee accumulation)
    const transfersToContract = transfers.filter(t => 
      t.args[1].toLowerCase() === contractAddresses.reflectiveToken.toLowerCase()
    );
    console.log(`  Transfers to contract (fees): ${transfersToContract.length}`);
    
    if (transfersToContract.length > 0) {
      const latestFee = transfersToContract[transfersToContract.length - 1];
      console.log(`  Latest fee transfer: ${ethers.formatEther(latestFee.args[2])} DBBPT`);
      console.log(`  Block: ${latestFee.blockNumber}`);
    }
    
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message.substring(0, 200)}`);
  }
  
  // Check if we can manually trigger swap
  console.log("\n🔄 ATTEMPTING TO TRIGGER SWAP:");
  console.log("-".repeat(80));
  
  try {
    const contractBalance = await token.balanceOf(contractAddresses.reflectiveToken);
    const swapThreshold = await token.swapThreshold();
    
    if (contractBalance >= swapThreshold) {
      console.log("  ✅ Contract has enough tokens to swap");
      console.log("  🚀 Attempting to trigger swapAndLiquify...");
      
      try {
        const tx = await token.swapAndLiquify();
        const receipt = await tx.wait(2);
        
        console.log(`  ✅ Swap triggered! TX: ${tx.hash}`);
        console.log(`  Block: ${receipt.blockNumber}`);
        
        // Check for YieldStrategyFeeSent event
        const feeSentFilter = token.filters.YieldStrategyFeeSent();
        const feeSentEvents = await token.queryFilter(feeSentFilter, receipt.blockNumber, receipt.blockNumber);
        
        if (feeSentEvents.length > 0) {
          console.log("\n  🎉 YIELD STRATEGY FEE DISTRIBUTED!");
          const event = feeSentEvents[0];
          const ethAmount = event.args[0];
          console.log(`     ETH Sent to Strategy: ${ethers.formatEther(ethAmount)} ETH`);
          
          // Check strategy balance after
          const strategyAddress = contractAddresses.treasuryYieldStrategy || "0x1eDa0B2c614890DD974336bBEdE5aB4F4a55666f";
          const strategyBalance = await ethers.provider.getBalance(strategyAddress);
          console.log(`     Strategy ETH Balance: ${ethers.formatEther(strategyBalance)} ETH`);
          
          // Check if buyback can be triggered
          const strategy = await ethers.getContractAt("TreasuryYieldStrategy", strategyAddress);
          const minBuybackAmount = await strategy.minBuybackAmount();
          
          if (strategyBalance >= minBuybackAmount) {
            console.log("\n  ✅ Strategy has enough ETH for buyback!");
            console.log("     Buyback should execute automatically on next ETH receipt");
          }
        } else {
          console.log("\n  ⏳ No YieldStrategyFeeSent event (may have been sent to marketing only)");
        }
      } catch (error: any) {
        if (error.message.includes("swap not allowed")) {
          console.log("  ⚠️  Swap not allowed (may be in swap already or trading disabled)");
        } else {
          console.log(`  ❌ Swap failed: ${error.message.substring(0, 100)}`);
        }
      }
    } else {
      console.log("  ⏳ Not enough tokens accumulated yet to trigger swap");
    }
  } catch (error: any) {
    console.log(`  ❌ Error checking swap: ${error.message.substring(0, 100)}`);
  }
}

main().catch(console.error);

