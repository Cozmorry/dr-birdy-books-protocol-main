import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { WalletConnect } from './WalletConnect';

interface ProtectedRouteProps {
  isConnected: boolean;
  isCorrectNetwork: boolean;
  account: string | null;
  isLoading: boolean;
  error: string | null;
  onConnect: () => void;
  onSwitchNetwork: () => void;
  onDisconnect: () => void;
}

export function ProtectedRoute({
  isConnected,
  isCorrectNetwork,
  account,
  isLoading,
  error,
  onConnect,
  onSwitchNetwork,
  onDisconnect,
}: ProtectedRouteProps) {
  if (!isConnected || !isCorrectNetwork) {
    return (
      <div className="max-w-md mx-auto">
        <WalletConnect
          isConnected={isConnected}
          isCorrectNetwork={isCorrectNetwork}
          account={account}
          isLoading={isLoading}
          error={error}
          onConnect={onConnect}
          onSwitchNetwork={onSwitchNetwork}
          onDisconnect={onDisconnect}
        />
      </div>
    );
  }

  return <Outlet />;
}

