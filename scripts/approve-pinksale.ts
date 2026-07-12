/**
 * Approve PinkSale Factory to spend DBBPT tokens
 *
 * Run this BEFORE creating the launchpad pool on PinkSale.
 * The wallet running this must be the one creating the pool on PinkSale.
 *
 * Usage:
 *   npx hardhat run scripts/approve-pinksale.ts --network mainnet
 */

import { ethers } from "hardhat";

const REFLECTIVE_TOKEN_ADDRESS = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
const PINKSALE_ADDRESS         = "0x50dd93Fd53d9769B53813620185249Fba1826537";

// Approve max uint256 — PinkSale will only pull what it needs
const APPROVE_AMOUNT = ethers.MaxUint256;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("🔐 Approving from wallet:", signer.address);
  console.log("📋 Token:    ", REFLECTIVE_TOKEN_ADDRESS);
  console.log("📋 Spender:  ", PINKSALE_ADDRESS);

  const token = await ethers.getContractAt("ReflectiveToken", REFLECTIVE_TOKEN_ADDRESS);

  // Check current balance
  const balance = await token.balanceOf(signer.address);
  console.log("\n💰 Wallet token balance:", ethers.formatEther(balance), "DBBPT");

  if (balance === 0n) {
    console.error("\n❌ Wallet has no DBBPT tokens. Make sure you're using the right wallet.");
    process.exit(1);
  }

  // Check current allowance
  const currentAllowance = await token.allowance(signer.address, PINKSALE_ADDRESS);
  console.log("📊 Current allowance:   ", ethers.formatEther(currentAllowance), "DBBPT");

  if (currentAllowance === ethers.MaxUint256) {
    console.log("\n✅ Already approved for max amount. Nothing to do.");
    return;
  }

  // Approve
  console.log("\n🔄 Approving PinkSale to spend tokens...");
  const tx = await token.approve(PINKSALE_ADDRESS, APPROVE_AMOUNT);
  console.log("   TX sent:", tx.hash);

  const receipt = await tx.wait();
  if (receipt && receipt.status === 1) {
    console.log(`\n✅ SUCCESS — PinkSale is approved.`);
    console.log(`   View on Basescan: https://basescan.org/tx/${tx.hash}`);
    console.log("\n   Go back to PinkSale and click 'Confirm & Create Launchpad'.");
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
