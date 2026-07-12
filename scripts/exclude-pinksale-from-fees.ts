/**
 * Exclude PinkSale Factory from ReflectiveToken Fees & Max Tx
 *
 * PinkSale requires this before you can create a launchpad pool.
 *
 * Usage:
 *   npx hardhat run scripts/exclude-pinksale-from-fees.ts --network mainnet
 */

import { ethers } from "hardhat";

const REFLECTIVE_TOKEN_ADDRESS = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0"; // Base mainnet DBBPT proxy
const PINKSALE_ADDRESS        = "0x50dd93Fd53d9769B53813620185249Fba1826537"; // PinkSale Factory

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔐 Running as:", deployer.address);
  console.log("📋 Token:    ", REFLECTIVE_TOKEN_ADDRESS);
  console.log("📋 PinkSale: ", PINKSALE_ADDRESS);

  const token = await ethers.getContractAt("ReflectiveToken", REFLECTIVE_TOKEN_ADDRESS);

  // Ownership check
  const owner = await token.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error(`\n❌ You are NOT the owner. Owner is: ${owner}`);
    process.exit(1);
  }
  console.log("\n✅ Ownership confirmed.");

  // Check current exclusion state
  const alreadyExcluded = await token._isExcludedFromFee?.(PINKSALE_ADDRESS).catch(() => null);
  if (alreadyExcluded) {
    console.log("ℹ️  PinkSale is already excluded from fees. Nothing to do.");
    return;
  }

  // Exclude from fees (also covers reflection rewards)
  console.log("\n🔄 Calling excludeFromFee...");
  const tx = await token.excludeFromFee(PINKSALE_ADDRESS, true);
  console.log("   TX sent:", tx.hash);
  const receipt = await tx.wait();

  if (receipt && receipt.status === 1) {
    console.log(`\n✅ SUCCESS — PinkSale is now excluded from fees & rewards.`);
    console.log(`   View on Basescan: https://basescan.org/tx/${tx.hash}`);
    console.log("\n📝 What this covers:");
    console.log("   ✔ Fees (taxFee + liquidityFee + marketingFee)");
    console.log("   ✔ Reflection rewards (excluded from reward pool)");
    console.log("   ✔ Max tx — note: maxTxAmount is not enforced in _update,");
    console.log("             so PinkSale is already unrestricted on tx size.");
    console.log("\n   You can now click 'Confirm & Create Launchpad' on PinkSale.");
  } else {
    console.error("\n❌ Transaction failed.");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
