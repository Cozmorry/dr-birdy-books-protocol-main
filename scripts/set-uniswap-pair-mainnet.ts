/**
 * Set the DBBPT/WETH Uniswap V2 pair on the staking contract.
 * This makes tier USD value use real token price instead of the ETH/USD oracle.
 *
 * 1. Create the DBBPT/WETH pair on Base (e.g. add liquidity on Uniswap).
 * 2. Set UNISWAP_PAIR_ADDRESS in .env to the pair contract address, or pass as first arg.
 * 3. Run as staking owner: npx hardhat run scripts/set-uniswap-pair-mainnet.ts --network mainnet
 *    Or with arg: npx hardhat run scripts/set-uniswap-pair-mainnet.ts --network mainnet -- "0xYourPairAddress"
 */
import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

const BASE_MAINNET_CHAIN_ID = 8453;

async function main() {
  const pairAddress =
    process.argv[2]?.replace(/^["']|["']$/g, "") ||
    process.env.UNISWAP_PAIR_ADDRESS;

  if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") {
    console.error("Usage: set UNISWAP_PAIR_ADDRESS in .env or pass pair address as first argument.");
    console.error("Example: npx hardhat run scripts/set-uniswap-pair-mainnet.ts --network mainnet -- \"0x...\"");
    process.exit(1);
  }

  console.log("\n🔧 Setting Uniswap pair on staking contract...\n");

  const [signer] = await ethers.getSigners();
  const addresses = getContractAddresses(BASE_MAINNET_CHAIN_ID);
  const stakingAddress = addresses.flexibleTieredStaking!;

  const stakingAbi = [
    "function setUniswapPair(address _uniswapPair)",
    "function uniswapPair() view returns (address)",
    "function owner() view returns (address)",
  ];
  const staking = await ethers.getContractAt(stakingAbi, stakingAddress);

  const owner = await staking.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Caller ${signer.address} is not staking owner ${owner}. Run with owner key.`);
  }

  const current = await staking.uniswapPair();
  console.log("Current uniswapPair:", current || "(not set)");
  console.log("Setting to:", pairAddress);

  if (current && current.toLowerCase() === ethers.getAddress(pairAddress).toLowerCase()) {
    console.log("Already set. Done.");
    return;
  }

  const tx = await staking.setUniswapPair(ethers.getAddress(pairAddress));
  await tx.wait();
  console.log("✅ Done. Tx:", tx.hash);
  console.log("\n⚠️  Existing stakers still have USD value from the old (wrong) price.");
  console.log("   They need to unstake and restake to get the correct tier.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
