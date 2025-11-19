const { DEPLOYMENT_CONFIG } = require("./config");
import { ethers, network } from "hardhat";

async function main() {
  console.log(
    `\n🚀 Deploying Dr. Birdy Books Protocol on Base ${network.name}`
  );

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address))
  );

  const deployed: Record<string, string> = {};

  // ===============================
  // STEP 1: Deploy Core Contracts
  // ===============================

  console.log("\n📦 Deploying ArweaveGateway...");
  const Gateway = await ethers.getContractFactory("ArweaveGateway");
  const gateway = await Gateway.deploy();
  await gateway.waitForDeployment();
  deployed.gateway = await gateway.getAddress();
  console.log("✅ ArweaveGateway deployed to:", deployed.gateway);

  console.log("\n📦 Deploying TokenDistribution...");
  const Distribution = await ethers.getContractFactory("TokenDistribution");
  const distribution = await Distribution.deploy();
  await distribution.waitForDeployment();
  deployed.distribution = await distribution.getAddress();
  console.log("✅ TokenDistribution deployed to:", deployed.distribution);

  console.log("\n📦 Deploying FlexibleTieredStaking...");
  const Staking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await Staking.deploy();
  await staking.waitForDeployment();
  deployed.staking = await staking.getAddress();
  console.log("✅ FlexibleTieredStaking deployed to:", deployed.staking);

  console.log("\n📦 Deploying Timelock...");
  const Timelock = await ethers.getContractFactory("ImprovedTimelock");
  const timelock = await Timelock.deploy(deployer.address, 172800); // 2 days in seconds
  await timelock.waitForDeployment();
  deployed.timelock = await timelock.getAddress();
  console.log("✅ Timelock deployed to:", deployed.timelock);

  console.log("\n📦 Deploying ReflectiveToken...");
  const Token = await ethers.getContractFactory("ReflectiveToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  deployed.token = await token.getAddress();
  console.log("✅ ReflectiveToken deployed to:", deployed.token);

  // ===============================
  // STEP 2: Safe Initialization
  // ===============================

  console.log("\n🔧 Initializing contracts...");

  // ===============================
  // STEP 2A: Initialize FlexibleTieredStaking
  // ===============================

  console.log("\n🔧 Initializing FlexibleTieredStaking...");

  try {
    // Initialize the staking contract with basic parameters
    const stakingTx = await staking.initialize(
      deployed.token, // Will be set after token is deployed
      DEPLOYMENT_CONFIG.PRIMARY_ORACLE, // Primary oracle
      DEPLOYMENT_CONFIG.BACKUP_ORACLE, // Backup oracle
      { gasLimit: 5_000_000 }
    );
    await stakingTx.wait();
    console.log("✅ FlexibleTieredStaking initialized successfully!");
  } catch (err: any) {
    console.warn(
      "⚠️ Staking initialization failed (will retry after token setup):",
      err.message
    );
  }

  // ===============================
  // STEP 2B: Initialize ReflectiveToken
  // ===============================

  console.log("\n🔧 Initializing ReflectiveToken...");

  try {
    // Initialize the token with basic parameters
    const tx = await token.initialize(
      DEPLOYMENT_CONFIG.UNISWAP_ROUTER,
      DEPLOYMENT_CONFIG.MARKETING_WALLET,
      deployed.staking,
      deployed.gateway,
      DEPLOYMENT_CONFIG.PRIMARY_ORACLE,
      { gasLimit: 10_000_000 }
    );
    await tx.wait();
    console.log("✅ ReflectiveToken initialized successfully!");

    // ===============================
    // STEP 3: Post-Deployment Setup
    // ===============================

    console.log("\n🔧 Setting up post-deployment configurations...");

    // Set timelock contract
    try {
      const setTimelockTx = await token.setTimelock(deployed.timelock);
      await setTimelockTx.wait();
      console.log("✅ Timelock contract set");
    } catch (err: any) {
      console.warn("⚠️ Failed to set timelock:", err.message);
    }

    // Set distribution contract
    try {
      const setDistributionTx = await token.setDistributionContract(
        deployed.distribution
      );
      await setDistributionTx.wait();
      console.log("✅ Distribution contract set");
    } catch (err: any) {
      console.warn("⚠️ Failed to set distribution contract:", err.message);
    }

    // Create Uniswap pair
    try {
      const createPairTx = await token.createUniswapPair();
      await createPairTx.wait();
      console.log("✅ Uniswap pair created");
    } catch (err: any) {
      console.warn("⚠️ Failed to create Uniswap pair:", err.message);
    }

    // Complete post-deployment setup
    try {
      const completeSetupTx = await (token as any).completePostDeploymentSetup(
        deployed.timelock,
        deployed.distribution
      );
      await completeSetupTx.wait();
      console.log("✅ Post-deployment setup completed");
    } catch (err: any) {
      console.warn("⚠️ Failed to complete post-deployment setup:", err.message);
    }

    // ===============================
    // STEP 3B: Post-Deployment Setup for Staking
    // ===============================

    console.log(
      "\n🔧 Setting up staking contract post-deployment configurations..."
    );

    // Set staking token (the deployed ReflectiveToken)
    try {
      const setStakingTokenTx = await (staking as any).setStakingToken(
        deployed.token
      );
      await setStakingTokenTx.wait();
      console.log("✅ Staking token set");
    } catch (err: any) {
      console.warn("⚠️ Failed to set staking token:", err.message);
    }

    // Set primary oracle
    try {
      const setPrimaryOracleTx = await (staking as any).setPrimaryPriceOracle(
        DEPLOYMENT_CONFIG.PRIMARY_ORACLE
      );
      await setPrimaryOracleTx.wait();
      console.log("✅ Primary oracle set");
    } catch (err: any) {
      console.warn("⚠️ Failed to set primary oracle:", err.message);
    }

    // Set backup oracle
    try {
      const setBackupOracleTx = await (staking as any).setBackupPriceOracle(
        DEPLOYMENT_CONFIG.BACKUP_ORACLE
      );
      await setBackupOracleTx.wait();
      console.log("✅ Backup oracle set");
    } catch (err: any) {
      console.warn("⚠️ Failed to set backup oracle:", err.message);
    }

    // Set gas refund reward
    try {
      const setGasRefundTx = await (staking as any).setGasRefundReward(
        ethers.parseEther("0.001")
      );
      await setGasRefundTx.wait();
      console.log("✅ Gas refund reward set");
    } catch (err: any) {
      console.warn("⚠️ Failed to set gas refund reward:", err.message);
    }

    // ===============================
    // STEP 4: TokenDistribution (DISABLED - Will be done later)
    // ===============================

    console.log("📋 Distribution contract deployed to:", deployed.distribution);
    console.log("📋 Token contract deployed to:", deployed.token);

    // Check contract status
    let contractStatus: any = null;
    let stakingStatus: any = null;

    try {
      contractStatus = await (token as any).getContractStatus();
      console.log("\n📊 ReflectiveToken Status:");
      console.log("  Trading Enabled:", contractStatus.isTradingEnabled);
      console.log("  Swap Enabled:", contractStatus.isSwapEnabled);
      console.log("  Pair Exists:", contractStatus.pairExists);
      console.log("  Timelock Exists:", contractStatus.timelockExists);
      console.log("  Distribution Exists:", contractStatus.distributionExists);
    } catch (err: any) {
      console.warn("⚠️ Failed to get token contract status:", err.message);
    }

    try {
      stakingStatus = await (staking as any).getContractStatus();
      console.log("\n📊 Staking Contract Status:");
      console.log("  Is Paused:", stakingStatus.isPaused);
      console.log("  Staking Token Set:", stakingStatus.stakingTokenSet);
      console.log("  Primary Oracle Set:", stakingStatus.primaryOracleSet);
      console.log("  Backup Oracle Set:", stakingStatus.backupOracleSet);
      console.log("  Tier Count:", stakingStatus.tierCount);
    } catch (err: any) {
      console.warn("⚠️ Failed to get staking contract status:", err.message);
    }

    // Get additional contract information
    try {
      console.log("\n📋 Contract Information:");

      // Token information
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();
      const circulatingSupply = await token.getCirculatingSupply();

      console.log(`  Token: ${name} (${symbol})`);
      console.log(`  Decimals: ${decimals}`);
      console.log(
        `  Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`
      );
      console.log(
        `  Circulating Supply: ${ethers.formatEther(
          circulatingSupply
        )} ${symbol}`
      );

      // Fee information
      const taxFee = await token.taxFee();
      const liquidityFee = await token.liquidityFee();
      const marketingFee = await token.marketingFee();
      const totalFee = await token.totalFee();

      console.log(
        `  Fees: Tax ${Number(taxFee) / 100}%, Liquidity ${
          Number(liquidityFee) / 100
        }%, Marketing ${Number(marketingFee) / 100}%`
      );
      console.log(`  Total Fee: ${Number(totalFee) / 100}%`);

      // Pair information
      if (contractStatus && contractStatus.pairExists) {
        const pairInfo = await (token as any).getPairInfo();
        console.log(`  Pair Address: ${pairInfo.pair}`);
        console.log(
          `  Reserves: ${ethers.formatEther(
            pairInfo.reserve0
          )} / ${ethers.formatEther(pairInfo.reserve1)}`
        );
      }

      // Staking contract information
      console.log("\n📋 Staking Contract Information:");

      try {
        const totalStaked = await (staking as any).getTotalStaked();
        const stakingBalances = await (staking as any).getContractBalances();
        const oracleInfo = await (staking as any).getOracleInfo();

        console.log(
          `  Total Staked: ${ethers.formatEther(totalStaked)} tokens`
        );
        console.log(
          `  ETH Balance: ${ethers.formatEther(stakingBalances.ethBalance)} ETH`
        );
        console.log(
          `  Token Balance: ${ethers.formatEther(
            stakingBalances.tokenBalance
          )} tokens`
        );
        console.log(`  Primary Oracle: ${oracleInfo.primaryOracle}`);
        console.log(`  Backup Oracle: ${oracleInfo.backupOracle}`);
        console.log(
          `  Gas Refund Reward: ${ethers.formatEther(
            oracleInfo.currentGasRefundReward
          )} ETH`
        );

        // Get tier information
        const tierCount = stakingStatus?.tierCount || 0;
        console.log(`  Configured Tiers: ${tierCount}`);

        for (let i = 0; i < tierCount; i++) {
          try {
            const tier = await (staking as any).getTier(i);
            console.log(
              `    Tier ${i}: ${tier.name} ($${Number(tier.threshold) / 1e8})`
            );
          } catch (err) {
            console.log(`    Tier ${i}: Error retrieving info`);
          }
        }
      } catch (err: any) {
        console.warn(
          "⚠️ Failed to get staking contract information:",
          err.message
        );
      }
    } catch (err: any) {
      console.warn("⚠️ Failed to get contract information:", err.message);
    }
  } catch (err: any) {
    console.warn("⚠️ Initialization failed:", err.message || err);
  }

  console.log("\n🎯 Deployment Summary:");
  console.table(deployed);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
