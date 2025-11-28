import React from 'react';
import { StakingPanelStore } from '../components/StakingPanelStore';

export default function StakingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staking</h1>
        <p className="text-gray-600 mt-1">Stake your tokens to earn tier access</p>
      </div>
      <StakingPanelStore />
    </div>
  );
}

