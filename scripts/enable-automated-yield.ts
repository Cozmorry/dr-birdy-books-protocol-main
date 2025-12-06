import { ethers } from "hardhat";

/**
 * Enable automated fee collection and buyback
 * This connects the ReflectiveToken to TreasuryYieldStrategy for automatic buybacks
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🤖 Enabling Automated Fee Collection & Buyback\n");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const TOKEN_ADDRESS = "0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c";
  const STRATEGY_ADDRESS = "0x75473d758e6ff2b32f8e46A6386471a7bdd38492";

  const token = await ethers.getContractAt("ReflectiveToken", TOKEN_ADDRESS);
  const strategy = await ethers.getContractAt("TreasuryYieldStrategy", STRATEGY_ADDRESS);

  console.log("📋 Contract Addresses:");
  console.log("   Token:", TOKEN_ADDRESS);
  console.log("   Strategy:", STRATEGY_ADDRESS);
  console.log("");

  // Step 1: Set yield strategy in token contract
  console.log("1️⃣ Setting yield strategy in token contract...");
  try {
    const tx1 = await token.setYieldStrategy(STRATEGY_ADDRESS);
    await tx1.wait();
    console.log("   ✅ Yield strategy set");
  } catch (error: any) {
    console.log("   ⚠️  Error or already set:", error.message.substring(0, 100));
  }

  // Step 2: Set fee split (50% to yield, 50% to marketing)
  console.log("\n2️⃣ Setting fee split (50% to yield strategy, 50% to marketing)...");
  try {
    const tx2 = await token.setYieldStrategyFeeBps(5000); // 5000 = 50%
    await tx2.wait();
    console.log("   ✅ Fee split set to 50%");
  } catch (error: any) {
    console.log("   ⚠️  Error:", error.message.substring(0, 100));
  }

  // Step 3: Verify auto-buyback is enabled in strategy
  console.log("\n3️⃣ Checking auto-buyback status...");
  const autoBuybackEnabled = await strategy.autoBuybackEnabled();
  const minBuybackAmount = await strategy.minBuybackAmount();
  console.log("   Auto-buyback enabled:", autoBuybackEnabled);
  console.log("   Min buyback amount:", ethers.formatEther(minBuybackAmount), "ETH");

  if (!autoBuybackEnabled) {
    console.log("\n   Enabling auto-buyback...");
    const tx3 = await strategy.setAutoBuybackEnabled(true);
    await tx3.wait();
    console.log("   ✅ Auto-buyback enabled");
  }

  // Step 4: Verify configuration
  console.log("\n4️⃣ Verifying configuration...");
  const yieldStrategyAddress = await token.yieldStrategy();
  const feeBps = await token.yieldStrategyFeeBps();
  
  console.log("   Token → Strategy:", yieldStrategyAddress);
  console.log("   Fee Split:", Number(feeBps) / 100, "% to yield strategy");
  console.log("   Remaining:", 100 - (Number(feeBps) / 100), "% to marketing wallet");
  console.log("");

  console.log("✅ Automation enabled!");
  console.log("\n📝 How it works:");
  console.log("   1. Users trade tokens → Protocol collects 5% fees");
  console.log("   2. Fees accumulate → Auto-swapped to ETH");
  console.log("   3. Marketing fee ETH split:");
  console.log("      • 50% → Yield Strategy (auto-buyback)");
  console.log("      • 50% → Marketing Wallet");
  console.log("   4. Strategy receives ETH → Auto-executes buyback");
  console.log("   5. Tokens bought → Burned → Value increases!");
  console.log("\n🎉 Automated yield generation is now ACTIVE!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });

