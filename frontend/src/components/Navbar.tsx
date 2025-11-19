import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useContractsStore } from '../hooks/useContractsStore';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { BookOpen, Wallet, LogOut, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';

interface NavbarProps {
  onConnect: () => void;
  onConnectLocalhost: () => void;
  onSwitchNetwork: () => void;
  onDisconnect: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onConnect,
  onConnectLocalhost,
  onSwitchNetwork,
  onDisconnect,
}) => {
  const {
    provider,
    account,
    isConnected,
    isCorrectNetwork,
    isLoading: web3Loading,
  } = useWeb3();

  const { protocolStats } = useContractsStore();

  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch ETH balance
  useEffect(() => {
    const fetchEthBalance = async () => {
      if (!provider || !account) {
        setEthBalance('0');
        return;
      }

      setIsLoadingBalance(true);
      try {
        const balance = await provider.getBalance(account);
        const formattedBalance = ethers.formatEther(balance);
        setEthBalance(parseFloat(formattedBalance).toFixed(4));
      } catch (error) {
        console.error('Error fetching ETH balance:', error);
        setEthBalance('0');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchEthBalance();
  }, [provider, account]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dr. Birdy Books</h1>
              <p className="text-xs text-gray-600">Protocol</p>
            </div>
          </div>

          {/* Protocol Stats */}
          {isConnected && (
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <p className="text-xs text-gray-500">Total Staked</p>
                <p className="text-sm font-semibold text-gray-900">
                  {protocolStats.isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    `${parseFloat(protocolStats.totalStaked).toLocaleString()} DBB`
                  )}
                </p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="text-xs text-gray-500">Stakers</p>
                <p className="text-sm font-semibold text-gray-900">
                  {protocolStats.isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    protocolStats.totalStakers.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Wallet Section */}
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={onConnect}
                  disabled={web3Loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {web3Loading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
                <Button
                  onClick={onConnectLocalhost}
                  variant="outline"
                  size="sm"
                >
                  Localhost
                </Button>
              </div>
            ) : !isCorrectNetwork ? (
              <Button
                onClick={onSwitchNetwork}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Switch Network
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {formatAddress(account || '')}
                    </span>
                    <span className="sm:hidden">
                      {account?.slice(0, 6)}...
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Connected Wallet
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {account}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* ETH Balance */}
                  <DropdownMenuItem className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">ETH Balance</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isLoadingBalance ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="text-sm font-medium">
                          {ethBalance} ETH
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  {/* Copy Address */}
                  <DropdownMenuItem
                    onClick={() => copyToClipboard(account || '')}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="text-sm">
                        {copied ? 'Copied!' : 'Copy Address'}
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  {/* Disconnect */}
                  <DropdownMenuItem
                    onClick={onDisconnect}
                    className="flex items-center space-x-2 text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
