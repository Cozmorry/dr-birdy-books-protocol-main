import React from 'react';
import { useContractsStore } from '../hooks/useContractsStore';
import { BlogSection } from '../components/BlogSection';
import { SEOHead } from '../components/SEOHead';

export default function BlogPage() {
  const { userInfo } = useContractsStore();

  return (
    <>
      <SEOHead
        title="Blog"
        description="Read our latest educational content, updates, and insights about DeFi, Web3, cryptocurrency, and the Dr. Birdy Books Protocol."
        keywords="DeFi blog, Web3 education, cryptocurrency blog, blockchain education, DBB Protocol blog, educational articles"
      />
      <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-600 mt-1">Read our latest educational content and updates</p>
      </div>
      <BlogSection hasAccess={userInfo?.hasAccess || false} />
    </div>
    </>
  );
}

