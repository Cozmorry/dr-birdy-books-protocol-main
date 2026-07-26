import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const proxyAddress = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
  const [deployer] = await ethers.getSigners();
  console.log("Calling reinitializeFeesToZero with owner wallet:", deployer.address);

  const tokenAbi = [
    "function reinitializeFeesToZero() external",
    "function taxFee() view returns (uint256)",
    "function liquidityFee() view returns (uint256)",
    "function marketingFee() view returns (uint256)",
    "function totalFee() view returns (uint256)",
  ];

  const token = new ethers.Contract(proxyAddress, tokenAbi, deployer);

  console.log("Before totalFee:", (await token.totalFee()).toString());
  const tx = await token.reinitializeFeesToZero();
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ Successfully set all proxy storage fee variables to 0!");
  console.log("After taxFee:", (await token.taxFee()).toString());
  console.log("After liquidityFee:", (await token.liquidityFee()).toString());
  console.log("After marketingFee:", (await token.marketingFee()).toString());
  console.log("After totalFee:", (await token.totalFee()).toString());
}

main().catch(console.error);
