import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useContractsStore } from '../hooks/useContractsStore';
import { useWeb3Store } from '../hooks/useWeb3Store';

export const RefreshButton: React.FC = () => {
  const { refreshAllData, account } = useWeb3Store();
  const { isRefreshing } = useContractsStore();

  const handleRefresh = async () => {
    if (account && !isRefreshing) {
      await refreshAllData(account);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing || !account}
      className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  );
};
