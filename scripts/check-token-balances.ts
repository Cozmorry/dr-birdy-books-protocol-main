import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔍 CHECKING TOKEN BALANCES");
  console.log("=".repeat(80));
  console.log("Network:", (await ethers.provider.getNetwork()).name, "Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("=".repeat(80));

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const contractAddresses = getContractAddresses(chainId);

  const token = await ethers.getContractAt("ReflectiveToken", contractAddresses.reflectiveToken);
  const distribution = await ethers.getContractAt("TokenDistribution", contractAddresses.tokenDistribution);

  // Get total supply
  const totalSupply = await token.totalSupply();
  console.log("\n📊 TOKEN SUPPLY:");
  console.log(`  Total Supply: ${ethers.formatEther(totalSupply)} DBBPT (${ethers.formatEther(totalSupply)} tokens)`);

  // Check balances
  const deployerBalance = await token.balanceOf(deployer.address);
  const tokenContractBalance = await token.balanceOf(contractAddresses.reflectiveToken);
  const distributionBalance = await token.balanceOf(contractAddresses.tokenDistribution);
  
  console.log("\n💰 BALANCES:");
  console.log(`  Deployer: ${ethers.formatEther(deployerBalance)} DBBPT`);
  console.log(`  Token Contract: ${ethers.formatEther(tokenContractBalance)} DBBPT`);
  console.log(`  Distribution Contract: ${ethers.formatEther(distributionBalance)} DBBPT`);

  // Check distribution status
  const distributionComplete = await distribution.initialDistributionComplete();
  const vestingInitialized = await distribution.vestingInitialized();
  
  console.log("\n📋 DISTRIBUTION STATUS:");
  console.log(`  Vesting Initialized: ${vestingInitialized}`);
  console.log(`  Initial Distribution Complete: ${distributionComplete}`);

  // Calculate circulating supply
  const circulatingSupply = totalSupply - tokenContractBalance - distributionBalance;
  console.log("\n📈 SUPPLY BREAKDOWN:");
  console.log(`  Total Supply: ${ethers.formatEther(totalSupply)} DBBPT`);
  console.log(`  In Token Contract: ${ethers.formatEther(tokenContractBalance)} DBBPT`);
  console.log(`  In Distribution Contract: ${ethers.formatEther(distributionBalance)} DBBPT`);
  console.log(`  Circulating (Deployer + Others): ${ethers.formatEther(circulatingSupply)} DBBPT`);

  // Check team member balances if distribution is complete
  if (distributionComplete) {
    console.log("\n👥 TEAM MEMBER BALANCES:");
    const { DEPLOYMENT_CONFIG } = require("./config");
    const teamWallets = DEPLOYMENT_CONFIG.TEAM_WALLETS;
    
    for (const [name, address] of Object.entries(teamWallets)) {
      if (name !== "AIRDROP") {
        const balance = await token.balanceOf(address as string);
        console.log(`  ${name}: ${ethers.formatEther(balance)} DBBPT`);
      }
    }
    
    // Check airdrop wallet
    const airdropWallet = await distribution.airdropWallet();
    const airdropBalance = await token.balanceOf(airdropWallet);
    console.log(`  Airdrop Wallet: ${ethers.formatEther(airdropBalance)} DBBPT`);

    // Extra diagnostic: check reflection state for airdrop wallet
    const dbg = await token.debugReflection(airdropWallet);
    console.log(`  Airdrop debugReflection -> rOwned: ${dbg.rOwned.toString()}, tOwned: ${dbg.tOwned.toString()}, isExcluded: ${dbg.isExcluded}`);
    if (dbg.isExcluded && dbg.tOwned.toString() === "0" && dbg.rOwned.toString() !== "0") {
      console.log("\n⚠️  Warning: airdrop wallet is excluded but has reflected rOwned balance and zero tOwned. This indicates tokens may be inaccessible via balanceOf(). Re-include the address with excludeFromFee(airdropWallet, false) as owner to restore visible balance.");
    }
  }

  // What MetaMask might be showing
  console.log("\n💡 METAMASK DISPLAY:");
  console.log(`  MetaMask shows: 8,000,000 DBBPT`);
  console.log(`  This could be:`);
  console.log(`    - Your personal balance: ${ethers.formatEther(deployerBalance)} DBBPT`);
  console.log(`    - Or the circulating supply (excluding locked tokens)`);
  console.log(`    - Total supply should be: ${ethers.formatEther(totalSupply)} DBBPT`);
  
  if (deployerBalance === ethers.parseEther("8000000")) {
    console.log("\n✅ You have 8M tokens in your wallet (deployer balance)");
    console.log("   This is correct - 1M was distributed, 1M might be in token contract");
  } else {
    console.log("\n⚠️  MetaMask might be showing a different value");
    console.log("   Check if you're looking at:");
    console.log("   - Total Supply (should be 10M)");
    console.log("   - Your Balance (check your address)");
    console.log("   - Circulating Supply");
  }
}

main().catch(console.error);

