import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useWeb3 } from '../hooks/useWeb3';

interface MainLayoutProps {
  onConnect: () => void;
  onSwitchNetwork: () => void;
  onDisconnect: () => void;
}

export function MainLayout({
  onConnect,
  onSwitchNetwork,
  onDisconnect,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        onConnect={onConnect}
        onSwitchNetwork={onSwitchNetwork}
        onDisconnect={onDisconnect}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
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
    </div>
  );
}

