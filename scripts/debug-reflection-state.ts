import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";
const { DEPLOYMENT_CONFIG } = require("./config");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Debugging reflection token state...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = contractAddresses.reflectiveToken;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("📋 Token Address:", tokenAddress);
  console.log("👤 Your Address:", deployer.address);
  console.log("");

  // Check reflection state
  try {
    const reflectionRate = await token.debugReflectionRate();
    console.log("🔄 Reflection State:");
    console.log("   rTotal:", reflectionRate.rTotal.toString());
    console.log("   tTotal:", reflectionRate.tTotal.toString());
    console.log("   Current Rate:", reflectionRate.currentRate.toString());
    console.log("");
  } catch (error) {
    console.log("⚠️  Could not read reflection rate\n");
  }

  // Check if excluded
  try {
    const isExcluded = await token.isExcludedFromFee(deployer.address);
    console.log("🔒 Fee Exclusion Status:");
    console.log("   Your address is excluded from fees:", isExcluded);
    console.log("");
  } catch (error) {
    console.log("⚠️  Could not check exclusion status\n");
  }

  // Check debug reflection for your address
  try {
    const yourReflection = await token.debugReflection(deployer.address);
    console.log("💰 Your Reflection State:");
    console.log("   _tOwned:", ethers.formatEther(yourReflection.tOwned));
    console.log("   _rOwned:", yourReflection.rOwned.toString());
    console.log("   balanceOf:", ethers.formatEther(await token.balanceOf(deployer.address)));
    console.log("");
  } catch (error: any) {
    console.log("⚠️  Could not read reflection state:", error.message, "\n");
  }

  // Check Team Member 1's state (example)
  const teamMember1Address = DEPLOYMENT_CONFIG.TEAM_WALLETS.J;
  try {
    const teamMember1Excluded = await token.isExcludedFromFee(teamMember1Address);
    console.log("🎯 Team Member 1 (J) State:");
    console.log("   Excluded from fees:", teamMember1Excluded);
    
    const teamMember1Reflection = await token.debugReflection(teamMember1Address);
    console.log("   _tOwned:", ethers.formatEther(teamMember1Reflection.tOwned));
    console.log("   _rOwned:", teamMember1Reflection.rOwned.toString());
    console.log("   balanceOf:", ethers.formatEther(await token.balanceOf(teamMember1Address)));
    console.log("");
  } catch (error: any) {
    console.log("⚠️  Could not read Team Member 1's state:", error.message, "\n");
  }

  // Check total supply and fees
  const totalSupply = await token.totalSupply();
  console.log("📊 Supply Info:");
  console.log("   Total Supply:", ethers.formatEther(totalSupply));
  
  try {
    const totalFees = await token.totalFees();
    console.log("   Total Fees:", ethers.formatEther(totalFees));
  } catch (error) {
    console.log("   Total Fees: (could not read)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

