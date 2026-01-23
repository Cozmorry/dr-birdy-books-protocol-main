import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Recover the 50,000 tokens that were taken as fees
 * These fees went to the token contract address
 */

async function main() {
  console.log("\n💰 Recovering fee tokens...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");

  // Read the latest deployment file
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      path: path.join(deploymentsDir, f),
      time: fs.statSync(path.join(deploymentsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0].path, "utf8"));
  const contracts = latestDeployment.contracts || latestDeployment;
  const tokenAddress = contracts.token;

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  // Check contract balance (where fees accumulate)
  const contractBalance = await token.balanceOf(tokenAddress);
  console.log("📊 Token Contract Balance:", ethers.formatEther(contractBalance), "DBBPT");
  console.log("");

  // Check deployer balance
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("📊 Your Balance:", ethers.formatEther(deployerBalance), "DBBPT");
  console.log("");

  // Check distribution balance
  const distributionBalance = await token.balanceOf(contracts.distribution);
  console.log("📊 Distribution Balance:", ethers.formatEther(distributionBalance), "DBBPT");
  console.log("");

  const totalSupply = await token.totalSupply();
  console.log("📊 Total Supply:", ethers.formatEther(totalSupply), "DBBPT");
  console.log("");

  // Calculate expected vs actual
  const expectedTotal = ethers.parseEther("10000000"); // 10M
  const actualTotal = deployerBalance + distributionBalance + contractBalance;
  const missing = expectedTotal - actualTotal;

  console.log("📊 Accounting:");
  console.log("   Expected Total: 10,000,000 DBBPT");
  console.log("   Actual Total:", ethers.formatEther(actualTotal), "DBBPT");
  console.log("   Difference:", ethers.formatEther(missing), "DBBPT");
  console.log("");

  if (contractBalance > 0n) {
    console.log("💰 Found tokens in contract (fees):", ethers.formatEther(contractBalance), "DBBPT");
    console.log("");
    console.log("📝 Options to recover:");
    console.log("   1. Transfer to deployer (you)");
    console.log("   2. Transfer to distribution contract");
    console.log("   3. Burn them (reduce supply)");
    console.log("");

    // Check if contract has a function to withdraw fees
    // Most likely we need to use the owner's ability to transfer from contract
    // But ReflectiveToken might not have a direct withdraw function
    
    // Try to transfer from contract to deployer
    // Note: The contract itself holds the tokens, so we need owner permission
    // Check if there's a way to transfer them
    
    console.log("⚠️  Note: Tokens in contract address are fees that will be processed by swapAndLiquify");
    console.log("   They will be swapped for ETH and distributed (marketing/liquidity)");
    console.log("");
    console.log("💡 If you want to recover them, you have a few options:");
    console.log("   1. Wait for swapAndLiquify to process them (automatic when threshold is met)");
    console.log("   2. Manually trigger swapAndLiquify if you have a function for it");
    console.log("   3. Check if there's an emergency withdraw function");
    console.log("");

    // Check for emergency or owner functions
    try {
      // Check if owner can transfer from contract
      // The contract address itself holds the fees
      // We might need to check if there's a way to recover them
      
      console.log("🔍 Checking available recovery options...");
      
      // Option: Check if we can use the token's transfer function from contract
      // But the contract can't call its own transfer function easily
      
      // Better option: Check if there's a way to manually process or withdraw
      const swapThreshold = await token.swapThreshold();
      console.log("   Swap Threshold:", ethers.formatEther(swapThreshold), "DBBPT");
      console.log("   Contract Balance:", ethers.formatEther(contractBalance), "DBBPT");
      
      if (contractBalance >= swapThreshold) {
        console.log("   ✅ Contract balance meets swap threshold");
        console.log("   💡 Fees will be automatically processed by swapAndLiquify");
        console.log("   💡 Or you can manually trigger swapAndLiquify if available");
      } else {
        console.log("   ⚠️  Contract balance below swap threshold");
        console.log("   💡 Fees will accumulate until threshold is met");
      }
    } catch (err: any) {
      console.log("   ⚠️  Could not check swap threshold:", err.message);
    }
  } else {
    console.log("ℹ️  No tokens in contract (fees may have already been processed)");
  }

  console.log("\n💡 Recommendation:");
  console.log("   The 50,000 tokens are in the contract as fees.");
  console.log("   They will be automatically processed by swapAndLiquify when threshold is met.");
  console.log("   If you need them immediately, you could:");
  console.log("   1. Lower the swap threshold temporarily");
  console.log("   2. Transfer more tokens to trigger swapAndLiquify");
  console.log("   3. Check if there's an emergency withdraw function");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
