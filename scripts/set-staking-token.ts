import { ethers } from "hardhat";

/**
 * Configure the new staking contract
 * Sets the staking token address
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("⚙️ Configuring new staking contract...\n");

  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";

  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("Setting staking token to:", TOKEN_ADDRESS);
  const tx = await staking.setStakingToken(TOKEN_ADDRESS);
  await tx.wait();
  console.log("✅ Staking token set!");

  const stakingToken = await staking.stakingToken();
  console.log("Verified staking token:", stakingToken);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

