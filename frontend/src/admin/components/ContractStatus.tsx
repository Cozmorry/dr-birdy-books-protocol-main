import { useEffect, useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, Settings, Wrench } from 'lucide-react';
import { useWeb3Store } from '../../hooks/useWeb3Store';
import { useContractsStore } from '../../hooks/useContractsStore';

export default function ContractStatus() {
  const { provider, signer } = useWeb3Store();
  const { contracts } = useContractsStore();
  const [contractStatus, setContractStatus] = useState<{
    isPaused: boolean;
    stakingTokenSet: boolean;
    primaryOracleSet: boolean;
    backupOracleSet: boolean;
    tierCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkContractStatus = async () => {
    if (!contracts.flexibleTieredStaking) {
      console.log('No staking contract available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Checking contract status...');
      const status = await contracts.flexibleTieredStaking.getContractStatus();
      console.log('Contract status result:', status);
      
      const parsedStatus = {
        isPaused: status[0],
        stakingTokenSet: status[1],
        primaryOracleSet: status[2],
        backupOracleSet: status[3],
        tierCount: Number(status[4])
      };
      
      console.log('Parsed contract status:', parsedStatus);
      setContractStatus(parsedStatus);
    } catch (error: any) {
      console.error('Failed to check contract status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contracts.flexibleTieredStaking) {
      checkContractStatus();
    }
  }, [contracts.flexibleTieredStaking]);

  if (!contracts.flexibleTieredStaking) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Contract not available</p>
          <p className="text-sm text-gray-500 mt-2">
            Please connect your wallet to view contract status
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Contract Status
        </h2>
        <div className="flex gap-2">
          <button
            onClick={checkContractStatus}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading && !contractStatus ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : contractStatus ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Contract Status:</span>
              <div className="flex items-center">
                {contractStatus.isPaused ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 font-medium">Paused</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">Active</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Staking Token:</span>
              <div className="flex items-center">
                {contractStatus.stakingTokenSet ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">Set</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 font-medium">Not Set</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Price Oracle:</span>
              <div className="flex items-center">
                {contractStatus.primaryOracleSet ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">Set</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600 font-medium">Not Set</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Tiers Configured:</span>
              <span className="text-blue-600 font-medium">{contractStatus.tierCount}</span>
            </div>
          </div>

          {contractStatus.isPaused && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">
                  Staking is currently paused. Please try again later.
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Click Refresh to check contract status</p>
        </div>
      )}
    </div>
  );
}

