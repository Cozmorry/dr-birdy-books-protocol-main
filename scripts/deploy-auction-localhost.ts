/**
 * @title Deploy Auction to Localhost
 * @notice Deploys MockERC20 (Mock USDC) and ContinuousClearingAuction for testing
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("\n🚀 Deploying Auction to Localhost");
  console.log("====================================");
  console.log("Deployer  :", deployer.address);
  console.log("Chain ID  :", chainId);
  console.log("Balance   :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  if (chainId !== 31337) {
    throw new Error(`This script is for localhost only (chainId 31337). Got: ${chainId}`);
  }

  // Load the localhost deployment to get the token address
  const localhostDeployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "deployments", "localhost-latest.json"),
      "utf8"
    )
  );

  const tokenAddress = localhostDeployment.reflectiveToken;
  console.log("📝 Using ReflectiveToken at:", tokenAddress);

  // ── Deploy Mock USDC ──────────────────────────────────────────────────────
  console.log("\n💵 Deploying Mock USDC...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy(
    "Mock USDC",
    "USDC",
    6 // USDC has 6 decimals
  );
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("  ✅ Mock USDC deployed at:", mockUSDCAddress);

  // Mint some USDC to the deployer for testing
  const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
  await (await mockUSDC.mint(deployer.address, mintAmount)).wait(1);
  console.log("  ✅ Minted", ethers.formatUnits(mintAmount, 6), "USDC to deployer");

  // ── Deploy Continuous Clearing Auction ────────────────────────────────────
  console.log("\n🔨 Deploying ContinuousClearingAuction...");
  
  // Auction parameters
  const auctionTokenAmount = ethers.parseEther("1500000"); // 1.5M DBBPT tokens
  const floorPrice = ethers.parseUnits("0.10", 6); // $0.10 per token (USDC has 6 decimals)
  const currentBlock = await ethers.provider.getBlockNumber();
  const startBlock = currentBlock + 10; // Start in 10 blocks (~20 seconds)
  const endBlock = startBlock + 500; // Run for 500 blocks (~1000 seconds / ~16 minutes)
  
  const fundsRecipient = deployer.address; // 2/3 goes here
  const liquidityRecipient = deployer.address; // 1/3 goes here
  const owner = deployer.address;

  const ContinuousClearingAuction = await ethers.getContractFactory("ContinuousClearingAuction");
  const auction = await ContinuousClearingAuction.deploy(
    tokenAddress,           // token
    mockUSDCAddress,        // currency
    auctionTokenAmount,     // tokenAmount
    floorPrice,             // floorPrice
    startBlock,             // startBlock
    endBlock,               // endBlock
    fundsRecipient,         // fundsRecipient
    liquidityRecipient,     // liquidityRecipient
    owner                   // owner
  );
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("  ✅ Auction deployed at:", auctionAddress);

  // ── Fund the Auction with DBBPT Tokens ────────────────────────────────────
  console.log("\n💰 Funding auction with DBBPT tokens...");
  
  // Get the token contract (it's a proxy, so we need to use the ABI carefully)
  const tokenABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function setStakingContract(address _staking) external"
  ];
  const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
  
  // Transfer tokens to auction
  console.log("  📤 Transferring tokens to auction...");
  const transferTx = await token.transfer(auctionAddress, auctionTokenAmount);
  await transferTx.wait(1);
  console.log("  ✅ Transferred", ethers.formatEther(auctionTokenAmount), "DBBPT to auction");

  // Verify balance (skip if it fails due to proxy issues)
  try {
    const auctionBalance = await token.balanceOf(auctionAddress);
    console.log("  ✅ Auction DBBPT balance:", ethers.formatEther(auctionBalance));
  } catch (e) {
    console.log("  ⚠️  Could not verify balance (proxy issue, but transfer succeeded)");
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const deployed = {
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    reflectiveToken: tokenAddress,
    mockUSDC: mockUSDCAddress,
    auction: auctionAddress,
    auctionParams: {
      tokenAmount: ethers.formatEther(auctionTokenAmount),
      floorPrice: ethers.formatUnits(floorPrice, 6) + " USDC",
      startBlock,
      endBlock,
      duration: endBlock - startBlock + " blocks",
      fundsRecipient,
      liquidityRecipient,
      owner,
    }
  };

  console.log("\n\n=====================================");
  console.log("🎯 AUCTION DEPLOYMENT COMPLETE");
  console.log("=====================================");
  console.log(JSON.stringify(deployed, null, 2));

  // Save to file
  const outDir = path.join(__dirname, "..", "deployments");
  const outFile = path.join(outDir, "localhost-auction-latest.json");
  fs.writeFileSync(outFile, JSON.stringify(deployed, null, 2));
  console.log("\n💾 Saved to:", outFile);

  console.log("\n📝 Next steps:");
  console.log("1. Update frontend/.env with:");
  console.log(`   REACT_APP_AUCTION_ADDRESS=${auctionAddress}`);
  console.log(`   REACT_APP_MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log("2. Restart your frontend");
  console.log("3. Navigate to /admin/auction to interact with the auction");
  console.log("\n⚠️  To bypass transfer fees when claiming tokens:");
  console.log(`   await token.setStakingContract("${auctionAddress}")`);
  console.log("   (Run this before finalizing the auction)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deployment failed:", err.message ?? err);
    process.exit(1);
  });
