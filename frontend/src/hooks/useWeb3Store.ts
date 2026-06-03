import { useAppStore } from '../store/useAppStore';

export const useWeb3Store = () => {
  const {
    provider,
    signer,
    account,
    authorizedAccounts,
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
  return {
    // Web3 state
    provider,
    signer,
    account,
    authorizedAccounts,
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
    loadProtocolStats,
    refreshAllData,
    startAutoRefresh,
    stopAutoRefresh,
    resetStore,
  };
};
