/**
 * Deploy DBBPT Auction using Uniswap's Continuous Clearing Auction (CCA)
 * 
 * Prerequisites:
 * 1. DBBPT must be verified on BaseScan
 * 2. Uniswap application must be approved
 * 3. Sufficient DBBPT balance to fund auction (1.5M tokens)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-uniswap-cca.ts --network mainnet
 */

import { ethers } from "hardhat";

// Uniswap CCA Factory on Base Mainnet (v1.1.0)
const UNISWAP_CCA_FACTORY = "0xCCccCcCAE7503Cac057829BF2811De42E16e0bD5";

// Token addresses on Base Mainnet
const DBBPT_TOKEN = "0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Auction configuration
const TOKEN_AMOUNT = ethers.parseEther("1500000"); // 1.5M DBBPT
const TARGET_RAISE = ethers.parseUnits("150000", 6); // $150,000 USDC

// Floor price: $0.10 per DBBPT
// = 0.1 USDC (1e5 units with 6 decimals) per 1 DBBPT (1e18 units with 18 decimals)
// Q96 format: (0.1 * 1e6 / 1e18) * 2^96 ≈ 7.922816251426433e15
const FLOOR_PRICE_Q96 = "7922816251426433400832";

interface AuctionStep {
  tokensPerBlock: number;
  durationBlocks: number;
}

/**
 * Design token release schedule
 * Total: 1,500,000 DBBPT over ~30 days (216,000 blocks at 12s/block)
 * 
 * Strategy: Gradual acceleration to encourage early bidding
 * - Phase 1 (Days 1-10): 15% → 225,000 tokens over 72,000 blocks = 3.125/block
 * - Phase 2 (Days 11-25): 60% → 900,000 tokens over 108,000 blocks = 8.333/block
 * - Phase 3 (Days 26-30): 25% → 375,000 tokens over 36,000 blocks = 10.417/block
 */
const AUCTION_STEPS: AuctionStep[] = [
  { tokensPerBlock: 3125, durationBlocks: 72000 },   // 225k tokens (15%)
  { tokensPerBlock: 8333, durationBlocks: 108000 },  // 900k tokens (60%)
  { tokensPerBlock: 10417, durationBlocks: 36000 },  // 375k tokens (25%)
];

/**
 * Pack auction steps into bytes format
 * Each step is 8 bytes: tokensPerBlock (uint40) | (durationBlocks << 40)
 */
function packAuctionSteps(steps: AuctionStep[]): string {
  let packed = "0x";
  for (const step of steps) {
    // Use MPS (Millionths Per Second) format: tokensPerBlock in micro-units
    // For 1.5M total supply, MPS = (tokens * 1e6) / totalSupply
    // Then scale to per-block rate
    const mps = Math.floor((step.tokensPerBlock * 1e6) / 1500000);

    // Pack: uint64(mps) | (uint64(blocks) << 24)
    const packedStep = BigInt(mps) | (BigInt(step.durationBlocks) << 24n);
    packed += packedStep.toString(16).padStart(16, "0");
  }
  return packed;
}

async function main() {
  console.log("\n🚀 Deploying DBBPT Auction via Uniswap CCA\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer:", deployer.address);

  // Check DBBPT balance
  const dbbptToken = await ethers.getContractAt("IERC20", DBBPT_TOKEN);
  const balance = await dbbptToken.balanceOf(deployer.address);
  console.log("💰 DBBPT Balance:", ethers.formatEther(balance));

  if (balance < TOKEN_AMOUNT) {
    throw new Error(`Insufficient DBBPT balance. Need ${ethers.formatEther(TOKEN_AMOUNT)}, have ${ethers.formatEther(balance)}`);
  }

  // Calculate blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  const START_DELAY = 500; // ~100 minutes
  const START_BLOCK = currentBlock + START_DELAY;
  const DURATION_BLOCKS = 216000; // ~30 days
  const END_BLOCK = START_BLOCK + DURATION_BLOCKS;
  const CLAIM_BLOCK = END_BLOCK; // Can claim immediately after auction ends

  console.log("\n⏰ Auction Timeline:");
  console.log("   Current Block:", currentBlock);
  console.log("   Start Block:  ", START_BLOCK, `(in ~${START_DELAY * 12 / 60} minutes)`);
  console.log("   End Block:    ", END_BLOCK, `(~${DURATION_BLOCKS * 12 / 86400} days)`);
  console.log("   Claim Block:  ", CLAIM_BLOCK);

  // Pack auction steps
  const auctionStepsData = packAuctionSteps(AUCTION_STEPS);
  console.log("\n📊 Token Release Schedule:");
  AUCTION_STEPS.forEach((step, i) => {
    console.log(`   Phase ${i + 1}: ${step.tokensPerBlock} tokens/block for ${step.durationBlocks} blocks`);
  });

  // Build auction parameters struct
  const parameters = {
    currency: USDC_ADDRESS,
    tokensRecipient: deployer.address, // Receives unsold tokens
    fundsRecipient: deployer.address,  // Receives all USDC raised
    startBlock: START_BLOCK,
    endBlock: END_BLOCK,
    claimBlock: CLAIM_BLOCK,
    tickSpacing: FLOOR_PRICE_Q96, // Use floor price as minimum increment
    validationHook: ethers.ZeroAddress, // No validation hook
    floorPrice: FLOOR_PRICE_Q96,
    requiredCurrencyRaised: 0, // No minimum - auction graduates regardless
    auctionStepsData: auctionStepsData,
  };

  console.log("\n📝 Auction Parameters:");
  console.log("   Currency:        ", USDC_ADDRESS, "(USDC)");
  console.log("   Token Amount:    ", ethers.formatEther(TOKEN_AMOUNT), "DBBPT");
  console.log("   Floor Price:     ", "$0.10 per DBBPT");
  console.log("   Target Raise:    ", ethers.formatUnits(TARGET_RAISE, 6), "USDC");
  console.log("   Tokens Recipient:", deployer.address);
  console.log("   Funds Recipient: ", deployer.address);

  // Encode parameters
  const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "tuple(address currency, address tokensRecipient, address fundsRecipient, uint64 startBlock, uint64 endBlock, uint64 claimBlock, uint256 tickSpacing, address validationHook, uint256 floorPrice, uint128 requiredCurrencyRaised, bytes auctionStepsData)"
    ],
    [parameters]
  );

  // Get factory contract
  const factoryABI = [
    "function initializeDistribution(address token, uint256 amount, bytes calldata data, bytes32 salt) external returns (address)",
  ];
  const factory = await ethers.getContractAt(factoryABI, UNISWAP_CCA_FACTORY);

  console.log("\n🔨 Step 1: Creating auction via Uniswap Factory...");
  console.log("   Factory:", UNISWAP_CCA_FACTORY);

  // Create auction
  const createTx = await factory.initializeDistribution(
    DBBPT_TOKEN,
    TOKEN_AMOUNT,
    encodedParams,
    ethers.ZeroHash // No salt - deterministic address
  );

  console.log("   ⏳ Transaction:", createTx.hash);
  const receipt = await createTx.wait();

  // Extract auction address from event logs
  // The DistributionCreated event should contain the auction address
  let auctionAddress = "";
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log as any);
      if (parsed && parsed.name === "DistributionCreated") {
        auctionAddress = parsed.args[0];
        break;
      }
    } catch (e) {
      // Not the event we're looking for
    }
  }

  if (!auctionAddress) {
    // Fallback: assume first log contains address
    auctionAddress = receipt.logs[0].address;
  }

  console.log("   ✅ Auction created:", auctionAddress);

  console.log("\n🛡️ Step 1.5: Excluding auction from fees...");
  const tokenContract = await ethers.getContractAt("ReflectiveToken", DBBPT_TOKEN);
  try {
    const excludeTx = await tokenContract.excludeFromFee(auctionAddress, true);
    await excludeTx.wait();
    console.log("   ✅ Auction excluded from fees!");
  } catch (error: any) {
    console.log("   ⚠️ Could not exclude auction from fees:", error.message);
  }

  console.log("\n💸 Step 2: Transferring DBBPT tokens to auction...");
  const transferTx = await dbbptToken.transfer(auctionAddress, TOKEN_AMOUNT);
  await transferTx.wait();
  console.log("   ✅ Transferred", ethers.formatEther(TOKEN_AMOUNT), "DBBPT");

  console.log("\n📢 Step 3: Notifying auction of token receipt...");
  const auctionABI = [
    "function onTokensReceived() external",
  ];
  const auction = await ethers.getContractAt(auctionABI, auctionAddress);
  const notifyTx = await auction.onTokensReceived();
  await notifyTx.wait();
  console.log("   ✅ Auction notified and ready!");

  // Verify auction balance
  const auctionBalance = await dbbptToken.balanceOf(auctionAddress);
  console.log("\n🔍 Verification:");
  console.log("   Auction DBBPT Balance:", ethers.formatEther(auctionBalance));

  if (auctionBalance !== TOKEN_AMOUNT) {
    console.warn("   ⚠️  Warning: Balance mismatch!");
  }

  console.log("\n✅ DEPLOYMENT COMPLETE!\n");
  console.log("📋 Summary:");
  console.log("   Auction Address:", auctionAddress);
  console.log("   DBBPT Token:    ", DBBPT_TOKEN);
  console.log("   USDC Currency:  ", USDC_ADDRESS);
  console.log("   Token Amount:   ", ethers.formatEther(TOKEN_AMOUNT), "DBBPT");
  console.log("   Floor Price:    ", "$0.10 per DBBPT");
  console.log("   Target Raise:   ", ethers.formatUnits(TARGET_RAISE, 6), "USDC");
  console.log("   Start Block:    ", START_BLOCK);
  console.log("   End Block:      ", END_BLOCK);
  console.log("   Duration:       ", "~30 days");

  console.log("\n🔗 View on BaseScan:");
  console.log("   Auction:", `https://basescan.org/address/${auctionAddress}`);
  console.log("   DBBPT:  ", `https://basescan.org/address/${DBBPT_TOKEN}`);

  console.log("\n📱 Uniswap Interface:");
  console.log("   Bidders can participate at: https://app.uniswap.org");

  console.log("\n🎯 Next Steps:");
  console.log("   1. Verify auction on BaseScan");
  console.log("   2. Announce auction to community");
  console.log("   3. Share Uniswap auction link");
  console.log("   4. Monitor bidding activity");
  console.log("   5. After auction: funds auto-distributed to", deployer.address);

  // Save deployment info
  const deploymentInfo = {
    network: "Base Mainnet",
    chainId: 8453,
    auctionType: "Uniswap CCA v1.1.0",
    auctionAddress: auctionAddress,
    dbbptToken: DBBPT_TOKEN,
    usdcCurrency: USDC_ADDRESS,
    tokenAmount: TOKEN_AMOUNT.toString(),
    floorPrice: "0.10 USD",
    targetRaise: "150000 USDC",
    startBlock: START_BLOCK,
    endBlock: END_BLOCK,
    claimBlock: CLAIM_BLOCK,
    duration: "~30 days",
    fundsRecipient: deployer.address,
    tokensRecipient: deployer.address,
    deployedAt: new Date().toISOString(),
    deployedBy: deployer.address,
  };

  const fs = require("fs");
  const path = require("path");
  fs.writeFileSync(
    path.join(__dirname, "..", "deployments", "uniswap-cca-mainnet.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to: deployments/uniswap-cca-mainnet.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
