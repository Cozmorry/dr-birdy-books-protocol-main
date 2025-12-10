import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Script to transfer tokens to the contract owner
 * 
 * This script transfers tokens from your wallet to the owner's wallet
 * so they can add liquidity via Uniswap GUI.
 * 
 * Usage:
 * 1. Set OWNER_ADDRESS below to the owner's wallet address
 * 2. Set TOKEN_AMOUNT to the amount you want to transfer (default: 8M tokens)
 * 3. Run: npx hardhat run scripts/transfer-tokens-to-owner.ts --network mainnet
 */

// Owner's wallet address
const OWNER_ADDRESS = "0x27799bb35820ecb2814ac2484ba34ad91bbda198";

// Amount to transfer (8M tokens = 8,000,000)
const TOKEN_AMOUNT = ethers.parseUnits("8000000", 18); // 8M tokens with 18 decimals

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Transferring tokens from:", signer.address);
  
  // Validate owner address
  if (OWNER_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("⚠️  Please set OWNER_ADDRESS in the script!");
  }
  
  if (!ethers.isAddress(OWNER_ADDRESS)) {
    throw new Error("⚠️  Invalid owner address!");
  }

  console.log("Transferring tokens to:", OWNER_ADDRESS);
  console.log("Network:", await signer.provider.getNetwork());

  // Get contract addresses for current network
  const network = await signer.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);
  
  const tokenAddress = contractAddresses.reflectiveToken;
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    throw new Error(`Token not deployed on chain ${chainId}`);
  }

  console.log("\n📋 Configuration:");
  console.log("   Token Address:", tokenAddress);
  console.log("   Amount to Transfer:", ethers.formatUnits(TOKEN_AMOUNT, 18), "tokens");

  // Get token contract
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const tokenSymbol = await token.symbol();
  const tokenDecimals = await token.decimals();
  
  console.log("\n📊 Token Info:");
  console.log("   Symbol:", tokenSymbol);
  console.log("   Decimals:", tokenDecimals);
  
  // Check your token balance
  const yourBalance = await token.balanceOf(signer.address);
  console.log("   Your Balance:", ethers.formatUnits(yourBalance, tokenDecimals), tokenSymbol);

  // Check owner's current balance
  const ownerBalance = await token.balanceOf(OWNER_ADDRESS);
  console.log("   Owner's Current Balance:", ethers.formatUnits(ownerBalance, tokenDecimals), tokenSymbol);

  // Validate balance
  if (yourBalance < TOKEN_AMOUNT) {
    throw new Error(
      `❌ Insufficient balance! You have ${ethers.formatUnits(yourBalance, tokenDecimals)} ${tokenSymbol}, ` +
      `but trying to transfer ${ethers.formatUnits(TOKEN_AMOUNT, tokenDecimals)} ${tokenSymbol}`
    );
  }

  console.log("\n✅ Balance check passed");

  // Confirm before proceeding
  console.log("\n⚠️  About to transfer:");
  console.log(`   ${ethers.formatUnits(TOKEN_AMOUNT, tokenDecimals)} ${tokenSymbol}`);
  console.log(`   From: ${signer.address}`);
  console.log(`   To: ${OWNER_ADDRESS}`);
  console.log("\n   This will be executed in 5 seconds...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Transfer tokens
  console.log("\n📤 Transferring tokens...");
  try {
    const transferTx = await token.transfer(OWNER_ADDRESS, TOKEN_AMOUNT);
    console.log("   Transaction hash:", transferTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await transferTx.wait();
    console.log("   ✅ Transfer successful!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Verify transfer
    const newOwnerBalance = await token.balanceOf(OWNER_ADDRESS);
    const newYourBalance = await token.balanceOf(signer.address);
    
    console.log("\n📊 Updated Balances:");
    console.log("   Your Balance:", ethers.formatUnits(newYourBalance, tokenDecimals), tokenSymbol);
    console.log("   Owner's Balance:", ethers.formatUnits(newOwnerBalance, tokenDecimals), tokenSymbol);

    console.log("\n✅ Transfer complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Owner can now add liquidity via Uniswap GUI");
    console.log("   2. Go to: https://app.uniswap.org/");
    console.log("   3. Navigate to Pool → Add Liquidity");
    console.log("   4. Select token:", tokenAddress);
    console.log("   5. Select WETH as the other token");
    console.log("   6. Add liquidity with tokens + ETH");

  } catch (error: any) {
    console.error("\n❌ Transfer failed:", error.message);
    
    if (error.message.includes("insufficient")) {
      console.error("   Check your token balance");
    } else if (error.message.includes("blacklist") || error.message.includes("blacklisted")) {
      console.error("   Your address might be blacklisted. Contact the contract owner.");
    } else if (error.message.includes("trading") || error.message.includes("disabled")) {
      console.error("   Trading might be disabled. Contact the contract owner.");
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

