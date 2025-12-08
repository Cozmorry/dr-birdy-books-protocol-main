import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useContractsStore } from '../hooks/useContractsStore';
import { ContentDownloads } from '../components/ContentDownloads';
import { SEOHead } from '../components/SEOHead';

export default function ContentPage() {
  const { userInfo, isLoading, loadUserInfo, refreshAllData } = useContractsStore();

  const handleRefresh = async () => {
    if (userInfo?.address) {
      await refreshAllData(userInfo.address);
    }
  };

  return (
    <>
      <SEOHead
        title="Content Downloads"
        description="Download premium educational content based on your tier level. Access PDFs, videos, courses, and more through the Dr. Birdy Books Protocol."
        keywords="educational content, content downloads, tier-based access, premium content, DeFi education, Web3 learning"
      />
      <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Downloads</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Download educational content based on your tier</p>
          {userInfo && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Your Tier: {userInfo.tier === -1 ? 'None' : `Tier ${userInfo.tier + 1}`} | 
              Staked: {parseFloat(userInfo.stakedAmount).toLocaleString()} DBBPT
            </p>
          )}
        </div>
        {userInfo?.address && (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-primary-700 dark:hover:bg-primary-600"
            title="Refresh tier information"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Tier
          </button>
        )}
      </div>
      <ContentDownloads
        userInfo={userInfo}
        userTier={userInfo?.tier ?? -1}
        hasAccess={userInfo?.hasAccess ?? false}
        isLoading={isLoading}
        onRefreshTier={async () => {
          if (userInfo?.address) {
            await loadUserInfo(userInfo.address);
          }
        }}
      />
    </div>
    </>
  );
}

