import React, { useState } from 'react';
import { ShoppingCart, CreditCard, CheckCircle, Star, Lock, Unlock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useContractsStore } from '../hooks/useContractsStore';
import { formatTokenAmount } from '../utils/formatNumbers';
import { trackTierPurchase } from '../utils/analytics';

interface TierPurchaseStoreProps {
  userInfo: any;
  tiers: any[];
  userTier: number;
  hasAccess: boolean;
  isLoading: boolean;
}

export const TierPurchaseStore: React.FC<TierPurchaseStoreProps> = ({
  userInfo,
  tiers,
  userTier,
  hasAccess,
  isLoading,
}) => {
  const { addToast } = useToast();
  const { stakeTokens, approveTokens } = useContractsStore();
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');

  const handleTierSelection = (tierIndex: number) => {
    if (tierIndex <= userTier) {
      addToast({ 
        type: 'info', 
        title: 'Tier Already Unlocked', 
        message: 'You already have access to this tier or higher' 
      });
      return;
    }
    setSelectedTier(tierIndex);
    setPurchaseAmount(tiers[tierIndex]?.threshold || '0');
  };

  const handlePurchaseTier = async () => {
    if (!selectedTier || !purchaseAmount) {
      addToast({ type: 'error', title: 'Invalid Selection', message: 'Please select a tier and enter an amount' });
      return;
    }

    const tier = tiers[selectedTier];
    const requiredAmount = parseFloat(tier.threshold);
    const purchaseAmountNum = parseFloat(purchaseAmount);

    if (purchaseAmountNum < requiredAmount) {
      addToast({ 
        type: 'error', 
        title: 'Insufficient Amount', 
        message: `You need at least ${formatTokenAmount(requiredAmount)} tokens to unlock ${tier.name}` 
      });
      return;
    }

    if (purchaseAmountNum > parseFloat(userInfo.balance)) {
      addToast({ 
        type: 'error', 
        title: 'Insufficient Balance', 
        message: `You only have ${formatTokenAmount(userInfo.balance)} tokens available` 
      });
      return;
    }

    setIsProcessing(true);
    try {
      // First approve tokens for staking
      await approveTokens(purchaseAmount);
      addToast({ type: 'success', title: 'Approval Successful', message: 'Tokens approved for staking' });

      // Then stake the tokens to unlock the tier
      await stakeTokens(purchaseAmount);
      
      // Track tier purchase in Google Analytics
      trackTierPurchase(selectedTier, purchaseAmountNum);
      
      addToast({ 
        type: 'success', 
        title: 'Tier Unlocked!', 
        message: `Successfully unlocked ${tier.name} tier by staking ${formatTokenAmount(purchaseAmount)} tokens` 
      });

      setSelectedTier(null);
      setPurchaseAmount('');
    } catch (error: any) {
      const { formatErrorForToast } = await import('../utils/formatErrors');
      const formattedError = formatErrorForToast(error, {
        operation: 'Tier Purchase',
        amount: purchaseAmount,
        balance: userInfo.balance
      });
      addToast({ type: 'error', title: formattedError.title, message: formattedError.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTierStatus = (tierIndex: number) => {
    if (tierIndex < userTier) return 'unlocked';
    if (tierIndex === userTier) return 'current';
    return 'locked';
  };

  const canPurchaseTier = (tierIndex: number) => {
    const tier = tiers[tierIndex];
    if (!tier) return false;
    const requiredAmount = parseFloat(tier.threshold);
    const userBalance = parseFloat(userInfo.balance);
    return userBalance >= requiredAmount;
  };

  if (!userInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please connect your wallet to purchase tiers</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <ShoppingCart className="h-6 w-6 text-purple-600 mr-2" />
          Tier Purchase
        </h2>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Current: Tier {userTier >= 0 ? userTier : 'None'}
          </span>
          {hasAccess && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              Access Granted
            </span>
          )}
        </div>
      </div>

      {/* User Balance */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatTokenAmount(userInfo.balance)} DBBPT
            </p>
          </div>
          <CreditCard className="h-8 w-8 text-gray-600" />
        </div>
      </div>

      {/* Tier Selection */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900">Available Tiers</h3>
        {tiers.map((tier, index) => {
          const status = getTierStatus(index);
          const canPurchase = canPurchaseTier(index);
          const isSelected = selectedTier === index;
          
          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-purple-500 bg-purple-50'
                  : status === 'current'
                  ? 'border-blue-500 bg-blue-50'
                  : status === 'unlocked'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
              onClick={() => handleTierSelection(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full mr-3 ${
                    isSelected
                      ? 'bg-purple-100'
                      : status === 'current'
                      ? 'bg-blue-100'
                      : status === 'unlocked'
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    {isSelected ? (
                      <ShoppingCart className="h-5 w-5 text-purple-600" />
                    ) : status === 'current' ? (
                      <Star className="h-5 w-5 text-blue-600" />
                    ) : status === 'unlocked' ? (
                      <Unlock className="h-5 w-5 text-green-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-medium ${
                      isSelected ? 'text-purple-900' : 
                      status === 'current' ? 'text-blue-900' : 
                      status === 'unlocked' ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      {tier.name}
                    </h4>
                    <p className={`text-sm ${
                      isSelected ? 'text-purple-700' : 
                      status === 'current' ? 'text-blue-700' : 
                      status === 'unlocked' ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      Required: {formatTokenAmount(tier.threshold)} DBBPT
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {status === 'current' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Current Tier
                    </span>
                  )}
                  {status === 'unlocked' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Unlocked
                    </span>
                  )}
                  {status === 'locked' && canPurchase && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Available
                    </span>
                  )}
                  {status === 'locked' && !canPurchase && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Insufficient Balance
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Purchase Form */}
      {selectedTier && (
        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-medium text-purple-900 mb-4">
            Purchase {tiers[selectedTier]?.name}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Stake
              </label>
              <input
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder={`Minimum: ${formatTokenAmount(tiers[selectedTier]?.threshold)}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isProcessing || isLoading}
                min={tiers[selectedTier]?.threshold}
                max={userInfo.balance}
              />
              <p className="text-xs text-gray-500 mt-1">
                You need at least {formatTokenAmount(tiers[selectedTier]?.threshold)} tokens to unlock this tier
              </p>
            </div>

            <div className="bg-white rounded-md p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Required Amount:</span>
                <span className="font-medium">{formatTokenAmount(tiers[selectedTier]?.threshold)} DBBPT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Your Balance:</span>
                <span className="font-medium">{formatTokenAmount(userInfo.balance)} DBBPT</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-600">Remaining After Purchase:</span>
                <span className={parseFloat(userInfo.balance) - parseFloat(purchaseAmount) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatTokenAmount(parseFloat(userInfo.balance) - parseFloat(purchaseAmount))} DBBPT
                </span>
              </div>
            </div>

            <button
              onClick={handlePurchaseTier}
              disabled={!purchaseAmount || parseFloat(purchaseAmount) < parseFloat(tiers[selectedTier]?.threshold) || isProcessing || isLoading}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase Tier
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Purchase Benefits */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-lg font-medium text-blue-900 mb-3">Tier Benefits</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-center">
            <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
            Access to exclusive content based on your tier level
          </li>
          <li className="flex items-center">
            <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
            File management and upload capabilities
          </li>
          <li className="flex items-center">
            <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
            Priority access to new features and updates
          </li>
          <li className="flex items-center">
            <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
            Community access and networking opportunities
          </li>
        </ul>
      </div>
    </div>
  );
};
