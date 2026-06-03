/**
 * @title Fast Localhost Deployment Script
 * @notice Deploys all protocol contracts to a local Hardhat node.
 * @dev Uses wait(1) instead of wait(2) so it doesn't stall — Hardhat mines
 *      exactly one block per transaction, so wait(2) hangs forever.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("\n🚀 Fast Localhost Deployment");
  console.log("============================");
  console.log("Deployer  :", deployer.address);
  console.log("Chain ID  :", chainId);
  console.log("Balance   :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  if (chainId !== 31337) {
    throw new Error(`This script is for localhost only (chainId 31337). Got: ${chainId}`);
  }

  // ── Mock Oracles ──────────────────────────────────────────────────────────
  console.log("📡 Deploying Mock Oracles...");
  const MockOracle = await ethers.getContractFactory("MockPriceOracle");

  const primaryOracleMock = await MockOracle.deploy();
  await primaryOracleMock.waitForDeployment();
  const primaryOracle = await primaryOracleMock.getAddress();
  console.log("  ✅ Primary Oracle :", primaryOracle);

  const backupOracleMock = await MockOracle.deploy();
  await backupOracleMock.waitForDeployment();
  const backupOracle = await backupOracleMock.getAddress();
  console.log("  ✅ Backup Oracle  :", backupOracle);

  // Set reasonable prices
  await (await primaryOracleMock.setPrice(2000n * 10n ** 8n)).wait(1);
  await (await backupOracleMock.setPrice(40000n * 10n ** 8n)).wait(1);
  console.log("  ✅ Prices set: ETH=$2000, BTC=$40000\n");

  // ── ArweaveGateway ────────────────────────────────────────────────────────
  console.log("📦 Deploying ArweaveGateway...");
  const ArweaveGateway = await ethers.getContractFactory("ArweaveGateway");
  const gateway = await ArweaveGateway.deploy();
  await gateway.waitForDeployment();
  const gatewayAddress = await gateway.getAddress();
  console.log("  ✅ ArweaveGateway :", gatewayAddress);

  // ── TokenDistribution ─────────────────────────────────────────────────────
  console.log("📦 Deploying TokenDistribution...");
  const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
  const distribution = await TokenDistribution.deploy();
  await distribution.waitForDeployment();
  const distributionAddress = await distribution.getAddress();
  console.log("  ✅ TokenDistribution :", distributionAddress);

  // ── ImprovedTimelock ──────────────────────────────────────────────────────
  console.log("📦 Deploying ImprovedTimelock...");
  const ImprovedTimelock = await ethers.getContractFactory("ImprovedTimelock");
  const timelock = await ImprovedTimelock.deploy(
    deployer.address, // admin
    2 * 24 * 60 * 60  // 2 days
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("  ✅ ImprovedTimelock :", timelockAddress);

  // ── ReflectiveToken (Manual Proxy) ────────────────────────────────────────
  console.log("\n📦 Deploying ReflectiveToken (Implementation + Proxy)...");

  // Implementation
  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
  const tokenImpl = await ReflectiveToken.deploy();
  await tokenImpl.waitForDeployment();
  const tokenImplAddress = await tokenImpl.getAddress();
  console.log("  ✅ Implementation :", tokenImplAddress);

  // ProxyAdmin
  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdmin.deploy(deployer.address);
  await proxyAdmin.waitForDeployment();
  const proxyAdminAddress = await proxyAdmin.getAddress();
  console.log("  ✅ ProxyAdmin      :", proxyAdminAddress);

  // Encode initialize — use deployer address as a non-zero router placeholder
  // (ReflectiveToken's initialize requires router != address(0); no real DEX on localhost)
  const initData = ReflectiveToken.interface.encodeFunctionData("initialize", [
    deployer.address,     // uniswap router placeholder (non-zero, no real DEX on localhost)
    deployer.address,     // marketing wallet
    ethers.ZeroAddress,   // staking (set after)
    gatewayAddress,
    primaryOracle,
  ]);

  // Proxy
  const TransparentProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
  const tokenProxy = await TransparentProxy.deploy(
    tokenImplAddress,
    proxyAdminAddress,
    initData
  );
  await tokenProxy.waitForDeployment();
  const tokenAddress = await tokenProxy.getAddress();
  console.log("  ✅ Token Proxy     :", tokenAddress);

  // ── FlexibleTieredStaking ─────────────────────────────────────────────────
  console.log("\n📦 Deploying FlexibleTieredStaking...");
  const FlexibleTieredStaking = await ethers.getContractFactory("FlexibleTieredStaking");
  const staking = await FlexibleTieredStaking.deploy(
    tokenAddress,
    primaryOracle,
    backupOracle
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("  ✅ FlexibleTieredStaking :", stakingAddress);

  // ── Post-deployment wiring ────────────────────────────────────────────────
  console.log("\n🔧 Wiring contracts together...");
  const token = ReflectiveToken.attach(tokenAddress) as any;

  await (await token.setStakingContract(stakingAddress)).wait(1);
  console.log("  ✅ Staking contract set on token");

  await (await token.setTimelock(timelockAddress)).wait(1);
  console.log("  ✅ Timelock set on token");

  await (await token.setDistributionContract(distributionAddress)).wait(1);
  console.log("  ✅ Distribution contract set on token");

  // ── Summary ───────────────────────────────────────────────────────────────
  const deployed = {
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    reflectiveToken: tokenAddress,
    tokenImplementation: tokenImplAddress,
    proxyAdmin: proxyAdminAddress,
    tokenDistribution: distributionAddress,
    flexibleTieredStaking: stakingAddress,
    arweaveGateway: gatewayAddress,
    improvedTimelock: timelockAddress,
    primaryOracle,
    backupOracle,
  };

  console.log("\n\n=====================================");
  console.log("🎯 DEPLOYMENT COMPLETE");
  console.log("=====================================");
  console.log(JSON.stringify(deployed, null, 2));

  // Save to file
  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "localhost-latest.json");
  fs.writeFileSync(outFile, JSON.stringify(deployed, null, 2));
  console.log("\n💾 Saved to:", outFile);
  console.log("\n⚡ Copy these into frontend/src/config/networks.ts LOCALHOST section!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deployment failed:", err.message ?? err);
    process.exit(1);
  });
