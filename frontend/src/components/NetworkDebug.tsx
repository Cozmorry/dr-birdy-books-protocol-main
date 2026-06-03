import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';

export function NetworkDebug() {
  const { provider, account, chainId, isConnected, isCorrectNetwork, connectWallet } = useWeb3();

  const forceRefresh = async () => {
    if (window.ethereum) {
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const actualChainId = parseInt(chainIdHex, 16);
      console.log('Manual refresh - MetaMask chainId:', actualChainId);
      
      // Force reload
      window.location.reload();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#000',
      color: '#0f0',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>🔍 Network Debug</strong></div>
      <div>Connected: {isConnected ? '✅ YES' : '❌ NO'}</div>
      <div>Correct Network: {isCorrectNetwork ? '✅ YES' : '❌ NO'}</div>
      <div>Chain ID: {chainId || 'null'}</div>
      <div>Account: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'null'}</div>
      <div>Provider: {provider ? '✅ Present' : '❌ null'}</div>
      <button
        onClick={forceRefresh}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          background: '#0f0',
          color: '#000',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold'
        }}
      >
        🔄 Force Refresh
      </button>
    </div>
  );
}
