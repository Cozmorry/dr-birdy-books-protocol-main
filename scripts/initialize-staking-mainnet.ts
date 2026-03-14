/**
 * Ensure the new FlexibleTieredStaking on mainnet is live (unpaused, ready for use).
 * Must be run by the staking contract owner.
 * Run: npx hardhat run scripts/initialize-staking-mainnet.ts --network mainnet
 */
import { ethers } from "hardhat";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";

const BASE_MAINNET_CHAIN_ID = 8453;

async function main() {
  console.log("\n🔧 Initializing new staking contract on mainnet...\n");

  const [signer] = await ethers.getSigners();
  console.log("Caller (must be staking owner):", signer.address);

  const addresses = getContractAddresses(BASE_MAINNET_CHAIN_ID);
  const oracleConfig = getOracleConfig(BASE_MAINNET_CHAIN_ID);
  const stakingAddress = addresses.flexibleTieredStaking;
  const tokenAddress = addresses.reflectiveToken;

  if (!stakingAddress || !tokenAddress) throw new Error("Missing config");

  const stakingAbi = [
    "function getContractStatus() view returns (bool isPaused, bool stakingTokenSet, bool primaryOracleSet, bool backupOracleSet, uint256 tierCount)",
    "function unpause()",
    "function setStakingToken(address)",
    "function setPrimaryPriceOracle(address)",
    "function setBackupPriceOracle(address)",
    "function owner() view returns (address)",
  ];
  const staking = await ethers.getContractAt(stakingAbi, stakingAddress);

  const owner = await staking.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("Staking owner:", owner);
    throw new Error("Caller is not the staking contract owner. Use the owner wallet.");
  }

  const [isPaused, stakingTokenSet, primaryOracleSet, backupOracleSet, tierCount] =
    await staking.getContractStatus();

  console.log("Status: isPaused =", isPaused, "| tokenSet =", stakingTokenSet, "| primaryOracle =", primaryOracleSet, "| backupOracle =", backupOracleSet, "| tierCount =", tierCount.toString());

  if (isPaused) {
    console.log("\nUnpausing...");
    const tx = await staking.unpause();
    await tx.wait();
    console.log("✅ Unpaused. Tx:", tx.hash);
  } else {
    console.log("\nContract is already unpaused.");
  }

  if (!stakingTokenSet) {
    console.log("Setting staking token...");
    const tx = await staking.setStakingToken(tokenAddress);
    await tx.wait();
    console.log("✅ Staking token set. Tx:", tx.hash);
  }
  if (!primaryOracleSet && oracleConfig.primaryOracle) {
    console.log("Setting primary oracle...");
    const tx = await staking.setPrimaryPriceOracle(oracleConfig.primaryOracle);
    await tx.wait();
    console.log("✅ Primary oracle set. Tx:", tx.hash);
  }
  if (!backupOracleSet && oracleConfig.backupOracle) {
    console.log("Setting backup oracle...");
    const tx = await staking.setBackupPriceOracle(oracleConfig.backupOracle);
    await tx.wait();
    console.log("✅ Backup oracle set. Tx:", tx.hash);
  }

  const [isPausedAfter] = await staking.getContractStatus();
  console.log("\nFinal isPaused:", isPausedAfter);
  console.log("✅ Staking contract is ready for use.\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
