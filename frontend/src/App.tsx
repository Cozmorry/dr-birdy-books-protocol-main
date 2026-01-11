import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useWeb3 } from './hooks/useWeb3';
import { useWeb3Store } from './hooks/useWeb3Store';
import { useContractsStore } from './hooks/useContractsStore';
import { MainLayout } from './components/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WalletConnect } from './components/WalletConnect';
import HomePage from './pages/HomePage';
import StakingPage from './pages/StakingPage';
import VestingPage from './pages/VestingPage';
import ContentPage from './pages/ContentPage';
import FolderDetailPage from './pages/FolderDetailPage';
import BlogPage from './pages/BlogPage';
import TierPage from './pages/TierPage';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { Onboarding } from './components/Onboarding';
import { useOnboarding } from './hooks/useOnboarding';
import AdminRoute from './AdminRoute';

// Wrapper component for FolderDetailPage to access store
function FolderDetailPageWrapper() {
  const { userInfo, isLoading, loadUserInfo } = useContractsStore();
  
  return (
    <FolderDetailPage
      userInfo={userInfo}
      userTier={userInfo?.tier ?? -1}
      hasAccess={userInfo?.hasAccess ?? false}
      isLoading={isLoading}
      onRefreshTier={async () => {
        if (userInfo?.address) {
          await loadUserInfo(userInfo.address);
        }
      }}
    />
  );
}

function MainApp() {
  const {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isCorrectNetwork,
    isLoading: web3Loading,
    error: web3Error,
    connectWallet,
    switchToBaseNetwork,
    disconnect,
  } = useWeb3();

  // Use Zustand store for contract state
  const {
    contracts,
    userInfo,
    tiers,
    protocolStats,
    isLoading: contractsLoading,
    error: contractsError,
  } = useContractsStore();

  // Use Web3 store for additional functionality
  const {
    setWeb3State,
  } = useWeb3Store();

  // Update Web3 state in store when it changes
  useEffect(() => {
    setWeb3State({
      provider,
      signer,
      account,
      isConnected,
      isCorrectNetwork,
      web3Loading,
      web3Error,
    });
  }, [provider, signer, account, isConnected, isCorrectNetwork, web3Loading, web3Error, setWeb3State]);



  const isLoading = web3Loading || contractsLoading;
  const error = web3Error || contractsError;
  
  // Onboarding hook
  const { isFirstTime, completeOnboarding } = useOnboarding();

  return (
    <ToastProvider>
      {/* Onboarding for first-time users */}
      {isConnected && isCorrectNetwork && (
        <Onboarding isFirstTime={isFirstTime} onComplete={completeOnboarding} />
      )}
      <Routes>
        <Route
          path="/*"
          element={
            <MainLayout
              onConnect={connectWallet}
              onSwitchNetwork={switchToBaseNetwork}
              onDisconnect={disconnect}
            />
          }
        >
          <Route
            path="*"
            element={
              <ProtectedRoute
                isConnected={isConnected}
                isCorrectNetwork={isCorrectNetwork}
                account={account}
                isLoading={isLoading}
                error={error}
                onConnect={connectWallet}
                onSwitchNetwork={switchToBaseNetwork}
                onDisconnect={disconnect}
              />
            }
          >
            <Route
              index
              element={
                <>
                  {chainId === 84532 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            Switch to Base Mainnet
                          </h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p className="mb-3">
                              You're connected to <strong>Base Sepolia Testnet</strong> (Chain ID: 84532). 
                              For production use, please switch to <strong>Base Mainnet</strong> (Chain ID: 8453) to interact with the live contracts.
                            </p>
                            <button
                              onClick={switchToBaseNetwork}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Switch to Base Mainnet
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <HomePage />
                </>
              }
            />
            <Route path="staking" element={<StakingPage />} />
            <Route path="vesting" element={<VestingPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="content/folders/:id" element={<FolderDetailPageWrapper />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="tier" element={<TierPage />} />
          </Route>
        </Route>
      </Routes>
      <ToastContainer />
    </ToastProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}