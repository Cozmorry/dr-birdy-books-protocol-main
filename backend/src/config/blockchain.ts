import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Blockchain configuration
// IMPORTANT: Contract addresses must match frontend config in frontend/src/config/networks.ts
export const BLOCKCHAIN_CONFIG = {
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org',
  // Base Sepolia (chainId 84532) - must match frontend CONTRACT_ADDRESSES[84532].flexibleTieredStaking
  stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS || '0xDB1A28eA484f0321d242a293ae42c74f71E14FC0',
  // Base Sepolia (chainId 84532) - must match frontend CONTRACT_ADDRESSES[84532].reflectiveToken
  tokenContractAddress: process.env.TOKEN_CONTRACT_ADDRESS || '0x02e4346067b96FfA5F4A6F2005c4fb98C39Da38c',
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

// Initialize provider
let provider: ethers.JsonRpcProvider | null = null;
let stakingContract: ethers.Contract | null = null;
let tokenContract: ethers.Contract | null = null;

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
    
    console.log('✅ Blockchain provider initialized');
    console.log(`📡 RPC: ${BLOCKCHAIN_CONFIG.rpcUrl}`);
    console.log(`📝 Staking Contract: ${BLOCKCHAIN_CONFIG.stakingContractAddress}`);
    
    return { provider, stakingContract, tokenContract };
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








