import { ethers } from "hardhat";

async function main() {
  const tokenAddress = "0xf24ca574B000B8aF0E41105976963CbA79155CA5";
  const stakingAddress = "0xEEFC9EAE442d5D73c030584d42A1eeEba7dE7Aff";

  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  const token = await ethers.getContractAt("ReflectiveToken", tokenAddress);
  const staking = await ethers.getContractAt("FlexibleTieredStaking", stakingAddress);

  // Check staking contract address in token
  const stakingContractInToken = await token.stakingContract();
  console.log("Staking contract in token:", stakingContractInToken);
  console.log("Expected staking address:", stakingAddress);
  console.log("Match:", stakingContractInToken.toLowerCase() === stakingAddress.toLowerCase());

  // Check if staking contract is excluded
  const isExcluded = await token._isExcludedFromFee(stakingAddress);
  console.log("Staking contract excluded from fees:", isExcluded);

  // Check user balance
  const balance = await token.balanceOf(deployer.address);
  console.log("User balance:", ethers.formatEther(balance), "DBB");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

