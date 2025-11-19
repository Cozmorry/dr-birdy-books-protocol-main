import React from 'react';
import { Coins, TrendingUp, Flame, Users } from 'lucide-react';
import { UserInfo } from '../types';

interface TokenInfoProps {
  userInfo: UserInfo | null;
  isLoading: boolean;
}

export const TokenInfo: React.FC<TokenInfoProps> = ({ userInfo, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Information</h3>
        <p className="text-gray-600">Connect your wallet to view token information</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Your Token Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Coins className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">Token Balance</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {parseFloat(userInfo.balance).toLocaleString()} DBBPT
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-900">Staked Amount</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {parseFloat(userInfo.stakedAmount).toLocaleString()} DBBPT
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Users className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-900">Tier Level</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {userInfo.tier >= 0 ? `Tier ${userInfo.tier + 1}` : 'No Tier'}
          </p>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Flame className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-orange-900">Access Status</span>
          </div>
          <p className={`text-2xl font-bold ${userInfo.hasAccess ? 'text-green-600' : 'text-red-600'}`}>
            {userInfo.hasAccess ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Can Unstake:</span>
          <span className={`text-sm font-medium ${userInfo.canUnstake ? 'text-green-600' : 'text-red-600'}`}>
            {userInfo.canUnstake ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  );
};
