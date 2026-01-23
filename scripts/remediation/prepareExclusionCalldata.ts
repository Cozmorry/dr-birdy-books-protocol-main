import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const args = process.argv.slice(2);
  const timelockIndex = args.indexOf("--timelock");
  const timelockAddr = timelockIndex !== -1 ? args[timelockIndex + 1] : undefined;
  const outIndex = args.indexOf("--out");
  const outFile = outIndex !== -1 ? args[outIndex + 1] : undefined;

  const { DEPLOYMENT_CONFIG } = require("../config");
  const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS || {};
  const extra = DEPLOYMENT_CONFIG.EXCLUDE_FROM_FEES || [];

  const addrs: string[] = [];
  for (const v of Object.values(teamWallets)) {
    if (typeof v === "string" && v !== "0x0000000000000000000000000000000000000000") addrs.push(v);
  }
  for (const v of extra) {
    if (typeof v === "string" && v !== "0x0000000000000000000000000000000000000000") addrs.push(v);
  }

  const unique = Array.from(new Set(addrs.map((a) => a.toLowerCase())));

  // Try to find token address in deployments
  let tokenAddr: string | undefined;
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (fs.existsSync(deploymentsDir)) {
    const files = fs.readdirSync(deploymentsDir).filter((f) => f.endsWith(".json")).map((f) => ({ name: f, path: path.join(deploymentsDir, f), time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime() })).sort((a,b)=>b.time-a.time);
    if (files.length > 0) {
      try {
        const json = JSON.parse(fs.readFileSync(files[0].path, "utf8"));
        tokenAddr = json.token || json.Token || json.reflectiveToken || json.tokenAddress || tokenAddr;
      } catch (e) {}
    }
  }

  if (!tokenAddr) {
    console.log("Could not auto-detect token address. Pass token address with --token <address> or ensure deployments file exists.");
  } else {
    console.log("Token address:", tokenAddr);
  }

  const iface = new ethers.utils.Interface(["function excludeFromFee(address account, bool excluded)"]);

  const now = Math.floor(Date.now() / 1000);
  const defaultEta = now + 3600 * 24; // 24 hours

  const output: any[] = [];

  console.log("\nGenerated calldata for exclusions:");
  for (const a of unique) {
    const calldata = iface.encodeFunctionData("excludeFromFee", [a, true]);
    console.log(`\nAddress: ${a}`);
    console.log(`  calldata: ${calldata}`);
    if (timelockAddr && tokenAddr) {
      console.log(`  Example queue call: queueTransaction(${tokenAddr}, 0, \"\", \"${calldata}\", ${defaultEta}) to ${timelockAddr}`);
    }
    output.push({ address: a, calldata, token: tokenAddr, timelock: timelockAddr, exampleEta: defaultEta });
  }

  if (outFile) {
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
    console.log(`\nSaved calldata to ${outFile}`);
  }

  console.log("\nNotes:");
  console.log(" - These are *calldata* payloads for excludeFromFee(addr, true).\n - If the owner is a timelock, you should queue transactions using your timelock's queue function.\n - If you are the owner and want to execute directly, you can run a small script to call the function for each address (not recommended for multisig/timelock owners).");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
