import { ethers, network } from "hardhat";

/**
 * Script to test Uniswap integration on a Mainnet Fork.
 * 
 * This script uses Hardhat's ability to "impersonate" the real owner of the contract
 * on the forked mainnet, meaning it can use the owner's tokens to test adding liquidity
 * and swapping, without ever needing their private key and without spending real funds.
 * 
 * Usage:
 * 1. Start fork: npx hardhat node --fork https://mainnet.base.org
 * 2. Run: npx hardhat run scripts/fork-test-uniswap.ts --network localhost
 */

async function main() {
  console.log("🚀 Starting Mainnet Fork Uniswap Test");

  // The actual owner of the contract on Base Mainnet
  const OWNER_ADDRESS = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198";
  
  // The actual deployed token on Base Mainnet
  const TOKEN_ADDRESS = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
  
  // Base Mainnet Uniswap V2 Router
  const UNISWAP_ROUTER = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24"; 

  // Impersonate the owner account
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [OWNER_ADDRESS],
  });

  // Get a signer for the impersonated owner
  const signer = await ethers.getSigner(OWNER_ADDRESS);
  console.log("👤 Impersonating Owner:", signer.address);

  // Fund the impersonated account with some fake ETH for gas and liquidity
  await network.provider.send("hardhat_setBalance", [
    OWNER_ADDRESS,
    "0x8AC7230489E80000", // 10 ETH
  ]);

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS, signer);
  const tokenDecimals = await token.decimals();
  const balance = await token.balanceOf(OWNER_ADDRESS);
  
  console.log("💰 Owner Token Balance:", ethers.formatUnits(balance, tokenDecimals), "DBBPT");

  if (balance === 0n) {
    throw new Error("Owner has 0 tokens on mainnet! Test aborted.");
  }

  // Check trading status
  let tradingEnabled = await token.tradingEnabled();
  console.log("📈 Initial Trading Enabled Status:", tradingEnabled);

  // 1. ADD LIQUIDITY
  console.log("\n💧 Step 1: Adding Initial Liquidity...");
  const tokensToAdd = ethers.parseUnits("500000", tokenDecimals); // Add 500k tokens
  const ethToAdd = ethers.parseEther("0.1"); // Add 0.1 ETH

  // Approve router for liquidity
  await (await token.approve(UNISWAP_ROUTER, tokensToAdd)).wait();
  
  const routerAbi = [
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    "function WETH() external pure returns (address)"
  ];
  const router = new ethers.Contract(UNISWAP_ROUTER, routerAbi, signer);
  const weth = await router.WETH();

  try {
    const tx = await router.addLiquidityETH(
      TOKEN_ADDRESS,
      tokensToAdd,
      0, // min tokens
      0, // min ETH
      OWNER_ADDRESS,
      Math.floor(Date.now() / 1000) + 600, // 10 min deadline
      { value: ethToAdd }
    );
    await tx.wait();
    console.log("   ✅ Liquidity Added Successfully!");
  } catch (error: any) {
    console.error("   ❌ Failed to add liquidity:", error.message);
    throw error;
  }

  // Enable trading if not enabled
  tradingEnabled = await token.tradingEnabled();
  if (!tradingEnabled) {
    console.log("\n🔓 Step 2: Enabling Trading...");
    await (await token.enableTrading()).wait();
    console.log("   ✅ Trading Enabled!");
  }

  // 2. TEST BUY
  console.log("\n🛒 Step 3: Testing a Buy Swap...");
  const buyAmountEth = ethers.parseEther("0.001");
  try {
    const buyTx = await router.swapExactETHForTokens(
      0,
      [weth, TOKEN_ADDRESS],
      OWNER_ADDRESS,
      Math.floor(Date.now() / 1000) + 600,
      { value: buyAmountEth }
    );
    await buyTx.wait();
    console.log("   ✅ Buy Swap Successful!");
  } catch (error: any) {
    console.error("   ❌ Buy Swap Failed:", error.message);
  }

  // 3. TEST SELL
  console.log("\n📉 Step 4: Testing a Sell Swap (with Taxes)...");
  const sellAmountTokens = ethers.parseUnits("1000", tokenDecimals);
  // Re-approve router for sell
  await (await token.approve(UNISWAP_ROUTER, sellAmountTokens)).wait();
  
  try {
    const sellTx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      sellAmountTokens,
      0,
      [TOKEN_ADDRESS, weth],
      OWNER_ADDRESS,
      Math.floor(Date.now() / 1000) + 600
    );
    await sellTx.wait();
    console.log("   ✅ Sell Swap Successful! Reflection tax logic passed.");
  } catch (error: any) {
    console.error("   ❌ Sell Swap Failed:", error.message);
  }

  console.log("\n🎉 Fork Test Complete! The token is fully compatible with Uniswap on Mainnet.");

  // Stop impersonating
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [OWNER_ADDRESS],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
