import { ethers } from "hardhat";
import { getContractAddresses } from "../frontend/src/config/networks";

async function main() {
  console.log("\n🔍 Checking contract ownership status...\n");

  // Get network
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contractAddresses = getContractAddresses(chainId);

  console.log("Network:", network.name, `(Chain ID: ${chainId})`);

  // Get the signer (the account trying to transfer)
  const [signer] = await ethers.getSigners();
  console.log("Caller address:", signer.address);
  console.log("Caller balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH\n");

  // Check FlexibleTieredStaking
  if (contractAddresses.flexibleTieredStaking) {
    console.log("📋 Checking FlexibleTieredStaking...");
    console.log("   Address:", contractAddresses.flexibleTieredStaking);
    
    try {
      const staking = await ethers.getContractAt(
        "FlexibleTieredStaking",
        contractAddresses.flexibleTieredStaking
      );

      const currentOwner = await staking.owner();
      console.log("   Current owner:", currentOwner);
      
      const isCallerOwner = currentOwner.toLowerCase() === signer.address.toLowerCase();
      console.log("   Is caller the owner?", isCallerOwner ? "✅ YES" : "❌ NO");
      
      // Check if owned by Timelock
      const timelockAddress = contractAddresses.improvedTimelock;
      if (timelockAddress) {
        const isOwnedByTimelock = currentOwner.toLowerCase() === timelockAddress.toLowerCase();
        console.log("   Is owned by Timelock?", isOwnedByTimelock ? "⚠️  YES" : "✅ NO");
        
        if (isOwnedByTimelock) {
          console.log("\n   ⚠️  ISSUE: Contract is owned by Timelock!");
          console.log("   You cannot call transferOwnership directly.");
          console.log("   Options:");
          console.log("   1. Use Timelock's queueTransaction (2-day delay)");
          console.log("   2. Check if you're the Timelock admin");
          
          // Check Timelock admin
          try {
            const timelock = await ethers.getContractAt("ImprovedTimelock", timelockAddress);
            const timelockAdmin = await timelock.admin();
            console.log("   Timelock admin:", timelockAdmin);
            console.log("   Is caller the Timelock admin?", 
              timelockAdmin.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");
          } catch (err) {
            console.log("   Could not check Timelock admin:", err);
          }
        }
      }
      
      // Check if contract is paused
      try {
        const isPaused = await staking.paused();
        console.log("   Is contract paused?", isPaused ? "⚠️  YES" : "✅ NO");
      } catch (err) {
        // Contract might not have paused() function
      }
      
      // Try to estimate gas for transferOwnership
      const newOwnerAddress = "0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b";
      console.log("\n   Testing transferOwnership to:", newOwnerAddress);
      
      try {
        const gasEstimate = await staking.transferOwnership.estimateGas(newOwnerAddress);
        console.log("   ✅ Gas estimate successful:", gasEstimate.toString());
        console.log("   This means the transaction should work!");
      } catch (err: any) {
        console.log("   ❌ Gas estimate failed:", err.message);
        console.log("   This is why you're getting 'Internal JSON-RPC error'");
        
        // Try to decode revert reason
        if (err.data) {
          try {
            const reason = staking.interface.parseError(err.data);
            console.log("   Revert reason:", reason?.name);
          } catch {
            // Couldn't decode
          }
        }
      }
      
    } catch (err: any) {
      console.log("   ❌ Error checking contract:", err.message);
    }
    
    console.log();
  }

  // Check other contracts too
  const contracts = [
    { name: "ReflectiveToken", address: contractAddresses.reflectiveToken },
    { name: "TokenDistribution", address: contractAddresses.tokenDistribution },
    { name: "ArweaveGateway", address: contractAddresses.arweaveGateway },
  ];

  for (const contract of contracts) {
    if (contract.address && contract.address !== ethers.ZeroAddress) {
      console.log(`📋 Checking ${contract.name}...`);
      console.log("   Address:", contract.address);
      
      try {
        const contractInstance = await ethers.getContractAt(contract.name, contract.address);
        const currentOwner = await contractInstance.owner();
        console.log("   Current owner:", currentOwner);
        console.log("   Is caller the owner?", 
          currentOwner.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");
      } catch (err: any) {
        if (err.message?.includes("owner()")) {
          console.log("   ℹ️  Contract doesn't have owner() function");
        } else {
          console.log("   ❌ Error:", err.message);
        }
      }
      console.log();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
