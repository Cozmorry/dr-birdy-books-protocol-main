import React from 'react';
import { Wallet, AlertCircle, CheckCircle } from 'lucide-react';

interface WalletConnectProps {
  isConnected: boolean;
  isCorrectNetwork: boolean;
  account: string | null;
  isLoading: boolean;
  error: string | null;
  onConnect: () => void;
  onSwitchNetwork: () => void;
  onDisconnect: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  isCorrectNetwork,
  account,
  isLoading,
  error,
  onConnect,
  onSwitchNetwork,
  onDisconnect,
}) => {
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center mb-4">
          <Wallet className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Connect your wallet to interact with the Dr. Birdy Books Protocol
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Connection Error
                </h3>
                <p className="text-sm text-red-700">{error}</p>
                <div className="mt-3 text-xs text-red-600">
                  <p className="mb-1">Troubleshooting tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Make sure MetaMask is installed and unlocked</li>
                    <li>Check if there's a pending connection request in MetaMask</li>
                    <li>Try refreshing the page if the issue persists</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* MetaMask */}
          {typeof window.ethereum !== 'undefined' && 
           window.ethereum.isMetaMask && 
           !window.ethereum.isCoinbaseWallet && (
            <button
              onClick={onConnect}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? 'Connecting...' : (
                <>
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect MetaMask
                </>
              )}
            </button>
          )}

          {/* Coinbase Wallet */}
          {typeof window.ethereum !== 'undefined' && 
           (window.ethereum.isCoinbaseWallet || typeof window.coinbaseWalletExtension !== 'undefined') && (
            <button
              onClick={onConnect}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? 'Connecting...' : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                    <circle cx="12" cy="12" r="6" fill="white"/>
                    <circle cx="12" cy="12" r="2" fill="#0052FF"/>
                  </svg>
                  Connect Coinbase Wallet
                </>
              )}
            </button>
          )}

          {/* Generic Wallet Button if ethereum provider exists but no specific wallet detected */}
          {typeof window.ethereum !== 'undefined' && 
           !window.ethereum.isMetaMask && 
           !window.ethereum.isCoinbaseWallet && 
           typeof window.coinbaseWalletExtension === 'undefined' && (
            <button
              onClick={onConnect}
              disabled={isLoading}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? 'Connecting...' : (
                <>
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Wallet
                </>
              )}
            </button>
          )}

          {/* No wallet detected */}
          {typeof window.ethereum === 'undefined' && typeof window.coinbaseWalletExtension === 'undefined' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                No wallet detected. Please install MetaMask or Coinbase Wallet to continue.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
          Wrong Network
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Please switch to Base network to continue
        </p>
        
        <button
          onClick={onSwitchNetwork}
          className="w-full bg-yellow-600 text-white py-3 px-4 rounded-md hover:bg-yellow-700 transition-colors"
        >
          Switch to Base Network
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-center mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
        Wallet Connected
      </h2>
      <div className="bg-gray-50 rounded-md p-4 mb-4">
        <p className="text-sm text-gray-600 mb-1">Connected Address:</p>
        <p className="font-mono text-sm text-gray-900 break-all">
          {account}
        </p>
      </div>
      
      <button
        onClick={onDisconnect}
        className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors"
      >
        Disconnect Wallet
      </button>
    </div>
  );
};
