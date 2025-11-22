import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const tokenAddress = "0xc87779bCf6Ab9A0B5075d83B07e4676Ffca1c93A";
  const stakingAddress = "0x62C4dC0506e243E896459dd7267A32902D7f57d0";

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);

  console.log("\n=== TESTING TRANSFERFROM DIRECTLY ===");
  
  const amount = ethers.parseEther("25");
  
  // Approve staking contract
  console.log("Approving staking contract...");
  const approveTx = await token.approve(stakingAddress, amount);
  await approveTx.wait();
  console.log("Approved!");
  
  // Check allowance
  const allowance = await token.allowance(deployer.address, stakingAddress);
  console.log("Allowance:", ethers.formatEther(allowance));
  
  // Now try transferFrom AS the deployer (simulating what staking contract would do)
  // But we can't actually call it AS the staking contract from here
  // So let's try a different approach - approve deployer to spend from deployer
  console.log("\nApproving self to test transferFrom...");
  const selfApproveTx = await token.approve(deployer.address, amount);
  await selfApproveTx.wait();
  
  console.log("Attempting transferFrom (deployer -> staking, called by deployer)...");
  try {
    const tx = await token.transferFrom(deployer.address, stakingAddress, amount);
    console.log("TransferFrom tx sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ TransferFrom successful! Gas used:", receipt?.gasUsed.toString());
  } catch (error: any) {
    console.error("❌ TransferFrom failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

