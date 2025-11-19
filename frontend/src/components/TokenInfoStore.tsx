import React from 'react';
import { Wallet, Coins, TrendingUp, Shield } from 'lucide-react';
import { useContractsStore } from '../hooks/useContractsStore';
import { formatTokenAmount } from '../utils/formatNumbers';

export const TokenInfoStore: React.FC = () => {
  const { userInfo } = useContractsStore();

  if (!userInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading user information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Wallet className="h-6 w-6 text-blue-600 mr-2" />
        Your Token Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Token Balance</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatTokenAmount(userInfo.balance)}
              </p>
              <p className="text-xs text-blue-500">DBB Tokens</p>
            </div>
            <Coins className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Staked Amount</p>
              <p className="text-2xl font-bold text-green-900">
                {formatTokenAmount(userInfo.stakedAmount)}
              </p>
              <p className="text-xs text-green-500">DBB Tokens</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Tier Level</p>
              <p className="text-2xl font-bold text-purple-900">
                {userInfo.tier >= 0 ? `Tier ${userInfo.tier}` : 'No Tier'}
              </p>
              <p className="text-xs text-purple-500">
                {userInfo.tier >= 0 ? 'Active Tier' : 'Not Staked'}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Access Status</p>
              <p className="text-2xl font-bold text-orange-900">
                {userInfo.hasAccess ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-orange-500">
                {userInfo.hasAccess ? 'Full Access' : 'Limited Access'}
              </p>
            </div>
            <Shield className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Staking Status</h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Can Unstake:</span>
              <span className={userInfo.canUnstake ? 'text-green-600' : 'text-red-600'}>
                {userInfo.canUnstake ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Wallet Address:</span>
              <span className="text-gray-900 font-mono text-xs">
                {userInfo.address.slice(0, 6)}...{userInfo.address.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Token Details</h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Balance:</span>
              <span className="text-gray-900">
                {formatTokenAmount(parseFloat(userInfo.balance) + parseFloat(userInfo.stakedAmount))} DBB
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Available:</span>
              <span className="text-gray-900">
                {formatTokenAmount(userInfo.balance)} DBB
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
