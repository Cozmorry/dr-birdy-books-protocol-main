/**
 * Verify that app config and on-chain state match for the staking cutover.
 * Run: npx hardhat run scripts/verify-staking-cutover.ts --network mainnet
 */
import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

const BASE_MAINNET_CHAIN_ID = 8453;
const EXPECTED_STAKING = "0x0106CbC32f3C10f68c4b58009D7054b31B99c264";

async function main() {
  console.log("\n🔍 Verifying staking cutover (app config vs on-chain)...\n");

  const addresses = getContractAddresses(BASE_MAINNET_CHAIN_ID);
  const configStaking = addresses.flexibleTieredStaking;
  const tokenAddress = addresses.reflectiveToken;

  if (!configStaking || !tokenAddress) {
    throw new Error("Missing token or staking address in config");
  }

  console.log("1. App config (frontend/src/config/networks.ts):");
  console.log("   flexibleTieredStaking:", configStaking);
  const configMatch = configStaking.toLowerCase() === EXPECTED_STAKING.toLowerCase();
  console.log("   Matches expected new staking:", configMatch ? "✅" : "❌");

  const token = await ethers.getContractAt(
    "ReflectiveToken",
    tokenAddress
  );
  const onChainStaking = await token.stakingContract();
  console.log("\n2. On-chain (ReflectiveToken.stakingContract()):");
  console.log("   ", onChainStaking);
  const chainMatch = onChainStaking.toLowerCase() === EXPECTED_STAKING.toLowerCase();
  console.log("   Matches expected new staking:", chainMatch ? "✅" : "❌");

  const stakingAbi = [
    "function getContractStatus() view returns (bool, bool, bool, bool, uint256)",
    "function getTotalStaked() view returns (uint256)",
    "function stakingToken() view returns (address)",
  ];
  const staking = await ethers.getContractAt(stakingAbi, configStaking);
  const [status] = await staking.getContractStatus();
  const totalStaked = await staking.getTotalStaked();
  const stakingToken = await staking.stakingToken();
  console.log("\n3. New staking contract (read calls):");
  console.log("   getContractStatus (initialized):", status);
  console.log("   getTotalStaked():", ethers.formatEther(totalStaked), "tokens");
  console.log("   stakingToken():", stakingToken);
  const tokenMatch = stakingToken.toLowerCase() === tokenAddress.toLowerCase();
  console.log("   stakingToken === reflectiveToken:", tokenMatch ? "✅" : "❌");

  const configAndChainAligned = configStaking.toLowerCase() === onChainStaking.toLowerCase();
  console.log("\n--- Summary ---");
  console.log("App config uses new staking:", configMatch ? "✅" : "❌");
  console.log("Token points to new staking:", chainMatch ? "✅" : "❌");
  console.log("Config and on-chain aligned:", configAndChainAligned ? "✅" : "❌");
  console.log("New staking wired to token:", tokenMatch ? "✅" : "❌");
  if (configMatch && chainMatch && configAndChainAligned && tokenMatch) {
    console.log("\n✅ Updates are effective in the app.\n");
  } else {
    console.log("\n⚠️ Some checks failed. Review above.\n");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
