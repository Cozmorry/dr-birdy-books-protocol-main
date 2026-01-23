import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const args = process.argv.slice(2);
  // Optional: allow explicit token address via --token <address>
  const tokenArgIndex = args.indexOf("--token");
  const explicitToken = tokenArgIndex !== -1 ? args[tokenArgIndex + 1] : (process.env.TOKEN || process.env.EXPLICIT_TOKEN || undefined);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load config
  const { DEPLOYMENT_CONFIG } = require("../config");
  const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS;

  // Determine token address from deployments
  let tokenAddress: string | undefined = explicitToken;
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!tokenAddress && fs.existsSync(deploymentsDir)) {
    const files = fs.readdirSync(deploymentsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ name: f, path: path.join(deploymentsDir, f), time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      try {
        const json = JSON.parse(fs.readFileSync(files[0].path, "utf8"));
        // Look for token
        tokenAddress = json.token || json.Token || json.reflectiveToken || json.TokenAddress || tokenAddress;
      } catch (e) {
        // ignore
      }
    }
  }

  if (!tokenAddress) {
    console.error("Could not auto-detect token address. Provide it with --token <address> or ensure the deployments folder exists.");
    process.exit(1);
  }

  console.log(`Token address: ${tokenAddress}`);

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress, deployer);

  // Build list of addresses to exclude from fees (team wallets + airdrop + explicit list)
  const addrs: string[] = [];
  for (const [k, v] of Object.entries(teamWallets)) {
    if (typeof v === "string" && v !== "0x0000000000000000000000000000000000000000") {
      addrs.push(v);
    }
  }

  // Include explicit addresses from EXCLUDE_FROM_FEES, if provided
  if (DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES && Array.isArray(DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES)) {
    for (const addr of DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES) {
      if (typeof addr === "string" && addr !== "0x0000000000000000000000000000000000000000") {
        addrs.push(addr);
      }
    }
  }

  // Deduplicate
  const uniqueAddrs = Array.from(new Set(addrs.map((a) => a.toLowerCase())));

  console.log("Addresses to exclude from fees:");
  uniqueAddrs.forEach((a) => console.log("  ", a));

  for (const addrLower of uniqueAddrs) {
    const addr = addrLower as string;
    try {
      console.log(`Excluding ${addr} from fees...`);
      const tx = await token.excludeFromFee(addr, true);
      console.log("   TX:", tx.hash);
      await tx.wait(1);
      console.log(`   ✅ Excluded ${addr}`);
    } catch (e: any) {
      console.log(`   ⚠️  Could not exclude ${addr}:`, e.message || e);
    }
  }

  console.log("Done. Verify exclusions with token.debugReflection(address) or token.isExcludedFromFee(address) (if available).");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
