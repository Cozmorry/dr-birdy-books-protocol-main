import React, { useState } from 'react';
import { Gift, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { VestingInfo } from '../types';

interface VestingPanelProps {
  vestingInfo: VestingInfo | null;
  onClaim: () => Promise<void>;
  isLoading: boolean;
}

export const VestingPanel: React.FC<VestingPanelProps> = ({
  vestingInfo,
  onClaim,
  isLoading,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setIsClaiming(true);
    setError(null);

    try {
      await onClaim();
    } catch (err: any) {
      setError(err.message || 'Failed to claim vested tokens');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!vestingInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Vesting</h3>
        <div className="text-center py-8">
          <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You are not a team member with vesting tokens</p>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(vestingInfo.totalAmount);
  const claimed = parseFloat(vestingInfo.claimed);
  const claimable = parseFloat(vestingInfo.claimable);
  const progress = totalAmount > 0 ? (claimed / totalAmount) * 100 : 0;
  const vestingEndDate = new Date(vestingInfo.vestingEndTime);
  const isVestingComplete = new Date() > vestingEndDate;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Vesting Information</h3>
      
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

      <div className="space-y-6">
        {/* Vesting Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Vesting Progress</span>
            <span className="text-sm text-gray-600">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Vesting Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Gift className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Total Allocation</span>
            </div>
            <p className="text-xl font-bold text-blue-900">
              {totalAmount.toLocaleString()} DBBPT
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">Claimed</span>
            </div>
            <p className="text-xl font-bold text-green-900">
              {claimed.toLocaleString()} DBBPT
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-900">Claimable</span>
            </div>
            <p className="text-xl font-bold text-orange-900">
              {claimable.toLocaleString()} DBBPT
            </p>
          </div>
        </div>

        {/* Vesting Timeline */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Vesting Timeline</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Vesting End Date:</span>
              <span className="font-medium">
                {vestingEndDate.toLocaleDateString()} {vestingEndDate.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${isVestingComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                {isVestingComplete ? 'Complete' : 'In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* Claim Button */}
        {claimable > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleClaim}
              disabled={isClaiming || isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClaiming ? 'Claiming...' : `Claim ${claimable.toLocaleString()} DBBPT`}
            </button>
          </div>
        )}

        {claimable === 0 && claimed > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  All vested tokens have been claimed!
                </p>
              </div>
            </div>
          </div>
        )}

        {claimable === 0 && claimed === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  No tokens available to claim yet. Check back after the vesting cliff period.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
