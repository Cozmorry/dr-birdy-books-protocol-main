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
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
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

      const isCorrectNetwork = hasDeployedContracts && (chainId === BASE_TESTNET.chainId || chainId === LOCALHOST.chainId);
      
      setWeb3State({
        provider,
        signer,
        account: accounts[0],
        chainId,
        isConnected: true,
        // Contracts are only deployed on Base Sepolia (84532) and Localhost (31337)
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
        setError('Connection request already pending. Please check your wallet.');
      } else {
        setError(err.message || 'Failed to connect wallet. Please try again.');
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

    // Default to Base Sepolia testnet where contracts are deployed
    const targetNetwork = BASE_TESTNET;
    
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
            // Contracts are only deployed on Base Sepolia (84532) and Localhost (31337)
            isCorrectNetwork: hasDeployedContracts && (chainId === BASE_TESTNET.chainId || chainId === LOCALHOST.chainId),
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
        // Contracts are only deployed on Base Sepolia (84532) and Localhost (31337)
        isCorrectNetwork: hasDeployedContracts && (newChainId === BASE_TESTNET.chainId || newChainId === LOCALHOST.chainId),
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
