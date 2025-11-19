import React, { useState } from 'react';
import { Flame, Send, AlertCircle } from 'lucide-react';

interface TokenActionsProps {
  userInfo: any;
  onBurn: (amount: string) => Promise<void>;
  onTransfer: (to: string, amount: string) => Promise<void>;
  isLoading: boolean;
}

export const TokenActions: React.FC<TokenActionsProps> = ({
  userInfo,
  onBurn,
  onTransfer,
  isLoading,
}) => {
  const [burnAmount, setBurnAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBurn = async () => {
    if (!burnAmount || parseFloat(burnAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(burnAmount) > parseFloat(userInfo.balance)) {
      setError('Insufficient balance');
      return;
    }

    setIsBurning(true);
    setError(null);

    try {
      await onBurn(burnAmount);
      setBurnAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to burn tokens');
    } finally {
      setIsBurning(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount || parseFloat(transferAmount) <= 0) {
      setError('Please enter valid recipient and amount');
      return;
    }

    if (parseFloat(transferAmount) > parseFloat(userInfo.balance)) {
      setError('Insufficient balance');
      return;
    }

    setIsTransferring(true);
    setError(null);

    try {
      await onTransfer(transferTo, transferAmount);
      setTransferTo('');
      setTransferAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to transfer tokens');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Token Actions</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burn Tokens */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <Flame className="h-5 w-5 text-red-600 mr-2" />
            <h4 className="text-lg font-medium text-red-900">Burn Tokens</h4>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Burn
            </label>
            <input
              type="number"
              value={burnAmount}
              onChange={(e) => setBurnAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={isBurning || isLoading || !userInfo}
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {parseFloat(userInfo?.balance || '0').toLocaleString()} DBBPT
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-xs text-yellow-800">
              ⚠️ Burning tokens is permanent and cannot be undone!
            </p>
          </div>

          <button
            onClick={handleBurn}
            disabled={isBurning || isLoading || !userInfo}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBurning ? 'Burning...' : 'Burn Tokens'}
          </button>
        </div>

        {/* Transfer Tokens */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <Send className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="text-lg font-medium text-blue-900">Transfer Tokens</h4>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTransferring || isLoading || !userInfo}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Transfer
            </label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTransferring || isLoading || !userInfo}
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {parseFloat(userInfo?.balance || '0').toLocaleString()} DBBPT
            </p>
          </div>

          <button
            onClick={handleTransfer}
            disabled={isTransferring || isLoading || !userInfo}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTransferring ? 'Transferring...' : 'Transfer Tokens'}
          </button>
        </div>
      </div>
    </div>
  );
};
