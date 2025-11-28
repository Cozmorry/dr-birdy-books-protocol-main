import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import { BookOpen, Wallet, LogOut, Copy, CheckCircle, RefreshCw, Home, TrendingUp, Download, FileText, Shield, MessageSquare } from 'lucide-react';
import { ethers } from 'ethers';
import { FeedbackModal } from './FeedbackModal';

interface NavbarProps {
  onConnect: () => void;
  onSwitchNetwork: () => void;
  onDisconnect: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onConnect,
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
  const location = useLocation();

  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

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
          <Link to="/" className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dr. Birdy Books</h1>
              <p className="text-xs text-gray-600">Protocol</p>
            </div>
          </Link>

          {/* Navigation Links */}
          {isConnected && isCorrectNetwork && (
            <nav className="hidden md:flex items-center space-x-1 ml-8">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </div>
              </Link>
              <Link
                to="/staking"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/staking') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Staking
                </div>
              </Link>
              <Link
                to="/content"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/content') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <Download className="h-4 w-4 mr-1" />
                  Content
                </div>
              </Link>
              <Link
                to="/blog"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/blog') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  Blog
                </div>
              </Link>
              <Link
                to="/tier"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/tier') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Tier
                </div>
              </Link>
            </nav>
          )}

          {/* Protocol Stats - Only Total Staked (Stakers removed per user request) */}
          {isConnected && isCorrectNetwork && (
            <div className="hidden md:flex items-center">
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
            </div>
          )}

          {/* Feedback Button */}
          {isConnected && isCorrectNetwork && (
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="hidden md:flex items-center px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors mr-2"
              title="Share Feedback"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </button>
          )}

          {/* Wallet Section */}
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <Button
                onClick={onConnect}
                disabled={web3Loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {web3Loading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
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
      
      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </nav>
  );
};
