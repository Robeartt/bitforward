import React, { useState, useEffect } from 'react';
import { useStacks } from '../../context/StacksContext';
import { ArrowLeftRight } from 'lucide-react';
import { getPositions, removePosition } from '../../utils/backendUtils';
import { getContract, takePosition } from '../../utils/stacksUtils';

const PositionManagement = () => {
  const { stacksUser, stacksNetwork } = useStacks();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchingPosition, setMatchingPosition] = useState(null);

  // We're no longer using these formatting functions as we'll display raw contract data

  // Function to load positions with contract details
  const loadPositions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch positions from backend
      const backendPositions = await getPositions();
      const positionsToRemove = [];

      // Enhance positions with contract details
      const enhancedPositions = await Promise.all(
        backendPositions.map(async (position) => {
          try {
            // Get contract details for each position
            const contractDetails = await getContract(position.contractId);

            if (!contractDetails) {
              // Skip positions without valid contract details
              positionsToRemove.push(position.contractId);
              return null;
            }

            // Check if position is no longer open (status !== 1)
            if (contractDetails.status !== 1) {
              positionsToRemove.push(position.contractId);
              console.log(`Position ${position.contractId} is no longer open (status: ${contractDetails.status}), marking for removal`);
              return null;
            }

            return {
              ...position,
              contractDetails
            };
          } catch (err) {
            console.error(`Error enhancing position ${position.contractId}:`, err);
            return null;
          }
        })
      );

      // Remove positions that are no longer open or invalid
      if (positionsToRemove.length > 0) {
        console.log(`Removing ${positionsToRemove.length} positions that are no longer open or invalid`);
        await Promise.all(
          positionsToRemove.map(async (contractId) => {
            try {
              await removePosition(contractId);
              console.log(`Successfully removed position ${contractId} from backend`);
            } catch (err) {
              console.error(`Failed to remove position ${contractId} from backend:`, err);
            }
          })
        );
      }

      // Filter out null values (positions that couldn't be enhanced or are no longer open)
      const validPositions = enhancedPositions.filter(p => p !== null);

      setPositions(validPositions);
    } catch (err) {
      console.error('Error loading positions:', err);
      setError('Failed to fetch positions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load positions initially
    loadPositions();

    // Set up periodic refresh (every 30 seconds)
    const interval = setInterval(loadPositions, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const handleMatchPosition = async (position) => {
    if (!stacksUser) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setMatchingPosition(position.contractId);
      setIsSubmitting(true);
      setError(null);

      // Use stacksUtils.takePosition to match the position
      await takePosition(stacksNetwork, {
        contractId: position.contractId,
        senderAddress: stacksUser.profile.stxAddress.testnet,
        onFinish: async (data) => {
          console.log('Position matched successfully:', data);

          // Refresh positions after successful match
          await loadPositions();

          setIsSubmitting(false);
          setMatchingPosition(null);
        },
        onCancel: (error) => {
          console.error('Position matching canceled or failed:', error);
          setError('Match canceled or failed: ' + (error?.message || 'Unknown error'));
          setIsSubmitting(false);
          setMatchingPosition(null);
        }
      });
    } catch (error) {
      console.error('Error matching position:', error);
      setError('Failed to match position: ' + error.message);
      setIsSubmitting(false);
      setMatchingPosition(null);
    }
  };

  if (loading && positions.length === 0) {
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
          <span className="ml-2 text-gray-400">Loading positions...</span>
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
            {loading && <span className="ml-2">(refreshing...)</span>}
          </div>
        </h3>
      </div>

      {error && (
        <div className="p-4">
          <div className="bg-red-900/20 border border-red-900 text-red-500 p-4 rounded-lg">
            {error}
            <button
              onClick={() => {
                setError(null);
                loadPositions();
              }}
              className="ml-4 text-sm text-indigo-500 hover:text-indigo-400"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="p-2">Contract ID</th>
                <th className="p-2">Position Type</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Closing Block</th>
                <th className="p-2">Premium</th>
                <th className="p-2">Asset</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.length > 0 ? positions.map((position) => {
                const contract = position.contractDetails;
                const isLong = contract.longId > 0 && contract.shortId === 0;

                return (
                  <tr key={position.contractId} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="p-2 font-mono text-sm">{position.contractId}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${isLong ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {isLong ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td className="p-2">
                      <div>{contract.collateralAmount}</div>
                    </td>
                    <td className="p-2">{contract.closingBlock}</td>
                    <td className="p-2">
                      <div className={contract.premium >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {contract.premium}
                      </div>
                    </td>
                    <td className="p-2 font-mono">{contract.asset}</td>
                    <td className="p-2 font-mono">
                      {contract.status === 1 ? 'Open' :
                        contract.status === 2 ? 'Filled' :
                          contract.status === 3 ? 'Closed' : 'Unknown'}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleMatchPosition(position)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${stacksUser && !isSubmitting && contract.status === 1
                            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                          }`}
                        disabled={!stacksUser || isSubmitting || matchingPosition !== null || contract.status !== 1}
                      >
                        {matchingPosition === position.contractId
                          ? 'Matching...'
                          : isSubmitting
                            ? 'Wait...'
                            : 'Match'}
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {loading ? 'Loading positions...' : 'No positions available to match'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PositionManagement;