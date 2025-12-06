import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

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

  // Check Joseph's state
  const josephAddress = "0x4d8b10e7d6bff54c8c1c1c42240c74e173c5f8ed";
  try {
    const josephExcluded = await token.isExcludedFromFee(josephAddress);
    console.log("🎯 Joseph's State:");
    console.log("   Excluded from fees:", josephExcluded);
    
    const josephReflection = await token.debugReflection(josephAddress);
    console.log("   _tOwned:", ethers.formatEther(josephReflection.tOwned));
    console.log("   _rOwned:", josephReflection.rOwned.toString());
    console.log("   balanceOf:", ethers.formatEther(await token.balanceOf(josephAddress)));
    console.log("");
  } catch (error: any) {
    console.log("⚠️  Could not read Joseph's state:", error.message, "\n");
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

