import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

/**
 * Script to add liquidity to Uniswap
 * 
 * This script helps add initial liquidity when tokens are in a different wallet.
 * 
 * Usage:
 * 1. If tokens are in your wallet: Run this script directly
 * 2. If tokens are in another wallet: Have them transfer tokens to you first, then run
 * 3. Or: Have them run this script with their wallet
 * 
 * Network: Set in hardhat.config.ts or use --network flag
 */

const UNISWAP_ROUTER_V2 = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24"; // Base Uniswap V2 Router
const WETH = "0x4200000000000000000000000000000000000006"; // Base WETH

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Adding liquidity with account:", signer.address);
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
  console.log("   Uniswap Router:", UNISWAP_ROUTER_V2);
  console.log("   WETH Address:", WETH);

  // Get token contract
  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const tokenSymbol = await token.symbol();
  const tokenDecimals = await token.decimals();
  
  console.log("\n📊 Token Info:");
  console.log("   Symbol:", tokenSymbol);
  console.log("   Decimals:", tokenDecimals);
  
  // Check token balance
  const tokenBalance = await token.balanceOf(signer.address);
  console.log("   Your Balance:", ethers.formatUnits(tokenBalance, tokenDecimals), tokenSymbol);

  // Get Uniswap Router (using the same interface as the token contract)
  const routerAbi = [
    "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
    "function factory() external pure returns (address)",
    "function WETH() external pure returns (address)"
  ];
  const router = new ethers.Contract(UNISWAP_ROUTER_V2, routerAbi, signer);

  // Prompt for amounts (you can modify these values)
  const TOKEN_AMOUNT = ethers.parseUnits("100000", tokenDecimals); // 100k tokens (adjust as needed)
  const ETH_AMOUNT = ethers.parseEther("1.0"); // 1 ETH (adjust as needed)

  console.log("\n💰 Liquidity to Add:");
  console.log("   Token Amount:", ethers.formatUnits(TOKEN_AMOUNT, tokenDecimals), tokenSymbol);
  console.log("   ETH Amount:", ethers.formatEther(ETH_AMOUNT), "ETH");

  // Check balances
  const ethBalance = await signer.provider.getBalance(signer.address);
  if (tokenBalance < TOKEN_AMOUNT) {
    throw new Error(`Insufficient token balance. Need ${ethers.formatUnits(TOKEN_AMOUNT, tokenDecimals)} ${tokenSymbol}, have ${ethers.formatUnits(tokenBalance, tokenDecimals)}`);
  }
  if (ethBalance < ETH_AMOUNT) {
    throw new Error(`Insufficient ETH balance. Need ${ethers.formatEther(ETH_AMOUNT)} ETH, have ${ethers.formatEther(ethBalance)}`);
  }

  console.log("\n✅ Balances sufficient");

  // Approve tokens
  console.log("\n🔐 Approving tokens...");
  const approveTx = await token.approve(UNISWAP_ROUTER_V2, TOKEN_AMOUNT);
  console.log("   Transaction hash:", approveTx.hash);
  await approveTx.wait();
  console.log("   ✅ Tokens approved");

  // Calculate minimum amounts (with 1% slippage tolerance)
  const minTokenAmount = (TOKEN_AMOUNT * 99n) / 100n;
  const minETHAmount = (ETH_AMOUNT * 99n) / 100n;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

  console.log("\n💧 Adding liquidity...");
  console.log("   Min Token Amount:", ethers.formatUnits(minTokenAmount, tokenDecimals));
  console.log("   Min ETH Amount:", ethers.formatEther(minETHAmount));
  console.log("   Deadline:", new Date(deadline * 1000).toISOString());

  try {
    const addLiquidityTx = await router.addLiquidityETH(
      tokenAddress,
      TOKEN_AMOUNT,
      minTokenAmount,
      minETHAmount,
      signer.address, // LP tokens go to you
      deadline,
      { value: ETH_AMOUNT }
    );

    console.log("   Transaction hash:", addLiquidityTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await addLiquidityTx.wait();
    console.log("   ✅ Liquidity added successfully!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Parse events to get LP token amount
    const liquidityEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = router.interface.parseLog(log);
        return parsed && parsed.name === "Transfer";
      } catch {
        return false;
      }
    });

    if (liquidityEvent) {
      console.log("\n📈 Liquidity Pool Tokens (LP) received!");
      console.log("   Check your wallet for Uniswap V2 LP tokens");
    }

  } catch (error: any) {
    console.error("\n❌ Error adding liquidity:", error.message);
    if (error.message.includes("insufficient")) {
      console.error("   Check your token and ETH balances");
    } else if (error.message.includes("slippage")) {
      console.error("   Try increasing slippage tolerance or adjusting amounts");
    }
    throw error;
  }

  console.log("\n✅ Liquidity addition complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Verify the pair was created/updated on Uniswap");
  console.log("   2. Check that the token contract has the correct pair address");
  console.log("   3. If pair address is not set, owner should call token.setUniswapPair()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

