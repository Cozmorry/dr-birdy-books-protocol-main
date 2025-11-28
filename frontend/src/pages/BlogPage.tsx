import React from 'react';
import { useContractsStore } from '../hooks/useContractsStore';
import { BlogSection } from '../components/BlogSection';

export default function BlogPage() {
  const { userInfo } = useContractsStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-600 mt-1">Read our latest educational content and updates</p>
      </div>
      <BlogSection hasAccess={userInfo?.hasAccess || false} />
    </div>
  );
}

