import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

/**
 * Complete initialization script for all contracts
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Initializing contracts with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const tokenAddress = contractAddresses.reflectiveToken;
  const distributionAddress = contractAddresses.tokenDistribution;
  const stakingAddress = contractAddresses.flexibleTieredStaking;

  console.log("📋 Contract Addresses:");
  console.log("Token:", tokenAddress);
  console.log("Distribution:", distributionAddress);
  console.log("Staking:", stakingAddress);
  console.log("");

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const distribution = await ethers.getContractAt("TokenDistribution", distributionAddress);

  // ========================================
  // STEP 1: Initialize TokenDistribution Contract
  // ========================================
  console.log("=".repeat(60));
  console.log("STEP 1: Initialize TokenDistribution Contract");
  console.log("=".repeat(60));

  try {
    const owner = await distribution.owner();
    if (owner === ethers.ZeroAddress) {
      console.log("Initializing TokenDistribution...");
      
      const dsignAddress = DEPLOYMENT_CONFIG.TEAM_WALLETS.DSIGN === "0x0000000000000000000000000000000000000000" 
        ? deployer.address 
        : DEPLOYMENT_CONFIG.TEAM_WALLETS.DSIGN;

      const initTx = await distribution.initialize(
        tokenAddress,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.JOSEPH,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.AJ,
        dsignAddress,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.DEVELOPER,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.BIRDY,
        DEPLOYMENT_CONFIG.TEAM_WALLETS.AIRDROP
      );
      await initTx.wait();
      console.log("✅ TokenDistribution initialized!");
    } else {
      console.log("✅ TokenDistribution already initialized");
      console.log("   Owner:", owner);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return;
  }

  // ========================================
  // STEP 2: Check Token Balances
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Check Token Balances");
  console.log("=".repeat(60));

  const deployerBalance = await token.balanceOf(deployer.address);
  const tokenContractBalance = await token.balanceOf(tokenAddress);
  const distributionBalance = await token.balanceOf(distributionAddress);
  const stakingBalance = await token.balanceOf(stakingAddress);

  console.log("Deployer:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("Token Contract:", ethers.formatEther(tokenContractBalance), "DBBPT");
  console.log("Distribution Contract:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("Staking Contract:", ethers.formatEther(stakingBalance), "DBBPT");

  console.log("\n✅ All initialization complete!");
  console.log("\n📝 Summary:");
  console.log("- TokenDistribution: Initialized ✅");
  console.log("- Total Supply:", ethers.formatEther(await token.totalSupply()), "DBBPT");
  console.log("- Deployer has:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("\n💡 Next Steps:");
  console.log("1. Users can now stake tokens via the frontend");
  console.log("2. Test unstaking after 24 hours (minimum staking duration)");
  console.log("3. Token distribution/vesting can be set up separately if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Initialization failed:");
    console.error(error);
    process.exit(1);
  });

