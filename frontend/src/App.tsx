import React, { useEffect } from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { useWeb3Store } from './hooks/useWeb3Store';
import { useContractsStore } from './hooks/useContractsStore';
import { Navbar } from './components/Navbar';
import { WalletConnect } from './components/WalletConnect';
import { TokenInfoStore } from './components/TokenInfoStore';
import { StakingPanelStore } from './components/StakingPanelStore';
import { VestingPanelStore } from './components/VestingPanelStore';
// import { TierInfo } from './components/TierInfo';
import { TierPurchaseStore } from './components/TierPurchaseStore';
// import { TokenActionsStore } from './components/TokenActionsStore';
import { FileManagementStore } from './components/FileManagementStore';
import { BlogSection } from './components/BlogSection';
import { ContentDownloads } from './components/ContentDownloads';
import { RefreshIndicator } from './components/RefreshIndicator';
import { RefreshButton } from './components/RefreshButton';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { BookOpen, Users, TrendingUp, Gift } from 'lucide-react';

function App() {
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
    connectToLocalhost,
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

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Navbar */}
        <Navbar
          onConnect={connectWallet}
          onConnectLocalhost={connectToLocalhost}
          onSwitchNetwork={switchToBaseNetwork}
          onDisconnect={disconnect}
        />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Refresh Controls */}
        {isConnected && (
          <div className="flex justify-end items-center space-x-2 mb-6">
            <RefreshIndicator />
            <RefreshButton />
          </div>
        )}
        
        {!isConnected ? (
          <div className="max-w-md mx-auto">
            <WalletConnect
              isConnected={isConnected}
              isCorrectNetwork={isCorrectNetwork}
              account={account}
              isLoading={isLoading}
              error={error}
              onConnect={connectWallet}
              onConnectLocalhost={connectToLocalhost}
              onSwitchNetwork={switchToBaseNetwork}
              onDisconnect={disconnect}
            />
          </div>
        ) : !isCorrectNetwork ? (
          <div className="max-w-md mx-auto">
            <WalletConnect
              isConnected={isConnected}
              isCorrectNetwork={isCorrectNetwork}
              account={account}
              isLoading={isLoading}
              error={error}
              onConnect={connectWallet}
              onConnectLocalhost={connectToLocalhost}
              onSwitchNetwork={switchToBaseNetwork}
              onDisconnect={disconnect}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Network-specific message */}
            {chainId && chainId !== 31337 && chainId === 8453 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Protocol</p>
                    <p className="text-2xl font-bold text-gray-900">Active</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Stakers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {protocolStats.isLoading ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : protocolStats.totalStakers > 0 ? (
                          protocolStats.totalStakers.toLocaleString()
                        ) : (
                          '0'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Staked</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {protocolStats.isLoading ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : parseFloat(protocolStats.totalStaked) > 0 ? (
                          `${parseFloat(protocolStats.totalStaked).toLocaleString()} DBB`
                        ) : (
                          '0 DBB'
                        )}
                      </p>
                    </div>
                  </div>
                  
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <Gift className="h-8 w-8 text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vesting</p>
                    <p className="text-2xl font-bold text-gray-900">Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Information */}
            <TokenInfoStore />

            {/* Main Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <StakingPanelStore />
              <VestingPanelStore />
            </div>

            {/* Blog Section */}
            <BlogSection hasAccess={userInfo?.hasAccess || false} />

            {/* Content Downloads - User-facing */}
            <ContentDownloads
              userInfo={userInfo}
              userTier={userInfo?.tier || -1}
              hasAccess={userInfo?.hasAccess || false}
              isLoading={isLoading}
            />

            {/* File Management - Admin/Upload */}
            <FileManagementStore
              userInfo={userInfo}
              userTier={userInfo?.tier || -1}
              hasAccess={userInfo?.hasAccess || false}
              isLoading={isLoading}
            />

            {/* Tier Purchase */}
            <TierPurchaseStore
              userInfo={userInfo}
              tiers={tiers}
              userTier={userInfo?.tier || -1}
              hasAccess={userInfo?.hasAccess || false}
              isLoading={isLoading}
            />

            {/* Additional Information */}
            {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TierInfo
                tiers={tiers}
                userTier={userInfo?.tier || -1}
                hasAccess={userInfo?.hasAccess || false}
              />
              
              <TokenActionsStore
                userInfo={userInfo}
                onTransfer={handleTransfer}
                isLoading={isLoading}
              />
            </div> */}

            {/* Contract Status */}
            {contracts.reflectiveToken && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Trading</p>
                    <p className="text-lg font-semibold text-green-600">Enabled</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Swapping</p>
                    <p className="text-lg font-semibold text-green-600">Enabled</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Distribution</p>
                    <p className="text-lg font-semibold text-blue-600">Active</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Dr. Birdy Books Protocol - Bridging Education, Media, and Cryptocurrency
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Built on Base Network
            </p>
          </div>
        </div>
      </footer>
      
      {/* Toast Container */}
      <ToastContainer />
    </div>
    </ToastProvider>
  );
}

export default App;