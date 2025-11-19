import React, { useState } from 'react';
import { Trash2, ArrowRightLeft, DollarSign } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useContractsStore } from '../hooks/useContractsStore';
import { formatTokenAmount } from '../utils/formatNumbers';

interface TokenActionsStoreProps {
  userInfo: any;
  onTransfer: (to: string, amount: string) => Promise<void>;
  isLoading: boolean;
}

export const TokenActionsStore: React.FC<TokenActionsStoreProps> = ({
  userInfo,
  onTransfer,
  isLoading,
}) => {
  const { addToast } = useToast();
  const { burnTokens } = useContractsStore();
  const [burnAmount, setBurnAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBurn = async () => {
    if (!burnAmount || parseFloat(burnAmount) <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount to burn' });
      return;
    }

    if (parseFloat(burnAmount) > parseFloat(userInfo.balance)) {
      addToast({ type: 'error', title: 'Insufficient Balance', message: 'You cannot burn more tokens than you have' });
      return;
    }

    setIsProcessing(true);
    try {
      await burnTokens(burnAmount);
      addToast({ type: 'success', title: 'Burn Successful', message: `Successfully burned ${burnAmount} tokens` });
      setBurnAmount('');
    } catch (error: any) {
      addToast({ type: 'error', title: 'Burn Failed', message: `Failed to burn tokens: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount || parseFloat(transferAmount) <= 0) {
      addToast({ type: 'error', title: 'Invalid Input', message: 'Please enter valid recipient and amount' });
      return;
    }

    if (parseFloat(transferAmount) > parseFloat(userInfo.balance)) {
      addToast({ type: 'error', title: 'Insufficient Balance', message: 'You cannot transfer more tokens than you have' });
      return;
    }

    setIsProcessing(true);
    try {
      await onTransfer(transferTo, transferAmount);
      addToast({ type: 'success', title: 'Transfer Successful', message: `Successfully transferred ${transferAmount} tokens` });
      setTransferTo('');
      setTransferAmount('');
    } catch (error: any) {
      addToast({ type: 'error', title: 'Transfer Failed', message: `Failed to transfer tokens: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading user information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <ArrowRightLeft className="h-6 w-6 text-blue-600 mr-2" />
        Token Actions
      </h2>

      <div className="space-y-6">
        {/* Burn Tokens */}
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
            <Trash2 className="h-5 w-5 mr-2" />
            Burn Tokens
          </h3>
          <p className="text-sm text-red-700 mb-4">
            Burning tokens permanently removes them from circulation. This action cannot be undone.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Burn
              </label>
              <input
                type="number"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                placeholder="Enter amount to burn"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isProcessing || isLoading}
              />
            </div>
            <button
              onClick={handleBurn}
              disabled={isProcessing || isLoading || !burnAmount}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isProcessing ? 'Burning...' : 'Burn Tokens'}
            </button>
          </div>
        </div>

        {/* Transfer Tokens */}
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Transfer Tokens
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Transfer your tokens to another address.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Address
              </label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing || isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Transfer
              </label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter amount to transfer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing || isLoading}
              />
            </div>
            <button
              onClick={handleTransfer}
              disabled={isProcessing || isLoading || !transferTo || !transferAmount}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {isProcessing ? 'Transferring...' : 'Transfer Tokens'}
            </button>
          </div>
        </div>

        {/* Token Balance Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            Current Balance
          </h3>
          <div className="text-2xl font-bold text-gray-900">
            {formatTokenAmount(userInfo.balance)} DBB
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Available for burning or transferring
          </p>
        </div>
      </div>

      {/* Loading State */}
      {(isLoading || isProcessing) && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            {isProcessing ? 'Processing transaction...' : 'Loading...'}
          </span>
        </div>
      )}
    </div>
  );
};
