import { ethers } from "hardhat";

async function main() {
  console.log("\n🔧 Setting up localhost environment with mock oracles...");

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  // Deploy mock oracles
  console.log("\n📦 Deploying MockPriceOracle...");
  const MockOracle = await ethers.getContractFactory("MockPriceOracle");
  const primaryOracle = await MockOracle.deploy();
  await primaryOracle.waitForDeployment();
  const primaryOracleAddress = await primaryOracle.getAddress();
  console.log("✅ Primary Mock Oracle deployed to:", primaryOracleAddress);

  const backupOracle = await MockOracle.deploy();
  await backupOracle.waitForDeployment();
  const backupOracleAddress = await backupOracle.getAddress();
  console.log("✅ Backup Mock Oracle deployed to:", backupOracleAddress);

  // Set a reasonable price for testing (e.g., $2000 for ETH)
  const ethPrice = 2000 * 1e8; // $2000 * 1e8 (Chainlink format)
  await primaryOracle.setPrice(ethPrice);
  console.log("✅ Set primary oracle price to $2000");

  const btcPrice = 40000 * 1e8; // $40000 * 1e8 (Chainlink format)
  await backupOracle.setPrice(btcPrice);
  console.log("✅ Set backup oracle price to $40000");

  // Get the deployed staking contract
  const stakingAddress = "0xa9c456E11403A5B222A11eE0573c8BF54227cDe4"; // Your staking contract address
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);

  console.log("\n🔧 Updating staking contract oracles...");
  
  try {
    // Update primary oracle
    const setPrimaryTx = await staking.setPrimaryPriceOracle(primaryOracleAddress);
    await setPrimaryTx.wait();
    console.log("✅ Primary oracle updated");

    // Update backup oracle
    const setBackupTx = await staking.setBackupPriceOracle(backupOracleAddress);
    await setBackupTx.wait();
    console.log("✅ Backup oracle updated");

    // Verify the update
    const oracleInfo = await staking.getOracleInfo();
    console.log("\n📊 Oracle Info:");
    console.log("- Primary Oracle:", oracleInfo.primaryOracle);
    console.log("- Backup Oracle:", oracleInfo.backupOracle);
    console.log("- Gas Refund Reward:", ethers.formatEther(oracleInfo.currentGasRefundReward));

    console.log("\n✅ Localhost setup completed successfully!");
    console.log("You can now test staking on localhost with mock oracles.");

  } catch (err: any) {
    console.error("❌ Failed to update oracles:", err.message);
    console.log("You may need to run this script as the contract owner.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
