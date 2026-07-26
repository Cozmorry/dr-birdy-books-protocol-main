import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const PROXY_ADDRESS = "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0";

  console.log("🚀 Deploying freshly compiled implementation with pure fee getters...");

  const ReflectiveToken = await ethers.getContractFactory("ReflectiveToken");

  // Deploy fresh implementation
  console.log("📦 Deploying new implementation contract...");
  const newImpl = await ReflectiveToken.deploy();
  await newImpl.waitForDeployment();
  const newImplAddress = await newImpl.getAddress();
  console.log("✅ New implementation deployed at:", newImplAddress);

  // Get the ProxyAdmin
  const proxyAdminAddr = await upgrades.erc1967.getAdminAddress(PROXY_ADDRESS);
  console.log("ProxyAdmin address:", proxyAdminAddr);

  const proxyAdminAbi = [
    "function upgradeAndCall(address proxy, address implementation, bytes calldata data) external payable",
    "function owner() view returns (address)",
  ];

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const proxyAdmin = new ethers.Contract(proxyAdminAddr, proxyAdminAbi, deployer);
  console.log("ProxyAdmin owner:", await proxyAdmin.owner());

  console.log("🔧 Upgrading proxy to new implementation...");
  const tx = await proxyAdmin.upgradeAndCall(PROXY_ADDRESS, newImplAddress, "0x");
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ Proxy now points to:", newImplAddress);

  // Verify
  const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(alchemyUrl);
  const totalFeeSelector = ethers.id("totalFee()").slice(0, 10);
  const raw = await provider.call({ to: PROXY_ADDRESS, data: totalFeeSelector });
  console.log("totalFee() now returns:", BigInt(raw).toString());
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exitCode = 1;
});
