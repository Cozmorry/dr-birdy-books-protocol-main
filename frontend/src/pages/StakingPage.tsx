import React from 'react';
import { StakingPanelStore } from '../components/StakingPanelStore';
import { SEOHead } from '../components/SEOHead';

export default function StakingPage() {
  return (
    <>
      <SEOHead
        title="Staking"
        description="Stake your DBBPT tokens to earn tier access and unlock premium educational content. Learn about our flexible tiered staking system on Base Network."
        keywords="staking, DeFi staking, token staking, tiered staking, DBBPT staking, Base Network staking"
      />
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staking</h1>
        <p className="text-gray-600 mt-1">Stake your tokens to earn tier access</p>
      </div>
      <StakingPanelStore />
    </div>
    </>
  );
}

