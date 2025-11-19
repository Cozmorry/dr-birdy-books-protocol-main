import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { BASE_MAINNET, BASE_TESTNET, LOCALHOST } from '../config/networks';

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
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setWeb3State({
        provider,
        signer,
        account: accounts[0],
        chainId,
        isConnected: true,
        isCorrectNetwork: chainId === BASE_MAINNET.chainId || chainId === BASE_TESTNET.chainId || chainId === LOCALHOST.chainId,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
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

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_MAINNET.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${BASE_MAINNET.chainId.toString(16)}`,
                chainName: BASE_MAINNET.name,
                rpcUrls: [BASE_MAINNET.rpcUrl],
                blockExplorerUrls: [BASE_MAINNET.blockExplorer],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          setError('Failed to add Base network to MetaMask');
        }
      } else {
        setError('Failed to switch to Base network');
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
      setWeb3State(prev => ({
        ...prev,
        chainId: newChainId,
        isCorrectNetwork: newChainId === BASE_MAINNET.chainId || newChainId === BASE_TESTNET.chainId || newChainId === LOCALHOST.chainId,
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
