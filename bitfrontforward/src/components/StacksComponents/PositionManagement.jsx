import React, { useState, useEffect } from 'react';
import { fetchAllPositions, formatSTX } from '../../utils/stacksUtils';
import { useStacks } from '../../context/StacksContext';
import { openContractCall } from '@stacks/connect';
import { makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';
import { principalCV } from '@stacks/transactions';
import { ArrowLeftRight } from 'lucide-react';

const PositionManagement = () => {
  const { stacksUser, stacksNetwork } = useStacks();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateUsdValue = (amount, openValue) => {
    const stxAmount = amount / 1000000;
    const pricePerSTX = (openValue / amount);
    return (openValue / 1000000).toFixed(2);
  };

  const calculatePremiumAmount = (amount, premium) => {
    // premium is already in STX terms and scaled by 1000000
    return formatSTX(premium);
  };

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const fetchedPositions = await fetchAllPositions();
      const unmatchedPositions = fetchedPositions
        .filter(position => position.matched === null)
        .map(position => ({
          ...position,
          type: position.long ? 'Long' : 'Hedge',
          amount: formatSTX(position.amount),
          usdValue: calculateUsdValue(position.amount, position.openValue),
          premiumAmount: calculatePremiumAmount(position.amount, position.premium),
          premiumPercentage: ((position.premium / position.amount) * 100).toFixed(2)
        }));
      setPositions(unmatchedPositions);
    } catch (err) {
      setError('Failed to fetch positions');
      console.error('Error loading positions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchPosition = async (owner) => {
    if (!stacksUser) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const postConditions = [
        makeStandardSTXPostCondition(
          stacksUser.profile.stxAddress.testnet,
          FungibleConditionCode.Greater,
          0
        )
      ];

      const options = {
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "bitforward",
        functionName: "match-position",
        functionArgs: [
          principalCV(owner)
        ],
        network: stacksNetwork,
        postConditions,
        onFinish: async ({ txId }) => {
          console.log('Match Transaction:', txId);
          
          try {
            const response = await fetch('http://localhost:3001/api/position/match', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                address: stacksUser.profile.stxAddress.testnet,
                matchedAddress: owner 
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            await loadPositions();
            console.log('Position matched successfully');
          } catch (error) {
            console.error('Error confirming match:', error);
            setError('Failed to confirm match: ' + error.message);
          } finally {
            setIsSubmitting(false);
          }
        },
        onCancel: () => {
          console.log('Match transaction canceled by user');
          setIsSubmitting(false);
        }
      };

      await openContractCall(options);
    } catch (error) {
      console.error('Error matching position:', error);
      setError('Failed to match position: ' + error.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Match Positions
          </h3>
        </div>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Match Positions
          </h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          Connect your wallet to view positions
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Match Positions
          </div>
          <div className="text-sm text-gray-400">
            {positions.length} available to match
          </div>
        </h3>
      </div>

      {error ? (
        <div className="p-4">
          <div className="bg-red-900/20 border border-red-900 text-red-500 p-4 rounded-lg">
            {error}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="p-2">Type</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Start Block</th>
                  <th className="p-2">Closing Block</th>
                  <th className="p-2">Premium</th>
                  <th className="p-2">Address</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.length > 0 ? positions.map((position, index) => (
                  <tr key={index} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        position.type === 'Long' ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {position.type}
                      </span>
                    </td>
                    <td className="p-2">
                      <div>{position.amount}</div>
                      <div className="text-sm text-gray-400">
                        ${position.usdValue}
                      </div>
                    </td>
                    <td className="p-2">{position.openBlock}</td>
                    <td className="p-2">{position.closingBlock}</td>
                    <td className="p-2">
                      <div className={position.type === 'Hedge' ? 'text-green-500' : 'text-red-500'}>
                        {position.type === 'Hedge' ? '-' : '+'}{position.premiumPercentage}%
                      </div>
                      <div className={position.type === 'Hedge' ? 'text-sm text-green-500' : 'text-sm text-red-500'}>
                        {position.premiumAmount}
                      </div>
                    </td>
                    <td className="p-2 font-mono text-sm">
                      {position.owner?.slice(0, 8)}...{position.owner?.slice(-8)}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleMatchPosition(position.owner)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          stacksUser && !isSubmitting
                            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }`}
                        disabled={!stacksUser || isSubmitting}
                      >
                        {isSubmitting ? 'Matching...' : 'Match'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No positions available to match
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionManagement;