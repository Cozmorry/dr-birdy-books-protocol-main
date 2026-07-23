import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const proxyAddress = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
  const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(alchemyUrl);
  const pairAddr = "0x9b5deC19274897852976863C6726B404c87840e7";
  const routerAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
  const WETH = "0x4200000000000000000000000000000000000006";

  // Check pair reserves
  const pairAbi = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
  ];
  const pair = new ethers.Contract(pairAddr, pairAbi, provider);
  const reserves = await pair.getReserves();
  const token0 = await pair.token0();
  const token1 = await pair.token1();
  console.log("token0:", token0);
  console.log("token1:", token1);
  console.log("reserve0:", reserves[0].toString());
  console.log("reserve1:", reserves[1].toString());

  // Check actual balances
  const tokenAbi = ["function balanceOf(address) view returns (uint256)"];
  const token = new ethers.Contract(proxyAddress, tokenAbi, provider);
  const weth = new ethers.Contract(WETH, tokenAbi, provider);
  const pairTokenBal = await token.balanceOf(pairAddr);
  const pairWethBal = await weth.balanceOf(pairAddr);
  console.log("\nActual pair DBBPT balance:", pairTokenBal.toString());
  console.log("Actual pair WETH balance:", pairWethBal.toString());

  // Compare to reserves
  const isToken0DBBPT = token0.toLowerCase() === proxyAddress.toLowerCase();
  const dbbptReserve = isToken0DBBPT ? reserves[0] : reserves[1];
  const wethReserve = isToken0DBBPT ? reserves[1] : reserves[0];
  console.log("\nDDBPT reserve in pair:", dbbptReserve.toString());
  console.log("WETH reserve in pair:", wethReserve.toString());
  console.log("\n⚠️  DBBPT balance > reserve?", pairTokenBal > dbbptReserve ? "YES - balance exceeds reserve (fees accumulated)" : "NO");
  
  // The issue: if actual DBBPT balance < reserve, the pair won't be able to send out tokens
  // because it sends based on reserve but balanceOf will be less  
  console.log("\nIf actual < reserve, pair will undershoot and UniswapV2 will see negative balance change → REVERT");
  const deficit = BigInt(dbbptReserve.toString()) - BigInt(pairTokenBal.toString());
  console.log("Deficit (reserve - actual):", deficit.toString());
  if (deficit > 0n) {
    console.log("❌ CONFIRMED BUG: reserves > actual balance! Fee deductions caused the pair to have fewer tokens than its recorded reserve.");
  }
}

main().catch(console.error);
