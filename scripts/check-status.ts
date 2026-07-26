import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const proxyAddress = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
  const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(alchemyUrl);

  // Call totalFee() via raw eth_call - selector = keccak256("totalFee()")[0:4] = 0x0bad4bed
  const totalFeeSelector = ethers.id("totalFee()").slice(0, 10);
  const taxFeeSelector = ethers.id("taxFee()").slice(0, 10);
  console.log("totalFee() selector:", totalFeeSelector);
  console.log("taxFee() selector:", taxFeeSelector);

  const rawTotalFee = await provider.call({ to: proxyAddress, data: totalFeeSelector });
  const rawTaxFee = await provider.call({ to: proxyAddress, data: taxFeeSelector });
  
  console.log("\n=== Raw eth_call results (bypasses any ABI caching) ===");
  console.log("totalFee() raw:", rawTotalFee);
  console.log("taxFee() raw:", rawTaxFee);
  
  const decodedTotalFee = BigInt(rawTotalFee);
  const decodedTaxFee = BigInt(rawTaxFee);
  console.log("totalFee() decoded:", decodedTotalFee.toString());
  console.log("taxFee() decoded:", decodedTaxFee.toString());

  if (decodedTotalFee === 0n && decodedTaxFee === 0n) {
    console.log("\n✅ Pure getters confirmed working — both return 0!");
  } else {
    // Check current implementation address
    const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const implAddr = await provider.getStorage(proxyAddress, implSlot);
    console.log("\n⚠️ Fees not 0. Current implementation:", "0x" + implAddr.slice(26));
    console.log("The pure function override may not have deployed. Check upgrade tx.");
  }
}

main().catch(console.error);
