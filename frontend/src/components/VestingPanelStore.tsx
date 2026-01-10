import React, { useState, useEffect } from 'react';
import { Gift, Clock, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useContractsStore } from '../hooks/useContractsStore';
import { useWeb3Store } from '../hooks/useWeb3Store';
import { formatTokenAmount, formatPercentage } from '../utils/formatNumbers';

export const VestingPanelStore: React.FC = () => {
  const { addToast } = useToast();
  const { vestingInfo, isLoading, claimVestedTokens, loadVestingInfo } = useContractsStore();
  const { account, provider } = useWeb3Store();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load vesting info when account changes
  useEffect(() => {
    if (account) {
      loadVestingInfo(account);
    }
  }, [account, loadVestingInfo]);

  // Update current time every second - use blockchain time if available
  useEffect(() => {
    const updateTime = async () => {
      if (provider) {
        try {
          // Get blockchain's current block timestamp
          const block = await provider.getBlock('latest');
          if (block && block.timestamp) {
            setCurrentTime(new Date(block.timestamp * 1000));
            return;
          }
        } catch (error) {
          console.warn('Failed to get blockchain time, using local time:', error);
        }
      }
      // Fallback to local time if blockchain time not available
      setCurrentTime(new Date());
    };

    // Update immediately
    updateTime();

    // Then update every second
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [provider]);

  const handleClaim = async () => {
    if (!vestingInfo || parseFloat(vestingInfo.claimable) <= 0) {
      addToast({ type: 'error', title: 'No Tokens Available', message: 'No tokens available to claim' });
      return;
    }

    setIsProcessing(true);
    try {
      await claimVestedTokens();
      addToast({ type: 'success', title: 'Claim Successful', message: `Successfully claimed ${vestingInfo.claimable} tokens` });
    } catch (error: any) {
      const { formatErrorForToast } = await import('../utils/formatErrors');
      const formattedError = formatErrorForToast(error, { operation: 'Claim Tokens' });
      addToast({ type: 'error', title: formattedError.title, message: formattedError.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!vestingInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No vesting information available</p>
            <p className="text-sm text-gray-500 mt-2">
              You may not be a team member or vesting has not been initialized
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate dates and times
  // Check if dates are valid (not 0 or epoch - showing 1970 means vesting not initialized)
  const startTimestamp = new Date(vestingInfo.startTime).getTime();
  const endTimestamp = new Date(vestingInfo.vestingEndTime).getTime();
  
  // If dates are 0 or invalid (showing 1970), vesting hasn't been initialized
  const isVestingInitialized = startTimestamp > 946684800000; // Jan 1, 2000 (reasonable check)
  
  if (!isVestingInitialized) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Gift className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-2">Vesting Not Initialized</p>
            <p className="text-gray-600 mb-4">
              The vesting schedule has not been initialized yet.
            </p>
            <p className="text-sm text-gray-500">
              Please contact the contract owner to initialize vesting by calling <code className="bg-gray-100 px-2 py-1 rounded text-xs">initializeVesting()</code>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const startDate = new Date(vestingInfo.startTime);
  const vestingEndDate = new Date(vestingInfo.vestingEndTime);
  const cliffEndDate = new Date(startDate.getTime() + vestingInfo.cliffPeriod * 24 * 60 * 60 * 1000);
  const now = currentTime;
  
  // Calculate time remaining
  const isBeforeCliff = now < cliffEndDate;
  const isVestingComplete = now >= vestingEndDate;
  const cliffTimeRemaining = Math.max(0, cliffEndDate.getTime() - now.getTime());
  const vestingTimeRemaining = Math.max(0, vestingEndDate.getTime() - now.getTime());
  
  // Convert to readable format
  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds === 0) return '0';
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const cliffDaysRemaining = Math.ceil(cliffTimeRemaining / (1000 * 60 * 60 * 24));
  const vestingDaysRemaining = Math.ceil(vestingTimeRemaining / (1000 * 60 * 60 * 24));

  // Calculate vested amount (excluding cliff)
  const totalAmount = parseFloat(vestingInfo.totalAmount);
  const claimed = parseFloat(vestingInfo.claimed);
  const claimable = parseFloat(vestingInfo.claimable);
  
  // Calculate total vested amount (claimed + claimable)
  const totalVested = claimed + claimable;
  const vestedPercentage = totalAmount > 0 ? (totalVested / totalAmount) * 100 : 0;

  // Calculate amount that will unlock after cliff (if before cliff)
  let unlockedAmount = claimable;
  let lockedAmount = 0;
  if (isBeforeCliff) {
    unlockedAmount = 0;
    lockedAmount = totalAmount - claimed;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Gift className="h-6 w-6 text-orange-600 mr-2" />
          Vesting Information
        </h2>
        <div className="flex gap-2">
          {isBeforeCliff && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Cliff Active
            </span>
          )}
          {!isBeforeCliff && !isVestingComplete && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              Vesting Active
            </span>
          )}
          {isVestingComplete && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Cliff Status Banner */}
      {isBeforeCliff && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Lock className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">Cliff Period Active</h3>
              <p className="text-sm text-yellow-800 mb-2">
                Tokens are locked until the cliff period ends. You will be able to claim vested tokens after this date.
              </p>
              <div className="flex items-center text-sm text-yellow-900">
                <Clock className="h-4 w-4 mr-2" />
                <span className="font-medium">Cliff ends in: {formatTimeRemaining(cliffTimeRemaining)}</span>
                <span className="mx-2">•</span>
                <span>{cliffDaysRemaining} day{cliffDaysRemaining !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vesting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total Allocation</p>
              <p className="text-2xl font-bold text-orange-900">
                {formatTokenAmount(vestingInfo.totalAmount)}
              </p>
              <p className="text-xs text-orange-500">DBBPT Tokens</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className={`rounded-lg p-4 ${isBeforeCliff ? 'bg-gray-50' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isBeforeCliff ? 'text-gray-600' : 'text-blue-600'}`}>
                {isBeforeCliff ? 'Unlocked After Cliff' : 'Claimable'}
              </p>
              <p className={`text-2xl font-bold ${isBeforeCliff ? 'text-gray-900' : 'text-blue-900'}`}>
                {formatTokenAmount(claimable)}
              </p>
              <p className={`text-xs ${isBeforeCliff ? 'text-gray-500' : 'text-blue-500'}`}>DBBPT Tokens</p>
            </div>
            {isBeforeCliff ? (
              <Lock className="h-8 w-8 text-gray-600" />
            ) : (
              <TrendingUp className="h-8 w-8 text-blue-600" />
            )}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Already Claimed</p>
              <p className="text-2xl font-bold text-green-900">
                {formatTokenAmount(vestingInfo.claimed)}
              </p>
              <p className="text-xs text-green-500">DBBPT Tokens</p>
            </div>
            <Gift className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">
                {isBeforeCliff ? 'Cliff Remaining' : isVestingComplete ? 'Completed' : 'Vesting Remaining'}
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {isBeforeCliff 
                  ? cliffDaysRemaining 
                  : isVestingComplete 
                    ? '0' 
                    : vestingDaysRemaining}
              </p>
              <p className="text-xs text-purple-500">
                {isBeforeCliff 
                  ? 'Days until cliff' 
                  : isVestingComplete 
                    ? 'Complete' 
                    : 'Days remaining'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Vesting Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900">Vesting Progress</h3>
          <span className="text-sm text-gray-600">{vestedPercentage.toFixed(2)}% Vested</span>
        </div>
        <div className="bg-gray-200 rounded-full h-4 mb-2 relative">
          <div
            className="bg-orange-600 h-4 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, vestedPercentage)}%`
            }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {formatTokenAmount(totalVested)} / {formatTokenAmount(vestingInfo.totalAmount)} DBBPT Vested
          </span>
          <span>
            {formatTokenAmount(claimed)} Claimed
          </span>
        </div>
      </div>

      {/* Vesting Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Vesting Schedule</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="text-gray-900 font-medium">
                {startDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliff End Date:</span>
              <span className={`font-medium ${isBeforeCliff ? 'text-yellow-700' : 'text-green-700'}`}>
                {cliffEndDate.toLocaleDateString()}
                {!isBeforeCliff && <CheckCircle2 className="inline-block h-3 w-3 ml-1" />}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vesting End Date:</span>
              <span className="text-gray-900 font-medium">
                {vestingEndDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliff Period:</span>
              <span className="text-gray-900 font-medium">
                {vestingInfo.cliffPeriod.toFixed(0)} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vesting Duration:</span>
              <span className="text-gray-900 font-medium">
                {vestingInfo.vestingDuration.toFixed(0)} days
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Claim Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Available to Claim:</span>
              <span className={`font-medium ${claimable > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                {formatTokenAmount(claimable)} DBBPT
              </span>
            </div>
            {isBeforeCliff && (
              <div className="flex justify-between">
                <span className="text-gray-600">Locked Until Cliff:</span>
                <span className="text-gray-900 font-medium">
                  {formatTokenAmount(lockedAmount)} DBBPT
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className="text-gray-900 font-medium">
                {formatTokenAmount(totalAmount - claimed - claimable)} DBBPT
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Can Claim:</span>
              <span className={`font-medium flex items-center ${claimable > 0 ? 'text-green-700' : 'text-red-600'}`}>
                {claimable > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Yes
                  </>
                ) : isBeforeCliff ? (
                  <>
                    <Lock className="h-4 w-4 mr-1" />
                    After Cliff
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-1" />
                    No
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Button */}
      <div className="flex justify-center">
        <button
          onClick={handleClaim}
          disabled={isProcessing || isLoading || claimable <= 0 || isBeforeCliff}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
        >
          <Gift className="h-5 w-5 mr-2" />
          {isProcessing 
            ? 'Claiming...' 
            : isBeforeCliff 
              ? `Cliff ends in ${formatTimeRemaining(cliffTimeRemaining)}`
              : claimable > 0 
                ? `Claim ${formatTokenAmount(claimable)} DBBPT`
                : 'No Tokens to Claim'}
        </button>
      </div>

      {claimable <= 0 && !isBeforeCliff && claimed > 0 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
            <p className="text-sm text-green-800">
              All currently vested tokens have been claimed!
            </p>
          </div>
        </div>
      )}

      {claimable <= 0 && claimed === 0 && !isBeforeCliff && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
            <p className="text-sm text-yellow-800">
              No tokens available to claim at this time. Tokens will continue to vest over time.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isLoading || isProcessing) && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-gray-600">
            {isProcessing ? 'Processing claim...' : 'Loading...'}
          </span>
        </div>
      )}
    </div>
  );
};