import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, AlertCircle, Users, DollarSign, Shield, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface StakingPanelProps {
  userInfo: any;
  tiers: any[];
  onStake: (amount: string) => Promise<void>;
  onUnstake: (amount: string) => Promise<void>;
  onStakeBatch: (amounts: string[]) => Promise<void>;
  onUnstakeBatch: (amounts: string[]) => Promise<void>;
  onEmergencyWithdraw: () => Promise<void>;
  onApproveTokens: (amount: string) => Promise<void>;
  onDebugTokenContract: () => Promise<void>;
  onTestApproval: () => Promise<void>;
  onInitializeToken: () => Promise<void>;
  onInitializeStakingContract: () => Promise<void>;
  onTestRawApproval: (amount: string) => Promise<any>;
  onCheckBlacklistStatus: () => Promise<any>;
  onFixBlacklistIssue: () => Promise<any>;
  onDebugReflectiveTokenState: () => Promise<any>;
  onCheckAndFixContractInitialization: () => Promise<any>;
  onFixAllowanceIssue: (amount: string) => Promise<any>;
  onDebugStakingContract: () => Promise<any>;
  isLoading: boolean;
}

export const StakingPanel: React.FC<StakingPanelProps> = ({
  userInfo,
  tiers,
  onStake,
  onUnstake,
  onStakeBatch,
  onUnstakeBatch,
  onEmergencyWithdraw,
  onApproveTokens,
  onDebugTokenContract,
  onTestApproval,
  onInitializeToken,
  onInitializeStakingContract,
  onTestRawApproval,
  onCheckBlacklistStatus,
  onFixBlacklistIssue,
  onDebugReflectiveTokenState,
  onCheckAndFixContractInitialization,
  onFixAllowanceIssue,
  onDebugStakingContract,
  isLoading,
}) => {
  const { addToast } = useToast();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [batchStakeAmounts, setBatchStakeAmounts] = useState(['', '']);
  const [batchUnstakeAmounts, setBatchUnstakeAmounts] = useState(['', '']);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isBatchStaking, setIsBatchStaking] = useState(false);
  const [isBatchUnstaking, setIsBatchUnstaking] = useState(false);
  const [isEmergencyWithdrawing, setIsEmergencyWithdrawing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveAmount, setApproveAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'emergency' | 'approve'>('single');

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError('Please enter a valid amount');
      addToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount to stake',
      });
      return;
    }

    if (parseFloat(stakeAmount) > parseFloat(userInfo.balance)) {
      setError('Insufficient balance');
      addToast({
        type: 'error',
        title: 'Insufficient Balance',
        message: 'You do not have enough tokens to stake this amount',
      });
      return;
    }

    setIsStaking(true);
    setError(null);

    // Show loading toast
    addToast({
      type: 'info',
      title: 'Staking Tokens',
      message: `Staking ${stakeAmount} DBBPT tokens...`,
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onStake(stakeAmount);
      setStakeAmount('');
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Staking Successful',
        message: `Successfully staked ${stakeAmount} DBBPT tokens`,
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to stake tokens');
      addToast({
        type: 'error',
        title: 'Staking Failed',
        message: err.message || 'Failed to stake tokens. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      setError('Please enter a valid amount');
      addToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount to unstake',
      });
      return;
    }

    if (parseFloat(unstakeAmount) > parseFloat(userInfo.stakedAmount)) {
      setError('Insufficient staked amount');
      addToast({
        type: 'error',
        title: 'Insufficient Staked Amount',
        message: 'You do not have enough staked tokens to unstake this amount',
      });
      return;
    }

    if (!userInfo.canUnstake) {
      setError('Minimum staking duration not met');
      addToast({
        type: 'warning',
        title: 'Minimum Duration Not Met',
        message: 'You must wait for the minimum staking duration before unstaking',
      });
      return;
    }

    setIsUnstaking(true);
    setError(null);

    // Show loading toast
    addToast({
      type: 'info',
      title: 'Unstaking Tokens',
      message: `Unstaking ${unstakeAmount} DBBPT tokens...`,
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onUnstake(unstakeAmount);
      setUnstakeAmount('');
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Unstaking Successful',
        message: `Successfully unstaked ${unstakeAmount} DBBPT tokens`,
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to unstake tokens');
      addToast({
        type: 'error',
        title: 'Unstaking Failed',
        message: err.message || 'Failed to unstake tokens. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleBatchStake = async () => {
    const validAmounts = batchStakeAmounts.filter(amount => amount && parseFloat(amount) > 0);
    if (validAmounts.length === 0) {
      setError('Please enter at least one valid amount');
      addToast({
        type: 'error',
        title: 'Invalid Batch Amounts',
        message: 'Please enter at least one valid amount for batch staking',
      });
      return;
    }

    const totalAmount = validAmounts.reduce((sum, amount) => sum + parseFloat(amount), 0);
    if (totalAmount > parseFloat(userInfo.balance)) {
      setError('Insufficient balance for batch staking');
      addToast({
        type: 'error',
        title: 'Insufficient Balance',
        message: 'You do not have enough tokens for batch staking',
      });
      return;
    }

    setIsBatchStaking(true);
    setError(null);

    // Show loading toast
    addToast({
      type: 'info',
      title: 'Batch Staking Tokens',
      message: `Staking ${validAmounts.length} batches totaling ${totalAmount.toFixed(2)} DBBPT...`,
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onStakeBatch(validAmounts);
      setBatchStakeAmounts(['', '']);
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Batch Staking Successful',
        message: `Successfully staked ${validAmounts.length} batches totaling ${totalAmount.toFixed(2)} DBBPT`,
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to batch stake tokens');
      addToast({
        type: 'error',
        title: 'Batch Staking Failed',
        message: err.message || 'Failed to batch stake tokens. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsBatchStaking(false);
    }
  };

  const handleBatchUnstake = async () => {
    const validAmounts = batchUnstakeAmounts.filter(amount => amount && parseFloat(amount) > 0);
    if (validAmounts.length === 0) {
      setError('Please enter at least one valid amount');
      addToast({
        type: 'error',
        title: 'Invalid Batch Amounts',
        message: 'Please enter at least one valid amount for batch unstaking',
      });
      return;
    }

    const totalAmount = validAmounts.reduce((sum, amount) => sum + parseFloat(amount), 0);
    if (totalAmount > parseFloat(userInfo.stakedAmount)) {
      setError('Insufficient staked amount for batch unstaking');
      addToast({
        type: 'error',
        title: 'Insufficient Staked Amount',
        message: 'You do not have enough staked tokens for batch unstaking',
      });
      return;
    }

    if (!userInfo.canUnstake) {
      setError('Minimum staking duration not met');
      addToast({
        type: 'warning',
        title: 'Minimum Duration Not Met',
        message: 'You must wait for the minimum staking duration before batch unstaking',
      });
      return;
    }

    setIsBatchUnstaking(true);
    setError(null);

    // Show loading toast
    addToast({
      type: 'info',
      title: 'Batch Unstaking Tokens',
      message: `Unstaking ${validAmounts.length} batches totaling ${totalAmount.toFixed(2)} DBBPT...`,
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onUnstakeBatch(validAmounts);
      setBatchUnstakeAmounts(['', '']);
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Batch Unstaking Successful',
        message: `Successfully unstaked ${validAmounts.length} batches totaling ${totalAmount.toFixed(2)} DBBPT`,
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to batch unstake tokens');
      addToast({
        type: 'error',
        title: 'Batch Unstaking Failed',
        message: err.message || 'Failed to batch unstake tokens. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsBatchUnstaking(false);
    }
  };

  const handleEmergencyWithdraw = async () => {
    setIsEmergencyWithdrawing(true);
    setError(null);

    // Show warning toast
    addToast({
      type: 'warning',
      title: 'Emergency Withdraw',
      message: 'Initiating emergency withdrawal of all staked tokens...',
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onEmergencyWithdraw();
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Emergency Withdraw Successful',
        message: 'All staked tokens have been withdrawn. You will lose tier access.',
        duration: 8000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to emergency withdraw');
      addToast({
        type: 'error',
        title: 'Emergency Withdraw Failed',
        message: err.message || 'Failed to emergency withdraw. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsEmergencyWithdrawing(false);
    }
  };

  const handleApproveTokens = async () => {
    if (!approveAmount || parseFloat(approveAmount) <= 0) {
      setError('Please enter a valid approval amount');
      addToast({
        type: 'error',
        title: 'Invalid Approval Amount',
        message: 'Please enter a valid amount to approve',
      });
      return;
    }

    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Approving Tokens',
      message: `Approving ${approveAmount} DBBPT tokens for staking...`,
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onApproveTokens(approveAmount);
      setError(null);
      setApproveAmount('');
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Token Approval Successful',
        message: `Successfully approved ${approveAmount} DBBPT tokens for staking`,
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Token approval failed');
      addToast({
        type: 'error',
        title: 'Token Approval Failed',
        message: err.message || 'Failed to approve tokens. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleTestRawApproval = async () => {
    if (!approveAmount || parseFloat(approveAmount) <= 0) {
      setError('Please enter a valid approval amount');
      addToast({
        type: 'error',
        title: 'Invalid Test Amount',
        message: 'Please enter a valid amount for raw approval test',
      });
      return;
    }

    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Testing Raw Approval',
      message: `Testing raw approval for ${approveAmount} DBBPT tokens...`,
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onTestRawApproval(approveAmount);
      setError(null);
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Raw Approval Test Successful',
        message: `Raw approval test completed for ${approveAmount} DBBPT tokens`,
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Raw approval test failed');
      addToast({
        type: 'error',
        title: 'Raw Approval Test Failed',
        message: err.message || 'Raw approval test failed. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCheckBlacklistStatus = async () => {
    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Checking Blacklist Status',
      message: 'Checking if user or staking contract is blacklisted...',
      duration: 0, // Don't auto-dismiss
    });

    try {
      const result = await onCheckBlacklistStatus();
      setError(null);
      
      // Show result toast
      if (result.canApprove) {
        addToast({
          type: 'success',
          title: 'Blacklist Check Complete',
          message: 'Neither user nor staking contract is blacklisted. Approvals should work.',
          duration: 5000,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Blacklist Issue Found',
          message: 'User or staking contract is blacklisted. This prevents approvals.',
          duration: 8000,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Blacklist check failed');
      addToast({
        type: 'error',
        title: 'Blacklist Check Failed',
        message: err.message || 'Failed to check blacklist status. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleFixBlacklistIssue = async () => {
    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Fixing Blacklist Issue',
      message: 'Attempting to unblacklist staking contract...',
      duration: 0, // Don't auto-dismiss
    });

    try {
      const result = await onFixBlacklistIssue();
      if (result.success) {
        setError(null);
        addToast({
          type: 'success',
          title: 'Blacklist Issue Fixed',
          message: result.message || 'Blacklist issue has been resolved. You can now approve tokens.',
          duration: 8000,
        });
      } else {
        setError(result.message || 'Failed to fix blacklist issue');
        addToast({
          type: 'error',
          title: 'Failed to Fix Blacklist Issue',
          message: result.message || 'Could not fix blacklist issue. You may not have permission.',
          duration: 8000,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fix blacklist issue');
      addToast({
        type: 'error',
        title: 'Blacklist Fix Failed',
        message: err.message || 'Failed to fix blacklist issue. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDebugReflectiveTokenState = async () => {
    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Debugging Token State',
      message: 'Analyzing ReflectiveToken contract state...',
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onDebugReflectiveTokenState();
      setError(null);
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Token State Debug Complete',
        message: 'Token contract state analysis completed. Check console for details.',
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to debug token state');
      addToast({
        type: 'error',
        title: 'Token Debug Failed',
        message: err.message || 'Failed to debug token state. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCheckAndFixContractInitialization = async () => {
    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Checking Contract Initialization',
      message: 'Verifying and fixing contract initialization...',
      duration: 0, // Don't auto-dismiss
    });

    try {
      const result = await onCheckAndFixContractInitialization();
      if (result.success) {
        setError(null);
        addToast({
          type: 'success',
          title: 'Contract Initialization Complete',
          message: result.message || 'Contract initialization has been verified and fixed.',
          duration: 8000,
        });
      } else {
        setError(result.message || 'Failed to fix contract initialization');
        addToast({
          type: 'error',
          title: 'Contract Initialization Failed',
          message: result.message || 'Could not fix contract initialization.',
          duration: 8000,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check contract initialization');
      addToast({
        type: 'error',
        title: 'Initialization Check Failed',
        message: err.message || 'Failed to check contract initialization. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleFixAllowanceIssue = async () => {
    if (!approveAmount || parseFloat(approveAmount) <= 0) {
      setError('Please enter a valid approval amount');
      addToast({
        type: 'error',
        title: 'Invalid Fix Amount',
        message: 'Please enter a valid amount to fix allowance issue',
      });
      return;
    }

    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Fixing Allowance Issue',
      message: `Attempting to fix allowance for ${approveAmount} DBBPT tokens...`,
      duration: 0, // Don't auto-dismiss
    });

    try {
      const result = await onFixAllowanceIssue(approveAmount);
      if (result.success) {
        setError(null);
        addToast({
          type: 'success',
          title: 'Allowance Issue Fixed',
          message: result.message || 'Allowance issue has been resolved. You can now stake tokens.',
          duration: 8000,
        });
      } else {
        setError(result.message || 'Failed to fix allowance issue');
        addToast({
          type: 'error',
          title: 'Allowance Fix Failed',
          message: result.message || 'Could not fix allowance issue.',
          duration: 8000,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fix allowance issue');
      addToast({
        type: 'error',
        title: 'Allowance Fix Error',
        message: err.message || 'Failed to fix allowance issue. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDebugStakingContract = async () => {
    setIsApproving(true);
    setError(null);
    
    // Show loading toast
    addToast({
      type: 'info',
      title: 'Debugging Staking Contract',
      message: 'Analyzing FlexibleTieredStaking contract state...',
      duration: 0, // Don't auto-dismiss
    });

    try {
      await onDebugStakingContract();
      setError(null);
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Staking Contract Debug Complete',
        message: 'Staking contract state analysis completed. Check console for details.',
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to debug staking contract');
      addToast({
        type: 'error',
        title: 'Staking Debug Failed',
        message: err.message || 'Failed to debug staking contract. Please try again.',
        duration: 8000,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const addBatchStakeInput = () => {
    setBatchStakeAmounts([...batchStakeAmounts, '']);
  };

  const removeBatchStakeInput = (index: number) => {
    const newAmounts = batchStakeAmounts.filter((_, i) => i !== index);
    setBatchStakeAmounts(newAmounts);
  };

  const addBatchUnstakeInput = () => {
    setBatchUnstakeAmounts([...batchUnstakeAmounts, '']);
  };

  const removeBatchUnstakeInput = (index: number) => {
    const newAmounts = batchUnstakeAmounts.filter((_, i) => i !== index);
    setBatchUnstakeAmounts(newAmounts);
  };

  const updateBatchStakeAmount = (index: number, value: string) => {
    const newAmounts = [...batchStakeAmounts];
    newAmounts[index] = value;
    setBatchStakeAmounts(newAmounts);
  };

  const updateBatchUnstakeAmount = (index: number, value: string) => {
    const newAmounts = [...batchUnstakeAmounts];
    newAmounts[index] = value;
    setBatchUnstakeAmounts(newAmounts);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Staking Panel</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Current Tier:</span>
          <span className="text-sm font-medium text-blue-600">
            {userInfo?.tier >= 0 ? `Tier ${userInfo.tier + 1}` : 'No Tier'}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'single'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Single Stake
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'batch'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Batch Stake
        </button>
        <button
          onClick={() => setActiveTab('emergency')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'emergency'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Emergency
        </button>
        <button
          onClick={() => setActiveTab('approve')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'approve'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Approve
        </button>
      </div>

      {/* Tier Information */}
      {tiers.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-3">Available Tiers</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tiers.map((tier, index) => (
              <div key={index} className="bg-white rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{tier.name}</span>
                  <span className="text-xs text-gray-500">${parseFloat(tier.threshold).toLocaleString()}</span>
                </div>
                {userInfo?.tier === index && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Your Tier
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Stake/Unstake */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stake Section */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="text-lg font-medium text-green-900">Stake Tokens</h4>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Stake
              </label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isStaking || isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {parseFloat(userInfo?.balance || '0').toLocaleString()} DBBPT
              </p>
            </div>

            <button
              onClick={handleStake}
              disabled={isStaking || isLoading || !userInfo}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isStaking ? 'Staking...' : 'Stake Tokens'}
            </button>
          </div>

          {/* Unstake Section */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="text-lg font-medium text-red-900">Unstake Tokens</h4>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Unstake
              </label>
              <input
                type="number"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isUnstaking || isLoading || !userInfo}
              />
              <p className="text-xs text-gray-500 mt-1">
                Staked: {parseFloat(userInfo?.stakedAmount || '0').toLocaleString()} DBBPT
              </p>
            </div>

            {!userInfo?.canUnstake && userInfo?.stakedAmount && parseFloat(userInfo.stakedAmount) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <div className="ml-2">
                    <p className="text-xs text-yellow-800">
                      Minimum staking duration not met. Please wait before unstaking.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleUnstake}
              disabled={isUnstaking || isLoading || !userInfo || !userInfo?.canUnstake}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUnstaking ? 'Unstaking...' : 'Unstake Tokens'}
            </button>
          </div>
        </div>
      )}

      {/* Batch Stake/Unstake */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          {/* Batch Stake */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="text-lg font-medium text-green-900">Batch Stake Tokens</h4>
            </div>
            
            <div className="space-y-3">
              {batchStakeAmounts.map((amount, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => updateBatchStakeAmount(index, e.target.value)}
                    placeholder="0.0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isBatchStaking || isLoading || !userInfo}
                  />
                  {batchStakeAmounts.length > 1 && (
                    <button
                      onClick={() => removeBatchStakeInput(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <div className="flex space-x-2">
                <button
                  onClick={addBatchStakeInput}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add Amount
                </button>
                <button
                  onClick={handleBatchStake}
                  disabled={isBatchStaking || isLoading || !userInfo}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isBatchStaking ? 'Staking...' : 'Batch Stake'}
                </button>
              </div>
            </div>
          </div>

          {/* Batch Unstake */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="text-lg font-medium text-red-900">Batch Unstake Tokens</h4>
            </div>
            
            <div className="space-y-3">
              {batchUnstakeAmounts.map((amount, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => updateBatchUnstakeAmount(index, e.target.value)}
                    placeholder="0.0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isBatchUnstaking || isLoading || !userInfo}
                  />
                  {batchUnstakeAmounts.length > 1 && (
                    <button
                      onClick={() => removeBatchUnstakeInput(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <div className="flex space-x-2">
                <button
                  onClick={addBatchUnstakeInput}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Add Amount
                </button>
                <button
                  onClick={handleBatchUnstake}
                  disabled={isBatchUnstaking || isLoading || !userInfo || !userInfo?.canUnstake}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isBatchUnstaking ? 'Unstaking...' : 'Batch Unstake'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Withdraw */}
      {activeTab === 'emergency' && (
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <h4 className="text-lg font-medium text-red-900">Emergency Withdraw</h4>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Emergency withdraw will immediately return all your staked tokens
                  but you will lose your tier access and any associated benefits.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Staked Amount:</span>
                <span className="text-sm font-bold text-gray-900">
                  {parseFloat(userInfo?.stakedAmount || '0').toLocaleString()} DBBPT
                </span>
              </div>
            </div>

            <button
              onClick={handleEmergencyWithdraw}
              disabled={isEmergencyWithdrawing || isLoading || !userInfo || !userInfo?.stakedAmount || parseFloat(userInfo.stakedAmount) === 0}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEmergencyWithdrawing ? 'Withdrawing...' : 'Emergency Withdraw All Tokens'}
            </button>
          </div>
        </div>
      )}

      {/* Manual Token Approval */}
      {activeTab === 'approve' && (
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-orange-600 mr-2" />
            <h4 className="text-lg font-medium text-orange-900">Manual Token Approval</h4>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Debug Tool:</strong> Use this to manually approve tokens for staking if you're experiencing allowance issues.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-md p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">Current Balance:</span>
                <span className="text-sm font-bold text-gray-900">
                  {parseFloat(userInfo?.balance || '0').toLocaleString()} DBBPT
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Amount (DBBPT)
                  </label>
                  <input
                    type="number"
                    value={approveAmount}
                    onChange={(e) => setApproveAmount(e.target.value)}
                    placeholder="Enter amount to approve"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleApproveTokens}
                    disabled={isApproving || isLoading || !approveAmount || parseFloat(approveAmount) <= 0}
                    className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isApproving ? 'Approving...' : 'Approve Tokens'}
                  </button>
                  
                  <button
                    onClick={onDebugTokenContract}
                    disabled={isLoading}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Debug Token Contract
                  </button>
                  
                  <button
                    onClick={onTestApproval}
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Test Approval (1 Token)
                  </button>
                  
                  <button
                    onClick={onInitializeToken}
                    disabled={isLoading}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Initialize Token
                  </button>
                  
                  <button
                    onClick={onInitializeStakingContract}
                    disabled={isLoading}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Initialize Staking Contract
                  </button>
                  
                  <button
                    onClick={handleTestRawApproval}
                    disabled={isApproving || isLoading || !approveAmount || parseFloat(approveAmount) <= 0}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isApproving ? 'Testing...' : 'Test Raw Approval'}
                  </button>
                  
                  <button
                    onClick={handleCheckBlacklistStatus}
                    disabled={isApproving || isLoading}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isApproving ? 'Checking...' : 'Check Blacklist Status'}
                  </button>
                  
                  <button
                    onClick={handleFixBlacklistIssue}
                    disabled={isApproving || isLoading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isApproving ? 'Fixing...' : 'Fix Blacklist Issue'}
                  </button>
                  
                  <button
                    onClick={handleDebugReflectiveTokenState}
                    disabled={isApproving || isLoading}
                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isApproving ? 'Debugging...' : 'Debug Token State'}
                  </button>
                  
                  <button
                    onClick={handleCheckAndFixContractInitialization}
                    disabled={isApproving || isLoading}
                    className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isApproving ? 'Checking...' : 'Fix Contract Initialization'}
                  </button>
                  
                  <button
                    onClick={handleFixAllowanceIssue}
                    disabled={isApproving || isLoading || !approveAmount || parseFloat(approveAmount) <= 0}
                    className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isApproving ? 'Fixing...' : 'Fix Allowance Issue'}
                  </button>
                  
                  <button
                    onClick={handleDebugStakingContract}
                    disabled={isApproving || isLoading}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isApproving ? 'Debugging...' : 'Debug Staking Contract'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};