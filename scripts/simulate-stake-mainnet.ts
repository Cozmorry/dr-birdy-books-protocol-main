/**
 * Simulate staking on mainnet to reproduce revert reason.
 * Run: npx hardhat run scripts/simulate-stake-mainnet.ts --network mainnet
 */
import { ethers } from "hardhat";
import { getContractAddresses, getOracleConfig } from "../frontend/src/config/networks";

const BASE_MAINNET_CHAIN_ID = 8453;

async function main() {
  console.log("\n🔍 Simulating stake on mainnet...\n");

  const [signer] = await ethers.getSigners();
  const addresses = getContractAddresses(BASE_MAINNET_CHAIN_ID);
  const stakingAddress = addresses.flexibleTieredStaking;
  const tokenAddress = addresses.reflectiveToken;

  if (!stakingAddress || !tokenAddress) throw new Error("Missing config");

  const tokenAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];
  const stakingAbi = [
    "function getContractStatus() view returns (bool, bool, bool, bool, uint256)",
    "function allowance(address user) view returns (uint256)",
    "function uniswapPair() view returns (address)",
    "function stake(uint256 amount)",
  ];

  const token = await ethers.getContractAt(tokenAbi, tokenAddress);
  const staking = await ethers.getContractAt(stakingAbi, stakingAddress);

  const user = signer.address;
  const amountWei = ethers.parseEther("1");

  const balance = await token.balanceOf(user);
  const allowance = await staking.allowance(user);
  const [isPaused, tokenSet, primarySet, backupSet, tierCount] = await staking.getContractStatus();
  const uniswapPair = await staking.uniswapPair();

  console.log("User:", user);
  console.log("Token balance:", ethers.formatEther(balance));
  console.log("Allowance (for staking contract):", ethers.formatEther(allowance));
  console.log("Staking: isPaused =", isPaused, "| tokenSet =", tokenSet, "| primaryOracle =", primarySet, "| backupOracle =", backupSet, "| tierCount =", tierCount);
  console.log("uniswapPair:", uniswapPair || "(not set)");

  if (balance < amountWei) {
    console.log("\n⚠️ Insufficient balance to stake 1 token. Use a smaller amount in simulation.");
  }
  if (allowance < amountWei) {
    console.log("\n⚠️ Insufficient allowance. Approve the staking contract first.");
  }

  // Simulate stake (static call) to get revert reason
  const stakingWithSigner = staking.connect(signer);
  try {
    await stakingWithSigner.stake.staticCall(amountWei);
    console.log("\n✅ Simulated stake(1e18) would succeed.");
  } catch (err: any) {
    console.log("\n❌ Simulated stake reverted:");
    console.log(err.message);
    if (err.data) console.log("Data:", err.data);
    if (err.reason) console.log("Reason:", err.reason);
    if (err.error?.message) console.log("Error:", err.error.message);
    // Try to decode custom error
    const fragment = err.error?.error?.error?.data || err.data;
    if (fragment && typeof fragment === "string" && fragment.length > 10) {
      console.log("Revert data (hex):", fragment.slice(0, 100) + "...");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
