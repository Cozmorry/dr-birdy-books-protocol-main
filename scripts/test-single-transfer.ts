import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🧪 Testing direct token transfer to Joseph...\n");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = contractAddresses.reflectiveToken;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  const josephAddress = "0x4d8b10e7d6bff54c8c1c1c42240c74e173c5f8ed";
  const testAmount = ethers.parseEther("1000"); // Just 1000 tokens for testing

  console.log("📋 Token Address:", tokenAddress);
  console.log("👤 Your Address:", deployer.address);
  console.log("🎯 Target (Joseph):", josephAddress);
  console.log("💰 Amount:", ethers.formatEther(testAmount), "DBBPT\n");

  // Check before
  const yourBalanceBefore = await token.balanceOf(deployer.address);
  const josephBalanceBefore = await token.balanceOf(josephAddress);
  console.log("Before Transfer:");
  console.log("   Your balance:", ethers.formatEther(yourBalanceBefore));
  console.log("   Joseph balance:", ethers.formatEther(josephBalanceBefore));
  console.log("");

  try {
    // Try the transfer with more details
    console.log("Attempting transfer...");
    const tx = await token.transfer(josephAddress, testAmount);
    console.log("✅ Transaction sent! Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Gas used:", receipt?.gasUsed.toString());
    console.log("");

    // Check after
    const yourBalanceAfter = await token.balanceOf(deployer.address);
    const josephBalanceAfter = await token.balanceOf(josephAddress);
    console.log("After Transfer:");
    console.log("   Your balance:", ethers.formatEther(yourBalanceAfter));
    console.log("   Joseph balance:", ethers.formatEther(josephBalanceAfter));
  } catch (error: any) {
    console.log("❌ Transfer failed!");
    console.log("\nError details:");
    console.log("   Message:", error.message);
    
    if (error.data) {
      console.log("   Data:", error.data);
    }
    if (error.reason) {
      console.log("   Reason:", error.reason);
    }
    
    // Try to get more details
    try {
      // Estimate gas to see if that gives us more info
      const gasEstimate = await token.transfer.estimateGas(josephAddress, testAmount);
      console.log("\n   Gas estimate succeeded:", gasEstimate.toString());
    } catch (estimateError: any) {
      console.log("\n   Gas estimation also failed:");
      console.log("   Reason:", estimateError.reason || estimateError.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Script error:", error);
    process.exit(1);
  });

