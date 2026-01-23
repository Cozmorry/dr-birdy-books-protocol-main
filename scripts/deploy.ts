const { DEPLOYMENT_CONFIG } = require("./config");
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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

  // Deploy FlexibleTieredStaking with constructor arguments (token, primaryOracle, backupOracle)
  console.log("\n📦 Deploying FlexibleTieredStaking...");
  const Staking = await ethers.getContractFactory("FlexibleTieredStaking");
  
  // Get oracle addresses with proper checksum
  let primaryOracle: string;
  let backupOracle: string;
  
  try {
    primaryOracle = DEPLOYMENT_CONFIG.PRIMARY_ORACLE 
      ? ethers.getAddress(DEPLOYMENT_CONFIG.PRIMARY_ORACLE.toLowerCase()) 
      : ethers.ZeroAddress;
  } catch (e) {
    primaryOracle = DEPLOYMENT_CONFIG.PRIMARY_ORACLE || ethers.ZeroAddress;
  }
  
  try {
    backupOracle = DEPLOYMENT_CONFIG.BACKUP_ORACLE 
      ? ethers.getAddress(DEPLOYMENT_CONFIG.BACKUP_ORACLE.toLowerCase()) 
      : ethers.ZeroAddress;
  } catch (e) {
    backupOracle = DEPLOYMENT_CONFIG.BACKUP_ORACLE || ethers.ZeroAddress;
  }
  
  if (primaryOracle === ethers.ZeroAddress) {
    throw new Error("Primary oracle not configured in DEPLOYMENT_CONFIG");
  }

  const staking = await Staking.deploy(
    ethers.getAddress(deployed.token),
    primaryOracle,
    backupOracle
  );
  await staking.waitForDeployment();
  deployed.staking = await staking.getAddress();
  console.log("✅ FlexibleTieredStaking deployed to:", deployed.staking);
  console.log("   ✅ Constructor initialized with token and oracles");

  // ===============================
  // STEP 2: Safe Initialization
  // ===============================

  console.log("\n🔧 Initializing contracts...");

  // Note: FlexibleTieredStaking is already initialized via constructor
  // Tiers are automatically set in the constructor (Tier 1: $24, Tier 2: $50, Tier 3: $1000)

  // ===============================
  // STEP 2A: Initialize ReflectiveToken
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
    // STEP 3C: Exclude All Addresses From Fees
    // ===============================

    console.log("\n🔒 Excluding addresses from fees...");

    // Collect all addresses to exclude
    const addressesToExclude: string[] = [];

    // Add all team wallets
    const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS || {};
    for (const [key, wallet] of Object.entries(teamWallets)) {
      if (typeof wallet === "string" && wallet !== ethers.ZeroAddress) {
        addressesToExclude.push(wallet);
      }
    }

    // Add marketing wallet
    if (DEPLOYMENT_CONFIG.MARKETING_WALLET && DEPLOYMENT_CONFIG.MARKETING_WALLET !== ethers.ZeroAddress) {
      addressesToExclude.push(DEPLOYMENT_CONFIG.MARKETING_WALLET);
    }

    // Add all addresses from EXCLUDE_FROM_FEES array
    if (DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES && Array.isArray(DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES)) {
      for (const addr of DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES) {
        if (typeof addr === "string" && addr !== ethers.ZeroAddress) {
          addressesToExclude.push(addr);
        }
      }
    }

    // Add deployer address (owner)
    addressesToExclude.push(deployer.address);

    // Deduplicate addresses (case-insensitive)
    const uniqueAddresses = Array.from(
      new Set(addressesToExclude.map((addr) => ethers.getAddress(addr.toLowerCase())))
    );

    console.log(`\n📋 Found ${uniqueAddresses.length} unique addresses to exclude:`);
    uniqueAddresses.forEach((addr, index) => {
      // Try to identify the address
      let label = "";
      if (addr.toLowerCase() === deployer.address.toLowerCase()) {
        label = " (Deployer/Owner)";
      } else if (addr.toLowerCase() === DEPLOYMENT_CONFIG.MARKETING_WALLET?.toLowerCase()) {
        label = " (Marketing Wallet)";
      } else if (addr.toLowerCase() === teamWallets.AIRDROP?.toLowerCase()) {
        label = " (Airdrop Wallet)";
      } else if (addr.toLowerCase() === teamWallets.J?.toLowerCase()) {
        label = " (Team J)";
      } else if (addr.toLowerCase() === teamWallets.A?.toLowerCase()) {
        label = " (Team A)";
      } else if (addr.toLowerCase() === teamWallets.D?.toLowerCase()) {
        label = " (Team D)";
      } else if (addr.toLowerCase() === teamWallets.M?.toLowerCase()) {
        label = " (Team M)";
      } else if (addr.toLowerCase() === teamWallets.B?.toLowerCase()) {
        label = " (Team B)";
      }
      console.log(`   ${index + 1}. ${addr}${label}`);
    });

    // Exclude each address
    let excludedCount = 0;
    let failedCount = 0;

    for (const addr of uniqueAddresses) {
      try {
        const checksummedAddr = ethers.getAddress(addr);
        console.log(`\n   Excluding ${checksummedAddr}...`);
        const excludeTx = await token.excludeFromFee(checksummedAddr, true);
        await excludeTx.wait();
        excludedCount++;
        console.log(`   ✅ Excluded successfully (TX: ${excludeTx.hash})`);
      } catch (err: any) {
        failedCount++;
        console.warn(`   ⚠️  Failed to exclude ${addr}: ${err.message}`);
      }
    }

    console.log(`\n✅ Fee exclusion complete: ${excludedCount} excluded, ${failedCount} failed`);

    // ===============================
    // STEP 3B: Post-Deployment Setup for Staking
    // ===============================

    console.log(
      "\n🔧 Staking contract setup..."
    );

    // Note: Staking contract is already initialized via constructor with:
    // - Token address
    // - Primary oracle
    // - Backup oracle
    // - Default tiers (Tier 1: $24, Tier 2: $50, Tier 3: $1000)
    
    console.log("✅ Staking contract fully configured via constructor");

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

  // ===============================
  // STEP 5: Ownership Configuration
  // ===============================
  // Owner is set to deployer address (you) - no transfer needed
  // If you want to transfer to a different address later, use the transfer-ownership script
  
  console.log("\n🔐 Contract ownership:");
  console.log("   Owner (deployer):", deployer.address);
  console.log("   ✅ Contracts deployed with you as owner");
  console.log("   💡 To transfer ownership later, use: scripts/transfer-ownership.ts");

  console.log("\n🎯 Deployment Summary:");
  console.table(deployed);

  // Save deployment info to file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkInfo = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: network.name,
    chainId: networkInfo.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gateway: deployed.gateway,
    distribution: deployed.distribution,
    timelock: deployed.timelock,
    token: deployed.token,
    staking: deployed.staking,
  };

  const deploymentFile = path.join(
    deploymentsDir,
    `deployment-${network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
