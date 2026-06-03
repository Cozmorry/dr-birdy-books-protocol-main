import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { BASE_MAINNET, BASE_TESTNET, LOCALHOST, getContractAddresses, getNetworkConfig } from '../config/networks';
import { trackWalletConnect } from '../utils/analytics';

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  authorizedAccounts: string[];
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
}

export const useWeb3 = () => {
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    authorizedAccounts: [],
    chainId: null,
    isConnected: false,
    isCorrectNetwork: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manuallyDisconnectedRef = useRef(false);
  const latestAccountRef = useRef<string | null>(null);
  const latestChainIdRef = useRef<number | null>(null);

  // Keep latestAccountRef updated with the active account
  useEffect(() => {
    latestAccountRef.current = web3State.account;
  }, [web3State.account]);

  // Keep latestChainIdRef updated with the active chain ID
  useEffect(() => {
    latestChainIdRef.current = web3State.chainId;
  }, [web3State.chainId]);

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
      const signer = await provider.getSigner(accounts[0]);
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
        authorizedAccounts: accounts,
        chainId,
        isConnected: true,
        // Contracts deployed on Base Mainnet (8453) and Base Sepolia Testnet (84532)
        isCorrectNetwork,
      });
      
      // Reset manual disconnect flag since user is connecting
      manuallyDisconnectedRef.current = false;
      
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

  const switchToBaseNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    // Default to LOCALHOST in development and BASE_MAINNET in production, unless configured via env
    const defaultChainId = process.env.REACT_APP_DEFAULT_NETWORK_ID
      ? parseInt(process.env.REACT_APP_DEFAULT_NETWORK_ID)
      : (process.env.NODE_ENV === 'development' ? LOCALHOST.chainId : BASE_MAINNET.chainId);

    const targetNetwork = getNetworkConfig(defaultChainId);
    console.log('[useWeb3] Requesting switch network to:', targetNetwork.name, 'Chain ID:', targetNetwork.chainId);
    
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
                blockExplorerUrls: targetNetwork.blockExplorer ? [targetNetwork.blockExplorer] : undefined,
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
    // Mark as manually disconnected to prevent auto-reconnect
    manuallyDisconnectedRef.current = true;
    
    setWeb3State({
      provider: null,
      signer: null,
      account: null,
      authorizedAccounts: [],
      chainId: null,
      isConnected: false,
      isCorrectNetwork: false,
    });
    setError(null);
  }, []);

  const switchAccount = useCallback(async (address: string) => {
    if (!web3State.provider) return;
    try {
      console.log('[useWeb3] Switching active account in dApp to:', address);
      const signer = await web3State.provider.getSigner(address);
      setWeb3State(prev => ({
        ...prev,
        signer,
        account: address,
      }));
    } catch (err) {
      console.error('[useWeb3] Failed to switch active account:', err);
      setError('Failed to switch account: ' + (err as any).message);
    }
  }, [web3State.provider]);

  // Auto-reconnect on page load if wallet was previously connected
  useEffect(() => {
    const checkConnection = async () => {
      // Don't auto-reconnect if user manually disconnected
      if (manuallyDisconnectedRef.current) return;
      
      if (typeof window.ethereum === 'undefined') return;
      
      try {
        // Use the safer window.ethereum.request method
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        }); // This doesn't prompt, just checks existing
        
        if (accounts && accounts.length > 0) {
          // Wallet was previously connected, restore connection
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner(accounts[0]);
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          
          // Check if contracts are deployed on this network
          const contractAddresses = getContractAddresses(chainId);
          const hasDeployedContracts = 
            contractAddresses.reflectiveToken !== ethers.ZeroAddress &&
            contractAddresses.flexibleTieredStaking !== ethers.ZeroAddress;

          console.log('[useWeb3] Auto-reconnect restoring wallet connection for account:', accounts[0]);
          setWeb3State({
            provider,
            signer,
            account: accounts[0],
            authorizedAccounts: accounts,
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
    if (typeof window.ethereum === 'undefined') {
      console.log('[useWeb3] event listener setup skipped: window.ethereum is undefined');
      return;
    }

    console.log('[useWeb3] window.ethereum check:', {
      exists: typeof window.ethereum !== 'undefined',
      isMetaMask: window.ethereum?.isMetaMask,
      isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
      providers: (window.ethereum as any)?.providers?.map((p: any) => ({
        isMetaMask: p.isMetaMask,
        isCoinbase: p.isCoinbaseWallet || p.isCoinbaseWallet === true
      }))
    });

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('[useWeb3] accountsChanged event received in listener, accounts:', accounts);
      if (accounts.length === 0) {
        console.log('[useWeb3] accounts.length is 0, calling disconnect');
        disconnect();
      } else {
        if (!window.ethereum) return;
        manuallyDisconnectedRef.current = false;
        console.log('[useWeb3] accountsChanged event received, switching to account:', accounts[0]);
        // Re-fetch provider + signer so the new account is used for all tx
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner(accounts[0]);
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          const contractAddresses = getContractAddresses(chainId);
          const hasDeployedContracts =
            contractAddresses.reflectiveToken !== ethers.ZeroAddress &&
            contractAddresses.flexibleTieredStaking !== ethers.ZeroAddress;
            
          console.log('[useWeb3] Successfully obtained new provider and signer on account switch');
          setWeb3State({
            provider,
            signer,
            account: accounts[0],
            authorizedAccounts: accounts,
            chainId,
            isConnected: true,
            isCorrectNetwork: hasDeployedContracts && (
              chainId === BASE_MAINNET.chainId ||
              chainId === BASE_TESTNET.chainId ||
              chainId === LOCALHOST.chainId
            ),
          });
        } catch (error) {
          console.error('[useWeb3] Failed to retrieve new provider/signer on accountsChanged, using fallback:', error);
          // Fallback: at minimum update the displayed account
          setWeb3State(prev => ({
            ...prev,
            account: accounts[0],
            authorizedAccounts: accounts,
            isConnected: true
          }));
        }
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log('[useWeb3] chainChanged event received. New Chain ID:', newChainId);

      if (!window.ethereum) return;

      try {
        // Rebuild provider + signer on the new chain — this is the key step that
        // triggers initializeContracts() in useWeb3Store via the provider dependency.
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const account = accounts?.[0] ?? null;
        const signer = account ? await provider.getSigner(account) : null;

        const contractAddresses = getContractAddresses(newChainId);
        const hasDeployedContracts =
          contractAddresses.reflectiveToken !== ethers.ZeroAddress &&
          contractAddresses.flexibleTieredStaking !== ethers.ZeroAddress;

        console.log('[useWeb3] Chain changed — new provider created for chain:', newChainId, 'contracts available:', hasDeployedContracts);

        setWeb3State(prev => ({
          ...prev,
          provider,
          signer,
          account,
          chainId: newChainId,
          isCorrectNetwork: hasDeployedContracts && (
            newChainId === BASE_MAINNET.chainId ||
            newChainId === BASE_TESTNET.chainId ||
            newChainId === LOCALHOST.chainId
          ),
        }));
      } catch (err) {
        console.error('[useWeb3] Failed to rebuild provider on chain change:', err);
        // Fallback: at minimum update chainId so the UI reflects the switch
        setWeb3State(prev => ({
          ...prev,
          chainId: newChainId,
          isCorrectNetwork: false,
        }));
      }
    };

    console.log('[useWeb3] Registering accountsChanged and chainChanged listeners...');
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Polling fallback because accountsChanged and chainChanged can be unreliable in some browsers/extensions
    console.log('[useWeb3] Starting background account and chain polling interval...');
    const pollInterval = setInterval(async () => {
      try {
        if (!window.ethereum) return;
        
        // Poll for account changes
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          if (accounts[0]?.toLowerCase() !== latestAccountRef.current?.toLowerCase()) {
            console.log('[useWeb3] Polling fallback detected account change from:', latestAccountRef.current, 'to:', accounts[0]);
            await handleAccountsChanged(accounts);
          }
        } else if (latestAccountRef.current !== null) {
          console.log('[useWeb3] Polling fallback detected all accounts disconnected');
          disconnect();
        }

        // Poll for chain changes
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(chainIdHex, 16);
        if (currentChainId !== latestChainIdRef.current) {
          console.log('[useWeb3] Polling fallback detected chain change from:', latestChainIdRef.current, 'to:', currentChainId);
          await handleChainChanged(chainIdHex);
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
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
    switchToBaseNetwork,
    disconnect,
    switchAccount,
  };
};
