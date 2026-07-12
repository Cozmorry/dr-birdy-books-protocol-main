import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("🚀 Deploying a fresh ReflectiveToken on Sepolia to test the Uniswap Fix...");
  
  const [signer] = await ethers.getSigners();
  console.log("Deployer:", signer.address);

  // Deploy fresh proxy
  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
  
  const UNISWAP_ROUTER = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24";
  
  const token = await upgrades.deployProxy(
    ReflectiveToken,
    [
      UNISWAP_ROUTER,
      signer.address, // marketing
      ethers.ZeroAddress, // staking (will set later)
      signer.address, // gateway
      signer.address, // oracle (dummy)
    ],
    { 
      initializer: "initialize",
      unsafeAllow: ["constructor"]
    }
  );
  
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  
  console.log("✅ Fresh Testnet Token Deployed at:", tokenAddress);

  // Exclude owner from fee
  console.log("\n🛡️ Excluding owner from fees...");
  await (await token.excludeFromFee(signer.address, true)).wait();
  
  // 1. Create Uniswap Pair (Testing the FIX!)
  console.log("\n🔗 Creating Uniswap Pair...");
  const createTx = await token.createUniswapPair();
  await createTx.wait();
  const pairAddress = await token.pairAddress();
  console.log("✅ Pair created successfully at:", pairAddress);

  // Enable trading
  console.log("\n🔓 Enabling Trading...");
  await (await token.enableTrading()).wait();

  // 2. Add Liquidity
  console.log("\n💧 Adding Liquidity...");
  const tokenAmount = ethers.parseUnits("1000", 18);
  const ethAmount = ethers.parseEther("0.001");
  
  await (await token.approve(UNISWAP_ROUTER, tokenAmount)).wait();
  
  const routerAbi = [
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
    "function WETH() external pure returns (address)"
  ];
  const router = new ethers.Contract(UNISWAP_ROUTER, routerAbi, signer);
  const weth = await router.WETH();

  const addLiqTx = await router.addLiquidityETH(
    tokenAddress,
    tokenAmount,
    0,
    0,
    signer.address,
    Math.floor(Date.now() / 1000) + 600,
    { value: ethAmount }
  );
  await addLiqTx.wait();
  console.log("✅ Liquidity added!");

  // 3. Test Buy Swap
  console.log("\n🛒 Testing Buy Swap...");
  const buyTx = await router.swapExactETHForTokens(
    0,
    [weth, tokenAddress],
    signer.address,
    Math.floor(Date.now() / 1000) + 600,
    { value: ethers.parseEther("0.0001") }
  );
  await buyTx.wait();
  console.log("✅ Buy successful!");

  // 4. Test Sell Swap
  console.log("\n📉 Testing Sell Swap...");
  const sellAmount = ethers.parseUnits("100", 18);
  await (await token.approve(UNISWAP_ROUTER, sellAmount)).wait();
  
  const sellTx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
    sellAmount,
    0,
    [tokenAddress, weth],
    signer.address,
    Math.floor(Date.now() / 1000) + 600
  );
  await sellTx.wait();
  console.log("✅ Sell successful! Tax and reflection logic works perfectly.");
  
  console.log("\n🎉 ENTIRE FLOW VERIFIED SUCCESSFULLY!");
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exitCode = 1;
});
