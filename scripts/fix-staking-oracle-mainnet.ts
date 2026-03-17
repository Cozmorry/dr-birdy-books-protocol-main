/**
 * Set the correct Chainlink ETH/USD oracle on the new staking contract.
 * The contract was deployed with a wrong primary oracle address; this fixes it so stake() works.
 * Run by staking owner: npx hardhat run scripts/fix-staking-oracle-mainnet.ts --network mainnet
 */
import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

const BASE_MAINNET_CHAIN_ID = 8453;
const CORRECT_PRIMARY_ORACLE = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; // Chainlink ETH/USD on Base

async function main() {
  console.log("\n🔧 Fixing primary oracle on staking contract...\n");

  const [signer] = await ethers.getSigners();
  const addresses = getContractAddresses(BASE_MAINNET_CHAIN_ID);
  const stakingAddress = addresses.flexibleTieredStaking!;

  const stakingAbi = [
    "function setPrimaryPriceOracle(address _oracle)",
    "function primaryPriceOracle() view returns (address)",
    "function owner() view returns (address)",
  ];
  const staking = await ethers.getContractAt(stakingAbi, stakingAddress);

  const owner = await staking.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Caller ${signer.address} is not staking owner ${owner}. Run with owner key.`);
  }

  const current = await staking.primaryPriceOracle();
  console.log("Current primary oracle:", current);
  console.log("Setting to:", CORRECT_PRIMARY_ORACLE);

  if (current.toLowerCase() === CORRECT_PRIMARY_ORACLE.toLowerCase()) {
    console.log("Already set. Done.");
    return;
  }

  const tx = await staking.setPrimaryPriceOracle(CORRECT_PRIMARY_ORACLE);
  await tx.wait();
  console.log("✅ Done. Tx:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
