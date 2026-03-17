import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Blockchain configuration
// IMPORTANT: Contract addresses must match frontend config in frontend/src/config/networks.ts
export const BLOCKCHAIN_CONFIG = {
  // Base Mainnet (chainId 8453) - default for production
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://mainnet.base.org',
  // Base Mainnet (chainId 8453) - must match frontend CONTRACT_ADDRESSES[8453].flexibleTieredStaking
  // Base Mainnet: 0x0106CbC32f3C10f68c4b58009D7054b31B99c264 (FlexibleTieredStaking)
  // Base Sepolia Testnet: 0x23A94f5C6FCb46EbB5888E02CF66eB80E13CE822
  stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS || '0x0106CbC32f3C10f68c4b58009D7054b31B99c264',
  // Base Mainnet (chainId 8453) - must match frontend CONTRACT_ADDRESSES[8453].reflectiveToken
  // Base Mainnet: 0x42364e088eFeB481cE811eF9caDd95F36e3F36c0 (ReflectiveToken proxy)
  tokenContractAddress: process.env.TOKEN_CONTRACT_ADDRESS || '0x42364e088eFeB481cE811eF9caDd95F36e3F36c0',
  // Base Mainnet (chainId 8453) - must match frontend CONTRACT_ADDRESSES[8453].tokenDistribution
  // Base Mainnet: 0xE1bABA07752ce8bD574eEa5aBe494521B3028638 (TokenDistribution)
  distributionContractAddress: process.env.DISTRIBUTION_CONTRACT_ADDRESS || '0xE1bABA07752ce8bD574eEa5aBe494521B3028638',
};

// Staking Contract ABI (minimal interface for verification)
export const STAKING_CONTRACT_ABI = [
  'function hasAccess(address user) external view returns (bool)',
  'function getUserTier(address user) external view returns (int256, string)', // Returns tuple: (tierIndex, tierName)
  'function userStakedTokens(address user) external view returns (uint256)',
  'function getUserStakedUSD(address user) external view returns (uint256)',
];

// Token Contract ABI (minimal interface)
export const TOKEN_CONTRACT_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function decimals() external view returns (uint8)',
];

// Token Distribution Contract ABI (for vesting info)
export const DISTRIBUTION_CONTRACT_ABI = [
  'function getVestingInfo(address member) external view returns (uint256, uint256, uint256, uint256)',
  'function vestingInfo(address) external view returns (uint256 totalAmount, uint256 startTime, uint256 duration, uint256 claimed, bool isActive)',
  'function VESTING_CLIFF() external view returns (uint256)',
  'function VESTING_DURATION() external view returns (uint256)',
  'function calculateClaimable(address member) external view returns (uint256)',
  'function isWalletActive(address member) external view returns (bool)',
];

// Initialize provider
let provider: ethers.JsonRpcProvider | null = null;
let stakingContract: ethers.Contract | null = null;
let tokenContract: ethers.Contract | null = null;
let distributionContract: ethers.Contract | null = null;

export const initializeBlockchain = () => {
  try {
    provider = new ethers.JsonRpcProvider(BLOCKCHAIN_CONFIG.rpcUrl);
    
    stakingContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.stakingContractAddress,
      STAKING_CONTRACT_ABI,
      provider
    );
    
    tokenContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.tokenContractAddress,
      TOKEN_CONTRACT_ABI,
      provider
    );
    
    distributionContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.distributionContractAddress,
      DISTRIBUTION_CONTRACT_ABI,
      provider
    );
    
    console.log('✅ Blockchain provider initialized');
    console.log(`📡 RPC: ${BLOCKCHAIN_CONFIG.rpcUrl}`);
    console.log(`📝 Staking Contract: ${BLOCKCHAIN_CONFIG.stakingContractAddress}`);
    console.log(`📝 Distribution Contract: ${BLOCKCHAIN_CONFIG.distributionContractAddress}`);
    
    return { provider, stakingContract, tokenContract, distributionContract };
  } catch (error) {
    console.error('❌ Failed to initialize blockchain provider:', error);
    throw error;
  }
};

// Helper functions for blockchain interactions
export const verifyUserAccess = async (walletAddress: string): Promise<boolean> => {
  if (!stakingContract) {
    throw new Error('Staking contract not initialized');
  }
  
  try {
    const hasAccess = await stakingContract.hasAccess(walletAddress);
    return hasAccess;
  } catch (error) {
    console.error('Error verifying user access:', error);
    return false;
  }
};

export const getUserTier = async (walletAddress: string): Promise<number> => {
  if (!stakingContract) {
    throw new Error('Staking contract not initialized');
  }
  
  try {
    // getUserTier returns a tuple: (int256 tierIndex, string memory tierName)
    const result = await stakingContract.getUserTier(walletAddress);
    // Extract the tier index (first element of tuple)
    // ethers.js returns tuples as arrays when the ABI is correct
    const tierIndex = Array.isArray(result) ? result[0] : result;
    const tierNumber = Number(tierIndex);
    console.log(`[getUserTier] Wallet: ${walletAddress}, Tier: ${tierNumber}`);
    return tierNumber;
  } catch (error) {
    console.error('Error getting user tier:', error);
    return -1;
  }
};

export const getUserStakedAmount = async (walletAddress: string): Promise<string> => {
  if (!stakingContract) {
    throw new Error('Staking contract not initialized');
  }
  
  try {
    const stakedAmount = await stakingContract.userStakedTokens(walletAddress);
    return ethers.formatEther(stakedAmount);
  } catch (error) {
    console.error('Error getting staked amount:', error);
    return '0';
  }
};

export const getProvider = () => provider;
export const getStakingContract = () => stakingContract;
export const getTokenContract = () => tokenContract;
export const getDistributionContract = () => distributionContract;








