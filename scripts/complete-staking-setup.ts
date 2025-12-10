import { ethers } from "hardhat";

/**
 * Complete setup for new staking contract
 * - Register with token contract
 * - Set price oracles
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("⚙️ Complete setup for new staking contract...\n");

  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STAKING_ADDRESS = "0x8ce28F9a9A6341E44B056F75a58d8a582595DC83";

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", STAKING_ADDRESS);

  console.log("📋 Contract Addresses:");
  console.log("   Token:", TOKEN_ADDRESS);
  console.log("   Staking:", STAKING_ADDRESS);
  console.log("");

  // Step 1: Register staking contract with token
  console.log("1️⃣ Registering staking contract with token...");
  try {
    const tx1 = await token.setStakingContract(STAKING_ADDRESS);
    await tx1.wait();
    console.log("   ✅ Staking contract registered with token");
  } catch (error: any) {
    console.log("   ⚠️ Error or already set:", error.message.substring(0, 100));
  }

  // Verify
  const registeredStaking = await token.stakingContract();
  console.log("   Registered staking contract:", registeredStaking);
  console.log("");

  // Step 2: Exclude staking contract from fees
  console.log("2️⃣ Excluding staking contract from fees...");
  try {
    const tx2 = await token.excludeFromFee(STAKING_ADDRESS);
    await tx2.wait();
    console.log("   ✅ Staking contract excluded from fees");
  } catch (error: any) {
    console.log("   ⚠️ Error or already excluded:", error.message.substring(0, 100));
  }

  // Step 3: Check price oracle
  console.log("\n3️⃣ Checking price oracles...");
  const primaryOracle = await staking.primaryPriceOracle();
  const backupOracle = await staking.backupPriceOracle();
  console.log("   Primary Oracle:", primaryOracle);
  console.log("   Backup Oracle:", backupOracle);

  console.log("\n✅ Setup complete!");
  console.log("   You can now stake tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

