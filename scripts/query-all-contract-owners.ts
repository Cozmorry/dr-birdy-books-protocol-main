import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";

// Configured network details
const NETWORKS = [
  {
    name: "Base Mainnet",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    contracts: [
      { name: "ReflectiveToken (Token Proxy)", address: "0x42364e088eFeB481cE811eF9caDd95F36e3F36c0", method: "owner" },
      { name: "TokenDistribution (New)", address: "0xE1bABA07752ce8bD574eEa5aBe494521B3028638", method: "owner" },
      { name: "FlexibleTieredStaking", address: "0x0106CbC32f3C10f68c4b58009D7054b31B99c264", method: "owner" },
      { name: "ArweaveGateway", address: "0xde84a771cbB8A8522E2732d991d162c387e1E2db", method: "owner" },
      { name: "ImprovedTimelock", address: "0x5592113B66a4068F21cbe08Ee1Ca70b12C9E14f8", method: "admin" },
      { name: "TreasuryYieldStrategy", address: "0x1eDa0B2c614890DD974336bBEdE5aB4F4a55666f", method: "owner" },
    ],
  },
  {
    name: "Base Sepolia Testnet",
    chainId: 84532,
    rpcUrl: ALCHEMY_API_KEY
      ? `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
      : "https://sepolia.base.org",
    contracts: [
      { name: "ReflectiveToken (Token Proxy)", address: "0xB49872C1aD8a052f1369ABDfC890264938647EB6", method: "owner" },
      { name: "TokenDistribution", address: "0x59ff0451A0718237CAd0FDb0835338180C66580e", method: "owner" },
      { name: "FlexibleTieredStaking", address: "0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822", method: "owner" },
      { name: "ArweaveGateway", address: "0x64E4EFc69A94aeEB23Efb1E2629386C71e01cde4", method: "owner" },
      { name: "ImprovedTimelock", address: "0x986Aa78997327B9a9b7507429a6cE72A5De993e3", method: "admin" },
      { name: "ProxyAdmin", address: "0x5627785DBcfEdEc7f2ff4c1f2E94928825A3449B", method: "owner" },
      { name: "Auction (Fixed)", address: "0x047E9919D2Cc9Be8C92BD9aD65b592D03516bae5", method: "owner" },
      { name: "Auction (Latest)", address: "0xD78444e0E752676fF5673eC5422eB72CB65e0338", method: "owner" },
    ],
  },
  {
    name: "Localhost (Hardhat)",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    contracts: [
      { name: "ReflectiveToken (Token Proxy)", address: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", method: "owner" },
      { name: "TokenDistribution", address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", method: "owner" },
      { name: "FlexibleTieredStaking", address: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788", method: "owner" },
      { name: "ArweaveGateway", address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", method: "owner" },
      { name: "ImprovedTimelock", address: "0x0165878A594ca255338adfa4d48449f69242Eb8F", method: "admin" },
      { name: "ProxyAdmin", address: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6", method: "owner" },
      { name: "Auction", address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", method: "owner" },
    ],
  },
];

const OWNER_ABI = [
  "function owner() view returns (address)",
];

const ADMIN_ABI = [
  "function admin() view returns (address)",
];

async function checkNetworkOwnership(network: typeof NETWORKS[0]) {
  console.log(`\n============================================================`);
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔗 RPC URL: ${network.rpcUrl}`);
  console.log(`============================================================`);

  const provider = new ethers.JsonRpcProvider(network.rpcUrl);

  try {
    // Quick ping to check if network is reachable
    await provider.getNetwork();
  } catch (err: any) {
    console.log(`❌ Network is offline or unreachable.`);
    return;
  }

  for (const contract of network.contracts) {
    try {
      const abi = contract.method === "owner" ? OWNER_ABI : ADMIN_ABI;
      const contractInstance = new ethers.Contract(contract.address, abi, provider);
      
      let ownerOrAdmin = "";
      if (contract.method === "owner") {
        ownerOrAdmin = await contractInstance.owner();
      } else {
        ownerOrAdmin = await contractInstance.admin();
      }

      console.log(`📋 ${contract.name.padEnd(30)} | Addr: ${contract.address} | Owner/Admin: ${ownerOrAdmin}`);
    } catch (err: any) {
      console.log(`❌ ${contract.name.padEnd(30)} | Addr: ${contract.address} | Query Failed: ${err.shortMessage || err.message}`);
    }
  }
}

async function main() {
  console.log("🔍 Starting Contract Ownership Query Tool...");
  for (const network of NETWORKS) {
    await checkNetworkOwnership(network);
  }
  console.log(`\n✅ Query complete!`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
