import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Preparing mainnet redeploy script (DRY-RUN: will not execute deployment without --execute).\n");

  const args = process.argv.slice(2);
  const execute = args.includes("--execute");

  const { DEPLOYMENT_CONFIG } = require("../config");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Token constructor/initializer args
  const router = DEPLOYMENT_CONFIG.UNISWAP_ROUTER;
  const marketing = DEPLOYMENT_CONFIG.MARKETING_WALLET;
  // Try to discover staking, gateway, oracle from last deployment
  const deploymentsDir = path.join(__dirname, "../../deployments");
  let staking = ethers.ZeroAddress;
  let gateway = ethers.ZeroAddress;
  let priceOracle = DEPLOYMENT_CONFIG.PRIMARY_ORACLE || ethers.ZeroAddress;

  if (fs.existsSync(deploymentsDir)) {
    const files = fs.readdirSync(deploymentsDir).filter((f) => f.endsWith('.json')).map((f) => ({ name: f, path: path.join(deploymentsDir, f), time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime() })).sort((a,b)=>b.time-a.time);
    if (files.length>0) {
      const json = JSON.parse(fs.readFileSync(files[0].path, 'utf8'));
      staking = json.staking || staking;
      gateway = json.gateway || gateway;
      priceOracle = json.priceOracle || priceOracle;
    }
  }

  console.log("Planned initializer args:");
  console.log("  router:", router);
  console.log("  marketing:", marketing);
  console.log("  staking:", staking);
  console.log("  gateway:", gateway);
  console.log("  priceOracle:", priceOracle);

  if (!execute) {
    console.log("\nDRY RUN complete. To actually deploy, re-run with --execute.\n");
    return;
  }

  console.log("\nExecuting deployment on network. This will deploy a new ReflectiveToken proxy and exclude addresses afterwards.\n");

  // Deploy ReflectiveToken as an upgradeable proxy
  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
  console.log("Deploying ReflectiveToken (proxy)...");
  const token = await upgrades.deployProxy(ReflectiveToken, [router, marketing, staking, gateway, priceOracle], { initializer: 'initialize' });
  await token.deploymentTransaction()?.wait?.();
  await token.waitForDeployment();
  const tokenAddr = (await token.getAddress()).toString();
  console.log("Deployed token proxy at:", tokenAddr);

  // Exclude addresses from fees
  console.log('\nExcluding configured addresses from fees...');
  const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS || {};
  const extras = DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES || [];
  const addrs: string[] = [];
  for (const v of Object.values(teamWallets)) {
    if (typeof v === 'string' && v !== ethers.ZeroAddress) addrs.push(v);
  }
  for (const v of extras) {
    if (typeof v === 'string' && v !== ethers.ZeroAddress) addrs.push(v);
  }
  const unique = Array.from(new Set(addrs.map(a=>a.toLowerCase())));

  for (const a of unique) {
    try {
      console.log('  Excluding', a);
      const tx = await token.excludeFromFee(a, true);
      console.log('    TX:', tx.hash);
      await tx.wait(1);
      console.log('    ✅ excluded');
    } catch (e:any) {
      console.log('    ⚠️ error excluding', a, e.message || e);
    }
  }

  // Write deployment record
  const out = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    token: tokenAddr,
    deployer: deployer.address,
  };

  const outPath = path.join(__dirname, '../../deployments', `deployment-mainnet-redeploy-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('\nWrote deployment file to', outPath);

  console.log('\nRedeployment complete. Verify exclusions with token.debugReflection(address) or via Etherscan events.');
}

main().catch((err) => { console.error(err); process.exitCode = 1; });