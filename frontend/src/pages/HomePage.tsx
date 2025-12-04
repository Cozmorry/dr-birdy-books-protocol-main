import React from 'react';
import { useContractsStore } from '../hooks/useContractsStore';
import { StakingPanelStore } from '../components/StakingPanelStore';
import { SEOHead } from '../components/SEOHead';
import { TrendingUp, Shield, Wallet } from 'lucide-react';

export default function HomePage() {
  const { userInfo, protocolStats, isLoading } = useContractsStore();

  return (
    <>
      <SEOHead
        title="Dashboard"
        description="View your staking dashboard, token balance, tier level, and access status on Dr. Birdy Books Protocol"
        keywords="staking dashboard, DeFi dashboard, token balance, tier access, DBB Protocol"
      />
      <div className="space-y-8">
      {/* Dashboard Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        
        {/* Protocol Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Staked</p>
            <p className="text-xl font-bold text-gray-900">
              {protocolStats.isLoading ? (
                <span className="animate-pulse">...</span>
              ) : parseFloat(protocolStats.totalStaked) > 0 ? (
                `${parseFloat(protocolStats.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 2 })} DBBPT`
              ) : (
                '0 DBBPT'
              )}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Your Tier</p>
            <p className="text-xl font-bold text-gray-900">
              {userInfo?.tier !== undefined && userInfo.tier >= 0 ? `Tier ${userInfo.tier + 1}` : 'None'}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Balance</p>
            <p className="text-xl font-bold text-gray-900">
              {userInfo?.balance ? `${parseFloat(userInfo.balance).toFixed(2)}` : '0'} DBBPT
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Token Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userInfo?.balance ? `${parseFloat(userInfo.balance).toFixed(2)}` : '0'} DBBPT
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Staked</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userInfo?.stakedAmount ? `${parseFloat(userInfo.stakedAmount).toFixed(2)}` : '0'} DBBPT
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Access</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userInfo?.hasAccess ? 'Yes' : 'No'}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Staking Panel */}
      <StakingPanelStore />
    </div>
    </>
  );
}

