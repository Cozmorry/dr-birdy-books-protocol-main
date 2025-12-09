import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { BASE_MAINNET, BASE_TESTNET, LOCALHOST, getContractAddresses } from '../config/networks';
import { trackWalletConnect } from '../utils/analytics';

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
}

export const useWeb3 = () => {
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
    isCorrectNetwork: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('No wallet detected. Please install MetaMask or another Web3 wallet.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Wait for MetaMask to be ready (retry up to 3 times)
      let retries = 3;
      let accounts: string[] = [];
      
      while (retries > 0) {
        try {
          // First, check if we already have accounts (no prompt)
          const existingAccounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (existingAccounts && existingAccounts.length > 0) {
            accounts = existingAccounts;
            break;
          }
          
          // If no existing accounts, request access (will prompt)
          accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          if (accounts && accounts.length > 0) {
            break;
          }
        } catch (requestError: any) {
          retries--;
          
          // If it's a user rejection, don't retry
          if (requestError.code === 4001) {
            throw requestError;
          }
          
          // If it's a pending request, wait a bit and retry
          if (requestError.code === -32002 || requestError.message?.includes('pending')) {
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }
          
          // For other errors, wait and retry
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          throw requestError;
        }
      }
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      // Create provider and get signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Check if contracts are deployed on this network
      const contractAddresses = getContractAddresses(chainId);
      const hasDeployedContracts = 
        contractAddresses.reflectiveToken !== ethers.ZeroAddress &&
        contractAddresses.flexibleTieredStaking !== ethers.ZeroAddress;

      const isCorrectNetwork = hasDeployedContracts && (
        chainId === BASE_MAINNET.chainId || 
        chainId === BASE_TESTNET.chainId || 
        chainId === LOCALHOST.chainId
      );
      
      setWeb3State({
        provider,
        signer,
        account: accounts[0],
        chainId,
        isConnected: true,
        // Contracts deployed on Base Mainnet (8453) and Base Sepolia Testnet (84532)
        isCorrectNetwork,
      });
      
      // Track wallet connection in Google Analytics
      const walletType = window.ethereum?.isMetaMask ? 'MetaMask' : 
                        window.ethereum?.isCoinbaseWallet ? 'Coinbase Wallet' : 
                        'Other';
      trackWalletConnect(walletType, chainId);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      
      // Provide more specific error messages
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the connection request in your wallet.');
      } else if (err.code === -32002) {
        setError('Connection request already pending. Please check your wallet and approve or reject the pending request.');
      } else if (err.message?.includes('Failed to connect to MetaMask') || 
                 err.message?.includes('connect') && err.message?.includes('MetaMask')) {
        setError('Unable to connect to MetaMask. Please ensure MetaMask is installed, unlocked, and try again. If the issue persists, refresh the page.');
      } else if (err.message?.includes('User rejected') || err.message?.includes('rejected')) {
        setError('Connection was rejected. Please click "Connect" again and approve the request in MetaMask.');
      } else if (err.message?.includes('already pending') || err.message?.includes('pending')) {
        setError('A connection request is already pending. Please check your MetaMask extension and approve or reject it.');
      } else if (err.message?.includes('not installed') || err.message?.includes('No wallet')) {
        setError('No wallet detected. Please install MetaMask or another Web3 wallet to continue.');
      } else if (err.message?.includes('unlocked') || err.message?.includes('locked')) {
        setError('Please unlock your MetaMask wallet and try again.');
      } else {
        // Clean up technical error messages for user display
        let errorMessage = err.message || 'Failed to connect wallet. Please try again.';
        
        // Remove technical details
        errorMessage = errorMessage.replace(/chrome-extension:\/\/[^\s]+/gi, '');
        errorMessage = errorMessage.replace(/scripts\/inpage\.js[^\s]*/gi, '');
        errorMessage = errorMessage.replace(/at\s+[^\s]+\s+\([^)]+\)/gi, '');
        errorMessage = errorMessage.replace(/Error:\s*/gi, '');
        errorMessage = errorMessage.trim();
        
        // If message is still too technical, provide a friendly default
        if (errorMessage.length > 200 || errorMessage.includes('Object.connect') || errorMessage.includes('async s')) {
          errorMessage = 'Unable to connect to your wallet. Please ensure MetaMask is installed and unlocked, then try again.';
        }
        
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectToLocalhost = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create a JsonRpcProvider for localhost
      const provider = new ethers.JsonRpcProvider(LOCALHOST.rpcUrl);
      
      // Get the first account from the local node
      const accounts = await provider.listAccounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found on local node');
      }

      // Use the first account as signer
      const signer = await provider.getSigner(accounts[0].address);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setWeb3State({
        provider: provider as any, // Type assertion for compatibility
        signer,
        account: accounts[0].address,
        chainId,
        isConnected: true,
        isCorrectNetwork: chainId === LOCALHOST.chainId,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect to localhost node');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchToBaseNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    // Default to Base Mainnet (contracts deployed)
    const targetNetwork = BASE_MAINNET;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetNetwork.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetNetwork.chainId.toString(16)}`,
                chainName: targetNetwork.name,
                rpcUrls: [targetNetwork.rpcUrl],
                blockExplorerUrls: [targetNetwork.blockExplorer],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          setError(`Failed to add ${targetNetwork.name} to MetaMask`);
        }
      } else {
        setError(`Failed to switch to ${targetNetwork.name}`);
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setWeb3State({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
      isCorrectNetwork: false,
    });
    setError(null);
  }, []);

  // Auto-reconnect on page load if wallet was previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum === 'undefined') return;
      
      try {
        // Use the safer window.ethereum.request method
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        }); // This doesn't prompt, just checks existing
        
        if (accounts && accounts.length > 0) {
          // Wallet was previously connected, restore connection
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          
          // Check if contracts are deployed on this network
          const contractAddresses = getContractAddresses(chainId);
          const hasDeployedContracts = 
            contractAddresses.reflectiveToken !== ethers.ZeroAddress &&
            contractAddresses.flexibleTieredStaking !== ethers.ZeroAddress;

          setWeb3State({
            provider,
            signer,
            account: accounts[0],
            chainId,
            isConnected: true,
            // Contracts deployed on Base Mainnet (8453) and Base Sepolia Testnet (84532)
            isCorrectNetwork: hasDeployedContracts && (
              chainId === BASE_MAINNET.chainId || 
              chainId === BASE_TESTNET.chainId || 
              chainId === LOCALHOST.chainId
            ),
          });
        }
      } catch (err) {
        // Silently fail - wallet might not be authorized yet
        console.log('No previous wallet connection found');
      }
    };

    checkConnection();
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setWeb3State(prev => ({ ...prev, account: accounts[0] }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      // Check if contracts are deployed on this network
      const contractAddresses = getContractAddresses(newChainId);
      const hasDeployedContracts = 
        contractAddresses.reflectiveToken !== ethers.ZeroAddress &&
        contractAddresses.flexibleTieredStaking !== ethers.ZeroAddress;

      setWeb3State(prev => ({
        ...prev,
        chainId: newChainId,
        // Contracts deployed on Base Mainnet (8453) and Base Sepolia Testnet (84532)
        isCorrectNetwork: hasDeployedContracts && (
          newChainId === BASE_MAINNET.chainId || 
          newChainId === BASE_TESTNET.chainId || 
          newChainId === LOCALHOST.chainId
        ),
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [disconnect]);

  return {
    ...web3State,
    isLoading,
    error,
    connectWallet,
    connectToLocalhost,
    switchToBaseNetwork,
    disconnect,
  };
};
