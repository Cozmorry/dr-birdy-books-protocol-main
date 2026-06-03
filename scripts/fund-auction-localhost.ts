/**
 * @title Fund Auction with DBBPT Tokens
 * @notice Transfers DBBPT tokens from deployer to auction contract
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n💰 Funding Auction with DBBPT");
  console.log("==============================");
  console.log("Deployer:", deployer.address);

  // Load deployment addresses
  const auctionDeployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "deployments", "localhost-auction-latest.json"),
      "utf8"
    )
  );

  const localhostDeployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "deployments", "localhost-latest.json"),
      "utf8"
    )
  );

  const auctionAddress = auctionDeployment.auction;
  const tokenAddress = localhostDeployment.reflectiveToken;

  console.log("Token Address:", tokenAddress);
  console.log("Auction Address:", auctionAddress);

  // Amount to fund
  const fundAmount = ethers.parseEther("1500000"); // 1.5M DBBPT

  // Get the token implementation ABI
  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");
  const token = ReflectiveToken.attach(tokenAddress);

  // Check deployer balance
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("\nDeployer DBBPT Balance:", ethers.formatEther(deployerBalance));

  if (deployerBalance < fundAmount) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(fundAmount)} but have ${ethers.formatEther(deployerBalance)}`);
  }

  // Transfer to auction
  console.log("\n📤 Transferring", ethers.formatEther(fundAmount), "DBBPT to auction...");
  const tx = await token.transfer(auctionAddress, fundAmount);
  const receipt = await tx.wait(1);
  console.log("✅ Transfer complete! Tx:", receipt.hash);

  // Verify auction balance
  const auctionBalance = await token.balanceOf(auctionAddress);
  console.log("\n✅ Auction DBBPT Balance:", ethers.formatEther(auctionBalance));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Failed:", err.message ?? err);
    process.exit(1);
  });
