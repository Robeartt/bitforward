import React, { useState, useEffect } from 'react';
import { fetchAllPositions, formatSTX } from '../../utils/stacksUtils';
import { useStacks } from '../../context/StacksContext';
import { openContractCall } from '@stacks/connect';
import { makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';
import { principalCV } from '@stacks/transactions';

const PositionManagement = () => {
  const { stacksUser, stacksNetwork } = useStacks();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const fetchedPositions = await fetchAllPositions();
      // Filter for unmatched positions only
      const unmatchedPositions = fetchedPositions.filter(position => position.matched === null);
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

  if (loading && positions.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 16l-4-4 4-4M4 8l4 4-4 4"/>
            </svg>
            Match Positions
          </div>
          <div className="text-sm text-gray-400">
            {positions.length} available to match
          </div>
        </h3>
      </div>
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="p-2">Type</th>
                <th className="p-2">Amount/Value</th>
                <th className="p-2">Start Block</th>
                <th className="p-2">Closing Block</th>
                <th className="p-2">Premium</th>
                <th className="p-2">Address</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <tr key={index} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      position.long ? 'bg-green-600' : 'bg-blue-600'
                    }`}>
                      {position.long ? 'Long' : 'Hedge'}
                    </span>
                  </td>
                  <td className="p-2">
                    {formatSTX(position.amount)}
                  </td>
                  <td className="p-2">
                    {position.openBlock}
                  </td>
                  <td className="p-2">
                    {position.closingBlock}
                  </td>
                  <td className="p-2">
                    {formatSTX(position.premium)}
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
              ))}
            </tbody>
          </table>
        </div>

        {positions.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-400">
            No positions available to match
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-500 p-4 rounded-lg mt-4">
          {error}
        </div>
      )}
    </div>
  );
};

export default PositionManagement;