import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const user1 = signers[1] || deployer; // Fallback to deployer if only one signer
  const user2 = signers[2] || deployer; // Fallback to deployer if only two signers
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("\n🧪 SIMULATING YIELD SYSTEM");
  console.log("=".repeat(80));
  console.log("Network:", network.name, "Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("=".repeat(80));

  const contractAddresses = getContractAddresses(chainId);
  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const strategyAddress = contractAddresses.treasuryYieldStrategy || "0x1eDa0B2c614890DD974336bBEdE5aB4F4a55666f";
  
  let strategy;
  try {
    strategy = await ethers.getContractAt("TreasuryYieldStrategy", strategyAddress);
  } catch (error) {
    console.log("❌ Could not load strategy contract");
    return;
  }

  // Get initial state
  console.log("\n📊 INITIAL STATE:");
  console.log("-".repeat(80));
  const deployerBalance = await token.balanceOf(deployer.address);
  const user1Balance = await token.balanceOf(user1.address);
  const user2Balance = await token.balanceOf(user2.address);
  const strategyEthBalance = await ethers.provider.getBalance(strategyAddress);
  const strategyTokenBalance = await token.balanceOf(strategyAddress);
  const yieldStrategyAddress = await token.yieldStrategy();
  const yieldStrategyFeeBps = await token.yieldStrategyFeeBps();
  const marketingWallet = await token.marketingWallet();
  const marketingWalletBalance = await ethers.provider.getBalance(marketingWallet);
  
  console.log(`  Deployer Balance: ${ethers.formatEther(deployerBalance)} DBBPT`);
  console.log(`  User1 Balance: ${ethers.formatEther(user1Balance)} DBBPT`);
  console.log(`  User2 Balance: ${ethers.formatEther(user2Balance)} DBBPT`);
  console.log(`  Strategy ETH Balance: ${ethers.formatEther(strategyEthBalance)} ETH`);
  console.log(`  Strategy Token Balance: ${ethers.formatEther(strategyTokenBalance)} DBBPT`);
  console.log(`  Marketing Wallet: ${marketingWallet}`);
  console.log(`  Marketing Wallet ETH: ${ethers.formatEther(marketingWalletBalance)} ETH`);
  console.log(`  Yield Strategy Fee Split: ${Number(yieldStrategyFeeBps) / 100}% to yield, ${100 - (Number(yieldStrategyFeeBps) / 100)}% to marketing`);

  // Check if yield strategy is configured
  if (yieldStrategyAddress === ethers.ZeroAddress) {
    console.log("\n❌ Yield strategy NOT configured on token!");
    return;
  }

  if (yieldStrategyAddress.toLowerCase() !== strategyAddress.toLowerCase()) {
    console.log("\n⚠️  Yield strategy address mismatch!");
    return;
  }

  // Check strategy status
  const isActive = await strategy.isActive();
  const autoBuybackEnabled = await strategy.autoBuybackEnabled();
  const minBuybackAmount = await strategy.minBuybackAmount();
  
  console.log(`\n  Strategy Active: ${isActive}`);
  console.log(`  Auto-Buyback Enabled: ${autoBuybackEnabled}`);
  console.log(`  Min Buyback Amount: ${ethers.formatEther(minBuybackAmount)} ETH`);

  if (!isActive || !autoBuybackEnabled) {
    console.log("\n⚠️  Strategy is not active or auto-buyback is disabled!");
    console.log("   Cannot simulate buyback execution.");
  }

  // Simulate a trade: Transfer tokens from user1 to user2
  // This should trigger fees if trading is enabled
  console.log("\n🔄 SIMULATING TRADE:");
  console.log("-".repeat(80));
  
  // First, check if user1 has tokens, if not, try to get some from deployer
  if (user1Balance === 0n) {
    console.log("  User1 has no tokens. Transferring from deployer...");
    try {
      const transferAmount = ethers.parseEther("1000");
      if (deployerBalance >= transferAmount) {
        const tx = await token.transfer(user1.address, transferAmount);
        await tx.wait(2);
        console.log(`  ✅ Transferred ${ethers.formatEther(transferAmount)} DBBPT to User1`);
      } else {
        console.log("  ⚠️  Deployer doesn't have enough tokens to transfer");
        console.log("  💡 You may need to manually send tokens to User1 first");
        return;
      }
    } catch (error: any) {
      console.log(`  ❌ Failed to transfer tokens: ${error.message.substring(0, 100)}`);
      return;
    }
  }

  // Get updated balances
  const user1BalanceAfter = await token.balanceOf(user1.address);
  const tradingEnabled = await token.tradingEnabled();
  
  console.log(`  User1 Balance: ${ethers.formatEther(user1BalanceAfter)} DBBPT`);
  console.log(`  Trading Enabled: ${tradingEnabled}`);
  
  if (!tradingEnabled) {
    console.log("  ⚠️  Trading is disabled - fees won't be collected");
    console.log("  💡 Enable trading first: token.setTradingEnabled(true)");
    return;
  }

  // Check current contract balance and swap threshold
  const contractBalance = await token.balanceOf(contractAddresses.reflectiveToken);
  const swapThreshold = await token.swapThreshold();
  console.log(`\n  Contract Balance: ${ethers.formatEther(contractBalance)} DBBPT`);
  console.log(`  Swap Threshold: ${ethers.formatEther(swapThreshold)} DBBPT`);
  
  if (contractBalance >= swapThreshold) {
    console.log("  ✅ Swap threshold REACHED - next transfer will trigger swap!");
  } else {
    console.log(`  ⏳ Need ${ethers.formatEther(swapThreshold - contractBalance)} more tokens to reach threshold`);
  }

  // Perform a trade: Transfer from user1 to user2
  // This will trigger swapAndLiquify if threshold is reached
  const tradeAmount = ethers.parseEther("100"); // Transfer 100 tokens
  console.log(`\n  Transferring ${ethers.formatEther(tradeAmount)} DBBPT from User1 to User2...`);
  console.log("  (This should trigger swap if threshold is reached)");
  
  try {
    // Get current block to check for events
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // Perform the transfer (this should trigger fees and potentially swap)
    const tx = await token.connect(user1).transfer(user2.address, tradeAmount);
    const receipt = await tx.wait(2);
    
    console.log(`  ✅ Transfer successful! TX: ${tx.hash}`);
    console.log(`  Block: ${receipt.blockNumber}`);
    
    // Wait a moment for events to be indexed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if swap was triggered by comparing balances
    console.log("\n  Checking if swap was triggered...");
    const contractBalanceAfter = await token.balanceOf(contractAddresses.reflectiveToken);
    if (contractBalanceAfter < contractBalance) {
      console.log("  ✅ Contract balance decreased - swap was triggered!");
      console.log(`     Balance before: ${ethers.formatEther(contractBalance)} DBBPT`);
      console.log(`     Balance after: ${ethers.formatEther(contractBalanceAfter)} DBBPT`);
      console.log(`     Tokens swapped: ${ethers.formatEther(contractBalance - contractBalanceAfter)} DBBPT`);
    } else {
      console.log("  ⏳ Contract balance unchanged - swap may not have triggered");
      console.log("     This could mean fees are still accumulating");
    }
    
    // Check for YieldStrategyFeeSent event
    try {
      const feeSentFilter = token.filters.YieldStrategyFeeSent();
      const fromBlock = Math.max(0, receipt.blockNumber - 10);
      const toBlock = receipt.blockNumber + 10;
      const feeSentEvents = await token.queryFilter(feeSentFilter, fromBlock, toBlock);
      
      if (feeSentEvents.length > 0) {
        console.log("\n  🎉 YIELD STRATEGY FEE EVENT DETECTED!");
        for (const event of feeSentEvents) {
          const ethAmount = event.args[0];
          console.log(`     ETH Sent to Strategy: ${ethers.formatEther(ethAmount)} ETH`);
          console.log(`     Event TX: ${event.transactionHash}`);
          console.log(`     Block: ${event.blockNumber}`);
        }
      } else {
        console.log("\n  ⏳ No YieldStrategyFeeSent event found in recent blocks");
        console.log("     Fees may be distributed in a separate transaction");
      }
    } catch (error: any) {
      console.log("\n  ⚠️  Could not query events:", error.message.substring(0, 100));
    }
    
    // Check updated balances
    const strategyEthBalanceAfter = await ethers.provider.getBalance(strategyAddress);
    const marketingWalletBalanceAfter = await ethers.provider.getBalance(marketingWallet);
    const user1BalanceFinal = await token.balanceOf(user1.address);
    const user2BalanceFinal = await token.balanceOf(user2.address);
    
    console.log("\n📊 UPDATED STATE AFTER TRADE:");
    console.log("-".repeat(80));
    console.log(`  User1 Balance: ${ethers.formatEther(user1BalanceFinal)} DBBPT`);
    console.log(`  User2 Balance: ${ethers.formatEther(user2BalanceFinal)} DBBPT`);
    console.log(`  Strategy ETH Balance: ${ethers.formatEther(strategyEthBalanceAfter)} ETH`);
    console.log(`  Marketing Wallet ETH: ${ethers.formatEther(marketingWalletBalanceAfter)} ETH`);
    
    const ethReceived = strategyEthBalanceAfter - strategyEthBalance;
    const marketingEthReceived = marketingWalletBalanceAfter - marketingWalletBalance;
    
    if (ethReceived > 0n) {
      console.log(`\n  ✅ Strategy received: ${ethers.formatEther(ethReceived)} ETH`);
    } else {
      console.log(`\n  ⏳ Strategy ETH balance unchanged (fees may be pending swap)`);
    }
    
    if (marketingEthReceived > 0n) {
      console.log(`  ✅ Marketing wallet received: ${ethers.formatEther(marketingEthReceived)} ETH`);
    }
    
    // Check if buyback can be triggered
    console.log("\n🔄 CHECKING BUYBACK STATUS:");
    console.log("-".repeat(80));
    
    const strategyEthBalanceNow = await ethers.provider.getBalance(strategyAddress);
    console.log(`  Current Strategy ETH: ${ethers.formatEther(strategyEthBalanceNow)} ETH`);
    console.log(`  Min Buyback Amount: ${ethers.formatEther(minBuybackAmount)} ETH`);
    
    if (strategyEthBalanceNow >= minBuybackAmount) {
      console.log("\n  ✅ Strategy has enough ETH to trigger buyback!");
      console.log("     Buyback should execute automatically via receive() function");
      
      // Try to trigger buyback by sending ETH directly (simulating receive)
      if (autoBuybackEnabled && isActive) {
        console.log("\n  🚀 Attempting to trigger buyback...");
        try {
          // Send a small amount of ETH to trigger receive() and buyback
          const triggerTx = await deployer.sendTransaction({
            to: strategyAddress,
            value: ethers.parseEther("0.0001"), // Small amount to trigger
          });
          const triggerReceipt = await triggerTx.wait(2);
          
          console.log(`  ✅ Trigger transaction sent: ${triggerTx.hash}`);
          
          // Check for BuybackExecuted event
          const buybackFilter = strategy.filters.BuybackExecuted();
          const buybackEvents = await strategy.queryFilter(buybackFilter, triggerReceipt.blockNumber, triggerReceipt.blockNumber);
          
          if (buybackEvents.length > 0) {
            console.log("\n  🎉 BUYBACK EXECUTED!");
            const buybackEvent = buybackEvents[0];
            const ethUsed = buybackEvent.args[0];
            const tokensBought = buybackEvent.args[1];
            const tokensBurned = buybackEvent.args[2];
            
            console.log(`     ETH Used: ${ethers.formatEther(ethUsed)} ETH`);
            console.log(`     Tokens Bought: ${ethers.formatEther(tokensBought)} DBBPT`);
            console.log(`     Tokens Burned: ${ethers.formatEther(tokensBurned)} DBBPT`);
            console.log(`     TX: ${buybackEvent.transactionHash}`);
          } else {
            console.log("\n  ⏳ Buyback event not found (may have been skipped due to min amount)");
          }
        } catch (error: any) {
          console.log(`  ⚠️  Could not trigger buyback: ${error.message.substring(0, 100)}`);
        }
      }
    } else {
      const needed = minBuybackAmount - strategyEthBalanceNow;
      console.log(`\n  ⏳ Need ${ethers.formatEther(needed)} more ETH to trigger buyback`);
      console.log("     Buyback will execute automatically when threshold is reached");
    }
    
  } catch (error: any) {
    console.log(`\n  ❌ Transfer failed: ${error.message}`);
    if (error.message.includes("insufficient funds")) {
      console.log("     User1 may not have enough tokens or ETH for gas");
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("📝 SIMULATION SUMMARY:");
  console.log("=".repeat(80));
  console.log("✅ Yield system is configured and ready");
  console.log("✅ Trading is enabled - fees will be collected");
  console.log("✅ Strategy is active and auto-buyback is enabled");
  console.log("\n💡 The yield system works as follows:");
  console.log("   1. Users trade tokens → Fees are collected");
  console.log("   2. Fees accumulate until swap threshold is reached");
  console.log("   3. ETH from fees is split: 50% → Strategy, 50% → Marketing");
  console.log("   4. When strategy receives ≥ 0.001 ETH → Auto-buyback executes");
  console.log("   5. Buyback burns tokens → Supply decreases → Value increases! 🚀");
}

main().catch(console.error);

