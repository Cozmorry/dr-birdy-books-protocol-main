import { ethers } from "hardhat";

async function main() {
  console.log("\n🔍 Testing frontend configuration...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Frontend contract addresses
  const CONTRACT_ADDRESSES = {
    reflectiveToken: '0x705f0380F17D8B45CF2D0E4Ef9c2052316f5385f',
    flexibleTieredStaking: '0xa9c456E11403A5B222A11eE0573c8BF54227cDe4',
  };

  try {
    // Test token contract
    console.log("\n📋 Testing token contract...");
    const token = await ethers.getContractAt("ReflectiveToken", CONTRACT_ADDRESSES.reflectiveToken);
    const tokenBalance = await token.balanceOf(deployer.address);
    console.log("✅ Token balance:", ethers.formatEther(tokenBalance));

    // Test staking contract
    console.log("\n📋 Testing staking contract...");
    const staking = await ethers.getContractAt("FlexibleTieredStaking", CONTRACT_ADDRESSES.flexibleTieredStaking);
    
    // Check contract status
    const contractStatus = await staking.getContractStatus();
    console.log("✅ Contract status:", contractStatus);

    // Check oracle info
    const oracleInfo = await staking.getOracleInfo();
    console.log("✅ Oracle info:", oracleInfo);

    // Test oracle calls
    console.log("\n📋 Testing oracle calls...");
    try {
      const primaryOracle = await ethers.getContractAt("MockPriceOracle", oracleInfo.primaryOracle);
      const primaryPrice = await primaryOracle.latestAnswer();
      console.log("✅ Primary oracle price:", primaryPrice.toString());
    } catch (err: any) {
      console.log("❌ Primary oracle error:", err.message);
    }

    // Test allowance
    console.log("\n📋 Testing allowance...");
    const allowance = await token.allowance(deployer.address, CONTRACT_ADDRESSES.flexibleTieredStaking);
    console.log("✅ Current allowance:", ethers.formatEther(allowance));

    // Test a small stake
    console.log("\n📋 Testing small stake...");
    const testAmount = ethers.parseEther("1");
    
    // Approve first
    console.log("Approving 1 token...");
    const approveTx = await token.approve(CONTRACT_ADDRESSES.flexibleTieredStaking, testAmount);
    await approveTx.wait();
    console.log("✅ Approved");

    // Try to stake
    console.log("Attempting to stake 1 token...");
    try {
      const stakeTx = await staking.stake(testAmount);
      console.log("✅ Stake transaction sent:", stakeTx.hash);
      const receipt = await stakeTx.wait();
      console.log("✅ Stake confirmed:", receipt.status === 1 ? 'SUCCESS' : 'FAILED');
    } catch (err: any) {
      console.log("❌ Stake failed:", err.message);
      console.log("Error details:", err);
    }

  } catch (err: any) {
    console.error("❌ Test error:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
