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

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("\n🚀 MAINNET POST-DEPLOYMENT SETUP");
  console.log("================================================================================");
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("================================================================================");

  // Get contract addresses from deployment JSON
  const deploymentFile = require("../deployments/deployment-mainnet-1765231331017.json");
  
  const TOKEN_PROXY = deploymentFile.token;
  const TOKEN_IMPL = deploymentFile.tokenImplementation;
  const DISTRIBUTION = deploymentFile.distribution;
  const STAKING = deploymentFile.staking;
  const TIMELOCK = deploymentFile.timelock;
  const GATEWAY = deploymentFile.gateway;
  const PROXY_ADMIN = deploymentFile.proxyAdmin;

  console.log("\n📋 Contract Addresses:");
  console.log("  Token (Proxy):", TOKEN_PROXY);
  console.log("  Token (Implementation):", TOKEN_IMPL);
  console.log("  Distribution:", DISTRIBUTION);
  console.log("  Staking:", STAKING);
  console.log("  Timelock:", TIMELOCK);
  console.log("  Gateway:", GATEWAY);
  console.log("  ProxyAdmin:", PROXY_ADMIN);

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_PROXY);
  const distribution = await ethers.getContractAt("TokenDistribution", DISTRIBUTION);

  // =========================================================================
  // STEP 1: Initialize TokenDistribution (if not already initialized)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: Initialize TokenDistribution Contract");
  console.log("=".repeat(80));

  try {
    const distributionOwner = await distribution.owner();
    if (distributionOwner === ethers.ZeroAddress) {
      console.log("\n📝 Initializing TokenDistribution with team wallets...");
      
      const dsignAddress = DEPLOYMENT_CONFIG.TEAM_WALLETS.DSIGN === "0x0000000000000000000000000000000000000000" 
        ? deployer.address 
        : DEPLOYMENT_CONFIG.TEAM_WALLETS.DSIGN;

      const initTx = await distribution.initialize(
        TOKEN_PROXY,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.JOSEPH,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.AJ,
        dsignAddress,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.DEVELOPER,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.BIRDY,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.AIRDROP
      );
      console.log("   ⏳ Waiting for confirmation...");
      await initTx.wait(2);
      console.log("✅ TokenDistribution initialized!");
      console.log("   TX:", initTx.hash);
    } else {
      console.log("✅ TokenDistribution already initialized");
      console.log("   Owner:", distributionOwner);
    }
  } catch (error: any) {
    if (error.message.includes("InvalidInitialization")) {
      console.log("✅ TokenDistribution already initialized");
    } else {
      console.error("❌ Error initializing TokenDistribution:", error.message);
      throw error;
    }
  }

  // =========================================================================
  // STEP 2: Initialize Token Distribution (Transfer tokens + Setup vesting)
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: Initialize Token Distribution (1M tokens for team + airdrop)");
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

  if (!distributionComplete) {
    if (distributionBalance < totalNeeded) {
      console.log("\n⚠️  Distribution contract needs tokens!");
      console.log("   Option 1: Use ReflectiveToken.initializeDistribution() (recommended)");
      console.log("   Option 2: Transfer tokens manually and call distribution functions");
      
      // Check if token contract has enough balance
      const tokenContractBalance = await token.balanceOf(TOKEN_PROXY);
      console.log("\n  Token Contract Balance:", ethers.formatEther(tokenContractBalance), "DBBPT");
      
      if (tokenContractBalance >= totalNeeded) {
        console.log("\n✅ Token contract has enough balance!");
        console.log("   Using ReflectiveToken.initializeDistribution()...");
        
        try {
          const initDistTx = await token.initializeDistribution();
          console.log("   ⏳ Waiting for confirmation...");
          await initDistTx.wait(2);
          console.log("✅ Distribution initialized!");
          console.log("   TX:", initDistTx.hash);
        } catch (error: any) {
          console.error("❌ Error:", error.message);
          console.log("\n💡 Manual alternative:");
          console.log("   1. Transfer 1M tokens to distribution contract");
          console.log("   2. Call distribution.initializeVesting()");
          console.log("   3. Call distribution.distributeInitialTokens()");
        }
      } else {
        console.log("\n⚠️  Token contract doesn't have enough balance!");
        console.log("   You need to transfer tokens first.");
        console.log("\n💡 Manual steps:");
        console.log("   1. Transfer 1M tokens from deployer to token contract");
        console.log("   2. Call token.initializeDistribution()");
      }
    } else {
      console.log("\n✅ Distribution contract has enough tokens!");
      
      if (!vestingInitialized) {
        console.log("   Initializing vesting...");
        const vestingTx = await distribution.initializeVesting();
        await vestingTx.wait(2);
        console.log("✅ Vesting initialized!");
      } else {
        console.log("✅ Vesting already initialized");
      }

      if (!distributionComplete) {
        console.log("   Completing distribution...");
        const distTx = await distribution.distributeInitialTokens();
        await distTx.wait(2);
        console.log("✅ Distribution complete!");
      } else {
        console.log("✅ Distribution already complete");
      }
    }
  } else {
    console.log("\n✅ Token distribution already initialized and complete!");
  }

  // =========================================================================
  // STEP 3: Verification Guide
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: Contract Verification on BaseScan");
  console.log("=".repeat(80));
  
  console.log("\n📋 To verify contracts on BaseScan:");
  console.log("\n1. ReflectiveToken (Implementation):");
  console.log("   npx hardhat verify --network mainnet", TOKEN_IMPL);
  console.log("\n2. ProxyAdmin:");
  console.log("   npx hardhat verify --network mainnet", PROXY_ADMIN, deployer.address);
  console.log("\n3. TransparentUpgradeableProxy:");
  console.log("   npx hardhat verify --network mainnet", TOKEN_PROXY, TOKEN_IMPL, PROXY_ADMIN, "0x...");
  console.log("   (Note: Last parameter is encoded initialize data - check deployment logs)");
  console.log("\n4. FlexibleTieredStaking:");
  console.log("   npx hardhat verify --network mainnet", STAKING, TOKEN_PROXY, DEPLOYMENT_CONFIG.PRIMARY_ORACLE, DEPLOYMENT_CONFIG.BACKUP_ORACLE);
  console.log("\n5. TokenDistribution:");
  console.log("   npx hardhat verify --network mainnet", DISTRIBUTION);
  console.log("\n6. ImprovedTimelock:");
  console.log("   npx hardhat verify --network mainnet", TIMELOCK, deployer.address, "172800");
  console.log("\n7. ArweaveGateway:");
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

