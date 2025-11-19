import React from 'react';
import { Star, Lock, Unlock } from 'lucide-react';
import { TierInfo as TierInfoType } from '../types';
import { formatTokenAmount } from '../utils/formatNumbers';

interface TierInfoProps {
  tiers: TierInfoType[];
  userTier: number;
  hasAccess: boolean;
}

export const TierInfo: React.FC<TierInfoProps> = ({
  tiers,
  userTier,
  hasAccess,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Staking Tiers</h3>
      
      <div className="space-y-4">
        {tiers.map((tier, index) => {
          const isUserTier = userTier === index;
          const isUnlocked = userTier >= index;
          
          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all ${
                isUserTier
                  ? 'border-blue-500 bg-blue-50'
                  : isUnlocked
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full mr-3 ${
                    isUserTier
                      ? 'bg-blue-100'
                      : isUnlocked
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    {isUserTier ? (
                      <Star className="h-5 w-5 text-blue-600" />
                    ) : isUnlocked ? (
                      <Unlock className="h-5 w-5 text-green-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-medium ${
                      isUserTier ? 'text-blue-900' : isUnlocked ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      {tier.name}
                    </h4>
                    <p className={`text-sm ${
                      isUserTier ? 'text-blue-700' : isUnlocked ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      Minimum: {formatTokenAmount(tier.threshold)} DBB
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {isUserTier && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Current Tier
                    </span>
                  )}
                  {!isUserTier && isUnlocked && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Unlocked
                    </span>
                  )}
                  {!isUnlocked && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Access Status:</span>
          <span className={`text-sm font-medium ${hasAccess ? 'text-green-600' : 'text-red-600'}`}>
            {hasAccess ? 'Active Access' : 'No Access'}
          </span>
        </div>
      </div>
    </div>
  );
};
