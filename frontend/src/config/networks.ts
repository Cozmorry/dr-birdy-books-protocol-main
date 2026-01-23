import { NetworkConfig } from '../types';

export const BASE_MAINNET: NetworkConfig = {
  chainId: 8453,
  name: 'Base Mainnet',
  rpcUrl: 'https://mainnet.base.org',
  blockExplorer: 'https://basescan.org'
};

export const BASE_TESTNET: NetworkConfig = {
  chainId: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org'
};

// Mainnet is the primary network, testnet is for testing
export const SUPPORTED_NETWORKS = [BASE_MAINNET, BASE_TESTNET];

// Oracle configurations for each network
export const ORACLE_CONFIGS = {
  [BASE_MAINNET.chainId]: {
    primaryOracle: '0x71041dDDaD356F8F9546D0Ba93B54C0b4C458375', // Chainlink ETH/USD on Base
    backupOracle: '0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8', // Chainlink BTC/USD on Base
    uniswapRouter: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Uniswap V2 Router on Base
    chainlinkETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Chainlink ETH/USD on Ethereum (fallback)
  },
  [BASE_TESTNET.chainId]: {
    primaryOracle: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', // Chainlink ETH/USD on Base Sepolia
    backupOracle: '0x6A7A5c3825438cf93dAe5C4C7B0a5c55fDcf1649', // Chainlink BTC/USD on Base Sepolia
    uniswapRouter: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Uniswap V2 Router on Base Sepolia
    chainlinkETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Chainlink ETH/USD on Ethereum (fallback)
  }
};

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [BASE_MAINNET.chainId]: {
    // ✅ LATEST MAINNET DEPLOYMENT (Jan 14, 2026) - Proxy Pattern ReflectiveToken
    // ✅ All contracts properly configured with fee exclusions
    reflectiveToken: '0x42364e088eFeB481cE811eF9caDd95F36e3F36c0', // ✅ PROXY - Users interact with this
    tokenDistribution: '0x7E9325C35f9A19185e29a90b07Eafe38B8cC60E3', // ✅ NEW MAINNET DISTRIBUTION (excluded from fees)
    flexibleTieredStaking: '0x71163f316b1797c4069a01aE104d8efDAEA024E4', // ✅ NEW MAINNET STAKING
    arweaveGateway: '0xde84a771cbB8A8522E2732d991d162c387e1E2db', // ✅ NEW MAINNET ARWEAVE GATEWAY
    improvedTimelock: '0x5592113B66a4068F21cbe08Ee1Ca70b12C9E14f8', // ✅ NEW MAINNET TIMELOCK
    tokenImplementation: '0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B', // ℹ️ Implementation contract (users don't interact with this)
    proxyAdmin: undefined as any, // Managed by OpenZeppelin upgrades
    treasuryYieldStrategy: '0x1eDa0B2c614890DD974336bBEdE5aB4F4a55666f', // Keep existing strategy unless redeployed
  },
  [BASE_TESTNET.chainId]: {
    reflectiveToken: '0xB49872C1aD8a052f1369ABDfC890264938647EB6', // ✅ PROXY - Deployed Dec 8, 2025 with manual proxy pattern
    tokenDistribution: '0x59ff0451A0718237CAd0FDb0835338180C66580e', // ✅ UPDATED - New deployment Dec 8, 2025
    flexibleTieredStaking: '0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822', // ✅ UPDATED - New deployment Dec 8, 2025
    arweaveGateway: '0x64E4EFc69A94aeEB23Efb1E2629386C71e01cde4', // ✅ UPDATED - New deployment Dec 8, 2025
    improvedTimelock: '0x986Aa78997327B9a9b7507429a6cE72A5De993e3', // ✅ UPDATED - New deployment Dec 8, 2025
    proxyAdmin: '0x5627785DBcfEdEc7f2ff4c1f2E94928825A3449B', // ✅ NEW - ProxyAdmin for upgradeability
    tokenImplementation: '0x82d0079cB7D5fE492B673a3d9ad24fFA1c4E5882', // ℹ️ INFO - Implementation contract (users don't interact with this)
  },
};

// Helper function to get oracle config for current network
export const getOracleConfig = (chainId: number) => {
  return ORACLE_CONFIGS[chainId] || ORACLE_CONFIGS[BASE_MAINNET.chainId];
};

// Helper function to get network config by chain ID
export const getNetworkConfig = (chainId: number) => {
  return SUPPORTED_NETWORKS.find(network => network.chainId === chainId) || BASE_MAINNET;
};

// Helper function to get contract addresses for current network
export const getContractAddresses = (chainId: number) => {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[BASE_MAINNET.chainId];
};