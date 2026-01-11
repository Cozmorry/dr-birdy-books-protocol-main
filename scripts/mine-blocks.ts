import { ethers } from "hardhat";

/**
 * Mine empty blocks to advance blockchain time
 * This is needed because Hardhat localhost time only advances with blocks
 * 
 * Usage: npx hardhat run scripts/mine-blocks.ts --network localhost
 */

const BLOCKS_TO_MINE = 100; // Mine 100 blocks (~13.3 minutes at 8 seconds per block)

async function main() {
  console.log("\n⛏️  MINING BLOCKS TO ADVANCE TIME");
  console.log("=".repeat(80));
  
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  
  if (Number(network.chainId) !== 31337) {
    console.error("\n❌ This script only works on localhost (chainId 31337)");
    process.exit(1);
  }
  
  const initialBlock = await provider.getBlock("latest");
  const initialTime = initialBlock?.timestamp || 0;
  const initialDate = new Date(initialTime * 1000);
  
  console.log(`\n📅 Initial Time:`);
  console.log(`   Block: ${initialBlock?.number}`);
  console.log(`   Timestamp: ${initialTime}`);
  console.log(`   Date: ${initialDate.toISOString()}`);
  
  console.log(`\n⛏️  Mining ${BLOCKS_TO_MINE} blocks...`);
  
  // Mine blocks (each block advances time by ~8 seconds on Hardhat)
  for (let i = 0; i < BLOCKS_TO_MINE; i++) {
    await provider.send("evm_mine", []);
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`   Mined ${i + 1}/${BLOCKS_TO_MINE} blocks...\r`);
    }
  }
  
  console.log(`\n✅ Mined ${BLOCKS_TO_MINE} blocks!`);
  
  const finalBlock = await provider.getBlock("latest");
  const finalTime = finalBlock?.timestamp || 0;
  const finalDate = new Date(finalTime * 1000);
  const timeAdvanced = finalTime - initialTime;
  
  console.log(`\n📅 Final Time:`);
  console.log(`   Block: ${finalBlock?.number}`);
  console.log(`   Timestamp: ${finalTime}`);
  console.log(`   Date: ${finalDate.toISOString()}`);
  
  console.log(`\n⏰ Time Advanced:`);
  console.log(`   Seconds: ${timeAdvanced}`);
  console.log(`   Minutes: ${(timeAdvanced / 60).toFixed(2)}`);
  console.log(`   Hours: ${(timeAdvanced / 3600).toFixed(2)}`);
  console.log(`   Days: ${(timeAdvanced / (24 * 3600)).toFixed(2)}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ Time advanced! Your vesting tokens should now have more claimable amount.");
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
