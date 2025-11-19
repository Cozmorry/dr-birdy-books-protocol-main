import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, AlertCircle, Users, DollarSign, Shield, Trash2, CheckCircle, XCircle, Settings, Wrench } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useContractsStore } from '../hooks/useContractsStore';
import { useWeb3Store } from '../hooks/useWeb3Store';
import { formatTokenAmount } from '../utils/formatNumbers';
import { getOracleConfig, getContractAddresses } from '../config/networks';

export const StakingPanelStore: React.FC = () => {
  const { addToast } = useToast();
  const {
    contracts,
    userInfo,
    isLoading,
    stakeTokens,
    unstakeTokens,
    stakeBatch,
    unstakeBatch,
    emergencyWithdraw,
    approveTokens,
  } = useContractsStore();

  const { provider, signer } = useWeb3Store();

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [batchAmounts, setBatchAmounts] = useState(['', '', '']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractStatus, setContractStatus] = useState<{
    isPaused: boolean;
    stakingTokenSet: boolean;
    primaryOracleSet: boolean;
    backupOracleSet: boolean;
    tierCount: number;
  } | null>(null);

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount to stake' });
      return;
    }

    setIsProcessing(true);
    try {
      // Check contract status before staking
      if (contracts.flexibleTieredStaking) {
        try {
          const contractStatus = await contracts.flexibleTieredStaking.getContractStatus();
          console.log('Contract status (raw):', contractStatus);
          
          // Parse the status result properly
          const parsedStatus = {
            isPaused: contractStatus[0],
            stakingTokenSet: contractStatus[1],
            primaryOracleSet: contractStatus[2],
            backupOracleSet: contractStatus[3],
            tierCount: Number(contractStatus[4])
          };
          
          console.log('Contract status (parsed):', parsedStatus);
          
          if (parsedStatus.isPaused) {
            addToast({ type: 'error', title: 'Contract Paused', message: 'Staking is currently paused. Please try again later.' });
            return;
          }
          
          if (!parsedStatus.stakingTokenSet) {
            addToast({ type: 'error', title: 'Contract Not Ready', message: 'Staking token is not set. Please contact support.' });
            return;
          }
          
          if (!parsedStatus.primaryOracleSet) {
            addToast({ type: 'error', title: 'Contract Not Ready', message: 'Price oracle is not set. Please contact support.' });
            return;
          }
        } catch (statusError) {
          console.warn('Could not check contract status:', statusError);
          // Continue with staking attempt even if status check fails
        }
      }

      await stakeTokens(stakeAmount);
      addToast({ type: 'success', title: 'Stake Successful', message: `Successfully staked ${stakeAmount} tokens` });
      setStakeAmount('');
    } catch (error: any) {
      console.error('Staking error:', error);
      
      // Provide more specific error messages based on the error
      let errorMessage = 'Failed to stake tokens';
      
      if (error.message.includes('execution reverted')) {
        if (error.message.includes('require(false)')) {
          errorMessage = 'Staking failed due to contract requirements not being met. Please ensure you have sufficient balance and allowance.';
        } else if (error.message.includes('Cannot stake zero tokens')) {
          errorMessage = 'Cannot stake zero tokens. Please enter a valid amount.';
        } else if (error.message.includes('Contract is paused')) {
          errorMessage = 'Staking is currently paused. Please try again later.';
        } else if (error.message.includes('Staking token not set')) {
          errorMessage = 'Staking contract is not properly configured. Please contact support.';
        } else if (error.message.includes('Price oracle not set')) {
          errorMessage = 'Price oracle is not configured. Please contact support.';
        } else {
          errorMessage = 'Transaction failed. Please check your balance and allowance, then try again.';
        }
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees. Please add more ETH to your wallet.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected. Please try again.';
      }
      
      addToast({ type: 'error', title: 'Stake Failed', message: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount to unstake' });
      return;
    }

    setIsProcessing(true);
    try {
      await unstakeTokens(unstakeAmount);
      addToast({ type: 'success', title: 'Unstake Successful', message: `Successfully unstaked ${unstakeAmount} tokens` });
      setUnstakeAmount('');
    } catch (error: any) {
      addToast({ type: 'error', title: 'Unstake Failed', message: `Failed to unstake tokens: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchStake = async () => {
    const validAmounts = batchAmounts.filter(amount => amount && parseFloat(amount) > 0);
    if (validAmounts.length === 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter at least one valid amount' });
      return;
    }

    setIsProcessing(true);
    try {
      await stakeBatch(validAmounts);
      addToast({ type: 'success', title: 'Batch Stake Successful', message: `Successfully staked ${validAmounts.length} batches` });
      setBatchAmounts(['', '', '']);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Batch Stake Failed', message: `Failed to batch stake: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchUnstake = async () => {
    const validAmounts = batchAmounts.filter(amount => amount && parseFloat(amount) > 0);
    if (validAmounts.length === 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter at least one valid amount' });
      return;
    }

    setIsProcessing(true);
    try {
      await unstakeBatch(validAmounts);
      addToast({ type: 'success', title: 'Batch Unstake Successful', message: `Successfully unstaked ${validAmounts.length} batches` });
      setBatchAmounts(['', '', '']);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Batch Unstake Failed', message: `Failed to batch unstake: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmergencyWithdraw = async () => {
    setIsProcessing(true);
    try {
      await emergencyWithdraw();
      addToast({ type: 'success', title: 'Emergency Withdrawal', message: 'Emergency withdrawal completed' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Emergency Withdrawal Failed', message: `Emergency withdrawal failed: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount to approve' });
      return;
    }

    setIsProcessing(true);
    try {
      await approveTokens(stakeAmount);
      addToast({ type: 'success', title: 'Approval Successful', message: `Successfully approved ${stakeAmount} tokens` });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Approval Failed', message: `Failed to approve tokens: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateBatchAmount = (index: number, value: string) => {
    const newAmounts = [...batchAmounts];
    newAmounts[index] = value;
    setBatchAmounts(newAmounts);
  };

  // Check contract status
  const checkContractStatus = async () => {
    if (contracts.flexibleTieredStaking) {
      try {
        console.log('Checking contract status...');
        const status = await contracts.flexibleTieredStaking.getContractStatus();
        console.log('Contract status result:', status);
        
        // Parse the status result properly
        const parsedStatus = {
          isPaused: status[0],
          stakingTokenSet: status[1],
          primaryOracleSet: status[2],
          backupOracleSet: status[3],
          tierCount: Number(status[4])
        };
        
        console.log('Parsed contract status:', parsedStatus);
        setContractStatus(parsedStatus);
      } catch (error: any) {
        console.error('Failed to check contract status:', error);
        addToast({ type: 'error', title: 'Status Check Failed', message: `Failed to check contract status: ${error.message}` });
      }
    } else {
      console.log('No staking contract available');
    }
  };

  // Check contract status on component mount
  useEffect(() => {
    checkContractStatus();
  }, []);

  // Set up staking token
  const setupStakingToken = async () => {
    if (!contracts.flexibleTieredStaking || !provider || !signer) {
      addToast({ type: 'error', title: 'Contract Not Available', message: 'Staking contract, provider, or signer is not available' });
      return;
    }

    setIsProcessing(true);
    try {
      // Get the reflective token address from the current network
      const network = await provider.getNetwork();
      const contractAddresses = getContractAddresses(Number(network.chainId));
      
      if (!contractAddresses.reflectiveToken || contractAddresses.reflectiveToken === '0x0000000000000000000000000000000000000000') {
        addToast({ type: 'error', title: 'Token Not Configured', message: 'Reflective token address is not configured for this network' });
        return;
      }

      // Create a new contract instance with signer for transactions
      const stakingContractWithSigner = contracts.flexibleTieredStaking.connect(signer);
      
      console.log('Setting staking token to:', contractAddresses.reflectiveToken);
      console.log('Network chain ID:', Number(network.chainId));
      
      const tx = await stakingContractWithSigner.setStakingToken(contractAddresses.reflectiveToken);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      addToast({ type: 'success', title: 'Staking Token Set', message: `Staking token has been successfully configured. Transaction: ${tx.hash}` });
      
      // Wait a moment for the transaction to be fully processed
      console.log('Waiting for transaction to be processed...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force refresh status multiple times to ensure it's updated
      console.log('Refreshing contract status...');
      await checkContractStatus();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkContractStatus();
    } catch (error: any) {
      console.error('Failed to set staking token:', error);
      addToast({ type: 'error', title: 'Setup Failed', message: `Failed to set staking token: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up price oracle
  const setupPriceOracle = async () => {
    if (!contracts.flexibleTieredStaking || !provider || !signer) {
      addToast({ type: 'error', title: 'Contract Not Available', message: 'Staking contract, provider, or signer is not available' });
      return;
    }

    setIsProcessing(true);
    try {
      // Get the oracle configuration for the current network
      const network = await provider.getNetwork();
      const oracleConfig = getOracleConfig(Number(network.chainId));
      
      if (!oracleConfig.primaryOracle) {
        addToast({ type: 'error', title: 'Oracle Not Configured', message: 'Price oracle is not configured for this network' });
        return;
      }

      // Create a new contract instance with signer for transactions
      const stakingContractWithSigner = contracts.flexibleTieredStaking.connect(signer);

      console.log('Setting primary oracle to:', oracleConfig.primaryOracle);
      console.log('Setting backup oracle to:', oracleConfig.backupOracle);
      console.log('Network chain ID:', Number(network.chainId));

      // Set primary oracle
      const primaryTx = await stakingContractWithSigner.setPrimaryPriceOracle(oracleConfig.primaryOracle);
      console.log('Primary oracle transaction sent:', primaryTx.hash);
      const primaryReceipt = await primaryTx.wait();
      console.log('Primary oracle transaction confirmed:', primaryReceipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      // Set backup oracle if available
      if (oracleConfig.backupOracle) {
        const backupTx = await stakingContractWithSigner.setBackupPriceOracle(oracleConfig.backupOracle);
        console.log('Backup oracle transaction sent:', backupTx.hash);
        const backupReceipt = await backupTx.wait();
        console.log('Backup oracle transaction confirmed:', backupReceipt.status === 1 ? 'SUCCESS' : 'FAILED');
      }
      
      addToast({ type: 'success', title: 'Price Oracle Set', message: `Price oracle has been successfully configured. Primary: ${primaryTx.hash}` });
      
      // Wait a moment for the transaction to be fully processed
      console.log('Waiting for oracle transaction to be processed...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force refresh status multiple times to ensure it's updated
      console.log('Refreshing contract status after oracle setup...');
      await checkContractStatus();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkContractStatus();
    } catch (error: any) {
      console.error('Failed to set price oracle:', error);
      addToast({ type: 'error', title: 'Setup Failed', message: `Failed to set price oracle: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up both staking token and oracle
  const setupContract = async () => {
    setIsProcessing(true);
    try {
      await setupStakingToken();
      await setupPriceOracle();
      
      // Final verification
      console.log('Performing final contract verification...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await checkContractStatus();
      
      addToast({ type: 'success', title: 'Contract Setup Complete', message: 'Staking contract has been fully configured' });
    } catch (error: any) {
      console.error('Failed to setup contract:', error);
      addToast({ type: 'error', title: 'Setup Failed', message: `Failed to setup contract: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry oracle setup specifically
  const retryOracleSetup = async () => {
    if (!contracts.flexibleTieredStaking || !provider || !signer) {
      addToast({ type: 'error', title: 'Contract Not Available', message: 'Staking contract, provider, or signer is not available' });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('=== RETRYING ORACLE SETUP ===');
      
      // Get the oracle configuration for the current network
      const network = await provider.getNetwork();
      const oracleConfig = getOracleConfig(Number(network.chainId));
      
      console.log('Oracle config for chain', Number(network.chainId), ':', oracleConfig);
      
      if (!oracleConfig.primaryOracle) {
        addToast({ type: 'error', title: 'Oracle Not Configured', message: 'Price oracle is not configured for this network' });
        return;
      }

      // Create a new contract instance with signer for transactions
      const stakingContractWithSigner = contracts.flexibleTieredStaking.connect(signer);

      console.log('Retrying primary oracle setup...');
      const primaryTx = await stakingContractWithSigner.setPrimaryPriceOracle(oracleConfig.primaryOracle);
      console.log('Primary oracle retry transaction:', primaryTx.hash);
      const primaryReceipt = await primaryTx.wait();
      console.log('Primary oracle retry confirmed:', primaryReceipt.status === 1 ? 'SUCCESS' : 'FAILED');
      
      // Set backup oracle if available
      if (oracleConfig.backupOracle) {
        console.log('Retrying backup oracle setup...');
        const backupTx = await stakingContractWithSigner.setBackupPriceOracle(oracleConfig.backupOracle);
        console.log('Backup oracle retry transaction:', backupTx.hash);
        const backupReceipt = await backupTx.wait();
        console.log('Backup oracle retry confirmed:', backupReceipt.status === 1 ? 'SUCCESS' : 'FAILED');
      }
      
      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 2000));
      await verifyContractSetup();
      
      addToast({ type: 'success', title: 'Oracle Retry Complete', message: 'Oracle setup has been retried and verified' });
      
    } catch (error: any) {
      console.error('Oracle retry failed:', error);
      addToast({ type: 'error', title: 'Oracle Retry Failed', message: `Failed to retry oracle setup: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual verification function
  const verifyContractSetup = async () => {
    if (!contracts.flexibleTieredStaking) {
      addToast({ type: 'error', title: 'Contract Not Available', message: 'Staking contract is not available' });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('=== MANUAL CONTRACT VERIFICATION ===');
      
      // Check contract status
      const status = await contracts.flexibleTieredStaking.getContractStatus();
      console.log('Contract Status (raw):', status);
      
      // Parse the status result properly
      const parsedStatus = {
        isPaused: status[0],
        stakingTokenSet: status[1],
        primaryOracleSet: status[2],
        backupOracleSet: status[3],
        tierCount: Number(status[4])
      };
      console.log('Contract Status (parsed):', parsedStatus);
      
      // Check staking token address
      const stakingTokenAddress = await contracts.flexibleTieredStaking.stakingToken();
      console.log('Staking Token Address:', stakingTokenAddress);
      
      // Check oracle addresses
      try {
        const oracleInfo = await contracts.flexibleTieredStaking.getOracleInfo();
        console.log('Oracle Info:', oracleInfo);
      } catch (oracleError) {
        console.error('Failed to get oracle info:', oracleError);
        console.log('Trying to get oracle addresses individually...');
        
        try {
          const primaryOracle = await contracts.flexibleTieredStaking.primaryPriceOracle();
          const backupOracle = await contracts.flexibleTieredStaking.backupPriceOracle();
          console.log('Primary Oracle (direct):', primaryOracle);
          console.log('Backup Oracle (direct):', backupOracle);
        } catch (directError) {
          console.error('Failed to get oracle addresses directly:', directError);
        }
      }
      
      // Update local status
      setContractStatus(parsedStatus);
      
      addToast({ 
        type: 'info', 
        title: 'Verification Complete', 
        message: `Staking Token: ${stakingTokenAddress}. Check console for oracle details.` 
      });
      
    } catch (error: any) {
      console.error('Verification failed:', error);
      addToast({ type: 'error', title: 'Verification Failed', message: `Failed to verify contract: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading user information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
          Staking Panel
        </h2>
        {userInfo.tier >= 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <Shield className="h-4 w-4 mr-1" />
            Tier {userInfo.tier}
          </div>
        )}
      </div>

      {/* User Staking Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Balance</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTokenAmount(userInfo.balance)} DBB
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Staked</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTokenAmount(userInfo.stakedAmount)} DBB
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Access</p>
              <p className="text-lg font-semibold text-gray-900">
                {userInfo.hasAccess ? 'Yes' : 'No'}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Contract Status */}
      {contractStatus && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-blue-900 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Contract Status
            </h3>
            <div className="flex gap-2">
              <button
                onClick={checkContractStatus}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
                disabled={isProcessing}
              >
                Refresh
              </button>
              <button
                onClick={async () => {
                  console.log('Manual status check...');
                  await checkContractStatus();
                }}
                className="text-sm text-green-600 hover:text-green-800 underline"
                disabled={isProcessing}
              >
                Debug Status
              </button>
              <button
                onClick={verifyContractSetup}
                className="text-sm text-purple-600 hover:text-purple-800 underline"
                disabled={isProcessing}
              >
                Verify Setup
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Contract Status:</span>
              <div className="flex items-center">
                {contractStatus.isPaused ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 font-medium">Paused</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">Active</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Staking Token:</span>
              <div className="flex items-center">
                {contractStatus.stakingTokenSet ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">Set</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 font-medium">Not Set</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Price Oracle:</span>
              <div className="flex items-center">
                {contractStatus.primaryOracleSet ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">Set</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 font-medium">Not Set</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Tiers Configured:</span>
              <span className="text-blue-600 font-medium">{contractStatus.tierCount}</span>
            </div>
          </div>
          {contractStatus.isPaused && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">
                  Staking is currently paused. Please try again later.
                </span>
              </div>
            </div>
          )}
          
          {/* Setup Actions */}
          {(!contractStatus.stakingTokenSet || !contractStatus.primaryOracleSet) && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center mb-3">
                <Settings className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium text-sm">
                  Contract Setup Required
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-yellow-700 text-sm">
                  The staking contract needs to be configured before it can be used.
                </p>
                <div className="flex flex-wrap gap-2">
                  {!contractStatus.stakingTokenSet && (
                    <button
                      onClick={setupStakingToken}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Set Staking Token
                    </button>
                  )}
                  {!contractStatus.primaryOracleSet && (
                    <button
                      onClick={setupPriceOracle}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Set Price Oracle
                    </button>
                  )}
                  {!contractStatus.stakingTokenSet && !contractStatus.primaryOracleSet && (
                    <button
                      onClick={setupContract}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Setup All
                    </button>
                  )}
                  {contractStatus.stakingTokenSet && !contractStatus.primaryOracleSet && (
                    <button
                      onClick={retryOracleSetup}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Retry Oracle
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staking Actions */}
      <div className="space-y-6">
        {/* Single Stake */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stake Tokens</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount to stake"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing || isLoading}
            />
            <button
              onClick={handleStake}
              disabled={isProcessing || isLoading || !stakeAmount}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Staking...' : 'Stake'}
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing || isLoading || !stakeAmount}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </div>

        {/* Single Unstake */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Unstake Tokens</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="Amount to unstake"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing || isLoading}
            />
            <button
              onClick={handleUnstake}
              disabled={isProcessing || isLoading || !unstakeAmount || !userInfo.canUnstake}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Unstaking...' : 'Unstake'}
            </button>
          </div>
          {!userInfo.canUnstake && (
            <p className="text-sm text-red-600 mt-2">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Unstaking is currently disabled
            </p>
          )}
        </div>

        {/* Batch Operations */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Operations</h3>
          <div className="space-y-3">
            {batchAmounts.map((amount, index) => (
              <input
                key={index}
                type="number"
                value={amount}
                onChange={(e) => updateBatchAmount(index, e.target.value)}
                placeholder={`Batch ${index + 1} amount`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing || isLoading}
              />
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleBatchStake}
                disabled={isProcessing || isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Batch Staking...' : 'Batch Stake'}
              </button>
              <button
                onClick={handleBatchUnstake}
                disabled={isProcessing || isLoading || !userInfo.canUnstake}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Batch Unstaking...' : 'Batch Unstake'}
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Actions */}
        {/* <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Emergency Actions
          </h3>
          <button
            onClick={handleEmergencyWithdraw}
            disabled={isProcessing || isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Emergency Withdraw'}
          </button>
          <p className="text-sm text-red-600 mt-2">
            Use only in case of emergency. This will withdraw all your staked tokens.
          </p>
        </div> */}
      </div>

      {/* Loading State */}
      {(isLoading || isProcessing) && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            {isProcessing ? 'Processing transaction...' : 'Loading...'}
          </span>
        </div>
      )}
    </div>
  );
};
