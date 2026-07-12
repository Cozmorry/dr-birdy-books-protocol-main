import { ethers } from "hardhat";

/**
 * Script to test Uniswap swapping compatibility.
 * 
 * This script will:
 * 1. Buy tokens with a small amount of ETH.
 * 2. Sell a small amount of tokens for ETH.
 * 
 * It uses swapExactTokensForETHSupportingFeeOnTransferTokens
 * which is critical for deflationary tokens.
 * 
 * Usage:
 * npx hardhat run scripts/test-uniswap-swap.ts --network localhost
 */

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing Uniswap compatibility with account:", signer.address);
  
  const network = await signer.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");

  let tokenAddress = process.env.TOKEN_ADDRESS;
  const chainId = Number(network.chainId);
  if (!tokenAddress) {
    if (chainId === 31337) { // Localhost
      tokenAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
    } else if (chainId === 84532) { // Base Sepolia
      tokenAddress = "0xB49872C1aD8a052f1369ABDfC890264938647EB6";
    } else if (chainId === 8453) { // Base Mainnet
      tokenAddress = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
    } else {
      throw new Error("TOKEN_ADDRESS not set in env, and network not recognized.");
    }
  }

  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
  const token = ReflectiveToken.attach(tokenAddress).connect(signer);
  
  const routerAddress = await token.uniswapRouter();
  let pairAddress = await token.pairAddress();
  
  if (!routerAddress || routerAddress === ethers.ZeroAddress) {
    throw new Error("Uniswap router not set in contract");
  }
  if (!pairAddress || pairAddress === ethers.ZeroAddress) {
    console.log("Uniswap pair not set. Creating it now...");
    const createTx = await token.createUniswapPair();
    await createTx.wait();
    pairAddress = await token.pairAddress();
    console.log("✅ Created Uniswap pair at:", pairAddress);
  }

  const tradingEnabled = await token.tradingEnabled();
  if (!tradingEnabled) {
    console.log("Trading is disabled. Enabling trading now...");
    const tx = await token.enableTrading();
    await tx.wait();
    console.log("✅ Trading enabled.");
  }

  const routerAbi = [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    "function WETH() external pure returns (address)"
  ];
  const router = new ethers.Contract(routerAddress, routerAbi, signer);
  const weth = await router.WETH();

  // Test Buy
  const buyAmountEth = ethers.parseEther("0.001");
  console.log(`\n1. Buying tokens with ${ethers.formatEther(buyAmountEth)} ETH...`);
  try {
    const buyTx = await router.swapExactETHForTokens(
      0, // accept any amount of tokens
      [weth, tokenAddress],
      signer.address,
      Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes
      { value: buyAmountEth }
    );
    await buyTx.wait();
    console.log("✅ Buy successful!");
  } catch (error: any) {
    console.error("❌ Buy failed:", error.reason || error.message);
  }

  // Test Sell
  const sellAmountTokens = ethers.parseUnits("100", 18); 
  const tokenBalance = await token.balanceOf(signer.address);
  
  if (tokenBalance >= sellAmountTokens) {
    console.log(`\n2. Selling ${ethers.formatUnits(sellAmountTokens, 18)} tokens...`);
    
    // Approve router
    const approveTx = await token.approve(routerAddress, sellAmountTokens);
    await approveTx.wait();
    console.log("   Approved router to spend tokens.");

    try {
      const sellTx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        sellAmountTokens,
        0, // accept any amount of ETH
        [tokenAddress, weth],
        signer.address,
        Math.floor(Date.now() / 1000) + 60 * 10 // 10 minutes
      );
      await sellTx.wait();
      console.log("✅ Sell successful! Reflection mechanics and taxes are working.");
    } catch (error: any) {
      console.error("❌ Sell failed:", error.reason || error.message);
    }
  } else {
    console.log(`\n⚠️ Not enough tokens to test sell. You need at least 100 tokens, but have ${ethers.formatUnits(tokenBalance, 18)}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
