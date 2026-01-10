import React from 'react';
import { VestingPanelStore } from '../components/VestingPanelStore';
import { SEOHead } from '../components/SEOHead';

export default function VestingPage() {
  return (
    <>
      <SEOHead
        title="Vesting"
        description="View and claim your vested DBBPT tokens. Track your vesting schedule, cliff period, and available tokens on Base Network."
        keywords="vesting, token vesting, DBBPT vesting, claim tokens, vesting schedule, Base Network"
      />
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team Vesting</h1>
          <p className="text-gray-600 mt-1">View and claim your vested tokens</p>
        </div>
        <VestingPanelStore />
      </div>
    </>
  );
}
