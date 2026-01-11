import { ethers } from "hardhat";

/**
 * Check if blockchain time is advancing on localhost
 */

async function main() {
  console.log("\n⏰ CHECKING BLOCKCHAIN TIME ADVANCEMENT");
  console.log("=".repeat(80));
  
  const provider = ethers.provider;
  
  // Get current block
  const block1 = await provider.getBlock("latest");
  const time1 = block1?.timestamp || 0;
  const date1 = new Date(time1 * 1000);
  
  console.log(`\n📅 Current Block Time:`);
  console.log(`   Block Number: ${block1?.number}`);
  console.log(`   Timestamp: ${time1}`);
  console.log(`   Date: ${date1.toISOString()}`);
  console.log(`   Local: ${date1.toLocaleString()}`);
  
  console.log(`\n⏳ Waiting 5 seconds and checking again...`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Get new block (might be same if no transactions)
  const block2 = await provider.getBlock("latest");
  const time2 = block2?.timestamp || 0;
  const date2 = new Date(time2 * 1000);
  
  console.log(`\n📅 After 5 seconds:`);
  console.log(`   Block Number: ${block2?.number}`);
  console.log(`   Timestamp: ${time2}`);
  console.log(`   Date: ${date2.toISOString()}`);
  console.log(`   Local: ${date2.toLocaleString()}`);
  
  const timeDiff = time2 - time1;
  
  console.log(`\n📊 Time Difference:`);
  console.log(`   Seconds: ${timeDiff}`);
  
  if (timeDiff === 0) {
    console.log(`\n❌ PROBLEM DETECTED: Blockchain time is NOT advancing!`);
    console.log(`\n💡 This is why your tokens aren't unlocking.`);
    console.log(`\n🔧 Solutions:`);
    console.log(`   1. Mine empty blocks to advance time:`);
    console.log(`      npx hardhat run scripts/mine-blocks.ts --network localhost`);
    console.log(`   2. Send any transaction (even a simple transfer)`);
    console.log(`   3. Use evm_increaseTime to fast-forward time`);
    console.log(`      npx hardhat run scripts/simulate-cliff-passed.ts --network localhost`);
  } else {
    console.log(`\n✅ Time IS advancing (${timeDiff} seconds in 5 real seconds)`);
    if (timeDiff < 5) {
      console.log(`\n⚠️  Time is advancing slowly. This is normal for localhost.`);
      console.log(`   You may need to mine blocks or send transactions to advance time faster.`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
