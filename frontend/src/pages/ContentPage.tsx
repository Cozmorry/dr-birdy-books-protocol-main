import React from 'react';
import { useContractsStore } from '../hooks/useContractsStore';
import { ContentDownloads } from '../components/ContentDownloads';
import { SEOHead } from '../components/SEOHead';

export default function ContentPage() {
  const { userInfo, isLoading } = useContractsStore();

  return (
    <>
      <SEOHead
        title="Content Downloads"
        description="Download premium educational content based on your tier level. Access PDFs, videos, courses, and more through the Dr. Birdy Books Protocol."
        keywords="educational content, content downloads, tier-based access, premium content, DeFi education, Web3 learning"
      />
      <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Downloads</h1>
        <p className="text-gray-600 mt-1">Download educational content based on your tier</p>
      </div>
      <ContentDownloads
        userInfo={userInfo}
        userTier={userInfo?.tier || -1}
        hasAccess={userInfo?.hasAccess || false}
        isLoading={isLoading}
      />
    </div>
    </>
  );
}

