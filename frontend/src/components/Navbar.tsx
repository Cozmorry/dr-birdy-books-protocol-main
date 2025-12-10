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
import { Wallet, LogOut, Copy, CheckCircle, RefreshCw, Home, TrendingUp, Download, FileText, Shield, MessageSquare, Menu, X } from 'lucide-react';
import { ethers } from 'ethers';
import { FeedbackModal } from './FeedbackModal';
import ThemeToggle from './ThemeToggle';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navigationLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/staking', label: 'Staking', icon: TrendingUp },
    { to: '/content', label: 'Content', icon: Download },
    { to: '/blog', label: 'Blog', icon: FileText },
    { to: '/tier', label: 'Tier', icon: Shield },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img 
              src="/birdy%20logo.png" 
              alt="Dr. Birdy Books" 
              className="h-14 w-auto sm:h-16 sm:w-auto object-contain min-w-[200px] max-w-[300px]"
            />
          </Link>

          {/* Desktop Navigation Links */}
          {isConnected && isCorrectNetwork && (
            <nav className="hidden md:flex items-center space-x-1 ml-8 flex-1">
              {navigationLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.to) 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="h-4 w-4 mr-1" />
                      {link.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Desktop Protocol Stats */}
          {isConnected && isCorrectNetwork && (
            <div className="hidden lg:flex items-center mr-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Staked</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {protocolStats.isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    `${parseFloat(protocolStats.totalStaked).toLocaleString()} DBBPT`
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Desktop Feedback Button */}
          {isConnected && isCorrectNetwork && (
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="hidden lg:flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors mr-2"
              title="Share Feedback"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </button>
          )}

          {/* Wallet Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            {!isConnected ? (
              <Button
                onClick={onConnect}
                disabled={web3Loading}
                className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-4"
              >
                <Wallet className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{web3Loading ? 'Connecting...' : 'Connect Wallet'}</span>
                <span className="sm:hidden">{web3Loading ? '...' : 'Connect'}</span>
              </Button>
            ) : !isCorrectNetwork ? (
              <Button
                onClick={onSwitchNetwork}
                className="bg-orange-600 hover:bg-orange-700 text-xs sm:text-sm px-2 sm:px-4"
              >
                Switch Network
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 text-xs sm:text-sm px-2 sm:px-4">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {formatAddress(account || '')}
                    </span>
                    <span className="sm:hidden">
                      {account?.slice(0, 4)}...
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Connected Wallet
                      </p>
                      <p className="text-xs leading-none text-muted-foreground break-all">
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

            {/* Mobile Menu Button */}
            {isConnected && isCorrectNetwork && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isConnected && isCorrectNetwork && mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 py-4">
            {/* Mobile Navigation Links */}
            <nav className="flex flex-col space-y-1 mb-4">
              {navigationLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.to) 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Protocol Stats */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Staked</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {protocolStats.isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  `${parseFloat(protocolStats.totalStaked).toLocaleString()} DBBPT`
                )}
              </p>
            </div>

            {/* Mobile Feedback Button */}
            <button
              onClick={() => {
                setIsFeedbackOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </button>
          </div>
        )}
      </div>
      
      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </nav>
  );
};
