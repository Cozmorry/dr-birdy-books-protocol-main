import React, { useState } from 'react';
import { Gift, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useContractsStore } from '../hooks/useContractsStore';
import { formatTokenAmount, formatPercentage } from '../utils/formatNumbers';

export const VestingPanelStore: React.FC = () => {
  const { addToast } = useToast();
  const { vestingInfo, isLoading, claimVestedTokens } = useContractsStore();
  const [isProcessing, setIsProcessing] = useState(false);

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
      addToast({ type: 'error', title: 'Claim Failed', message: `Failed to claim tokens: ${error.message}` });
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

  const vestingEndDate = new Date(vestingInfo.vestingEndTime);
  const now = new Date();
  const isVestingComplete = now >= vestingEndDate;
  const daysRemaining = Math.max(0, Math.ceil((vestingEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Gift className="h-6 w-6 text-orange-600 mr-2" />
          Vesting Information
        </h2>
        {isVestingComplete && (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            Complete
          </span>
        )}
      </div>

      {/* Vesting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total Amount</p>
              <p className="text-2xl font-bold text-orange-900">
                {formatTokenAmount(vestingInfo.totalAmount)}
              </p>
              <p className="text-xs text-orange-500">DBB Tokens</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Claimable</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatTokenAmount(vestingInfo.claimable)}
              </p>
              <p className="text-xs text-blue-500">DBB Tokens</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Already Claimed</p>
              <p className="text-2xl font-bold text-green-900">
                {formatTokenAmount(vestingInfo.claimed)}
              </p>
              <p className="text-xs text-green-500">DBB Tokens</p>
            </div>
            <Gift className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Time Remaining</p>
              <p className="text-2xl font-bold text-purple-900">
                {isVestingComplete ? '0' : daysRemaining}
              </p>
              <p className="text-xs text-purple-500">
                {isVestingComplete ? 'Complete' : 'Days'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Vesting Progress */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vesting Progress</h3>
        <div className="bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-orange-600 h-4 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (parseFloat(vestingInfo.claimed) / parseFloat(vestingInfo.totalAmount)) * 100)}%`
            }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {formatTokenAmount(vestingInfo.claimed)} / {formatTokenAmount(vestingInfo.totalAmount)} DBB
          </span>
          <span>
            {formatPercentage((parseFloat(vestingInfo.claimed) / parseFloat(vestingInfo.totalAmount)) * 100)}
          </span>
        </div>
      </div>

      {/* Vesting Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Vesting Schedule</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="text-gray-900">
                {new Date(vestingInfo.vestingEndTime).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">End Date:</span>
              <span className="text-gray-900">
                {vestingEndDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={isVestingComplete ? 'text-green-600' : 'text-orange-600'}>
                {isVestingComplete ? 'Complete' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Claim Information</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Available to Claim:</span>
              <span className="text-gray-900">
                {formatTokenAmount(vestingInfo.claimable)} DBB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className="text-gray-900">
                {formatTokenAmount(parseFloat(vestingInfo.totalAmount) - parseFloat(vestingInfo.claimed))} DBB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Can Claim:</span>
              <span className={parseFloat(vestingInfo.claimable) > 0 ? 'text-green-600' : 'text-red-600'}>
                {parseFloat(vestingInfo.claimable) > 0 ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Button */}
      <div className="flex justify-center">
        <button
          onClick={handleClaim}
          disabled={isProcessing || isLoading || parseFloat(vestingInfo.claimable) <= 0}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <Gift className="h-5 w-5 mr-2" />
          {isProcessing ? 'Claiming...' : 'Claim Vested Tokens'}
        </button>
      </div>

      {parseFloat(vestingInfo.claimable) <= 0 && (
        <p className="text-center text-gray-500 mt-4">
          No tokens available to claim at this time
        </p>
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
