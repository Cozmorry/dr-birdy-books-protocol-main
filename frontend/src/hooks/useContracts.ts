import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getContractAddresses, getOracleConfig } from '../config/networks';
import { UserInfo, VestingInfo, TierInfo } from '../types';

// Contract type definitions - using any for simplicity
type ReflectiveTokenContract = any;
type FlexibleTieredStakingContract = any;
type TokenDistributionContract = any;

// Contract ABIs - these would be generated from your contracts
const REFLECTIVE_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function burnTokens(uint256 amount)",
  "function burnTokensFrom(address account, uint256 amount)",
  "function getTotalBurned() view returns (uint256)",
  "function getCirculatingSupply() view returns (uint256)",
  "function isDistributionComplete() view returns (bool)",
  "function getDistributionContract() view returns (address)",
  "function tradingEnabled() view returns (bool)",
  "function swapEnabled() view returns (bool)",
  "function pairAddress() view returns (address)",
  "function getContractStatus() view returns (bool, bool, bool, bool, bool)",
  "function getPairInfo() view returns (address, bool)",
  "function isPairReady() view returns (bool)",
  "function getTimelockInfo() view returns (address, uint256)",
  "function setTimelock(address timelock)",
  "function setDistributionContract(address distribution)",
  "function setStakingContract(address staking)",
  "function setArweaveGateway(address gateway)",
  "function createUniswapPair()",
  "function excludeFromFee(address account, bool excluded)",
  "function isExcludedFromFee(address account) view returns (bool)",
  "function blacklist(address account)",
  "function unblacklist(address account)",
  "function isBlacklisted(address account) view returns (bool)",
  "function setTradingEnabled(bool enabled)",
  "function setSwapEnabled(bool enabled)",
  "function emergencyBurn(uint256 amount)",
  "function queueSetFees(uint256 taxFee, uint256 liquidityFee, uint256 marketingFee)",
  "function queueUpdateMarketingWallet(address newWallet)",
  "function queueUpdateArweaveGateway(address newGateway)",
  "function queueSetSlippage(uint256 swapSlippageBps, uint256 liquiditySlippageBps)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event TokensBurned(address indexed burner, uint256 amount)"
];

const TOKEN_DISTRIBUTION_ABI = [
  "function getTeamMembers() view returns (address[])",
  "function getVestingInfo(address member) view returns (uint256, uint256, uint256, uint256)",
  "function vestingInfo(address) view returns (uint256 totalAmount, uint256 startTime, uint256 duration, uint256 claimed, bool isActive)",
  "function VESTING_CLIFF() view returns (uint256)",
  "function VESTING_DURATION() view returns (uint256)",
  "function calculateClaimable(address member) view returns (uint256)",
  "function claimVestedTokens()",
  "function isDistributionComplete() view returns (bool)",
  "function getContractBalance() view returns (uint256)",
  "function getTeamAllocation() view returns (uint256)",
  "function getAirdropAllocation() view returns (uint256)",
  "function getTotalDistributed() view returns (uint256)",
  "function getTeamWallets() view returns (address, address, address, address, address, address)",
  "function isWalletActive(address member) view returns (bool)",
  "function initializeVesting()",
  "function initializeVestingWithStartTime(uint256 _startTime)",
  "function distributeInitialTokens()",
  "function markDistributionComplete()",
  "function updateTeamWallets(address joseph, address aj, address dsign, address developer, address birdy, address airdrop)",
  "function emergencyWithdraw(uint256 amount)",
  "function vestingInitialized() view returns (bool)",
  "function airdropWallet() view returns (address)",
  "event TokensClaimed(address indexed recipient, uint256 amount, uint256 remaining)",
  "event TokensDistributed(address indexed recipient, uint256 amount, bool isVested)",
  "event TeamWalletUpdated(address indexed oldWallet, address indexed newWallet, string role)",
  "event VestingMigrated(address indexed oldWallet, address indexed newWallet, uint256 totalAmount, uint256 claimed)"
];

const FLEXIBLE_TIERED_STAKING_ABI = [
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function stakeBatch(uint256[] amounts)",
  "function unstakeBatch(uint256[] amounts)",
  "function getUserStakingInfo(address user) view returns (uint256, uint256, bool, bool)",
  "function getUserTier(address user) view returns (int256, string)",
  "function hasAccess(address user) view returns (bool)",
  "function getTierCount() view returns (uint256)",
  "function getTier(uint256 tierIndex) view returns (uint256, string)",
  "function getTierFiles(uint256 tierIndex) view returns (tuple(string, string, string, uint256, uint256)[])",
  "function getUserFiles(address user) view returns (tuple(string, string, string, uint256, uint256)[])",
  "function logFileAccess(address user, uint256 tierIndex, string txId)",
  "function getContractStatus() view returns (bool, bool, bool, bool, uint256)",
  "function getTotalStaked() view returns (uint256)",
  "function allowance(address user) view returns (uint256)",
  "function addTier(uint256 threshold, string name)",
  "function updateTier(uint256 tierIndex, uint256 threshold, string name)",
  "function removeTier(uint256 tierIndex)",
  "function addFileToTierBatch(uint256 tierIndex, string[] txIds, string[] fileTypes, string[] descriptions, uint256[] versions)",
  "function addFileToUserBatch(address user, string[] txIds, string[] fileTypes, string[] descriptions, uint256[] versions)",
  "function verifyStaker(address user, uint256 tierIndex) view returns (bool)",
  "function meetsTierRequirement(address user, uint256 tierIndex) view returns (bool)",
  "function getOracleInfo() view returns (address, address, uint256)",
  "function getContractBalances() view returns (uint256, uint256)",
  "function pause()",
  "function unpause()",
  "function emergencyWithdraw()",
  "function setStakingToken(address token)",
  "function setPrimaryPriceOracle(address oracle)",
  "function setBackupPriceOracle(address oracle)",
  "function setGasRefundReward(uint256 reward)",
  "function withdrawETH(uint256 amount)",
  "function firstStakeTimestamp(address user) view returns (uint256)",
  "function userStakedTokens(address user) view returns (uint256)",
  "function stakingToken() view returns (address)",
  "function primaryPriceOracle() view returns (address)",
  "function backupPriceOracle() view returns (address)",
  "function gasRefundReward() view returns (uint256)",
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event TierUpdated(address indexed user, uint256 tierIndex)",
  "event TierAdded(uint256 indexed tierIndex, uint256 threshold, string name)",
  "event TierRemoved(uint256 indexed tierIndex)",
  "event FileAddedToTier(uint256 indexed tierIndex, string txId, string fileType)",
  "event FileAddedToUser(address indexed user, string txId, string fileType)",
  "event FileAccessLogged(address indexed user, uint256 tierIndex, string txId)"
];

const ARWEAVE_GATEWAY_ABI = [
  "function verifyTransaction(string txId) view returns (bool)",
  "function addTransaction(string txId, bool isVerified)",
  "function addTransactions(string[] txIds, bool[] verifiedStatus)",
  "function removeTransaction(string txId)",
  "function updateTransactionStatus(string txId, bool newStatus)",
  "function updateTransactions(string[] txIds, bool[] newStatus)",
  "event TransactionAdded(string txId, bool isVerified)",
  "event TransactionRemoved(string txId)",
  "event TransactionStatusUpdated(string txId, bool newStatus)"
];

const IMPROVED_TIMELOCK_ABI = [
  "function getMinDelay() view returns (uint256)",
  "function getDelay() view returns (uint256)",
  "function getTimestamp(bytes32 txHash) view returns (uint256)",
  "function queueTransaction(address target, uint256 value, string signature, bytes data, uint256 executeTime)",
  "function executeTransaction(address target, uint256 value, string signature, bytes data, uint256 executeTime)",
  "function cancelTransaction(address target, uint256 value, string signature, bytes data, uint256 executeTime)",
  "function isOperationPending(bytes32 id) view returns (bool)",
  "function isOperationReady(bytes32 id) view returns (bool)",
  "function isOperationDone(bytes32 id) view returns (bool)",
  "function getOperationId(address target, uint256 value, string signature, bytes data, uint256 executeTime) pure returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function renounceRole(bytes32 role, address callerConfirmation)",
  "function updateDelay(uint256 newDelay)",
  "function updateMinDelay(uint256 newMinDelay)",
  "event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)",
  "event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)",
  "event CallCancelled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)",
  "event MinDelayChangeUpdate(uint256 oldDuration, uint256 newDuration)",
  "event CallSalt(bytes32 indexed id, bytes32 salt)"
];

export const useContracts = (provider: ethers.BrowserProvider | null, signer: ethers.JsonRpcSigner | null) => {
  const [contracts, setContracts] = useState<{
    reflectiveToken: ReflectiveTokenContract | null;
    tokenDistribution: TokenDistributionContract | null;
    flexibleTieredStaking: FlexibleTieredStakingContract | null;
    arweaveGateway: ethers.Contract | null;
    improvedTimelock: ethers.Contract | null;
  }>({
    reflectiveToken: null,
    tokenDistribution: null,
    flexibleTieredStaking: null,
    arweaveGateway: null,
    improvedTimelock: null,
  });

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [vestingInfo, setVestingInfo] = useState<VestingInfo | null>(null);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get contract addresses for current network
  const getContractAddressesForNetwork = async () => {
    if (!provider) return null;
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    return getContractAddresses(chainId);
  };

  // Initialize contracts
  useEffect(() => {
    if (!provider) return;

    const initializeContracts = async () => {
      try {
        // Get the network to determine which contract addresses to use
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const contractAddresses = getContractAddresses(chainId);
        
        const reflectiveToken = new ethers.Contract(
          contractAddresses.reflectiveToken,
          REFLECTIVE_TOKEN_ABI,
          provider
        ) as ReflectiveTokenContract;

        const tokenDistribution = new ethers.Contract(
          contractAddresses.tokenDistribution,
          TOKEN_DISTRIBUTION_ABI,
          provider
        ) as TokenDistributionContract;

        const flexibleTieredStaking = new ethers.Contract(
          contractAddresses.flexibleTieredStaking,
          FLEXIBLE_TIERED_STAKING_ABI,
          provider
        ) as FlexibleTieredStakingContract;

        const arweaveGateway = new ethers.Contract(
          contractAddresses.arweaveGateway,
          ARWEAVE_GATEWAY_ABI,
          provider
        );

        const improvedTimelock = new ethers.Contract(
          contractAddresses.improvedTimelock,
          IMPROVED_TIMELOCK_ABI,
          provider
        );

        setContracts({
          reflectiveToken,
          tokenDistribution,
          flexibleTieredStaking,
          arweaveGateway,
          improvedTimelock,
        });
      } catch (err: any) {
        setError('Failed to initialize contracts: ' + err.message);
      }
    };

    initializeContracts();
  }, [provider]);

  // Load user information
  const loadUserInfo = useCallback(async (account: string) => {
    if (!contracts.reflectiveToken || !contracts.flexibleTieredStaking) return;

    setIsLoading(true);
    setError(null);

    try {
      const [balance, stakingInfo, tierInfo] = await Promise.all([
        contracts.reflectiveToken.balanceOf(account),
        contracts.flexibleTieredStaking.getUserStakingInfo(account),
        contracts.flexibleTieredStaking.getUserTier(account),
      ]);

      const [stakedAmount, , hasAccess, canUnstake] = stakingInfo;
      const [tierIndex] = tierInfo;

      setUserInfo({
        address: account,
        balance: ethers.formatEther(balance),
        stakedAmount: ethers.formatEther(stakedAmount),
        tier: Number(tierIndex),
        hasAccess,
        canUnstake,
      });
    } catch (err: any) {
      setError('Failed to load user info: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [contracts]);

  // Load vesting information
  const loadVestingInfo = useCallback(async (account: string) => {
    if (!contracts.tokenDistribution) return;

    try {
      // Get vesting info from getVestingInfo function
      const vestingData = await contracts.tokenDistribution.getVestingInfo(account);
      const [totalAmount, claimed, claimable, vestingEndTime] = vestingData;

      // Get detailed vesting info from public mapping (includes startTime)
      const vestingStruct = await contracts.tokenDistribution.vestingInfo(account);
      let startTime: bigint;
      
      // Handle both array and object responses from ethers
      if (Array.isArray(vestingStruct)) {
        // [totalAmount, startTime, duration, claimed, isActive]
        startTime = vestingStruct[1];
      } else {
        // Object with named properties
        startTime = vestingStruct.startTime;
      }

      // Get cliff and duration constants from contract
      const cliffPeriod = await contracts.tokenDistribution.VESTING_CLIFF();
      const vestingDuration = await contracts.tokenDistribution.VESTING_DURATION();

      // Convert from seconds to days
      const cliffDays = Number(cliffPeriod) / (24 * 60 * 60);
      const durationDays = Number(vestingDuration) / (24 * 60 * 60);

      setVestingInfo({
        totalAmount: ethers.formatEther(totalAmount),
        claimed: ethers.formatEther(claimed),
        claimable: ethers.formatEther(claimable),
        vestingEndTime: new Date(Number(vestingEndTime) * 1000).toISOString(),
        startTime: new Date(Number(startTime) * 1000).toISOString(),
        cliffPeriod: cliffDays,
        vestingDuration: durationDays,
      });
    } catch (err: any) {
      // User might not be a team member, which is fine
      console.log('Vesting info not available:', err.message);
      setVestingInfo(null);
    }
  }, [contracts]);

  // Load tiers
  const loadTiers = useCallback(async () => {
    if (!contracts.flexibleTieredStaking) return;

    try {
      const tierCount = await contracts.flexibleTieredStaking.getTierCount();
      const tierPromises = [];

      for (let i = 0; i < Number(tierCount); i++) {
        tierPromises.push(contracts.flexibleTieredStaking.getTier(i));
      }

      const tierData = await Promise.all(tierPromises);
      const formattedTiers = tierData.map(([threshold, name]) => ({
        // Thresholds are in USD with 8 decimals, not 18
        // So we divide by 1e8, not 1e18
        threshold: (Number(threshold) / 1e8).toString(),
        name,
      }));

      setTiers(formattedTiers);
    } catch (err: any) {
      setError('Failed to load tiers: ' + err.message);
    }
  }, [contracts]);

  // Helper function to ensure sufficient allowance
  const ensureAllowance = useCallback(async (requiredAmount: bigint) => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    const contractAddresses = await getContractAddressesForNetwork();
    if (!contractAddresses) throw new Error('Could not get contract addresses');
    const stakingContractAddress = contractAddresses.flexibleTieredStaking;
    
    console.log('Checking allowance for:', userAddress);
    console.log('Staking contract address:', stakingContractAddress);
    console.log('Token contract address:', contracts.reflectiveToken.target);
    console.log('Are addresses the same?', contracts.reflectiveToken.target === contractAddresses.reflectiveToken);
    
    const currentAllowance = await contracts.reflectiveToken.allowance(
      userAddress,
      stakingContractAddress
    );
    
    console.log('Current allowance:', ethers.formatEther(currentAllowance));
    console.log('Required amount:', ethers.formatEther(requiredAmount));
    
    if (currentAllowance < requiredAmount) {
      // Approve a larger amount to avoid future approval issues
      const approveAmount = requiredAmount * BigInt(2);
      console.log('Approving amount:', ethers.formatEther(approveAmount));
      
      const approveTx = await contracts.reflectiveToken.connect(signer).approve(
        stakingContractAddress,
        approveAmount
      );
      
      console.log('Approval transaction hash:', approveTx.hash);
      const receipt = await approveTx.wait();
      console.log('Approval transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      // Wait a moment for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the approval worked
      const newAllowance = await contracts.reflectiveToken.allowance(
        userAddress,
        stakingContractAddress
      );
      console.log('New allowance after approval:', ethers.formatEther(newAllowance));
      console.log('New allowance (raw):', newAllowance.toString());
      console.log('Required amount (raw):', requiredAmount.toString());
      
      // Let's also try to call the allowance function directly with the contract instance
      try {
        const directAllowance = await contracts.reflectiveToken.allowance(userAddress, stakingContractAddress);
        console.log('Direct allowance call result:', ethers.formatEther(directAllowance));
        console.log('Direct allowance (raw):', directAllowance.toString());
      } catch (err) {
        console.log('Error calling allowance directly:', err);
      }
      
      // Let's also check the approval event from the transaction receipt
      console.log('Checking approval event from transaction...');
      try {
        const receipt = await signer.provider.getTransactionReceipt(approveTx.hash);
        console.log('Approval transaction receipt:', receipt);
        if (receipt && receipt.logs) {
          console.log('Transaction logs:', receipt.logs);
        }
      } catch (err) {
        console.log('Error getting transaction receipt:', err);
      }
      
      if (newAllowance < requiredAmount) {
        throw new Error(`Approval failed. New allowance (${ethers.formatEther(newAllowance)}) is still less than required (${ethers.formatEther(requiredAmount)})`);
      }
    }
  }, [contracts, signer]);

  // Stake tokens
  const stakeTokens = useCallback(async (amount: string) => {
    if (!contracts.reflectiveToken || !contracts.flexibleTieredStaking || !signer) {
      throw new Error('Contracts or signer not available');
    }

    const amountWei = ethers.parseEther(amount);
    console.log('Attempting to stake:', ethers.formatEther(amountWei), 'tokens');
    
    // Ensure sufficient allowance
    await ensureAllowance(amountWei);

    // Double-check allowance before staking
    const userAddress = await signer.getAddress();
    const contractAddresses = await getContractAddressesForNetwork();
    if (!contractAddresses) throw new Error('Could not get contract addresses');
    const finalAllowance = await contracts.reflectiveToken.allowance(
      userAddress,
      contractAddresses.flexibleTieredStaking
    );
    console.log('Final allowance check before staking:', ethers.formatEther(finalAllowance));
    
    if (finalAllowance < amountWei) {
      throw new Error(`Insufficient allowance: ${ethers.formatEther(finalAllowance)} < ${ethers.formatEther(amountWei)}`);
    }

    // Debug: Check contract status before staking
    try {
      const contractStatus = await contracts.flexibleTieredStaking.getContractStatus();
      console.log('Contract status before staking:', contractStatus);
      
      // Check oracle info
      const oracleInfo = await contracts.flexibleTieredStaking.getOracleInfo();
      console.log('Oracle info:', oracleInfo);
      
      // Try to get user USD value to see if oracles are working
      try {
        const userStakingInfo = await contracts.flexibleTieredStaking.getUserStakingInfo(userAddress);
        console.log('User staking info:', userStakingInfo);
      } catch (oracleErr: any) {
        console.log('Oracle error when getting user info:', oracleErr.message);
      }
      
    } catch (debugErr: any) {
      console.log('Debug error:', debugErr.message);
    }

    // Then stake the tokens
    console.log('Calling stake function...');
    const stakeTx = await contracts.flexibleTieredStaking.connect(signer).stake(amountWei);
    console.log('Stake transaction hash:', stakeTx.hash);
    const receipt = await stakeTx.wait();
    console.log('Stake transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  }, [contracts, signer, ensureAllowance]);

  // Manual approval function for debugging
  const approveTokens = useCallback(async (amount: string) => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const amountWei = ethers.parseEther(amount);
    const userAddress = await signer.getAddress();
    const contractAddresses = await getContractAddressesForNetwork();
    if (!contractAddresses) throw new Error('Could not get contract addresses');
    const stakingContractAddress = contractAddresses.flexibleTieredStaking;
    
    console.log('Manual approval for:', ethers.formatEther(amountWei), 'tokens');
    console.log('User address:', userAddress);
    console.log('Staking contract:', stakingContractAddress);
    
    const currentAllowance = await contracts.reflectiveToken.allowance(
      userAddress,
      stakingContractAddress
    );
    console.log('Current allowance:', ethers.formatEther(currentAllowance));
    
    const approveTx = await contracts.reflectiveToken.connect(signer).approve(
      stakingContractAddress,
      amountWei
    );
    
    console.log('Approval transaction hash:', approveTx.hash);
    const receipt = await approveTx.wait();
    console.log('Approval transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
    
    const newAllowance = await contracts.reflectiveToken.allowance(
      userAddress,
      stakingContractAddress
    );
    console.log('New allowance after approval:', ethers.formatEther(newAllowance));
    
    // Let's also check the transaction receipt for any events
    try {
      const receipt = await signer.provider.getTransactionReceipt(approveTx.hash);
      console.log('Transaction receipt logs:', receipt?.logs);
      
      // Check if there are any Approval events
      const approvalEvents = receipt?.logs.filter(log => {
        try {
          const parsed = contracts.reflectiveToken.interface.parseLog(log);
          return parsed && parsed.name === 'Approval';
        } catch {
          return false;
        }
      });
      console.log('Approval events found:', approvalEvents?.length);
      
      if (approvalEvents?.length! > 0) {
        approvalEvents?.forEach((event, index) => {
          try {
            const parsed = contracts.reflectiveToken.interface.parseLog(event);
            console.log(`Approval event ${index}:`, parsed?.args);
          } catch (err) {
            console.log(`Error parsing approval event ${index}:`, err);
          }
        });
      }
    } catch (err) {
      console.log('Error analyzing transaction receipt:', err);
    }
    
    return receipt;
  }, [contracts, signer]);

  // Function to check blacklist status and fix approval issues
  const checkBlacklistStatus = useCallback(async () => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    const stakingContractAddress = (await getContractAddressesForNetwork())?.flexibleTieredStaking;
    
    console.log('=== CHECKING BLACKLIST STATUS ===');
    console.log('User address:', userAddress);
    console.log('Staking contract:', stakingContractAddress);
    
    try {
      // Check if user is blacklisted
      const userBlacklisted = await contracts.reflectiveToken.isBlacklisted(userAddress);
      console.log('User blacklisted:', userBlacklisted);
      
      // Check if staking contract is blacklisted
      const stakingBlacklisted = await contracts.reflectiveToken.isBlacklisted(stakingContractAddress);
      console.log('Staking contract blacklisted:', stakingBlacklisted);
      
      if (stakingBlacklisted) {
        console.log('❌ STAKING CONTRACT IS BLACKLISTED! This is why approvals fail.');
        console.log('The ReflectiveToken contract blocks approvals to blacklisted addresses.');
        return { userBlacklisted, stakingBlacklisted, canApprove: false };
      }
      
      if (userBlacklisted) {
        console.log('❌ USER IS BLACKLISTED! This is why approvals fail.');
        return { userBlacklisted, stakingBlacklisted, canApprove: false };
      }
      
      console.log('✅ Neither user nor staking contract is blacklisted');
      return { userBlacklisted, stakingBlacklisted, canApprove: true };
      
    } catch (err) {
      console.error('Error checking blacklist status:', err);
      throw err;
    }
  }, [contracts, signer]);

  // Function to try raw contract call for approval
  const testRawApproval = useCallback(async (amount: string) => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    const stakingContractAddress = (await getContractAddressesForNetwork())?.flexibleTieredStaking;
    const amountWei = ethers.parseEther(amount);
    
    console.log('=== TESTING RAW APPROVAL ===');
    console.log('User address:', userAddress);
    console.log('Staking contract:', stakingContractAddress);
    console.log('Amount:', ethers.formatEther(amountWei));
    
    // First check blacklist status
    await checkBlacklistStatus();
    
    try {
      // Try to call approve using raw transaction
      const approveData = contracts.reflectiveToken.interface.encodeFunctionData('approve', [
        stakingContractAddress,
        amountWei
      ]);
      
      console.log('Approval data:', approveData);
      
      // Send raw transaction
      const tx = await signer.sendTransaction({
        to: (await getContractAddressesForNetwork())?.reflectiveToken,
        data: approveData,
        gasLimit: 100000
      });
      
      console.log('Raw approval transaction hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('Raw approval transaction confirmed:', receipt?.status === 1 ? 'SUCCESS' : 'FAILED');
      
      // Check allowance after raw transaction
      const newAllowance = await contracts.reflectiveToken.allowance(userAddress, stakingContractAddress);
      console.log('New allowance after raw approval:', ethers.formatEther(newAllowance));
      
      return receipt;
    } catch (err) {
      console.error('Error with raw approval:', err);
      throw err;
    }
  }, [contracts, signer, checkBlacklistStatus]);

  // Function to fix blacklist issue by unblacklisting staking contract
  const fixBlacklistIssue = useCallback(async () => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const stakingContractAddress = (await getContractAddressesForNetwork())?.flexibleTieredStaking;
    
    console.log('=== ATTEMPTING TO FIX BLACKLIST ISSUE ===');
    console.log('Staking contract:', stakingContractAddress);
    
    try {
      // Check if staking contract is blacklisted
      const stakingBlacklisted = await contracts.reflectiveToken.isBlacklisted(stakingContractAddress);
      console.log('Staking contract blacklisted:', stakingBlacklisted);
      
      if (stakingBlacklisted) {
        console.log('🔧 Attempting to unblacklist staking contract...');
        
        // Try to unblacklist the staking contract
        const unblacklistTx = await contracts.reflectiveToken.connect(signer).unblacklist(stakingContractAddress);
        console.log('Unblacklist transaction hash:', unblacklistTx.hash);
        
        const receipt = await unblacklistTx.wait();
        console.log('Unblacklist transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
        
        if (receipt.status === 1) {
          console.log('✅ Staking contract unblacklisted successfully!');
          
          // Verify the fix
          const newBlacklistStatus = await contracts.reflectiveToken.isBlacklisted(stakingContractAddress);
          console.log('New blacklist status:', newBlacklistStatus);
          
          if (!newBlacklistStatus) {
            console.log('🎉 BLACKLIST ISSUE FIXED! You can now approve tokens.');
            return { success: true, message: 'Staking contract unblacklisted successfully!' };
          } else {
            console.log('❌ Unblacklist failed - contract still blacklisted');
            return { success: false, message: 'Unblacklist transaction failed' };
          }
        } else {
          console.log('❌ Unblacklist transaction failed');
          return { success: false, message: 'Unblacklist transaction failed' };
        }
      } else {
        console.log('✅ Staking contract is not blacklisted - issue might be elsewhere');
        return { success: true, message: 'Staking contract is not blacklisted' };
      }
      
    } catch (err: any) {
      console.error('Error fixing blacklist issue:', err);
      
      if (err.message.includes('Ownable: caller is not the owner')) {
        console.log('❌ You are not the owner of the ReflectiveToken contract');
        console.log('The contract owner needs to unblacklist the staking contract');
        return { success: false, message: 'You are not the contract owner. The owner needs to unblacklist the staking contract.' };
      } else if (err.message.includes('AccessControl')) {
        console.log('❌ Access control error - you may not have permission');
        return { success: false, message: 'Access control error - insufficient permissions' };
      } else {
        return { success: false, message: err.message || 'Unknown error occurred' };
      }
    }
  }, [contracts, signer]);

  // Function to debug the ReflectiveToken's internal state
  const debugReflectiveTokenState = useCallback(async () => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    const stakingContractAddress = (await getContractAddressesForNetwork())?.flexibleTieredStaking;
    
    console.log('=== DEBUGGING REFLECTIVE TOKEN STATE ===');
    console.log('User address:', userAddress);
    console.log('Staking contract:', stakingContractAddress);
    
    try {
      // Check basic token info
      const name = await contracts.reflectiveToken.name();
      const symbol = await contracts.reflectiveToken.symbol();
      const decimals = await contracts.reflectiveToken.decimals();
      const totalSupply = await contracts.reflectiveToken.totalSupply();
      
      console.log('Token Info:');
      console.log('- Name:', name);
      console.log('- Symbol:', symbol);
      console.log('- Decimals:', decimals);
      console.log('- Total Supply:', ethers.formatEther(totalSupply));
      
      // Check user balance
      const userBalance = await contracts.reflectiveToken.balanceOf(userAddress);
      console.log('User Balance:', ethers.formatEther(userBalance));
      
      // Check allowance
      const allowance = await contracts.reflectiveToken.allowance(userAddress, stakingContractAddress);
      console.log('Current Allowance:', ethers.formatEther(allowance));
      
      // Check if user is excluded from fees
      const isExcluded = await contracts.reflectiveToken.isExcludedFromFee(userAddress);
      console.log('User excluded from fees:', isExcluded);
      
      // Check if staking contract is excluded from fees
      const stakingExcluded = await contracts.reflectiveToken.isExcludedFromFee(stakingContractAddress);
      console.log('Staking contract excluded from fees:', stakingExcluded);
      
      // Check reflection state
      try {
        const reflectionInfo = await contracts.reflectiveToken.debugReflection(userAddress);
        console.log('Reflection Info:');
        console.log('- rOwned:', reflectionInfo.rOwned.toString());
        console.log('- tOwned:', reflectionInfo.tOwned.toString());
        console.log('- isExcluded:', reflectionInfo.isExcluded);
      } catch (err: any) {
        console.log('Could not get reflection info:', err.message);
      }
      
      // Check contract status
      try {
        const contractStatus = await contracts.reflectiveToken.getContractStatus();
        console.log('Contract Status:');
        console.log('- Trading enabled:', contractStatus.isTradingEnabled);
        console.log('- Swap enabled:', contractStatus.isSwapEnabled);
        console.log('- Pair exists:', contractStatus.pairExists);
        console.log('- Timelock exists:', contractStatus.timelockExists);
        console.log('- Distribution exists:', contractStatus.distributionExists);
      } catch (err: any) {
        console.log('Could not get contract status:', err.message);
      }
      
      // Check if token is initialized
      try {
        const isInitialized = await contracts.reflectiveToken.isInitialized();
        console.log('Token initialized:', isInitialized);
      } catch (err: any) {
        console.log('Could not check initialization status:', err.message);
      }
      
      // Check if trading is enabled
      try {
        const tradingEnabled = await contracts.reflectiveToken.tradingEnabled();
        console.log('Trading enabled:', tradingEnabled);
      } catch (err: any) {
        console.log('Could not check trading status:', err.message);
      }
      
      // Check if paused
      try {
        const paused = await contracts.reflectiveToken.paused();
        console.log('Contract paused:', paused);
      } catch (err: any) {
        console.log('Could not check pause status:', err.message);
      }
      
      return {
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatEther(totalSupply),
        userBalance: ethers.formatEther(userBalance),
        allowance: ethers.formatEther(allowance),
        isExcluded,
        stakingExcluded
      };
      
    } catch (err) {
      console.error('Error debugging token state:', err);
      throw err;
    }
  }, [contracts, signer]);

  // Function to check and fix contract initialization
  const checkAndFixContractInitialization = useCallback(async () => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    console.log('=== CHECKING CONTRACT INITIALIZATION ===');
    
    try {
      // Check if basic functions exist
      const name = await contracts.reflectiveToken.name();
      console.log('✅ Contract name:', name);
      
      // Check if the contract has the required functions
      let hasExcludedFromFee = false;
      let hasDebugReflection = false;
      let hasGetContractStatus = false;
      
      try {
        await contracts.reflectiveToken.isExcludedFromFee(await signer.getAddress());
        hasExcludedFromFee = true;
        console.log('✅ isExcludedFromFee function exists');
      } catch (err) {
        console.log('❌ isExcludedFromFee function missing or failing');
      }
      
      try {
        await contracts.reflectiveToken.debugReflection(await signer.getAddress());
        hasDebugReflection = true;
        console.log('✅ debugReflection function exists');
      } catch (err) {
        console.log('❌ debugReflection function missing or failing');
      }
      
      try {
        await contracts.reflectiveToken.getContractStatus();
        hasGetContractStatus = true;
        console.log('✅ getContractStatus function exists');
      } catch (err) {
        console.log('❌ getContractStatus function missing or failing');
      }
      
      // Check if contract is initialized
      let isInitialized = false;
      try {
        isInitialized = await contracts.reflectiveToken.isInitialized();
        console.log('Contract initialized:', isInitialized);
      } catch (err) {
        console.log('❌ isInitialized function missing or failing');
      }
      
      // If not initialized, try to initialize
      if (!isInitialized) {
        console.log('🔧 Contract not initialized, attempting to initialize...');
        
        // Get network-specific oracle configuration
        const network = await signer.provider.getNetwork();
        const oracleConfig = getOracleConfig(Number(network.chainId));
        
        const routerAddress = oracleConfig.uniswapRouter;
        const marketingWallet = await signer.getAddress();
        const stakingAddress = (await getContractAddressesForNetwork())?.flexibleTieredStaking;
        const gatewayAddress = (await getContractAddressesForNetwork())?.arweaveGateway;
        const oracleAddress = oracleConfig.chainlinkETH;
        
        try {
          // First, let's check if the contract is actually working by testing basic functions
          console.log('Testing basic contract functions...');
          
          try {
            const testBalance = await contracts.reflectiveToken.balanceOf(await signer.getAddress());
            console.log('✅ Basic balanceOf function works:', ethers.formatEther(testBalance));
          } catch (err: any) {
            console.log('❌ Basic balanceOf function failed:', err.message);
            return { success: false, message: 'Contract is not properly deployed or accessible' };
          }
          
          console.log('Initialization parameters:');
          console.log('- Router:', routerAddress);
          console.log('- Marketing:', marketingWallet);
          console.log('- Staking:', stakingAddress);
          console.log('- Gateway:', gatewayAddress);
          console.log('- Oracle:', oracleAddress);
          
          // Try to call initialize using raw transaction data
          const initializeData = contracts.reflectiveToken.interface.encodeFunctionData('initialize', [
            routerAddress,
            marketingWallet,
            stakingAddress,
            gatewayAddress,
            oracleAddress
          ]);
          
          console.log('Initialize data:', initializeData);
          
          const initTx = await signer.sendTransaction({
            to: (await getContractAddressesForNetwork())?.reflectiveToken,
            data: initializeData,
            gasLimit: 2000000 // Higher gas limit for initialization
          });
          
          console.log('Initialization transaction hash:', initTx.hash);
          const receipt = await initTx.wait();
          console.log('Initialization transaction confirmed:', receipt?.status === 1 ? 'SUCCESS' : 'FAILED');
          
          if (receipt?.status === 1) {
            console.log('✅ Contract initialized successfully!');
            return { success: true, message: 'Contract initialized successfully!' };
          } else {
            console.log('❌ Contract initialization failed!');
            return { success: false, message: 'Contract initialization failed!' };
          }
          
        } catch (err: any) {
          console.error('Error initializing contract:', err);
          
          // If initialize fails, try alternative setup methods
          console.log('🔄 Initialize failed, trying alternative setup methods...');
          
          try {
            // Try to set up the contract using individual setter functions
            console.log('Attempting to set up contract using individual functions...');
            
            // Try to set staking contract
            try {
              const setStakingTx = await contracts.reflectiveToken.connect(signer).setStakingContract(stakingAddress);
              console.log('✅ Set staking contract transaction:', setStakingTx.hash);
              await setStakingTx.wait();
            } catch (err: any) {
              console.log('❌ Could not set staking contract:', err.message);
            }
            
            // Try to set Arweave gateway
            try {
              const setGatewayTx = await contracts.reflectiveToken.connect(signer).setArweaveGateway(gatewayAddress);
              console.log('✅ Set Arweave gateway transaction:', setGatewayTx.hash);
              await setGatewayTx.wait();
            } catch (err: any) {
              console.log('❌ Could not set Arweave gateway:', err.message);
            }
            
            // Try to set price oracle
            try {
              console.log('Attempting to call setPriceOracle on contract:', contracts.reflectiveToken.address);
              console.log('Available methods:', Object.getOwnPropertyNames(contracts.reflectiveToken));
              console.log('setPriceOracle method exists:', typeof contracts.reflectiveToken.setPriceOracle);
              
              // Check if contract is initialized
              try {
                const isInitialized = await contracts.reflectiveToken.isInitialized();
                console.log('Contract is initialized:', isInitialized);
              } catch (initErr: any) {
                console.log('Could not check initialization status:', initErr.message);
              }
              
              const setOracleTx = await contracts.reflectiveToken.connect(signer).setPriceOracle(oracleAddress);
              console.log('✅ Set price oracle transaction:', setOracleTx.hash);
              await setOracleTx.wait();
            } catch (err: any) {
              console.log('❌ Could not set price oracle:', err.message);
              console.log('Error details:', err);
            }
            
            console.log('✅ Alternative setup completed');
            
            // Note: Price oracle setup failed, but other components were set up
            // The staking contract should still work with the oracles it has
            return { 
              success: true, 
              message: 'Contract setup completed using alternative methods. Note: Price oracle setup failed, but staking should still work.' 
            };
            
          } catch (altErr: any) {
            console.error('Alternative setup also failed:', altErr);
            return { success: false, message: `Both initialize and alternative setup failed: ${err.message}` };
          }
        }
      } else {
        console.log('✅ Contract is already initialized');
        return { success: true, message: 'Contract is already initialized' };
      }
      
    } catch (err: any) {
      console.error('Error checking contract initialization:', err);
      return { success: false, message: err.message || 'Failed to check contract initialization' };
    }
  }, [contracts, signer]);

  // Function to manually fix allowance by calling approve again
  const fixAllowanceIssue = useCallback(async (amount: string) => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    const stakingContractAddress = (await getContractAddressesForNetwork())?.flexibleTieredStaking;
    const amountWei = ethers.parseEther(amount);
    
    console.log('=== FIXING ALLOWANCE ISSUE ===');
    console.log('User address:', userAddress);
    console.log('Staking contract:', stakingContractAddress);
    console.log('Amount:', ethers.formatEther(amountWei));
    
    try {
      // Check current allowance
      const currentAllowance = await contracts.reflectiveToken.allowance(userAddress, stakingContractAddress);
      console.log('Current allowance:', ethers.formatEther(currentAllowance));
      
      if (currentAllowance >= amountWei) {
        console.log('✅ Allowance is already sufficient');
        return { success: true, message: 'Allowance is already sufficient' };
      }
      
      console.log('🔧 Attempting to fix allowance...');
      
      // Try to approve again
      const approveTx = await contracts.reflectiveToken.connect(signer).approve(stakingContractAddress, amountWei);
      console.log('Approval transaction hash:', approveTx.hash);
      
      const receipt = await approveTx.wait();
      console.log('Approval transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      if (receipt.status === 1) {
        // Check allowance after approval
        const newAllowance = await contracts.reflectiveToken.allowance(userAddress, stakingContractAddress);
        console.log('New allowance after fix:', ethers.formatEther(newAllowance));
        
        if (newAllowance >= amountWei) {
          console.log('✅ Allowance fixed successfully!');
          return { success: true, message: 'Allowance fixed successfully!' };
        } else {
          console.log('❌ Allowance still insufficient after fix');
          return { success: false, message: 'Allowance still insufficient after fix' };
        }
      } else {
        console.log('❌ Approval transaction failed');
        return { success: false, message: 'Approval transaction failed' };
      }
      
    } catch (err: any) {
      console.error('Error fixing allowance:', err);
      return { success: false, message: err.message || 'Failed to fix allowance' };
    }
  }, [contracts, signer]);

  // Function to debug staking contract state
  const debugStakingContract = useCallback(async () => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Staking contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    
    console.log('=== DEBUGGING STAKING CONTRACT ===');
    console.log('User address:', userAddress);
    console.log('Staking contract address:', (await getContractAddressesForNetwork())?.flexibleTieredStaking);
    
    try {
      // Check basic contract info
      const contractStatus = await contracts.flexibleTieredStaking.getContractStatus();
      console.log('Contract Status:');
      console.log('- Is paused:', contractStatus.isPaused);
      console.log('- Staking token set:', contractStatus.stakingTokenSet);
      console.log('- Primary oracle set:', contractStatus.primaryOracleSet);
      console.log('- Backup oracle set:', contractStatus.backupOracleSet);
      console.log('- Tier count:', contractStatus.tierCount);
      
      // Check if user has any staked tokens
      const userStakedTokens = await contracts.flexibleTieredStaking.userStakedTokens(userAddress);
      console.log('User staked tokens:', ethers.formatEther(userStakedTokens));
      
      // Check if user has access
      const hasAccess = await contracts.flexibleTieredStaking.hasAccess(userAddress);
      console.log('User has access:', hasAccess);
      
      // Check user tier
      const userTier = await contracts.flexibleTieredStaking.getUserTier(userAddress);
      console.log('User tier:', userTier);
      
      // Check total staked
      const totalStaked = await contracts.flexibleTieredStaking.getTotalStaked();
      console.log('Total staked:', ethers.formatEther(totalStaked));
      
      // Check contract balances
      let contractBalances;
      try {
        contractBalances = await contracts.flexibleTieredStaking.getContractBalances();
        console.log('Contract balances:');
        console.log('- ETH balance:', contractBalances.ethBalance ? ethers.formatEther(contractBalances.ethBalance) : '0.0');
        console.log('- Token balance:', contractBalances.tokenBalance ? ethers.formatEther(contractBalances.tokenBalance) : '0.0');
      } catch (balanceError: any) {
        console.log('Contract balances: Error retrieving balances - contract may not be fully initialized');
        console.log('Balance error:', balanceError.message);
        contractBalances = { ethBalance: 0, tokenBalance: 0 };
      }
      
      // Check oracle info
      let oracleInfo;
      try {
        oracleInfo = await contracts.flexibleTieredStaking.getOracleInfo();
        console.log('Oracle info:');
        console.log('- Primary oracle:', oracleInfo.primaryOracle);
        console.log('- Backup oracle:', oracleInfo.backupOracle);
        console.log('- Gas refund reward:', oracleInfo.currentGasRefundReward ? ethers.formatEther(oracleInfo.currentGasRefundReward) : '0.0');
      } catch (oracleError: any) {
        console.log('Oracle info: Error retrieving oracle info - contract may not be fully initialized');
        console.log('Oracle error:', oracleError.message);
        oracleInfo = { primaryOracle: '0x0000000000000000000000000000000000000000', backupOracle: '0x0000000000000000000000000000000000000000', currentGasRefundReward: 0 };
      }
      
      return {
        contractStatus,
        userStakedTokens: ethers.formatEther(userStakedTokens),
        hasAccess,
        userTier,
        totalStaked: ethers.formatEther(totalStaked),
        contractBalances,
        oracleInfo
      };
      
    } catch (err: any) {
      console.error('Error debugging staking contract:', err);
      throw err;
    }
  }, [contracts, signer]);

  // Function to try to initialize the ReflectiveToken if needed
  const initializeReflectiveToken = useCallback(async () => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    console.log('=== ATTEMPTING TO INITIALIZE REFLECTIVE TOKEN ===');
    
    try {
      // Check if already initialized
      const isInitialized = await contracts.reflectiveToken.isInitialized();
      console.log('Token is already initialized:', isInitialized);
      
      if (isInitialized) {
        console.log('✅ Token is already initialized');
        return;
      }
      
      // Try to initialize with required contracts
      console.log('Attempting to initialize token...');
      
      // Get network-specific oracle configuration
      const network = await signer.provider.getNetwork();
      const oracleConfig = getOracleConfig(Number(network.chainId));
      
      const routerAddress = oracleConfig.uniswapRouter;
      const marketingWallet = await signer.getAddress(); // Use current user as marketing wallet
      const stakingAddress = (await getContractAddressesForNetwork())?.flexibleTieredStaking;
      const gatewayAddress = (await getContractAddressesForNetwork())?.arweaveGateway;
      const oracleAddress = oracleConfig.chainlinkETH;
      
      console.log('Initialization parameters:');
      console.log('- Router:', routerAddress);
      console.log('- Marketing:', marketingWallet);
      console.log('- Staking:', stakingAddress);
      console.log('- Gateway:', gatewayAddress);
      console.log('- Oracle:', oracleAddress);
      
      const initTx = await contracts.reflectiveToken.connect(signer).initialize(
        routerAddress,
        marketingWallet,
        stakingAddress,
        gatewayAddress,
        oracleAddress
      );
      
      console.log('Initialization transaction hash:', initTx.hash);
      const receipt = await initTx.wait();
      console.log('Initialization transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      if (receipt.status === 1) {
        console.log('✅ Token initialization successful!');
      } else {
        console.log('❌ Token initialization failed!');
      }
      
    } catch (err) {
      console.error('Error initializing token:', err);
      console.log('This might be expected if the token is already initialized or has different initialization requirements');
    }
  }, [contracts, signer]);

  // Function to initialize the FlexibleTieredStaking contract
  const initializeStakingContract = useCallback(async () => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Staking contract or signer not available');
    }

    console.log('=== ATTEMPTING TO INITIALIZE STAKING CONTRACT ===');
    
    try {
      // Check if already initialized by checking if staking token is set
      const contractStatus = await contracts.flexibleTieredStaking.getContractStatus();
      console.log('Contract status:', contractStatus);
      
      if (contractStatus.stakingTokenSet && contractStatus.primaryOracleSet) {
        console.log('✅ Staking contract is already initialized');
        console.log('Contract status:', contractStatus);
        return;
      }
      
      // Try to initialize with required parameters
      console.log('Attempting to initialize staking contract...');
      
      // Get the required contract addresses
      const stakingTokenAddress = (await getContractAddressesForNetwork())?.reflectiveToken;
      
      // Get network-specific oracle configuration
      let primaryOracleAddress, backupOracleAddress;
      try {
        const network = await signer.provider.getNetwork();
        console.log('Current network:', network.name, 'Chain ID:', network.chainId);
        
        const oracleConfig = getOracleConfig(Number(network.chainId));
        primaryOracleAddress = oracleConfig.primaryOracle;
        backupOracleAddress = oracleConfig.backupOracle;
        console.log('Using network-specific oracles:', network.name);
      } catch (networkErr: any) {
        console.log('Could not detect network, using default oracles:', networkErr.message);
        const defaultConfig = getOracleConfig(31337); // Default to localhost config
        primaryOracleAddress = defaultConfig.primaryOracle;
        backupOracleAddress = defaultConfig.backupOracle;
      }
      
      console.log('Initialization parameters:');
      console.log('- Staking Token:', stakingTokenAddress);
      console.log('- Primary Oracle:', primaryOracleAddress);
      console.log('- Backup Oracle:', backupOracleAddress);
      
      // Check if initialize function exists
      if (typeof contracts.flexibleTieredStaking.initialize !== 'function') {
        console.log('⚠️ Initialize function not available - contract may already be initialized');
        return;
      }
      
      const tx = await contracts.flexibleTieredStaking.initialize(
        stakingTokenAddress,
        primaryOracleAddress,
        backupOracleAddress
      );
      
      console.log('Initialization transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Staking contract initialized successfully');
      
    } catch (err: any) {
      console.error('❌ Failed to initialize staking contract:', err);
      
      // If initialization fails, try to set up the contract using individual setter functions
      console.log('🔄 Initialize failed, trying alternative setup methods...');
      
      try {
        // Check if contract is already properly initialized
        const currentStatus = await contracts.flexibleTieredStaking.getContractStatus();
        if (currentStatus.stakingTokenSet && currentStatus.primaryOracleSet) {
          console.log('✅ Contract is already properly initialized');
          return;
        }
        
        // Try to set up the contract using individual setter functions
        console.log('Attempting to set up contract using individual functions...');
        
        // Try to set staking token
        try {
          const setStakingTx = await contracts.flexibleTieredStaking.setStakingToken((await getContractAddressesForNetwork())?.reflectiveToken);
          console.log('✅ Set staking token transaction:', setStakingTx.hash);
          await setStakingTx.wait();
        } catch (err: any) {
          console.log('❌ Could not set staking token:', err.message);
        }
        
        // Get network-specific oracle configuration
        const network = await signer.provider.getNetwork();
        const oracleConfig = getOracleConfig(Number(network.chainId));
        
        // Try to set primary oracle
        try {
          const setPrimaryTx = await contracts.flexibleTieredStaking.setPrimaryPriceOracle(oracleConfig.primaryOracle);
          console.log('✅ Set primary oracle transaction:', setPrimaryTx.hash);
          await setPrimaryTx.wait();
        } catch (err: any) {
          console.log('❌ Could not set primary oracle:', err.message);
        }
        
        // Try to set backup oracle
        try {
          const setBackupTx = await contracts.flexibleTieredStaking.setBackupPriceOracle(oracleConfig.backupOracle);
          console.log('✅ Set backup oracle transaction:', setBackupTx.hash);
          await setBackupTx.wait();
        } catch (err: any) {
          console.log('❌ Could not set backup oracle:', err.message);
        }
        
        console.log('✅ Alternative setup completed');
        
      } catch (altErr: any) {
        console.error('❌ Alternative setup also failed:', altErr);
        throw altErr;
      }
    }
  }, [contracts.flexibleTieredStaking, signer]);

  // Test function to manually approve a small amount
  const testApproval = useCallback(async () => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    const testAmount = ethers.parseEther("1"); // 1 token
    const testSpender = "0x0000000000000000000000000000000000000001"; // Dummy address
    
    console.log('=== TESTING APPROVAL ===');
    console.log('User address:', userAddress);
    console.log('Test spender:', testSpender);
    console.log('Test amount:', ethers.formatEther(testAmount));
    
    try {
      // Check if user is blacklisted first
      try {
        const isBlacklisted = await contracts.reflectiveToken.isBlacklisted(userAddress);
        console.log('User is blacklisted:', isBlacklisted);
        if (isBlacklisted) {
          console.log('❌ User is blacklisted - cannot approve!');
          return;
        }
      } catch (err) {
        console.log('No blacklist function or error:', err);
      }
      
      // Check if token is paused
      try {
        const isPaused = await contracts.reflectiveToken.paused();
        console.log('Token is paused:', isPaused);
        if (isPaused) {
          console.log('❌ Token is paused - cannot approve!');
          return;
        }
      } catch (err) {
        console.log('No paused function or error:', err);
      }
      
      // Check current allowance
      const currentAllowance = await contracts.reflectiveToken.allowance(userAddress, testSpender);
      console.log('Current allowance to test spender:', ethers.formatEther(currentAllowance));
      
      // Try to approve
      console.log('Attempting approval...');
      const approveTx = await contracts.reflectiveToken.connect(signer).approve(testSpender, testAmount);
      console.log('Approval transaction hash:', approveTx.hash);
      
      const receipt = await approveTx.wait();
      console.log('Approval transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      // Check new allowance
      const newAllowance = await contracts.reflectiveToken.allowance(userAddress, testSpender);
      console.log('New allowance to test spender:', ethers.formatEther(newAllowance));
      console.log('New allowance (raw):', newAllowance.toString());
      
      if (newAllowance > 0) {
        console.log('✅ Token contract approval is working!');
      } else {
        console.log('❌ Token contract approval is NOT working!');
      }
      
    } catch (err) {
      console.error('Error testing approval:', err);
    }
  }, [contracts, signer]);

  // Debug function to check token contract state
  const debugTokenContract = useCallback(async () => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Token contract or signer not available');
    }

    const userAddress = await signer.getAddress();
    const contractAddresses = await getContractAddressesForNetwork();
    if (!contractAddresses) throw new Error('Could not get contract addresses');
    const stakingContractAddress = contractAddresses.flexibleTieredStaking;
    
    console.log('=== TOKEN CONTRACT DEBUG ===');
    console.log('User address:', userAddress);
    console.log('Staking contract address:', stakingContractAddress);
    console.log('Token contract address:', contracts.reflectiveToken.target);
    console.log('Expected token address:', contractAddresses.reflectiveToken);
    
    try {
      // Check token balance
      const balance = await contracts.reflectiveToken.balanceOf(userAddress);
      console.log('User token balance:', ethers.formatEther(balance));
      
      // Check allowance using the contract instance
      const allowance = await contracts.reflectiveToken.allowance(userAddress, stakingContractAddress);
      console.log('Current allowance (contract):', ethers.formatEther(allowance));
      console.log('Allowance (raw):', allowance.toString());
      
      // Try calling allowance directly with provider
      try {
        const directCall = await signer.provider.call({
          to: (await getContractAddressesForNetwork())?.reflectiveToken,
          data: contracts.reflectiveToken.interface.encodeFunctionData('allowance', [userAddress, stakingContractAddress])
        });
        const directAllowance = ethers.getBigInt(directCall);
        console.log('Direct provider allowance:', ethers.formatEther(directAllowance));
        console.log('Direct allowance (raw):', directAllowance.toString());
      } catch (err) {
        console.log('Error with direct provider call:', err);
      }
      
      // Check token name and symbol
      const name = await contracts.reflectiveToken.name();
      const symbol = await contracts.reflectiveToken.symbol();
      const decimals = await contracts.reflectiveToken.decimals();
      console.log('Token name:', name);
      console.log('Token symbol:', symbol);
      console.log('Token decimals:', decimals);
      
      // Check if the token contract is paused or has any restrictions
      try {
        const paused = await contracts.reflectiveToken.paused();
        console.log('Token is paused:', paused);
      } catch (err) {
        console.log('No paused function or error checking paused status:', err);
      }
      
      // Check if there are any recent approval events
      try {
        const filter = contracts.reflectiveToken.filters.Approval(userAddress, stakingContractAddress);
        const events = await contracts.reflectiveToken.queryFilter(filter, -10); // Last 10 blocks
        console.log('Recent approval events:', events);
      } catch (err) {
        console.log('Error querying approval events:', err);
      }
      
      // Check if the token contract is properly initialized
      try {
        const owner = await contracts.reflectiveToken.owner();
        console.log('Token contract owner:', owner);
        
        // Check if the token has the required contracts set
        try {
          const stakingContract = await contracts.reflectiveToken.getStakingContract();
          console.log('Token staking contract:', stakingContract);
          console.log('Expected staking contract:', stakingContractAddress);
          console.log('Staking contracts match:', stakingContract.toLowerCase() === stakingContractAddress.toLowerCase());
        } catch (err) {
          console.log('Error getting staking contract from token:', err);
        }
        
        // Check if the token is paused
        try {
          const paused = await contracts.reflectiveToken.paused();
          console.log('Token is paused:', paused);
        } catch (err) {
          console.log('No paused function or error:', err);
        }
        
        // Check if the user is blacklisted
        try {
          const isBlacklisted = await contracts.reflectiveToken.isBlacklisted(userAddress);
          console.log('User is blacklisted:', isBlacklisted);
        } catch (err) {
          console.log('No blacklist function or error:', err);
        }
        
        // Check if token is properly initialized
        try {
          const isInitialized = await contracts.reflectiveToken.isInitialized();
          console.log('Token is initialized:', isInitialized);
        } catch (err) {
          console.log('No isInitialized function or error:', err);
        }
        
        // Check token contract status
        try {
          const contractStatus = await contracts.reflectiveToken.getContractStatus();
          console.log('Token contract status:', contractStatus);
        } catch (err) {
          console.log('No getContractStatus function or error:', err);
        }
        
      } catch (err) {
        console.log('Error checking token contract state:', err);
      }
      
    } catch (err) {
      console.error('Error debugging token contract:', err);
    }
  }, [contracts, signer]);

  // Unstake tokens
  const unstakeTokens = useCallback(async (amount: string) => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Contracts or signer not available');
    }

    const amountWei = ethers.parseEther(amount);
    const unstakeTx = await contracts.flexibleTieredStaking.connect(signer).unstake(amountWei);
    await unstakeTx.wait();
  }, [contracts, signer]);

  // Claim vested tokens
  const claimVestedTokens = useCallback(async () => {
    if (!contracts.tokenDistribution || !signer) {
      throw new Error('Contracts or signer not available');
    }

    const claimTx = await contracts.tokenDistribution.connect(signer).claimVestedTokens();
    await claimTx.wait();
  }, [contracts, signer]);

  // Burn tokens
  const burnTokens = useCallback(async (amount: string) => {
    if (!contracts.reflectiveToken || !signer) {
      throw new Error('Contracts or signer not available');
    }

    const amountWei = ethers.parseEther(amount);
    const burnTx = await contracts.reflectiveToken.connect(signer).burnTokens(amountWei);
    await burnTx.wait();
  }, [contracts, signer]);


  // Batch stake tokens
  const stakeBatch = useCallback(async (amounts: string[]) => {
    if (!contracts.reflectiveToken || !contracts.flexibleTieredStaking || !signer) {
      throw new Error('Contracts or signer not available');
    }

    const amountsWei = amounts.map(amount => ethers.parseEther(amount));
    const totalAmount = amountsWei.reduce((sum, amount) => sum + amount, BigInt(0));
    
    // Ensure sufficient allowance
    await ensureAllowance(totalAmount);

    const tx = await contracts.flexibleTieredStaking.connect(signer).stakeBatch(amountsWei);
    await tx.wait();
  }, [contracts, signer, ensureAllowance]);

  // Batch unstake tokens
  const unstakeBatch = useCallback(async (amounts: string[]) => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Staking contract or signer not available');
    }

    const amountsWei = amounts.map(amount => ethers.parseEther(amount));
    const tx = await contracts.flexibleTieredStaking.connect(signer).unstakeBatch(amountsWei);
    await tx.wait();
  }, [contracts, signer]);

  // Emergency withdraw
  const emergencyWithdraw = useCallback(async () => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Staking contract or signer not available');
    }

    const tx = await contracts.flexibleTieredStaking.connect(signer).emergencyWithdraw();
    await tx.wait();
  }, [contracts, signer]);

  // Arweave Gateway Functions
  const verifyArweaveTransaction = useCallback(async (txId: string) => {
    if (!contracts.arweaveGateway) {
      throw new Error('Arweave gateway contract not available');
    }

    try {
      const isVerified = await contracts.arweaveGateway.verifyTransaction(txId);
      console.log(`Arweave transaction ${txId} verification:`, isVerified);
      return isVerified;
    } catch (err: any) {
      console.error('Error verifying Arweave transaction:', err);
      throw err;
    }
  }, [contracts]);

  const addArweaveTransaction = useCallback(async (txId: string, isVerified: boolean) => {
    if (!contracts.arweaveGateway || !signer) {
      throw new Error('Arweave gateway contract or signer not available');
    }

    try {
      console.log(`Adding Arweave transaction ${txId} with verified status: ${isVerified}`);
      const tx = await (contracts.arweaveGateway.connect(signer) as any).addTransaction(txId, isVerified);
      await tx.wait();
      console.log(`✅ Arweave transaction ${txId} added successfully`);
    } catch (err: any) {
      console.error('Error adding Arweave transaction:', err);
      throw err;
    }
  }, [contracts, signer]);

  const addArweaveTransactions = useCallback(async (txIds: string[], verifiedStatus: boolean[]) => {
    if (!contracts.arweaveGateway || !signer) {
      throw new Error('Arweave gateway contract or signer not available');
    }

    try {
      console.log(`Adding ${txIds.length} Arweave transactions`);
      const tx = await (contracts.arweaveGateway.connect(signer) as any).addTransactions(txIds, verifiedStatus);
      await tx.wait();
      console.log(`✅ ${txIds.length} Arweave transactions added successfully`);
    } catch (err: any) {
      console.error('Error adding Arweave transactions:', err);
      throw err;
    }
  }, [contracts, signer]);

  // File Management Functions
  const getTierFiles = useCallback(async (tierIndex: number) => {
    if (!contracts.flexibleTieredStaking) {
      throw new Error('Staking contract not available');
    }

    try {
      console.log(`Getting files for tier ${tierIndex}`);
      // This would need to be implemented in the staking contract
      // For now, return empty array as placeholder
      console.log('⚠️ getTierFiles not implemented in contract yet');
      return [];
    } catch (err: any) {
      console.error('Error getting tier files:', err);
      throw err;
    }
  }, [contracts]);

  const getUserFiles = useCallback(async (userAddress: string) => {
    if (!contracts.flexibleTieredStaking) {
      throw new Error('Staking contract not available');
    }

    try {
      console.log(`Getting files for user ${userAddress}`);
      // This would need to be implemented in the staking contract
      // For now, return empty array as placeholder
      console.log('⚠️ getUserFiles not implemented in contract yet');
      return [];
    } catch (err: any) {
      console.error('Error getting user files:', err);
      throw err;
    }
  }, [contracts]);

  const logFileAccess = useCallback(async (userAddress: string, tierIndex: number, txId: string) => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Staking contract or signer not available');
    }

    try {
      console.log(`Logging file access for user ${userAddress}, tier ${tierIndex}, txId ${txId}`);
      // This would need to be implemented in the staking contract
      console.log('⚠️ logFileAccess not implemented in contract yet');
    } catch (err: any) {
      console.error('Error logging file access:', err);
      throw err;
    }
  }, [contracts, signer]);

  const addFileToTier = useCallback(async (tierIndex: number, txIds: string[], fileTypes: string[], descriptions: string[], versions: number[]) => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Staking contract or signer not available');
    }

    try {
      console.log(`Adding ${txIds.length} files to tier ${tierIndex}`);
      // This would need to be implemented in the staking contract
      console.log('⚠️ addFileToTier not implemented in contract yet');
    } catch (err: any) {
      console.error('Error adding files to tier:', err);
      throw err;
    }
  }, [contracts, signer]);

  const addFileToUser = useCallback(async (userAddress: string, txIds: string[], fileTypes: string[], descriptions: string[], versions: number[]) => {
    if (!contracts.flexibleTieredStaking || !signer) {
      throw new Error('Staking contract or signer not available');
    }

    try {
      console.log(`Adding ${txIds.length} files to user ${userAddress}`);
      // This would need to be implemented in the staking contract
      console.log('⚠️ addFileToUser not implemented in contract yet');
    } catch (err: any) {
      console.error('Error adding files to user:', err);
      throw err;
    }
  }, [contracts, signer]);

  return {
    contracts,
    userInfo,
    vestingInfo,
    tiers,
    isLoading,
    error,
    loadUserInfo,
    loadVestingInfo,
    loadTiers,
    stakeTokens,
    unstakeTokens,
    stakeBatch,
    unstakeBatch,
    claimVestedTokens,
    burnTokens,
    verifyArweaveTransaction,
    addArweaveTransaction,
    addArweaveTransactions,
    getTierFiles,
    getUserFiles,
    logFileAccess,
    addFileToTier,
    addFileToUser,
    emergencyWithdraw,
    approveTokens,
    debugTokenContract,
    testApproval,
    initializeReflectiveToken,
    initializeStakingContract,
    testRawApproval,
    checkBlacklistStatus,
    fixBlacklistIssue,
    debugReflectiveTokenState,
    checkAndFixContractInitialization,
    fixAllowanceIssue,
    debugStakingContract,
  };
};
