import { ethers } from "hardhat";

async function main() {
  const proxyAddress = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");

  const pairAddr = "0x9b5deC19274897852976863C6726B404c87840e7";
  const dummyUser = "0x0000000000000000000000000000000000000001";
  const amount = ethers.parseEther("458.34");

  // ABI for ERC20 transfer
  const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
  const token = new ethers.Contract(proxyAddress, abi, provider);

  console.log("Simulating transfer(to, amount) from Pair address via eth_call...");
  try {
    const tx = {
      from: pairAddr,
      to: proxyAddress,
      data: token.interface.encodeFunctionData("transfer", [dummyUser, amount]),
    };
    await provider.call(tx);
    console.log("Direct pair transfer SUCCESS!");
  } catch (err: any) {
    console.error("Direct pair transfer REVERTED:", err.info?.error?.message || err.message || err);
  }
}

main().catch(console.error);
