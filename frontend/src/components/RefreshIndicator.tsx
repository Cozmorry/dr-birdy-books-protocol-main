import React from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { useContractsStore } from '../hooks/useContractsStore';

export const RefreshIndicator: React.FC = () => {
  const { isRefreshing, lastDataRefresh } = useContractsStore();

  const formatLastRefresh = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      {isRefreshing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span>Refreshing data...</span>
        </>
      ) : (
        <>
          <Clock className="h-4 w-4 text-gray-400" />
          <span>Last updated: {formatLastRefresh(lastDataRefresh)}</span>
        </>
      )}
    </div>
  );
};
