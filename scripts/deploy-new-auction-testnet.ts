/**
 * Deploy New ContinuousClearingAuction to Base Sepolia Testnet
 * 
 * This script deploys a fresh auction with appropriate start/end blocks
 * for immediate testing.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-new-auction-testnet.ts --network testnet
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying new auction with account:", deployer.address);

  // Contract addresses on Base Sepolia
  const TOKEN_ADDRESS = "0xB49872C1aD8a052f1369ABDfC890264938647EB6"; // DBBPT
  const CURRENCY_ADDRESS = "0x8841b3404ceD77ddb4Be25616BA24ffBA500bd8B"; // Mock USDC

  // Auction parameters
  const TOKEN_AMOUNT = ethers.parseEther("1500000"); // 1.5M DBBPT
  const FLOOR_PRICE = ethers.parseUnits("0.1", 6); // 0.1 USDC (6 decimals)
  
  // Get current block
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("\n📊 Current block:", currentBlock);
  
  // Start in 50 blocks (~100 seconds on Base)
  const START_BLOCK = currentBlock + 50;
  // Run for 10,000 blocks (~5.5 hours on Base)
  const END_BLOCK = START_BLOCK + 10000;
  
  const FUNDS_RECIPIENT = deployer.address; // 66.67% of funds
  const LIQUIDITY_RECIPIENT = deployer.address; // 33.33% of funds
  const OWNER = deployer.address;

  console.log("\n📋 Auction Configuration:");
  console.log("   Token (DBBPT):         ", TOKEN_ADDRESS);
  console.log("   Currency (USDC):       ", CURRENCY_ADDRESS);
  console.log("   Token Amount:          ", ethers.formatEther(TOKEN_AMOUNT), "DBBPT");
  console.log("   Floor Price:           ", ethers.formatUnits(FLOOR_PRICE, 6), "USDC");
  console.log("   Start Block:           ", START_BLOCK, `(in ~${(START_BLOCK - currentBlock) * 2} seconds)`);
  console.log("   End Block:             ", END_BLOCK, `(runs for ${END_BLOCK - START_BLOCK} blocks)`);
  console.log("   Funds Recipient:       ", FUNDS_RECIPIENT);
  console.log("   Liquidity Recipient:   ", LIQUIDITY_RECIPIENT);
  console.log("   Owner:                 ", OWNER);

  console.log("\n🔄 Deploying ContinuousClearingAuction...");

  const AuctionFactory = await ethers.getContractFactory("ContinuousClearingAuction");
  const auction = await AuctionFactory.deploy(
    TOKEN_ADDRESS,
    CURRENCY_ADDRESS,
    TOKEN_AMOUNT,
    FLOOR_PRICE,
    START_BLOCK,
    END_BLOCK,
    FUNDS_RECIPIENT,
    LIQUIDITY_RECIPIENT,
    OWNER
  );

  console.log("   Transaction sent:", auction.deploymentTransaction()?.hash);
  console.log("   Waiting for confirmation...");

  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();

  console.log("\n✅ SUCCESS! Auction deployed!");
  console.log("\n📝 Deployment Details:");
  console.log("   Auction Address:       ", auctionAddress);
  console.log("   Transaction:           ", auction.deploymentTransaction()?.hash);
  console.log("   Block Explorer:        ", `https://sepolia.basescan.org/address/${auctionAddress}`);

  console.log("\n📋 Next Steps:");
  console.log("\n1. Update frontend/.env:");
  console.log(`   REACT_APP_AUCTION_ADDRESS=${auctionAddress}`);
  
  console.log("\n2. Exclude auction from fees (already done for old auction, but do for new one):");
  console.log(`   npx hardhat console --network testnet`);
  console.log(`   > const token = await ethers.getContractAt("ReflectiveToken", "${TOKEN_ADDRESS}");`);
  console.log(`   > await token.excludeFromFee("${auctionAddress}", true);`);
  
  console.log("\n3. Fund the auction with 1.5M DBBPT:");
  console.log(`   > await token.transfer("${auctionAddress}", ethers.parseEther("1500000"));`);
  
  console.log("\n4. Mint test USDC for bidding:");
  console.log(`   > const usdc = await ethers.getContractAt("MockERC20", "${CURRENCY_ADDRESS}");`);
  console.log(`   > await usdc.mint("${deployer.address}", ethers.parseUnits("100000", 6));`);
  
  console.log("\n5. Open frontend and start bidding:");
  console.log("   http://localhost:3000/admin/auction");

  console.log("\n⏰ Auction Timeline:");
  console.log(`   Starts in:             ~${(START_BLOCK - currentBlock) * 2} seconds`);
  console.log(`   Duration:              ~${((END_BLOCK - START_BLOCK) * 2) / 3600} hours`);
  console.log(`   Ends at block:         ${END_BLOCK}`);

  // Save deployment info
  const deploymentInfo = {
    network: "Base Sepolia Testnet",
    chainId: 84532,
    auctionAddress: auctionAddress,
    tokenAddress: TOKEN_ADDRESS,
    currencyAddress: CURRENCY_ADDRESS,
    tokenAmount: TOKEN_AMOUNT.toString(),
    floorPrice: FLOOR_PRICE.toString(),
    startBlock: START_BLOCK,
    endBlock: END_BLOCK,
    fundsRecipient: FUNDS_RECIPIENT,
    liquidityRecipient: LIQUIDITY_RECIPIENT,
    owner: OWNER,
    deployedAt: new Date().toISOString(),
    deploymentTx: auction.deploymentTransaction()?.hash,
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "testnet-auction-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to: deployments/testnet-auction-latest.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
