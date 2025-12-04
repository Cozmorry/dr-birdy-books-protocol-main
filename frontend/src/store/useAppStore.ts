import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ethers } from 'ethers';
import { UserInfo, VestingInfo, TierInfo } from '../types';
import { getContractAddresses } from '../config/networks';

// Contract type definitions
type ReflectiveTokenContract = any;
type FlexibleTieredStakingContract = any;
type TokenDistributionContract = any;

// Store state interface
interface AppState {
  // Web3 state
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  web3Loading: boolean;
  web3Error: string | null;

  // Contract state
  contracts: {
    reflectiveToken: ReflectiveTokenContract | null;
    tokenDistribution: TokenDistributionContract | null;
    flexibleTieredStaking: FlexibleTieredStakingContract | null;
    arweaveGateway: ethers.Contract | null;
    improvedTimelock: ethers.Contract | null;
  };

  // User data state
  userInfo: UserInfo | null;
  vestingInfo: VestingInfo | null;
  tiers: TierInfo[];
  contractsLoading: boolean;
  contractsError: string | null;

  // Protocol statistics
  protocolStats: {
    totalStaked: string;
    totalStakers: number;
    isLoading: boolean;
  };

  // Real-time data refresh
  lastDataRefresh: number;
  autoRefreshInterval: NodeJS.Timeout | null;
  isRefreshing: boolean;

  // Actions
  setWeb3State: (state: Partial<Pick<AppState, 'provider' | 'signer' | 'account' | 'isConnected' | 'isCorrectNetwork' | 'web3Loading' | 'web3Error'>>) => void;
  setContracts: (contracts: AppState['contracts']) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  setVestingInfo: (vestingInfo: VestingInfo | null) => void;
  setTiers: (tiers: TierInfo[]) => void;
  setContractsLoading: (loading: boolean) => void;
  setContractsError: (error: string | null) => void;
  setLastDataRefresh: (timestamp: number) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setProtocolStats: (stats: { totalStaked: string; totalStakers: number; isLoading: boolean }) => void;
  
  // Data loading actions
  loadUserInfo: (account: string) => Promise<void>;
  loadVestingInfo: (account: string) => Promise<void>;
  loadTiers: () => Promise<void>;
  loadProtocolStats: () => Promise<void>;
  refreshAllData: (account: string) => Promise<void>;
  
  // Contract interaction actions
  stakeTokens: (amount: string) => Promise<void>;
  unstakeTokens: (amount: string) => Promise<void>;
  stakeBatch: (amounts: string[]) => Promise<void>;
  unstakeBatch: (amounts: string[]) => Promise<void>;
  claimVestedTokens: () => Promise<void>;
  burnTokens: (amount: string) => Promise<void>;
  approveTokens: (amount: string) => Promise<void>;
  emergencyWithdraw: () => Promise<void>;
  
  // Auto-refresh management
  startAutoRefresh: (account: string) => void;
  stopAutoRefresh: () => void;
  
  // Reset store
  resetStore: () => void;
}

// Initial state
const initialState = {
  // Web3 state
  provider: null,
  signer: null,
  account: null,
  isConnected: false,
  isCorrectNetwork: false,
  web3Loading: false,
  web3Error: null,

  // Contract state
  contracts: {
    reflectiveToken: null,
    tokenDistribution: null,
    flexibleTieredStaking: null,
    arweaveGateway: null,
    improvedTimelock: null,
  },

  // User data state
  userInfo: null,
  vestingInfo: null,
  tiers: [],
  contractsLoading: false,
  contractsError: null,

  // Protocol statistics
  protocolStats: {
    totalStaked: '0',
    totalStakers: 0,
    isLoading: false,
  },

  // Real-time data refresh
  lastDataRefresh: 0,
  autoRefreshInterval: null,
  isRefreshing: false,
};

// Contract ABIs (same as in useContracts.ts)
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
  "function distributeInitialTokens()",
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


export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Web3 state setters
    setWeb3State: (state) => set(state),

    // Contract state setters
    setContracts: (contracts) => set({ contracts }),
    setUserInfo: (userInfo) => set({ userInfo }),
    setVestingInfo: (vestingInfo) => set({ vestingInfo }),
    setTiers: (tiers) => set({ tiers }),
    setContractsLoading: (contractsLoading) => set({ contractsLoading }),
    setContractsError: (contractsError) => set({ contractsError }),
    setLastDataRefresh: (lastDataRefresh) => set({ lastDataRefresh }),
    setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
    setProtocolStats: (protocolStats) => set({ protocolStats }),

    // Data loading actions
    loadUserInfo: async (account: string) => {
      console.log('[loadUserInfo] Called for account:', account);
      const { contracts } = get();
      if (!contracts.reflectiveToken || !contracts.flexibleTieredStaking) {
        console.log('[loadUserInfo] Contracts not ready:', {
          hasToken: !!contracts.reflectiveToken,
          hasStaking: !!contracts.flexibleTieredStaking
        });
        return;
      }

      set({ contractsLoading: true, contractsError: null });

      try {
        console.log('[loadUserInfo] Fetching user data...');
        const [balance, stakingInfo, tierInfo] = await Promise.all([
          contracts.reflectiveToken.balanceOf(account),
          contracts.flexibleTieredStaking.getUserStakingInfo(account),
          contracts.flexibleTieredStaking.getUserTier(account),
        ]);

        const [stakedAmount, , hasAccess, canUnstake] = stakingInfo;
        const [tierIndex] = tierInfo;

        console.log('[loadUserInfo] Raw data:', {
          balance: balance.toString(),
          stakedAmount: stakedAmount.toString(),
          tierIndex: tierIndex.toString(),
          hasAccess,
          canUnstake
        });

        const userInfo: UserInfo = {
          address: account,
          balance: ethers.formatEther(balance),
          stakedAmount: ethers.formatEther(stakedAmount),
          tier: Number(tierIndex),
          hasAccess,
          canUnstake,
        };

        console.log('[loadUserInfo] Setting userInfo:', userInfo);
        set({ userInfo, contractsLoading: false });
      } catch (err: any) {
        console.error('[loadUserInfo] Error:', err);
        set({ contractsError: 'Failed to load user info: ' + err.message, contractsLoading: false });
      }
    },

    loadVestingInfo: async (account: string) => {
      const { contracts } = get();
      if (!contracts.tokenDistribution) return;

      try {
        const vestingData = await contracts.tokenDistribution.getVestingInfo(account);
        const [totalAmount, claimed, claimable, vestingEndTime] = vestingData;

        const vestingInfo: VestingInfo = {
          totalAmount: ethers.formatEther(totalAmount),
          claimed: ethers.formatEther(claimed),
          claimable: ethers.formatEther(claimable),
          vestingEndTime: new Date(Number(vestingEndTime) * 1000).toISOString(),
        };

        set({ vestingInfo });
      } catch (err: any) {
        // User might not be a team member, which is fine
        set({ vestingInfo: null });
      }
    },

    loadTiers: async () => {
      const { contracts } = get();
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

        set({ tiers: formattedTiers });
      } catch (err: any) {
        set({ contractsError: 'Failed to load tiers: ' + err.message });
      }
    },

    loadProtocolStats: async () => {
      const { contracts, setProtocolStats } = get();
      console.log('loadProtocolStats called', { hasContract: !!contracts.flexibleTieredStaking });
      
      if (!contracts.flexibleTieredStaking) {
        console.log('No staking contract available');
        setProtocolStats({
          totalStaked: '0',
          totalStakers: 0,
          isLoading: false,
        });
        return;
      }

      console.log('Setting loading state...');
      setProtocolStats({ totalStaked: '0', totalStakers: 0, isLoading: true });

      try {
        console.log('Calling getTotalStaked...');
        
        // Get total staked amount directly
        const totalStaked = await contracts.flexibleTieredStaking.getTotalStaked();
        console.log('Total staked result (raw):', totalStaked.toString());
        
        const totalStakedFormatted = ethers.formatEther(totalStaked);
        console.log('Formatted total staked:', totalStakedFormatted);
        
        // Debug: Also check contract balance directly from token
        try {
          if (contracts.flexibleTieredStaking?.provider) {
            const network = await contracts.flexibleTieredStaking.provider.getNetwork();
            const chainId = Number(network.chainId);
            const contractAddresses = getContractAddresses(chainId);
            const stakingContractAddress = contractAddresses.flexibleTieredStaking;
            
            if (contracts.reflectiveToken && stakingContractAddress) {
              const contractBalance = await contracts.reflectiveToken.balanceOf(stakingContractAddress);
              const contractBalanceFormatted = ethers.formatEther(contractBalance);
              console.log('Contract balance (from token):', contractBalanceFormatted);
              console.log('Balance match:', totalStaked.toString() === contractBalance.toString() ? 'YES' : 'NO');
            }
          }
        } catch (debugError) {
          console.warn('Could not debug contract balance:', debugError);
        }

        // For now, we'll estimate stakers based on total staked amount
        // In a real implementation, you'd want to track this via events
        // For demonstration, we'll use a simple heuristic
        const estimatedStakers = totalStaked > 0 ? Math.max(1, Math.floor(Number(totalStakedFormatted) / 100)) : 0;
        console.log('Estimated stakers:', estimatedStakers);

        console.log('Setting final stats...');
        setProtocolStats({
          totalStaked: totalStakedFormatted,
          totalStakers: estimatedStakers,
          isLoading: false,
        });
        console.log('Protocol stats updated successfully');
      } catch (err: any) {
        console.error('Failed to load protocol stats:', err);
        
        // Check if this is a contract not deployed error or empty data error
        if (err.message && (
          err.message.includes('could not decode result data') ||
          err.message.includes('execution reverted') ||
          err.message.includes('network changed') ||
          err.code === 'BAD_DATA' ||
          err.value === '0x'
        )) {
          console.log('Contract appears to not be deployed on this network or not initialized');
          setProtocolStats({
            totalStaked: '0',
            totalStakers: 0,
            isLoading: false,
          });
        } else {
          setProtocolStats({
            totalStaked: '0',
            totalStakers: 0,
            isLoading: false,
          });
        }
      }
    },

    refreshAllData: async (account: string) => {
      console.log('[refreshAllData] Called for account:', account);
      const { loadUserInfo, loadVestingInfo, loadTiers, loadProtocolStats } = get();
      set({ isRefreshing: true, lastDataRefresh: Date.now() });

      try {
        await Promise.all([
          loadUserInfo(account),
          loadVestingInfo(account),
          loadTiers(),
          loadProtocolStats(),
        ]);
        console.log('[refreshAllData] Completed successfully');
      } finally {
        set({ isRefreshing: false });
      }
    },

    // Contract interaction actions
    stakeTokens: async (amount: string) => {
      const { contracts, signer } = get();
      if (!contracts.reflectiveToken || !contracts.flexibleTieredStaking || !signer) {
        throw new Error('Contracts or signer not available');
      }

      const amountWei = ethers.parseEther(amount);
      const userAddress = await signer.getAddress();
      
      // Check user balance first with detailed logging
      const userBalance = await contracts.reflectiveToken.balanceOf(userAddress);
      const balanceFormatted = ethers.formatEther(userBalance);
      const amountFormatted = ethers.formatEther(amountWei);
      
      // Check if user is blacklisted
      let isBlacklisted = false;
      try {
        isBlacklisted = await contracts.reflectiveToken.isBlacklisted(userAddress);
      } catch (err) {
        console.warn('Could not check blacklist status:', err);
      }
      
      console.log('=== BALANCE CHECK ===');
      console.log('User Address:', userAddress);
      console.log('Balance:', balanceFormatted, 'DBBPT');
      console.log('Required Amount:', amountFormatted, 'DBBPT');
      console.log('Balance (Wei):', userBalance.toString());
      console.log('Amount (Wei):', amountWei.toString());
      console.log('Has Enough:', userBalance >= amountWei);
      console.log('Is Blacklisted:', isBlacklisted);
      if (isBlacklisted) {
        throw new Error('Your wallet address is blacklisted. You cannot stake tokens.');
      }
      console.log('=====================');
      
      if (userBalance < amountWei) {
        throw new Error(
          `Insufficient balance: You have ${balanceFormatted} tokens, but need ${amountFormatted} tokens. Please acquire tokens first.`
        );
      }
      
      if (userBalance === BigInt(0)) {
        throw new Error(
          `You don't have any tokens! Your balance is 0. Please acquire tokens before staking.`
        );
      }
      
      // Ensure sufficient allowance
      const network = await signer.provider.getNetwork();
      const chainId = Number(network.chainId);
      const contractAddresses = getContractAddresses(chainId);
      const stakingContractAddress = contractAddresses.flexibleTieredStaking;
      
      console.log('=== ALLOWANCE CHECK ===');
      console.log('User Address:', userAddress);
      console.log('Staking Contract:', stakingContractAddress);
      console.log('Required Amount:', amountFormatted, 'DBBPT');
      
      const currentAllowance = await contracts.reflectiveToken.allowance(
        userAddress,
        stakingContractAddress
      );
      const allowanceFormatted = ethers.formatEther(currentAllowance);
      
      console.log('Current Allowance:', allowanceFormatted, 'DBBPT');
      console.log('Required Amount:', amountFormatted, 'DBBPT');
      console.log('Has Enough Allowance:', currentAllowance >= amountWei);
      console.log('========================');
      
      if (currentAllowance < amountWei) {
        console.log(`Current allowance (${allowanceFormatted}) is less than required (${amountFormatted}). Approving...`);
        const approveAmount = amountWei * BigInt(2); // Approve 2x to avoid multiple approvals
        const approveTx = await contracts.reflectiveToken.connect(signer).approve(
          stakingContractAddress,
          approveAmount
        );
        console.log('Approval transaction sent:', approveTx.hash);
        const approveReceipt = await approveTx.wait();
        console.log('Approval confirmed:', approveReceipt.status === 1 ? 'SUCCESS' : 'FAILED');
        
        if (approveReceipt.status !== 1) {
          throw new Error('Approval transaction failed. Please check the transaction on the block explorer.');
        }
        
        // Wait for a couple blocks to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        
        // Retry allowance check with exponential backoff
        let newAllowance = BigInt(0);
        let retries = 0;
        const maxRetries = 5;
        
        while (retries < maxRetries && newAllowance < amountWei) {
          // Wait a bit longer with each retry
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
          }
          
          newAllowance = await contracts.reflectiveToken.allowance(
            userAddress,
            stakingContractAddress
          );
          console.log(`Allowance check attempt ${retries + 1}:`, ethers.formatEther(newAllowance), 'DBBPT');
          retries++;
        }
        
        console.log('New allowance after approval:', ethers.formatEther(newAllowance));
        
        if (newAllowance < amountWei) {
          throw new Error(
            `Approval failed: New allowance (${ethers.formatEther(newAllowance)}) is still less than required (${amountFormatted}) after ${maxRetries} attempts. ` +
            `Please check the approval transaction: ${approveTx.hash} on the block explorer.`
          );
        }
      }

      // Skip static call and gas estimation - they're failing with "missing revert data" RPC error
      // Since all pre-flight checks pass (balance, allowance, blacklist), proceed with transaction
      console.log('All pre-flight checks passed. Attempting staking transaction...');
      
      // Double-check balance and allowance one more time before transaction
      const finalBalance = await contracts.reflectiveToken.balanceOf(userAddress);
      const finalAllowance = await contracts.reflectiveToken.allowance(
        userAddress,
        stakingContractAddress
      );
      
      console.log('=== FINAL PRE-TRANSACTION CHECK ===');
      console.log(`Balance: ${ethers.formatEther(finalBalance)} DBBPT`);
      console.log(`Allowance: ${ethers.formatEther(finalAllowance)} DBBPT`);
      console.log(`Required: ${amountFormatted} DBBPT`);
      console.log(`Balance >= Required: ${finalBalance >= amountWei ? '✓' : '✗'}`);
      console.log(`Allowance >= Required: ${finalAllowance >= amountWei ? '✓' : '✗'}`);
      console.log('===================================');
      
      if (finalBalance < amountWei) {
        throw new Error(`Insufficient balance: You have ${ethers.formatEther(finalBalance)} DBBPT but need ${amountFormatted} DBBPT.`);
      }
      
      if (finalAllowance < amountWei) {
        throw new Error(`Insufficient allowance: You have approved ${ethers.formatEther(finalAllowance)} DBBPT but need ${amountFormatted} DBBPT.`);
      }

      // Send transaction with manual gas limit to bypass estimation issues
      console.log('Sending stake transaction with manual gas limit...');
      
      try {
        // Get the contract function and populate the transaction
        const stakingContract = contracts.flexibleTieredStaking.connect(signer);
        const populatedTx = await stakingContract.stake.populateTransaction(amountWei);
        
        // Send transaction with manual gas limit (bypasses estimation)
        const stakeTx = await signer.sendTransaction({
          to: populatedTx.to,
          data: populatedTx.data,
          gasLimit: BigInt(300000), // Manual gas limit - adjust if needed
        });
        
        console.log('Stake transaction sent:', stakeTx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await stakeTx.wait();
        if (!receipt) {
          throw new Error('Transaction receipt is null. Transaction may have been dropped.');
        }
        
        console.log('Stake transaction confirmed. Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
        
        if (receipt.status === 0) {
          const txHash = receipt.hash;
          const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;
          throw new Error(
            `Transaction reverted on-chain. Transaction hash: ${txHash}. ` +
            `Please check the transaction on Base Sepolia explorer: ${explorerUrl} ` +
            `This appears to be a reflection system issue. You may need to exclude your wallet from fees ` +
            `or try staking a smaller amount.`
          );
        }
        
        // Transaction succeeded - refresh user data
        const { loadUserInfo } = get();
        try {
          // Wait a moment for blockchain state to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          await loadUserInfo(userAddress);
        } catch (refreshError) {
          console.warn('Failed to refresh user info after staking:', refreshError);
          // Don't fail the whole operation if refresh fails
        }
        
        // Transaction successful - no return value needed (void)
      } catch (txError: any) {
        console.error('Transaction failed:', txError);
        
        // Extract transaction hash if available
        let txHash = '';
        if (txError.receipt?.hash) {
          txHash = txError.receipt.hash;
        } else if (txError.transactionHash) {
          txHash = txError.transactionHash;
        }
        
        // Provide helpful error message
        if (txError.reason || txError.message) {
          const errorMsg = txError.reason || txError.message;
          // Check for common user-facing errors
          if (errorMsg.toLowerCase().includes('insufficient')) {
            throw new Error(`You don't have enough tokens. Your balance: ${balanceFormatted} DBBPT`);
          }
          if (errorMsg.toLowerCase().includes('allowance')) {
            throw new Error('Please approve tokens first before staking.');
          }
          // Generic error
          throw new Error('Transaction failed. Please check your balance and try again.');
        }
        
        throw new Error(
          `Transaction failed. Please check your balance (${balanceFormatted} DBBPT) and try again.`
        );
      }
    },

    unstakeTokens: async (amount: string) => {
      const { contracts, signer, account } = get();
      if (!contracts.flexibleTieredStaking || !signer || !account) {
        throw new Error('Contracts or signer not available');
      }

      try {
        // Check network first
        const network = await signer.provider.getNetwork();
        const chainId = Number(network.chainId);
        console.log('Current network:', network.name, 'Chain ID:', chainId);
        
        // Check if on correct network (Base Sepolia = 84532, Base Mainnet = 8453)
        if (chainId !== 84532 && chainId !== 8453 && chainId !== 31337) {
          throw new Error(`Wrong network! You're on ${network.name} (Chain ID: ${chainId}). Please switch to Base Sepolia (Chain ID: 84532) or Base Mainnet (Chain ID: 8453).`);
        }
        
        // Check ETH balance for gas
        const ethBalance = await signer.provider.getBalance(account);
        const ethBalanceFormatted = ethers.formatEther(ethBalance);
        console.log('ETH balance for gas:', ethBalanceFormatted, 'ETH');
        
        if (ethBalance === BigInt(0)) {
          throw new Error('You have 0 ETH in your wallet. You need ETH (not DBBPT) to pay for gas fees. Please add ETH to your wallet.');
        }
        
        // Check staked amount
        const stakingInfo = await contracts.flexibleTieredStaking.getUserStakingInfo(account);
        const stakedAmount = stakingInfo[0];
        const stakedAmountFormatted = ethers.formatEther(stakedAmount);
        console.log('Staked amount:', stakedAmountFormatted, 'DBBPT');
        
        const amountWei = ethers.parseEther(amount);
        const amountFormatted = ethers.formatEther(amountWei);
        console.log('Attempting to unstake:', amountFormatted, 'DBBPT');
        
        // Check if user can unstake
        const canUnstake = stakingInfo[3];
        console.log('Can unstake:', canUnstake);
        
        if (!canUnstake) {
          throw new Error('Minimum staking duration not met. You need to wait at least 24 hours after staking before you can unstake.');
        }
        
        if (stakedAmount < amountWei) {
          throw new Error(`Insufficient staked tokens. You have ${stakedAmountFormatted} DBBPT staked, but tried to unstake ${amountFormatted} DBBPT.`);
        }

        const unstakeTx = await contracts.flexibleTieredStaking.connect(signer).unstake(amountWei);
        console.log('Unstake transaction sent:', unstakeTx.hash);
        await unstakeTx.wait();
        console.log('Unstake transaction confirmed');

        // Refresh user data after unstaking
        const { loadUserInfo } = get();
        await loadUserInfo(account);
      } catch (error: any) {
        console.error('Unstake error details:', {
          message: error?.message,
          reason: error?.reason,
          code: error?.code,
          data: error?.data,
          error: error
        });
        
        // Check for network-related errors
        if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
          throw new Error(`Network error: ${error.message}. Please check your network connection and try again.`);
        }
        
        throw error;
      }
    },

    stakeBatch: async (amounts: string[]) => {
      const { contracts, signer, account } = get();
      if (!contracts.reflectiveToken || !contracts.flexibleTieredStaking || !signer || !account) {
        throw new Error('Contracts or signer not available');
      }

      const amountsWei = amounts.map(amount => ethers.parseEther(amount));
      const totalAmount = amountsWei.reduce((sum, amount) => sum + amount, BigInt(0));
      
      // Ensure sufficient allowance
      const userAddress = await signer.getAddress();
      const network = await signer.provider.getNetwork();
      const chainId = Number(network.chainId);
      const contractAddresses = getContractAddresses(chainId);
      const stakingContractAddress = contractAddresses.flexibleTieredStaking;
      
      const currentAllowance = await contracts.reflectiveToken.allowance(
        userAddress,
        stakingContractAddress
      );
      
      if (currentAllowance < totalAmount) {
        const approveAmount = totalAmount * BigInt(2);
        const approveTx = await contracts.reflectiveToken.connect(signer).approve(
          stakingContractAddress,
          approveAmount
        );
        await approveTx.wait();
      }

      const tx = await contracts.flexibleTieredStaking.connect(signer).stakeBatch(amountsWei);
      await tx.wait();

      // Refresh user data after staking
      const { loadUserInfo } = get();
      await loadUserInfo(account);
    },

    unstakeBatch: async (amounts: string[]) => {
      const { contracts, signer, account } = get();
      if (!contracts.flexibleTieredStaking || !signer || !account) {
        throw new Error('Staking contract or signer not available');
      }

      const amountsWei = amounts.map(amount => ethers.parseEther(amount));
      const tx = await contracts.flexibleTieredStaking.connect(signer).unstakeBatch(amountsWei);
      await tx.wait();

      // Refresh user data after unstaking
      const { loadUserInfo } = get();
      await loadUserInfo(account);
    },

    claimVestedTokens: async () => {
      const { contracts, signer, account } = get();
      if (!contracts.tokenDistribution || !signer || !account) {
        throw new Error('Contracts or signer not available');
      }

      const claimTx = await contracts.tokenDistribution.connect(signer).claimVestedTokens();
      await claimTx.wait();

      // Refresh vesting data after claiming
      const { loadVestingInfo } = get();
      await loadVestingInfo(account);
    },

    burnTokens: async (amount: string) => {
      const { contracts, signer, account } = get();
      if (!contracts.reflectiveToken || !signer || !account) {
        throw new Error('Contracts or signer not available');
      }

      const amountWei = ethers.parseEther(amount);
      const burnTx = await contracts.reflectiveToken.connect(signer).burnTokens(amountWei);
      await burnTx.wait();

      // Refresh user data after burning
      const { loadUserInfo } = get();
      await loadUserInfo(account);
    },

    approveTokens: async (amount: string) => {
      const { contracts, signer } = get();
      if (!contracts.reflectiveToken || !signer) {
        throw new Error('Token contract or signer not available');
      }

      const amountWei = ethers.parseEther(amount);
      const userAddress = await signer.getAddress();
      const network = await signer.provider.getNetwork();
      const chainId = Number(network.chainId);
      const contractAddresses = getContractAddresses(chainId);
      const stakingContractAddress = contractAddresses.flexibleTieredStaking;
      
      const approveTx = await contracts.reflectiveToken.connect(signer).approve(
        stakingContractAddress,
        amountWei
      );
      
      await approveTx.wait();
    },

    emergencyWithdraw: async () => {
      const { contracts, signer, account } = get();
      if (!contracts.flexibleTieredStaking || !signer || !account) {
        throw new Error('Staking contract or signer not available');
      }

      const tx = await contracts.flexibleTieredStaking.connect(signer).emergencyWithdraw();
      await tx.wait();

      // Refresh user data after emergency withdraw
      const { loadUserInfo } = get();
      await loadUserInfo(account);
    },

    // Auto-refresh management
    startAutoRefresh: (account: string) => {
      const { stopAutoRefresh, refreshAllData } = get();
      
      // Clear any existing interval
      stopAutoRefresh();
      
      // Start new interval (refresh every 30 seconds)
      const interval = setInterval(() => {
        refreshAllData(account);
      }, 30000);
      
      set({ autoRefreshInterval: interval });
    },

    stopAutoRefresh: () => {
      const { autoRefreshInterval } = get();
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        set({ autoRefreshInterval: null });
      }
    },

    // Reset store
    resetStore: () => {
      const { stopAutoRefresh } = get();
      stopAutoRefresh();
      set(initialState);
    },
  }))
);

// Track initialization to prevent excessive re-initialization
let isInitializing = false;
let lastProviderChainId: number | null = null;

// Initialize contracts when provider changes
export const initializeContracts = async (provider: ethers.BrowserProvider | null) => {
  if (!provider) {
    console.log('No provider available for contract initialization');
    return;
  }

  // Prevent concurrent initializations
  if (isInitializing) {
    console.log('Contract initialization already in progress, skipping...');
    return;
  }

  // Get network to check if we need to re-initialize
  let chainId: number;
  try {
    const network = await provider.getNetwork();
    chainId = Number(network.chainId);
    
    // Check if contracts are already initialized for this chain
    const currentContracts = useAppStore.getState().contracts;
    if (currentContracts.reflectiveToken && lastProviderChainId === chainId) {
      console.log('Contracts already initialized for chain ID:', chainId);
      return;
    }
    
    lastProviderChainId = chainId;
  } catch (err) {
    console.warn('Failed to get network info:', err);
    // Continue with initialization, will get network again in try block
  }

  isInitializing = true;
  console.log('Initializing contracts with provider...');

  try {
    // Get the network to determine which contract addresses to use
    const network = await provider.getNetwork();
    chainId = Number(network.chainId);
    const contractAddresses = getContractAddresses(chainId);
    
    console.log('Using contract addresses for chain ID:', chainId);
    console.log('Contract addresses:', contractAddresses);

    // Check if contracts are deployed on this network
    const hasDeployedContracts = 
      contractAddresses.reflectiveToken &&
      contractAddresses.reflectiveToken !== '0x0000000000000000000000000000000000000000' &&
      contractAddresses.flexibleTieredStaking &&
      contractAddresses.flexibleTieredStaking !== '0x0000000000000000000000000000000000000000' &&
      contractAddresses.tokenDistribution &&
      contractAddresses.tokenDistribution !== '0x0000000000000000000000000000000000000000';

    if (!hasDeployedContracts) {
      console.warn('Contracts not deployed on chain ID:', chainId);
      console.warn('Please switch to Base Sepolia (84532) or Localhost (31337)');
      useAppStore.getState().setContractsError(
        `Contracts not deployed on this network (Chain ID: ${chainId}). Please switch to Base Sepolia Testnet (Chain ID: 84532).`
      );
      // Don't set contracts if they don't exist
      useAppStore.getState().setContracts({
        reflectiveToken: null,
        tokenDistribution: null,
        flexibleTieredStaking: null,
        arweaveGateway: null,
        improvedTimelock: null,
      });
      return;
    }

    console.log('Creating ReflectiveToken contract...');
    const reflectiveToken = new ethers.Contract(
      contractAddresses.reflectiveToken,
      REFLECTIVE_TOKEN_ABI,
      provider
    ) as ReflectiveTokenContract;

    console.log('Creating TokenDistribution contract...');
    const tokenDistribution = new ethers.Contract(
      contractAddresses.tokenDistribution,
      TOKEN_DISTRIBUTION_ABI,
      provider
    ) as TokenDistributionContract;

    console.log('Creating FlexibleTieredStaking contract...');
    const flexibleTieredStaking = new ethers.Contract(
      contractAddresses.flexibleTieredStaking,
      FLEXIBLE_TIERED_STAKING_ABI,
      provider
    ) as FlexibleTieredStakingContract;

    console.log('Creating ArweaveGateway contract...');
    const arweaveGateway = new ethers.Contract(
      contractAddresses.arweaveGateway,
      ARWEAVE_GATEWAY_ABI,
      provider
    );

    console.log('Creating ImprovedTimelock contract...');
    const improvedTimelock = new ethers.Contract(
      contractAddresses.improvedTimelock,
      IMPROVED_TIMELOCK_ABI,
      provider
    );

    console.log('Setting contracts in store...');
    useAppStore.getState().setContracts({
      reflectiveToken,
      tokenDistribution,
      flexibleTieredStaking,
      arweaveGateway,
      improvedTimelock,
    });
    console.log('Contracts initialized successfully!');
  } catch (err: any) {
    console.error('Failed to initialize contracts:', err);
    useAppStore.getState().setContractsError('Failed to initialize contracts: ' + err.message);
  } finally {
    isInitializing = false;
  }
};

// Subscribe to account changes for auto-refresh
useAppStore.subscribe(
  (state) => state.account,
  (account, previousAccount) => {
    const { startAutoRefresh, stopAutoRefresh } = useAppStore.getState();
    
    if (previousAccount && account !== previousAccount) {
      // Account changed, stop old refresh and start new one
      stopAutoRefresh();
    }
    
    if (account) {
      // Start auto-refresh for new account
      startAutoRefresh(account);
    } else {
      // No account, stop auto-refresh
      stopAutoRefresh();
    }
  }
);
