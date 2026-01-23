import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npx hardhat run --network <network> scripts/remediation/queueIncludeAirdrop.ts -- <airdropAddress> [--timelock <timelockAddress>]");
    process.exit(1);
  }

  const airdropAddr = args[0];
  const timelockIndex = args.indexOf("--timelock");
  const timelockAddr = timelockIndex !== -1 ? args[timelockIndex + 1] : undefined;

  const [deployer] = await ethers.getSigners();

  // Try to find deployed token address from deployments folder
  let tokenAddress: string | undefined;
  const deploymentsDir = "deployments";
  if (fs.existsSync(deploymentsDir)) {
    const files = fs.readdirSync(deploymentsDir);
    for (const file of files) {
      if (file.endsWith("mainnet-20250110.json") || file.includes("localhost") || file.includes("testnet") || file.includes("mainnet")) {
        try {
          const json = JSON.parse(fs.readFileSync(`${deploymentsDir}/${file}`, "utf8"));
          // find a field that looks like ReflectiveToken
          for (const key of Object.keys(json)) {
            const obj = (json as any)[key];
            if (obj && obj.address && (obj.name === "ReflectiveToken" || key.toLowerCase().includes("reflective"))) {
              tokenAddress = obj.address;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }

  if (!tokenAddress) {
    console.error("Could not auto-detect token address. Please edit the script to set tokenAddress manually.");
    process.exit(1);
  }

  console.log(`Token address: ${tokenAddress}`);
  console.log(`Airdrop address: ${airdropAddr}`);
  if (timelockAddr) console.log(`Timelock: ${timelockAddr}`);

  const tokenAbi = [
    "function excludeFromFee(address account, bool excluded)",
  ];
  const iface = new ethers.utils.Interface(tokenAbi);

  const calldata = iface.encodeFunctionData("excludeFromFee", [airdropAddr, false]);

  console.log("\nCalldata to call excludeFromFee(airdropAddr, false):\n");
  console.log(calldata);

  if (timelockAddr) {
    // Typical Timelock queue function: queueTransaction(target, value, signature, data, eta)
    // This varies by timelock. Print an example for Gnosis Safe / Timelock: queueTransaction(target, 0, "", data, eta)
    const eta = Math.floor(Date.now() / 1000) + 3600 * 24; // 24h from now as example
    console.log(`\nExample timelock queue call:`);
    console.log(`queueTransaction(${tokenAddress}, 0, "", \"${calldata}\", ${eta})`);
  }

  // Optionally, if deployer is owner, call directly (DANGEROUS: will perform tx)
  const token = await ethers.getContractAt(tokenAbi, tokenAddress, deployer);
  console.log("\nDeployer address:", deployer.address);
  console.log("Are you the owner/signer? If so, you can uncomment the direct call below to execute the inclusion immediately.");
  console.log("// await token.excludeFromFee(airdropAddr, false); // uncomment to execute (requires owner)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
