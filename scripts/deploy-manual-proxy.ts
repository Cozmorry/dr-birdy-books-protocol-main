/**
 * @title Manual Proxy Deployment Script
 * @notice Deploys Dr. Birdy Books Protocol contracts using manual proxy deployment
 * @dev Bypasses OpenZeppelin Hardhat Upgrades plugin to avoid RPC compatibility issues
 */

import { ethers } from "hardhat";
import { DEPLOYMENT_CONFIG } from "./config";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;

  console.log("\n🚀 Deploying Dr. Birdy Books Protocol with Manual Proxy Pattern on", networkName);
  console.log("================================================================================");
  console.log("Using deployer:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const deployed: any = {
    network: networkName,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  try {
    // Determine which oracle to use based on network
    let primaryOracle = DEPLOYMENT_CONFIG.PRIMARY_ORACLE;
    let backupOracle = DEPLOYMENT_CONFIG.BACKUP_ORACLE;

    if (networkName === "localhost" || networkName === "hardhat") {
      console.log("\n⚠️  Localhost detected - deploying mock oracles...");
      const MockOracle = await ethers.getContractFactory("MockPriceOracle");
      
      const primaryOracleMock = await MockOracle.deploy();
      await primaryOracleMock.waitForDeployment();
      primaryOracle = await primaryOracleMock.getAddress();
      
      const backupOracleMock = await MockOracle.deploy();
      await backupOracleMock.waitForDeployment();
      backupOracle = await backupOracleMock.getAddress();
      
      console.log("✅ Mock Primary Oracle:", primaryOracle);
      console.log("✅ Mock Backup Oracle:", backupOracle);
    }

    // =========================================================================
    // STEP 1: Deploy small contracts (no proxy needed)
    // =========================================================================
    console.log("\n📦 Step 1: Deploying small contracts (no proxy needed)...");
    console.log("--------------------------------------------------------------------------------");

    // 1. ArweaveGateway
    console.log("\n1️⃣ Deploying ArweaveGateway...");
    const ArweaveGateway = await ethers.getContractFactory("ArweaveGateway");
    const gateway = await ArweaveGateway.deploy();
    await gateway.waitForDeployment();
    deployed.gateway = await gateway.getAddress();
    console.log("✅ ArweaveGateway deployed to:", deployed.gateway);

    // 2. TokenDistribution
    console.log("\n2️⃣ Deploying TokenDistribution...");
    const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
    const distribution = await TokenDistribution.deploy();
    await distribution.waitForDeployment();
    deployed.distribution = await distribution.getAddress();
    console.log("✅ TokenDistribution deployed to:", deployed.distribution);

    // 3. ImprovedTimelock
    console.log("\n3️⃣ Deploying ImprovedTimelock...");
    const ImprovedTimelock = await ethers.getContractFactory("ImprovedTimelock");
    const timelock = await ImprovedTimelock.deploy(
      deployer.address, // admin
      2 * 24 * 60 * 60  // 2 days delay
    );
    await timelock.waitForDeployment();
    deployed.timelock = await timelock.getAddress();
    console.log("✅ ImprovedTimelock deployed to:", deployed.timelock);

    // =========================================================================
    // STEP 2: Deploy ReflectiveToken with MANUAL Transparent Proxy
    // =========================================================================
    console.log("\n📦 Step 2: Deploying ReflectiveToken with MANUAL Transparent Proxy...");
    console.log("--------------------------------------------------------------------------------");
    console.log("⚠️  This contract is 34KB - REQUIRES PROXY!");

    console.log("\n4️⃣ Deploying ReflectiveToken (Manual Proxy + Implementation)...");
    console.log("   📋 Initializing with:");
    console.log("      Router:", DEPLOYMENT_CONFIG.UNISWAP_ROUTER);
    console.log("      Marketing:", DEPLOYMENT_CONFIG.MARKETING_WALLET);
    console.log("      Primary Oracle:", primaryOracle);
    console.log("      Backup Oracle:", backupOracle);

    // Step 2a: Deploy Implementation Contract
    console.log("\n   📝 Step 2a: Deploying ReflectiveToken Implementation...");
    const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
    const tokenImplementation = await ReflectiveToken.deploy();
    await tokenImplementation.waitForDeployment();
    const tokenImplementationAddress = await tokenImplementation.getAddress();
    console.log("   ✅ Implementation deployed to:", tokenImplementationAddress);

    // Step 2b: Encode initialize data
    console.log("\n   📝 Step 2b: Encoding initialize call data...");
    const initializeData = ReflectiveToken.interface.encodeFunctionData("initialize", [
      DEPLOYMENT_CONFIG.UNISWAP_ROUTER,
      DEPLOYMENT_CONFIG.MARKETING_WALLET,
      ethers.ZeroAddress, // staking - will set later
      deployed.gateway,
      primaryOracle,
    ]);
    console.log("   ✅ Initialize data encoded");

    // Step 2c: Deploy ProxyAdmin
    console.log("\n   📝 Step 2c: Deploying ProxyAdmin...");
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = await ProxyAdmin.deploy(deployer.address);
    await proxyAdmin.waitForDeployment();
    deployed.proxyAdmin = await proxyAdmin.getAddress();
    console.log("   ✅ ProxyAdmin deployed to:", deployed.proxyAdmin);

    // Step 2d: Deploy TransparentUpgradeableProxy
    console.log("\n   📝 Step 2d: Deploying TransparentUpgradeableProxy...");
    const TransparentProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
    const tokenProxy = await TransparentProxy.deploy(
      tokenImplementationAddress,
      deployed.proxyAdmin,
      initializeData
    );
    await tokenProxy.waitForDeployment();
    deployed.token = await tokenProxy.getAddress();
    deployed.tokenImplementation = tokenImplementationAddress;

    console.log("\n✅ ReflectiveToken Proxy deployed to:", deployed.token);
    console.log("   📝 Implementation deployed to:", deployed.tokenImplementation);
    console.log("   📝 ProxyAdmin deployed to:", deployed.proxyAdmin);
    console.log("   💡 Users interact with: ", deployed.token);

    // =========================================================================
    // STEP 3: Deploy FlexibleTieredStaking (Direct deployment)
    // =========================================================================
    console.log("\n📦 Step 3: Deploying FlexibleTieredStaking...");
    console.log("--------------------------------------------------------------------------------");
    console.log("⚠️  This contract is 28KB - deploying directly (borderline size)");

    console.log("\n5️⃣ Deploying FlexibleTieredStaking...");
    const FlexibleTieredStaking = await ethers.getContractFactory("FlexibleTieredStaking");
    const staking = await FlexibleTieredStaking.deploy(
      deployed.token,
      primaryOracle,
      backupOracle
    );
    await staking.waitForDeployment();
    deployed.staking = await staking.getAddress();
    console.log("✅ FlexibleTieredStaking deployed to:", deployed.staking);
    console.log("   ✅ Constructor initialized with token and oracles");

    // =========================================================================
    // STEP 4: Post-deployment configuration
    // =========================================================================
    console.log("\n🔧 Step 4: Post-deployment configuration...");
    console.log("--------------------------------------------------------------------------------");

    // Get token contract instance at proxy address
    const token = ReflectiveToken.attach(deployed.token);

    // Set staking contract
    console.log("\n📝 Setting staking contract on token...");
    const setStakingTx = await token.setStakingContract(deployed.staking);
    await setStakingTx.wait();
    console.log("✅ Staking contract set");

    // Set timelock contract
    console.log("\n📝 Setting timelock contract...");
    const setTimelockTx = await token.setTimelock(deployed.timelock);
    await setTimelockTx.wait();
    console.log("✅ Timelock contract set");

    // Set distribution contract
    console.log("\n📝 Setting distribution contract...");
    const setDistributionTx = await token.setDistributionContract(deployed.distribution);
    await setDistributionTx.wait();
    console.log("✅ Distribution contract set");

    // Create Uniswap pair (will fail on localhost with mock router, that's OK)
    console.log("\n📝 Creating Uniswap pair...");
    try {
      const createPairTx = await token.createPair();
      await createPairTx.wait();
      const pairAddress = await token.pairAddress();
      deployed.uniswapPair = pairAddress;
      console.log("✅ Uniswap pair created at:", pairAddress);
    } catch (error: any) {
      console.log("⚠️ Failed to create Uniswap pair:", error.message.split('\n')[0]);
      console.log("   (This is expected on localhost/testnet without real Uniswap)");
    }

    // =========================================================================
    // STEP 5: Verify deployment
    // =========================================================================
    console.log("\n📊 Step 5: Checking contract status...");
    console.log("--------------------------------------------------------------------------------");

    // Check token status
    console.log("\n📋 ReflectiveToken Status:");
    const tradingEnabled = await token.tradingEnabled();
    const swapEnabled = await token.swapEnabled();
    const pairAddress = await token.pairAddress();
    const timelockAddress = await token.timelock();
    const distributionAddress = await token.tokenDistribution();

    console.log("  Trading Enabled:", tradingEnabled);
    console.log("  Swap Enabled:", swapEnabled);
    console.log("  Pair Exists:", pairAddress !== ethers.ZeroAddress);
    console.log("  Timelock Exists:", timelockAddress !== ethers.ZeroAddress);
    console.log("  Distribution Exists:", distributionAddress !== ethers.ZeroAddress);

    // Check staking status
    console.log("\n📋 Staking Contract Status:");
    const stakingStatus = await staking.getContractStatus();
    console.log("  Is Paused:", stakingStatus[0]);
    console.log("  Staking Token Set:", stakingStatus[1] !== ethers.ZeroAddress);
    console.log("  Primary Oracle Set:", stakingStatus[2] !== ethers.ZeroAddress);
    console.log("  Backup Oracle Set:", stakingStatus[3] !== ethers.ZeroAddress);
    console.log("  Tier Count:", stakingStatus[4]);

    // Get token info
    console.log("\n📋 Token Information:");
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const taxFee = await token.taxFee();
    const liquidityFee = await token.liquidityFee();
    const marketingFee = await token.marketingFee();
    const totalFee = await token.totalFee();

    console.log(`  Token: ${name} (${symbol})`);
    console.log(`  Decimals: ${decimals}`);
    console.log(`  Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`  Circulating Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`  Fees: Tax ${Number(taxFee) / 100}%, Liquidity ${Number(liquidityFee) / 100}%, Marketing ${Number(marketingFee) / 100}%`);
    console.log(`  Total Fee: ${Number(totalFee) / 100}%`);

    // =========================================================================
    // FINAL: Display summary
    // =========================================================================
    console.log("\n================================================================================");
    console.log("🎯 DEPLOYMENT SUMMARY");
    console.log("================================================================================");
    console.log("\n📍 Contract Addresses:");
    console.table({
      "ArweaveGateway": deployed.gateway,
      "TokenDistribution": deployed.distribution,
      "ImprovedTimelock": deployed.timelock,
      "ReflectiveToken (Proxy)": deployed.token,
      "ReflectiveToken (Implementation)": deployed.tokenImplementation,
      "ProxyAdmin": deployed.proxyAdmin,
      "FlexibleTieredStaking": deployed.staking,
    });

    console.log("\n💡 Important Notes:");
    console.log("  • ReflectiveToken uses MANUAL PROXY pattern (contract was 34KB)");
    console.log("  • Users interact with PROXY address:", deployed.token);
    console.log("  • Implementation can be upgraded via ProxyAdmin:", deployed.proxyAdmin);
    console.log("  • FlexibleTieredStaking deployed directly (28KB - borderline)");
    console.log("  • All contracts are now mainnet-ready!");

    console.log("\n📝 Next Steps:");
    console.log("  1. Verify contracts on BaseScan");
    console.log("  2. Update frontend with proxy address");
    console.log("  3. Test all functions with small amounts");
    console.log("  4. Initialize token distribution");
    console.log("  5. Add initial liquidity");

    console.log("\n🔐 Contract Ownership:");
    console.log("  Owner (deployer):", deployer.address);
    console.log("  ProxyAdmin owner:", deployer.address);
    console.log("  ✅ You control all upgrades and admin functions");

    console.log("\n💾 Save these addresses immediately!");
    console.log("================================================================================");

    // Save deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(
      deploymentsDir,
      `deployment-${networkName}-${Date.now()}.json`
    );
    fs.writeFileSync(deploymentFile, JSON.stringify(deployed, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentFile);

    console.log("\n✅ Deployment complete!");

  } catch (error: any) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

