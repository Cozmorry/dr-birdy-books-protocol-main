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
  name: 'Localhost',
  rpcUrl: 'http://127.0.0.1:8545',
  blockExplorer: ''
};

export const SUPPORTED_NETWORKS = [BASE_MAINNET, BASE_TESTNET, LOCALHOST];

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
  },
  [LOCALHOST.chainId]: {
    primaryOracle: '0x398DCFe98a0DEa56Bc6A550db0DC475EbfFD256c', // Mock oracle for localhost
    backupOracle: '0xa1e11F45558997fc52E1345D618AB3DeA3331a41', // Mock oracle for localhost
    uniswapRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router (Ethereum mainnet)
    chainlinkETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Chainlink ETH/USD on Ethereum
  }
};

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [BASE_MAINNET.chainId]: {
    reflectiveToken: '0x0000000000000000000000000000000000000000', // Update with actual Base Mainnet address
    tokenDistribution: '0x0000000000000000000000000000000000000000', // Update with actual Base Mainnet address
    flexibleTieredStaking: '0x0000000000000000000000000000000000000000', // Update with actual Base Mainnet address
    arweaveGateway: '0x0000000000000000000000000000000000000000', // Update with actual Base Mainnet address
    improvedTimelock: '0x0000000000000000000000000000000000000000', // Update with actual Base Mainnet address
  },
  [BASE_TESTNET.chainId]: {
    reflectiveToken: '0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c', // ✅ FIXED - With balanceOf() fix for unstaking
    tokenDistribution: '0x951f92b9897f632B0caE54502C8016F4cEd0e969', // ✅ FIXED - With correct TOTAL_DISTRIBUTED (1M tokens)
    flexibleTieredStaking: '0x09b611a69BecdA1c2D043D423F70EA9a7fc3c7d3', // ✅ REDEPLOYED - Owned by: 0xE409c2F794647AC4940d7f1B6506790098bbA136
    arweaveGateway: '0xe5C61ff65d10FfBBbaf706Bd9E97D5965708c1Fa', // Deployed on Base Sepolia
    improvedTimelock: '0xc875dEC51d1a0ff97Fb23c3004aBBb9feC0eba48', // Deployed on Base Sepolia
  },
  [LOCALHOST.chainId]: {
    reflectiveToken: '0x4213F020e9430F3549614231A4Dc06226FEEae40',
    tokenDistribution: '0x7d479974CeF2B37377aA06e9DbaC01b379fd79f4',
    flexibleTieredStaking: '0xEA654465C976A6f029eFA5e311BC089d6Cf3bd6F',
    arweaveGateway: '0x763f85d0dCAD625ef737E462B7720b9f5a4Ed399',
    improvedTimelock: '0xc3dBEd8206C2f17E5d279DB94A430FA9cF10f1c2',
  },
};



/** WORKING ON LOCALHOST
 * [LOCALHOST.chainId]: {
    reflectiveToken: '0x705f0380F17D8B45CF2D0E4Ef9c2052316f5385f',
    tokenDistribution: '0x515fbd88DcC7003dB2af933C6a1140cBc9b58dbd',
    flexibleTieredStaking: '0xa9c456E11403A5B222A11eE0573c8BF54227cDe4',
    arweaveGateway: '0x7970048249D63cf8324aBA4a458fC05B3CA8D7DD',
    improvedTimelock: '0x9998919aB0EE6f381EdA461A7bB1bebC5D5C16D6',
  },
 */
// Helper function to get oracle config for current network
export const getOracleConfig = (chainId: number) => {
  return ORACLE_CONFIGS[chainId] || ORACLE_CONFIGS[LOCALHOST.chainId];
};

// Helper function to get network config by chain ID
export const getNetworkConfig = (chainId: number) => {
  return SUPPORTED_NETWORKS.find(network => network.chainId === chainId) || LOCALHOST;
};

// Helper function to get contract addresses for current network
export const getContractAddresses = (chainId: number) => {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[LOCALHOST.chainId];
};