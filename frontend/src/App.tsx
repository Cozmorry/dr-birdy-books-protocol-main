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
import ContentPage from './pages/ContentPage';
import BlogPage from './pages/BlogPage';
import TierPage from './pages/TierPage';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { Onboarding } from './components/Onboarding';
import { useOnboarding } from './hooks/useOnboarding';
import AdminRoute from './AdminRoute';

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
                  {chainId && chainId !== 31337 && chainId === 8453 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Switch to Base Sepolia Testnet
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p className="mb-3">
                              You're connected to <strong>Base Mainnet</strong> (Chain ID: 8453), but the contracts are deployed on <strong>Base Sepolia Testnet</strong> (Chain ID: 84532). 
                              Please switch your MetaMask network to Base Sepolia to interact with the contracts.
                            </p>
                            <button
                              onClick={switchToBaseNetwork}
                              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
                            >
                              Switch to Base Sepolia Testnet
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
            <Route path="content" element={<ContentPage />} />
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