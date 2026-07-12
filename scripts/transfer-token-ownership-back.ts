import { ethers } from "hardhat";

const TOKEN = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";
const NEW_OWNER = "0x27799bb35820Ecb2814Ac2484bA34AD91bbda198";

async function main() {
  const [signer] = await ethers.getSigners();
  const token = await ethers.getContractAt("ReflectiveToken", TOKEN);

  console.log("Current owner:", await token.owner());
  console.log("Transferring to:", NEW_OWNER);

  const tx = await token.transferOwnership(NEW_OWNER);
  console.log("TX sent:", tx.hash);
  await tx.wait();

  console.log("New owner:", await token.owner());
  console.log("Done: https://basescan.org/tx/" + tx.hash);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
