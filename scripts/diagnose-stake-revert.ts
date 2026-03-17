/**
 * Diagnose why stake() reverts: check oracle price path and token transfer.
 * Run: npx hardhat run scripts/diagnose-stake-revert.ts --network mainnet
 */
import { ethers } from "hardhat";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";

const BASE_MAINNET_CHAIN_ID = 8453;

async function main() {
  console.log("\n🔍 Diagnosing stake revert...\n");

  const [signer] = await ethers.getSigners();
  const addresses = getContractAddresses(BASE_MAINNET_CHAIN_ID);
  const oracleConfig = getOracleConfig(BASE_MAINNET_CHAIN_ID);
  const stakingAddress = addresses.flexibleTieredStaking!;
  const tokenAddress = addresses.reflectiveToken!;

  const provider = ethers.provider;
  const block = await provider.getBlock("latest");
  const now = block?.timestamp ?? 0;

  const aggregatorAbi = [
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  ];

  // 1. Check primary oracle (ETH/USD) - used when uniswapPair is 0
  const primary = new ethers.Contract(oracleConfig.primaryOracle, aggregatorAbi, provider);
  let primaryUpdatedAt = 0n;
  let primaryAnswer = 0n;
  try {
    const data = await primary.latestRoundData();
    primaryAnswer = BigInt(data[1].toString());
    primaryUpdatedAt = BigInt(data[3].toString());
    const age = Number(now) - Number(primaryUpdatedAt);
    const hours24 = 24 * 60 * 60;
    console.log("Primary oracle (ETH/USD):");
    console.log("  answer (8 decimals):", primaryAnswer.toString());
    console.log("  updatedAt:", primaryUpdatedAt.toString(), "| age seconds:", age, "| age hours:", (age / 3600).toFixed(1));
    console.log("  (block.timestamp - updatedAt) < 24h?", age < hours24 ? "✅ YES" : "❌ NO (would return 0)");
  } catch (e: any) {
    console.log("Primary oracle call failed:", e.message);
  }

  // 2. Check uniswapPair on staking
  const stakingAbi = ["function uniswapPair() view returns (address)"];
  const staking = await ethers.getContractAt(stakingAbi, stakingAddress);
  const pair = await staking.uniswapPair();
  console.log("\nStaking uniswapPair:", pair === ethers.ZeroAddress ? "0 (not set) - uses oracle as fallback" : pair);

  // 3. Simulate stake and try to get revert reason via estimateGas
  const stakingStakeAbi = ["function stake(uint256 amount)"];
  const stakingFull = await ethers.getContractAt(stakingStakeAbi, stakingAddress);
  const amountWei = ethers.parseEther("1");
  try {
    const gas = await stakingFull.connect(signer).stake.estimateGas(amountWei);
    console.log("\n✅ estimateGas(stake(1e18)) succeeded. Gas:", gas.toString());
  } catch (err: any) {
    console.log("\n❌ estimateGas(stake(1e18)) failed:");
    console.log(err.message);
    // Try to extract revert reason from error
    const reason = err.reason || err.error?.message || err.shortMessage;
    if (reason) console.log("Reason:", reason);
    if (err.data) console.log("Data:", err.data);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
