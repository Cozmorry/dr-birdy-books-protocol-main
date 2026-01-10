/**
 * @title Mainnet Post-Deployment Setup
 * @notice Complete setup script for mainnet deployment
 * @dev Handles:
 *  1. Initialize TokenDistribution
 *  2. Initialize vesting and distribution
 *  3. Guide for contract verification
 *  4. Guide for adding liquidity
 */

import { ethers } from "hardhat";
import { DEPLOYMENT_CONFIG } from "./config";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  
  if (!signers || signers.length === 0) {
    throw new Error("No signers available. Please check your hardhat.config.ts and ensure MAINNET_PRIVATE_KEY is set in .env");
  }
  
  const [deployer] = signers;
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = network.chainId.toString();
  
  if (!deployer || !deployer.address) {
    throw new Error("Deployer signer is invalid. Please check your wallet configuration.");
  }
  
  console.log("\n🚀 POST-DEPLOYMENT SETUP");
  console.log("================================================================================");
  console.log("Network:", networkName, "Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  
  try {
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
  } catch (error: any) {
    console.log("Balance: Unable to fetch");
    console.error("Error fetching balance:", error.message);
  }
  console.log("================================================================================");

  // Find the most recent deployment file for this network
  const deploymentsDir = path.join(__dirname, "../deployments");
  let deploymentFile: any = null;
  let deploymentFilePath: string | null = null;

  if (fs.existsSync(deploymentsDir)) {
    const files = fs.readdirSync(deploymentsDir)
      .filter((f) => f.startsWith(`deployment-${networkName}-`) && f.endsWith(".json"))
      .map((f) => ({
        name: f,
        path: path.join(deploymentsDir, f),
        time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      deploymentFilePath = files[0].path;
      deploymentFile = JSON.parse(fs.readFileSync(deploymentFilePath, "utf8"));
      console.log(`\n📋 Using deployment file: ${files[0].name}`);
    }
  }

  // If no deployment file found, try to get addresses from actual deployed contracts
  // For localhost, use the addresses from the deploy script output
  let TOKEN: string;
  let DISTRIBUTION: string;
  let STAKING: string;
  let TIMELOCK: string;
  let GATEWAY: string;

  if (deploymentFile) {
    TOKEN = deploymentFile.token;
    DISTRIBUTION = deploymentFile.distribution;
    STAKING = deploymentFile.staking;
    TIMELOCK = deploymentFile.timelock;
    GATEWAY = deploymentFile.gateway;
  } else {
    console.log("\n⚠️  No deployment file found for this network!");
    console.log("   Using addresses from deploy script output (localhost only)");
    console.log("   If on localhost, please check the deploy script output for addresses.");
    
    // For localhost, we can try to detect from console output or use default Hardhat addresses
    // But it's better to have the deployment file. Let's prompt the user.
    if (networkName === "localhost" || networkName === "hardhat") {
      // Common Hardhat localhost addresses (first deploy uses these)
      // These are from the terminal output you showed
      TOKEN = process.env.LOCALHOST_TOKEN || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
      DISTRIBUTION = process.env.LOCALHOST_DISTRIBUTION || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      STAKING = process.env.LOCALHOST_STAKING || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
      TIMELOCK = process.env.LOCALHOST_TIMELOCK || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
      GATEWAY = process.env.LOCALHOST_GATEWAY || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      console.log("   Using default localhost addresses (from latest deploy)");
    } else {
      throw new Error(`No deployment file found for network: ${networkName}. Please deploy contracts first or create a deployment file.`);
    }
  }
  
  // Check if this is proxy deployment or direct deployment
  const TOKEN_PROXY = TOKEN; // For new deployment, token is deployed directly (no proxy)
  const TOKEN_IMPL = deploymentFile.tokenImplementation || TOKEN;
  const PROXY_ADMIN = deploymentFile.proxyAdmin || null;

  console.log("\n📋 Contract Addresses:");
  console.log("  Token:", TOKEN_PROXY);
  if (PROXY_ADMIN) {
    console.log("  Token (Implementation):", TOKEN_IMPL);
    console.log("  ProxyAdmin:", PROXY_ADMIN);
  }
  console.log("  Distribution:", DISTRIBUTION);
  console.log("  Staking:", STAKING);
  console.log("  Timelock:", TIMELOCK);
  console.log("  Gateway:", GATEWAY);

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_PROXY);
  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  // Determine confirmation count based on network (localhost needs 0-1, mainnet needs 2+)
  const confirmations = networkName === "localhost" || networkName === "hardhat" ? 1 : 2;

  // =========================================================================
  // STEP 1: Initialize TokenDistribution (if not already initialized)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: Initialize TokenDistribution Contract");
  console.log("=".repeat(80));

  try {
    let distributionOwner: string;
    try {
      distributionOwner = await distribution.owner();
    } catch (error: any) {
      // Contract might not be initialized yet (owner() fails)
      if (error.message.includes("decode") || error.message.includes("0x")) {
        distributionOwner = ethers.ZeroAddress;
      } else {
        throw error;
      }
    }

    if (distributionOwner === ethers.ZeroAddress || !distributionOwner) {
      console.log("\n📝 Initializing TokenDistribution with team wallets...");
      
      const teamMember3Address = DEPLOYMENT_CONFIG.TEAM_WALLETS.D === "0x0000000000000000000000000000000000000000" 
        ? deployer.address 
        : DEPLOYMENT_CONFIG.TEAM_WALLETS.D;

      const initTx = await distribution.initialize(
        TOKEN_PROXY,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.J,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.A,
        teamMember3Address,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.M,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.B,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.AIRDROP
      );
      console.log("   ⏳ Waiting for confirmation...");
      console.log("   TX Hash:", initTx.hash);
      
      // Use appropriate confirmation count for network
      await initTx.wait(confirmations);
      console.log("✅ TokenDistribution initialized!");
      console.log("   TX:", initTx.hash);
    } else {
      console.log("✅ TokenDistribution already initialized");
      console.log("   Owner:", distributionOwner);
    }
  } catch (error: any) {
    if (error.message.includes("InvalidInitialization") || error.message.includes("already initialized")) {
      console.log("✅ TokenDistribution already initialized");
    } else {
      console.error("❌ Error initializing TokenDistribution:", error.message);
      throw error;
    }
  }

  // =========================================================================
  // STEP 2: Check Ownership (CRITICAL - Required for vesting initialization)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: Check Contract Ownership");
  console.log("=".repeat(80));

  const distributionOwner = await distribution.owner();
  console.log("\n👤 Distribution Contract Owner:", distributionOwner);
  console.log("   Deployer Address:", deployer.address);
  
  if (distributionOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("\n⚠️  WARNING: You are NOT the owner of TokenDistribution!");
    console.log("   Owner:", distributionOwner);
    console.log("   Deployer:", deployer.address);
    console.log("\n💡 To initialize vesting, you need to:");
    console.log("   1. Have the current owner run this script, OR");
    console.log("   2. Have the current owner call these functions manually:");
    console.log("      - distribution.initializeVesting()");
    console.log("      - distribution.distributeInitialTokens()");
    console.log("\n   If you transferred ownership, you may need to:");
    console.log("   - Transfer ownership back to deployer, OR");
    console.log("   - Have the new owner run this script");
    console.log("\n⚠️  Skipping vesting initialization (requires owner permissions)...");
  } else {
    console.log("✅ You are the owner! Proceeding with vesting initialization...");
  }

  // =========================================================================
  // STEP 3: Initialize Token Distribution (Transfer tokens + Setup vesting)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: Initialize Token Distribution (1M tokens for team + airdrop)");
  console.log("=".repeat(80));

  const deployerBalance = await token.balanceOf(deployer.address);
  const distributionBalance = await token.balanceOf(DISTRIBUTION);
  const totalNeeded = ethers.parseEther("1000000"); // 1M tokens

  console.log("\n📊 Current Balances:");
  console.log("  Deployer:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("  Distribution Contract:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("  Required:", ethers.formatEther(totalNeeded), "DBBPT");

  const vestingInitialized = await distribution.vestingInitialized();
  const distributionComplete = await distribution.isDistributionComplete();

  // Only proceed if user is the owner
  const isOwner = distributionOwner.toLowerCase() === deployer.address.toLowerCase();
  
  if (!distributionComplete && isOwner) {
    if (distributionBalance < totalNeeded) {
      console.log("\n⚠️  Distribution contract needs tokens!");
      console.log("   Option 1: Use ReflectiveToken.initializeDistribution() (if tokens in token contract)");
      console.log("   Option 2: Transfer tokens from deployer wallet directly");
      
      // Check if deployer has enough tokens
      if (deployerBalance >= totalNeeded) {
        console.log("\n✅ Deployer has enough tokens!");
        console.log("   Note: Token has 5% transfer fee, excluding distribution contract from fees...");
        
        try {
          // Exclude distribution contract from fees to avoid fee deduction (5% fee)
          console.log("   Excluding distribution contract from fees...");
          try {
            const excludeTx = await token.excludeFromFee(DISTRIBUTION, true);
            console.log("   ⏳ Waiting for confirmation...");
            console.log("   TX Hash:", excludeTx.hash);
            await excludeTx.wait(confirmations);
            console.log("✅ Distribution contract excluded from fees!");
          } catch (excludeError: any) {
            // Contract might already be excluded or might fail silently
            console.log("   Note: Exclusion may have already been set");
          }
          
          console.log("\n   Transferring 1M tokens to distribution contract...");
          // Transfer tokens from deployer to distribution contract (should be fee-free now)
          const transferTx = await token.transfer(DISTRIBUTION, totalNeeded);
          console.log("   ⏳ Waiting for confirmation...");
          console.log("   TX Hash:", transferTx.hash);
          await transferTx.wait(confirmations);
          console.log("✅ Tokens transferred!");
          console.log("   TX:", transferTx.hash);
          
          // Verify balance after transfer (important for localhost state sync)
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for state sync on localhost
          let newDistributionBalance = await token.balanceOf(DISTRIBUTION);
          console.log("   Verified balance:", ethers.formatEther(newDistributionBalance), "DBBPT");
          
          // If balance is less than needed, fees were likely applied - transfer difference
          if (newDistributionBalance < totalNeeded) {
            console.log("\n⚠️  Distribution contract balance is less than expected (fees were applied)");
            console.log("   Expected:", ethers.formatEther(totalNeeded), "DBBPT");
            console.log("   Actual:", ethers.formatEther(newDistributionBalance), "DBBPT");
            console.log("   Difference:", ethers.formatEther(totalNeeded - newDistributionBalance), "DBBPT");
            
            // Make sure exclusion is set, then transfer difference
            console.log("   Ensuring distribution contract is excluded from fees...");
            try {
              const excludeTx = await token.excludeFromFee(DISTRIBUTION, true);
              await excludeTx.wait(confirmations);
              console.log("✅ Exclusion confirmed!");
            } catch (e) {
              // Already excluded, continue
            }
            
            // Transfer the difference (now without fees)
            const difference = totalNeeded - newDistributionBalance;
            if (difference > 0n) {
              console.log("   Transferring difference (without fees)...");
              const diffTx = await token.transfer(DISTRIBUTION, difference);
              await diffTx.wait(confirmations);
              console.log("✅ Difference transferred!");
              
              // Verify final balance
              await new Promise(resolve => setTimeout(resolve, 500));
              newDistributionBalance = await token.balanceOf(DISTRIBUTION);
              console.log("   Final balance:", ethers.formatEther(newDistributionBalance), "DBBPT");
              
              // If still short, transfer one more time to cover any remaining difference
              if (newDistributionBalance < totalNeeded) {
                const remaining = totalNeeded - newDistributionBalance;
                console.log("   ⚠️  Still short by:", ethers.formatEther(remaining), "DBBPT");
                console.log("   Transferring remaining amount...");
                const finalTx = await token.transfer(DISTRIBUTION, remaining);
                await finalTx.wait(confirmations);
                await new Promise(resolve => setTimeout(resolve, 500));
                newDistributionBalance = await token.balanceOf(DISTRIBUTION);
                console.log("   ✅ Final balance:", ethers.formatEther(newDistributionBalance), "DBBPT");
              }
            }
          }
          
          // Final verification before proceeding
          const finalCheckBalance = await token.balanceOf(DISTRIBUTION);
          if (finalCheckBalance < totalNeeded) {
            console.log("\n❌ ERROR: Distribution contract still doesn't have enough tokens!");
            console.log("   Required:", ethers.formatEther(totalNeeded), "DBBPT");
            console.log("   Actual:", ethers.formatEther(finalCheckBalance), "DBBPT");
            console.log("   This usually means fees are still being applied.");
            console.log("\n💡 Solution: Make sure distribution contract is excluded from fees");
            throw new Error(`Insufficient tokens in distribution contract. Expected ${ethers.formatEther(totalNeeded)} DBBPT, got ${ethers.formatEther(finalCheckBalance)} DBBPT`);
          }
          
          console.log("\n✅ Distribution contract has sufficient balance!");
          
          // Now initialize vesting and distribution
          if (!vestingInitialized) {
            console.log("\n   Initializing vesting...");
            const vestingTx = await distribution.initializeVesting();
            console.log("   ⏳ Waiting for confirmation...");
            console.log("   TX Hash:", vestingTx.hash);
            await vestingTx.wait(confirmations);
            console.log("✅ Vesting initialized!");
            console.log("   TX:", vestingTx.hash);
          } else {
            console.log("✅ Vesting already initialized");
          }

          if (!distributionComplete) {
            // Final balance check before calling distributeInitialTokens
            const finalBalanceCheck = await token.balanceOf(DISTRIBUTION);
            console.log("\n   Final balance check before distribution:", ethers.formatEther(finalBalanceCheck), "DBBPT");
            console.log("   Required:", ethers.formatEther(totalNeeded), "DBBPT");
            
            if (finalBalanceCheck < totalNeeded) {
              const shortfall = totalNeeded - finalBalanceCheck;
              console.log("   ⚠️  Still short by:", ethers.formatEther(shortfall), "DBBPT");
              console.log("   Transferring remaining amount...");
              const topUpTx = await token.transfer(DISTRIBUTION, shortfall);
              await topUpTx.wait(confirmations);
              
              // Verify again
              await new Promise(resolve => setTimeout(resolve, 500));
              const verifiedBalance = await token.balanceOf(DISTRIBUTION);
              console.log("   ✅ Verified balance:", ethers.formatEther(verifiedBalance), "DBBPT");
              
              if (verifiedBalance < totalNeeded) {
                throw new Error(`Cannot reach required balance. Expected ${ethers.formatEther(totalNeeded)} DBBPT, got ${ethers.formatEther(verifiedBalance)} DBBPT. Fees may be preventing full transfer.`);
              }
            }
            
            console.log("\n   Completing distribution...");
            const distTx = await distribution.distributeInitialTokens();
            console.log("   ⏳ Waiting for confirmation...");
            console.log("   TX Hash:", distTx.hash);
            await distTx.wait(confirmations);
            console.log("✅ Distribution complete!");
            console.log("   TX:", distTx.hash);
          } else {
            console.log("✅ Distribution already complete");
          }
        } catch (error: any) {
          console.error("❌ Error:", error.message);
          console.log("\n💡 Manual alternative:");
          console.log("   1. Transfer 1M tokens to distribution contract:", DISTRIBUTION);
          console.log("   2. Call distribution.initializeVesting()");
          console.log("   3. Call distribution.distributeInitialTokens()");
        }
      }
      // Check if token contract has enough balance
      else {
        const tokenContractBalance = await token.balanceOf(TOKEN_PROXY);
        console.log("\n  Token Contract Balance:", ethers.formatEther(tokenContractBalance), "DBBPT");
        
        if (tokenContractBalance >= totalNeeded) {
        console.log("\n✅ Token contract has enough balance!");
        console.log("   Using ReflectiveToken.initializeDistribution()...");
        
        try {
          const tokenOwner = await token.owner();
          if (tokenOwner.toLowerCase() === deployer.address.toLowerCase()) {
            const initDistTx = await token.initializeDistribution();
            console.log("   ⏳ Waiting for confirmation...");
            console.log("   TX Hash:", initDistTx.hash);
            await initDistTx.wait(confirmations);
            console.log("✅ Distribution initialized!");
            console.log("   TX:", initDistTx.hash);
          } else {
            console.log("\n⚠️  You are not the token owner!");
            console.log("   Token Owner:", tokenOwner);
            console.log("   Deployer:", deployer.address);
            console.log("\n💡 You need the token owner to call:");
            console.log("   token.initializeDistribution()");
          }
        } catch (error: any) {
          console.error("❌ Error:", error.message);
          console.log("\n💡 Manual alternative:");
          console.log("   1. Transfer 1M tokens to distribution contract (requires token owner)");
          console.log("   2. Call distribution.initializeVesting() (requires distribution owner)");
          console.log("   3. Call distribution.distributeInitialTokens() (requires distribution owner)");
        }
        } else {
          console.log("\n⚠️  Token contract doesn't have enough balance!");
          console.log("   Current balance:", ethers.formatEther(tokenContractBalance), "DBBPT");
          console.log("   Required:", ethers.formatEther(totalNeeded), "DBBPT");
          console.log("\n💡 Manual steps:");
          console.log("   1. Transfer 1M tokens to the token contract");
          console.log("   2. Call token.initializeDistribution() (if you're token owner)");
          console.log("\n   OR if tokens are in deployer wallet:");
          console.log("   1. Transfer 1M tokens directly to distribution contract:", DISTRIBUTION);
          console.log("   2. Call distribution.initializeVesting()");
          console.log("   3. Call distribution.distributeInitialTokens()");
          console.log("\n   OR if tokens are in another wallet:");
          console.log("   1. Transfer 1M tokens directly to distribution contract:", DISTRIBUTION);
          console.log("   2. Have distribution owner call initializeVesting() and distributeInitialTokens()");
        }
      }
    } else {
      console.log("\n✅ Distribution contract has enough tokens!");
      
      if (!vestingInitialized) {
        console.log("   Initializing vesting...");
        try {
          const vestingTx = await distribution.initializeVesting();
          console.log("   ⏳ Waiting for confirmation...");
          console.log("   TX Hash:", vestingTx.hash);
          await vestingTx.wait(confirmations);
          console.log("✅ Vesting initialized!");
          console.log("   TX:", vestingTx.hash);
        } catch (error: any) {
          console.error("❌ Error initializing vesting:", error.message);
          throw error;
        }
      } else {
        console.log("✅ Vesting already initialized");
      }

      if (!distributionComplete) {
        console.log("   Completing distribution...");
        try {
          const distTx = await distribution.distributeInitialTokens();
          console.log("   ⏳ Waiting for confirmation...");
          console.log("   TX Hash:", distTx.hash);
          await distTx.wait(confirmations);
          console.log("✅ Distribution complete!");
          console.log("   TX:", distTx.hash);
        } catch (error: any) {
          console.error("❌ Error completing distribution:", error.message);
          throw error;
        }
      } else {
        console.log("✅ Distribution already complete");
      }
    }
  } else if (!isOwner) {
    console.log("\n⏭️  Skipping vesting initialization (not the owner)");
    console.log("   Current owner:", distributionOwner);
    console.log("\n📋 Summary of what needs to be done:");
    console.log("   1. Distribution contract balance:", ethers.formatEther(distributionBalance), "DBBPT");
    console.log("   2. Required balance:", ethers.formatEther(totalNeeded), "DBBPT");
    console.log("   3. Vesting initialized:", vestingInitialized);
    console.log("   4. Distribution complete:", distributionComplete);
    console.log("\n💡 Have the owner run this script or call manually:");
    console.log("   distribution.initializeVesting()");
    console.log("   distribution.distributeInitialTokens()");
  } else {
    console.log("\n✅ Token distribution already initialized and complete!");
  }

  // =========================================================================
  // STEP 4: Verification Guide
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: Contract Verification on BaseScan");
  console.log("=".repeat(80));
  
  console.log("\n📋 To verify contracts on BaseScan:");
  if (PROXY_ADMIN) {
    console.log("\n1. ReflectiveToken (Implementation):");
    console.log("   npx hardhat verify --network mainnet", TOKEN_IMPL);
    console.log("\n2. ProxyAdmin:");
    console.log("   npx hardhat verify --network mainnet", PROXY_ADMIN, deployer.address);
    console.log("\n3. TransparentUpgradeableProxy:");
    console.log("   npx hardhat verify --network mainnet", TOKEN_PROXY, TOKEN_IMPL, PROXY_ADMIN, "0x...");
    console.log("   (Note: Last parameter is encoded initialize data - check deployment logs)");
  } else {
    console.log("\n1. ReflectiveToken:");
    console.log("   npx hardhat verify --network mainnet", TOKEN_PROXY);
  }
  console.log("\n2. FlexibleTieredStaking:");
  console.log("   npx hardhat verify --network mainnet", STAKING, TOKEN_PROXY, DEPLOYMENT_CONFIG.PRIMARY_ORACLE, DEPLOYMENT_CONFIG.BACKUP_ORACLE);
  console.log("\n3. TokenDistribution:");
  console.log("   npx hardhat verify --network mainnet", DISTRIBUTION);
  console.log("\n4. ImprovedTimelock:");
  console.log("   npx hardhat verify --network mainnet", TIMELOCK, deployer.address, "172800");
  console.log("\n5. ArweaveGateway:");
  console.log("   npx hardhat verify --network mainnet", GATEWAY);

  // =========================================================================
  // STEP 4: Add Liquidity Guide
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: Add Initial Liquidity to Uniswap");
  console.log("=".repeat(80));
  
  console.log("\n📋 To add liquidity:");
  console.log("\n1. Go to Uniswap V2 on Base:");
  console.log("   https://app.uniswap.org/");
  console.log("\n2. Connect your wallet");
  console.log("\n3. Navigate to 'Pool' > 'Add Liquidity'");
  console.log("\n4. Select tokens:");
  console.log("   - Token A: DBBPT (", TOKEN_PROXY, ")");
  console.log("   - Token B: WETH (0x4200000000000000000000000000000000000006)");
  console.log("\n5. Recommended initial liquidity:");
  console.log("   - Token Amount: Start with 100,000 - 500,000 DBBPT");
  console.log("   - ETH Amount: Match the USD value (e.g., $1,000 - $5,000 worth of ETH)");
  console.log("\n6. Approve tokens if needed");
  console.log("\n7. Add liquidity and confirm transaction");
  console.log("\n⚠️  Important:");
  console.log("   - Start with smaller amounts for testing");
  console.log("   - Ensure you have enough ETH for gas + liquidity");
  console.log("   - The pair address will be automatically set in the token contract");

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("✅ POST-DEPLOYMENT SETUP COMPLETE");
  console.log("=".repeat(80));
  
  console.log("\n📋 Summary:");
  console.log("  ✅ TokenDistribution initialized");
  if (distributionComplete) {
    console.log("  ✅ Token distribution complete (1M tokens allocated)");
  } else {
    console.log("  ⚠️  Token distribution pending (needs 1M tokens)");
  }
  console.log("  📝 Contracts ready for verification");
  console.log("  💧 Ready to add liquidity");
  
  console.log("\n🔗 BaseScan Links:");
  console.log("  Token Proxy:", `https://basescan.org/address/${TOKEN_PROXY}`);
  console.log("  Staking:", `https://basescan.org/address/${STAKING}`);
  console.log("  Distribution:", `https://basescan.org/address/${DISTRIBUTION}`);
  
  console.log("\n💡 Next Steps:");
  console.log("  1. Verify contracts on BaseScan (see Step 3 above)");
  console.log("  2. Add initial liquidity to Uniswap (see Step 4 above)");
  console.log("  3. Test all functions with small amounts");
  console.log("  4. Announce launch! 🚀");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Setup failed:");
    console.error(error);
    process.exit(1);
  });

