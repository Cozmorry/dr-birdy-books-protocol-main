import React from 'react';
import { useContractsStore } from '../hooks/useContractsStore';
import { TierPurchaseStore } from '../components/TierPurchaseStore';

export default function TierPage() {
  const { userInfo, tiers, isLoading } = useContractsStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tier Purchase</h1>
        <p className="text-gray-600 mt-1">Upgrade your tier to access more content</p>
      </div>
      <TierPurchaseStore
        userInfo={userInfo}
        tiers={tiers}
        userTier={userInfo?.tier || -1}
        hasAccess={userInfo?.hasAccess || false}
        isLoading={isLoading}
      />
    </div>
  );
}

