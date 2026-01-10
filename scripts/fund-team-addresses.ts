import { ethers } from "hardhat";

/**
 * Script to fund team member addresses with ETH for gas fees
 * Only works on localhost/testnet
 * 
 * Usage: npx hardhat run scripts/fund-team-addresses.ts --network localhost
 */

const TEAM_MEMBERS = {
  J: "0x4d8b10e7d6bff54c8c1c1c42240c74e173c5f8ed",
  A: "0xdd82052fbc8edc7091dafa1540f16c63c51cb2fb",
  D: "0x130678ed1594929c02da4c10ab11a848df727eea",
  M: "0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b",
  B: "0xad19c12098037b7d35009c7cc794769e1427cc2d",
};

const ETH_AMOUNT = ethers.parseEther("10"); // 10 ETH per address (more than enough for testing)

async function main() {
  console.log("\n💰 FUNDING TEAM MEMBER ADDRESSES WITH ETH");
  console.log("=".repeat(80));
  
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`\n📋 Network: ${network.name} (Chain ID: ${chainId})`);
  
  // Only allow this on localhost/testnet for safety
  if (chainId !== 31337 && chainId !== 84532) {
    console.error("\n❌ ERROR: This script can only be run on localhost (31337) or testnet (84532)");
    console.error("   For safety reasons, ETH funding is not allowed on mainnet");
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  const deployerBalance = await provider.getBalance(deployer.address);
  
  console.log(`\n👤 Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(deployerBalance)} ETH`);
  
  const totalNeeded = ETH_AMOUNT * BigInt(Object.keys(TEAM_MEMBERS).length);
  
  if (deployerBalance < totalNeeded) {
    console.error(`\n❌ ERROR: Deployer doesn't have enough ETH`);
    console.error(`   Needed: ${ethers.formatEther(totalNeeded)} ETH`);
    console.error(`   Available: ${ethers.formatEther(deployerBalance)} ETH`);
    process.exit(1);
  }
  
  console.log(`\n📊 Funding ${Object.keys(TEAM_MEMBERS).length} team members with ${ethers.formatEther(ETH_AMOUNT)} ETH each...`);
  console.log("=".repeat(80));
  
  for (const [name, address] of Object.entries(TEAM_MEMBERS)) {
    try {
      // Check current balance
      const currentBalance = await provider.getBalance(address);
      
      console.log(`\n💸 ${name} (${address}):`);
      console.log(`   Current Balance: ${ethers.formatEther(currentBalance)} ETH`);
      
      if (currentBalance >= ETH_AMOUNT) {
        console.log(`   ✅ Already has enough ETH, skipping...`);
        continue;
      }
      
      // Calculate how much to send
      const toSend = ETH_AMOUNT - currentBalance;
      
      // Send ETH
      console.log(`   Sending ${ethers.formatEther(toSend)} ETH...`);
      const tx = await deployer.sendTransaction({
        to: address,
        value: toSend,
      });
      
      console.log(`   ⏳ Waiting for confirmation...`);
      console.log(`   TX Hash: ${tx.hash}`);
      
      await tx.wait();
      
      // Verify new balance
      const newBalance = await provider.getBalance(address);
      console.log(`   ✅ New Balance: ${ethers.formatEther(newBalance)} ETH`);
      
    } catch (error: any) {
      console.error(`   ❌ Error funding ${name}: ${error.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ FUNDING COMPLETE");
  console.log("=".repeat(80));
  console.log("\n💡 All team member addresses now have ETH for gas fees");
  console.log("   They can now claim their vested tokens!");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
