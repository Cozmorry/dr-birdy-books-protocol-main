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

export const LOCALHOST: NetworkConfig = {
  chainId: 31337,
  name: 'Localhost (Hardhat)',
  rpcUrl: 'http://127.0.0.1:8545',
  blockExplorer: ''
};

// Mainnet is the primary network, testnet is for testing
export const SUPPORTED_NETWORKS = [BASE_MAINNET, BASE_TESTNET, LOCALHOST];

// Oracle configurations for each network
export const ORACLE_CONFIGS = {
  [BASE_MAINNET.chainId]: {
    primaryOracle: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', // Chainlink ETH/USD on Base (data.chain.link)
    backupOracle: '0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8', // Chainlink BTC/USD on Base
    uniswapRouter: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Uniswap V2 Router on Base
    chainlinkETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Chainlink ETH/USD on Ethereum (fallback)
  },
  [BASE_TESTNET.chainId]: {
    primaryOracle: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', // Chainlink ETH/USD on Base Sepolia
    backupOracle: '0x6A7A5c3825438cf93dAe5C4C7B0a5c55fDcf1649', // Chainlink BTC/USD on Base Sepolia
    uniswapRouter: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Uniswap V2 Router on Base Sepolia
    chainlinkETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Chainlink ETH/USD on Ethereum (fallback)
  },
  [LOCALHOST.chainId]: {
    primaryOracle: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Mock Primary Oracle (Hardhat)
    backupOracle:  '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Mock Backup Oracle (Hardhat)
    uniswapRouter: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Placeholder (deployer addr)
    chainlinkETH:  '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Same as primary mock
  }
};

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [BASE_MAINNET.chainId]: {
    // ✅ LATEST MAINNET DEPLOYMENT (Jan 24, 2026) - Fixed vesting bug & preserved original timeline
    // ⚠️ New TokenDistribution not yet excluded from fees (missing 37.5k tokens)
    reflectiveToken: '0x42364e088eFeB481cE811eF9caDd95F36e3F36c0', // ✅ PROXY - Users interact with this
    tokenDistribution: '0xE1bABA07752ce8bD574eEa5aBe494521B3028638', // ✅ NEW DISTRIBUTION - Fixed _migrateVestingData bug
    flexibleTieredStaking: '0x0106CbC32f3C10f68c4b58009D7054b31B99c264', // ✅ Cutover: new FlexibleTieredStaking (token owner updated)
    arweaveGateway: '0xde84a771cbB8A8522E2732d991d162c387e1E2db', // ✅ NEW MAINNET ARWEAVE GATEWAY
    improvedTimelock: '0x5592113B66a4068F21cbe08Ee1Ca70b12C9E14f8', // ✅ NEW MAINNET TIMELOCK
    tokenImplementation: '0xF131837df0763bD4F0eB2ee8B1dDD622a2276a4B', // ℹ️ Implementation contract (users don't interact with this)
    proxyAdmin: undefined as any, // Managed by OpenZeppelin upgrades
    treasuryYieldStrategy: '0x1eDa0B2c614890DD974336bBEdE5aB4F4a55666f', // Keep existing strategy unless redeployed
    continuousClearingAuction: process.env.REACT_APP_AUCTION_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  [BASE_TESTNET.chainId]: {
    reflectiveToken: '0xB49872C1aD8a052f1369ABDfC890264938647EB6', // ✅ PROXY - Deployed Dec 8, 2025 with manual proxy pattern
    tokenDistribution: '0x59ff0451A0718237CAd0FDb0835338180C66580e', // ✅ UPDATED - New deployment Dec 8, 2025
    flexibleTieredStaking: '0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822', // ✅ UPDATED - New deployment Dec 8, 2025
    arweaveGateway: '0x64E4EFc69A94aeEB23Efb1E2629386C71e01cde4', // ✅ UPDATED - New deployment Dec 8, 2025
    improvedTimelock: '0x986Aa78997327B9a9b7507429a6cE72A5De993e3', // ✅ UPDATED - New deployment Dec 8, 2025
    proxyAdmin: '0x5627785DBcfEdEc7f2ff4c1f2E94928825A3449B', // ✅ NEW - ProxyAdmin for upgradeability
    tokenImplementation: '0x82d0079cB7D5fE492B673a3d9ad24fFA1c4E5882', // ℹ️ INFO - Implementation contract (users don't interact with this)
    continuousClearingAuction: process.env.REACT_APP_AUCTION_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  [LOCALHOST.chainId]: {
    // ✅ Deployed 2026-06-01 via scripts/deploy-localhost-fast.ts
    reflectiveToken:          '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318', // Token Proxy
    tokenDistribution:        '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    flexibleTieredStaking:    '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    arweaveGateway:           '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    improvedTimelock:         '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    tokenImplementation:      '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    proxyAdmin:               '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
    treasuryYieldStrategy:    '0x0000000000000000000000000000000000000000', // Not deployed on localhost
    continuousClearingAuction: process.env.REACT_APP_AUCTION_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
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