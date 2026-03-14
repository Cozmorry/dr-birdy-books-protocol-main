import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

const NEW_STAKING = "0x0106CbC32f3C10f68c4b58009D7054b31B99c264";
const BASE_MAINNET_CHAIN_ID = 8453;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Caller:", signer.address);

  const addresses = getContractAddresses(BASE_MAINNET_CHAIN_ID);
  const tokenAddress = addresses.reflectiveToken;
  if (!tokenAddress) throw new Error("No token address for Base mainnet");

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const current = await token.stakingContract();
  console.log("Current staking:", current);
  if (current.toLowerCase() === NEW_STAKING.toLowerCase()) {
    console.log("Already set to new staking. Done.");
    return;
  }

  console.log("Setting staking to:", NEW_STAKING);
  const tx = await token.setStakingContract(NEW_STAKING);
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Done. New staking:", await token.stakingContract());
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
