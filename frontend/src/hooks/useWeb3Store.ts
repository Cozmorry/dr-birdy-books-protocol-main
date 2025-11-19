import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { initializeContracts } from '../store/useAppStore';

export const useWeb3Store = () => {
  const {
    provider,
    signer,
    account,
    isConnected,
    isCorrectNetwork,
    web3Loading,
    web3Error,
    setWeb3State,
    contracts,
    loadUserInfo,
    loadVestingInfo,
    loadTiers,
    loadProtocolStats,
    refreshAllData,
    startAutoRefresh,
    stopAutoRefresh,
    resetStore,
  } = useAppStore();

  // Initialize contracts when provider changes
  useEffect(() => {
    if (provider) {
      initializeContracts(provider);
    }
  }, [provider]);

  // Load protocol stats when contracts are available
  useEffect(() => {
    if (contracts.flexibleTieredStaking) {
      console.log('Loading protocol stats from useWeb3Store...');
      loadProtocolStats();
    }
  }, [contracts.flexibleTieredStaking, loadProtocolStats]);

  // Load data when connected
  useEffect(() => {
    if (isConnected && account && contracts.reflectiveToken && contracts.flexibleTieredStaking) {
      refreshAllData(account);
    }
  }, [isConnected, account, contracts.reflectiveToken, contracts.flexibleTieredStaking, refreshAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  return {
    // Web3 state
    provider,
    signer,
    account,
    isConnected,
    isCorrectNetwork,
    web3Loading,
    web3Error,
    
    // Contract state
    contracts,
    
    // Actions
    setWeb3State,
    loadUserInfo,
    loadVestingInfo,
    loadTiers,
    refreshAllData,
    startAutoRefresh,
    stopAutoRefresh,
    resetStore,
  };
};
