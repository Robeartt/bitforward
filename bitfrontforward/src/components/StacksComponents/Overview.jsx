import { useState, useEffect } from 'react';
import { boolCV, uintCV } from '@stacks/transactions/dist/clarity';
import { makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import PriceSetter from './PriceSetter';
import { useStacks } from '../../context/StacksContext';
import { positionService } from '../../services/positionService';
import { 
  fetchPositionData, 
  fetchCurrentPrice, 
  calculatePositionStats, 
  formatSTX,
  fetchAllPositions 
} from '../../utils/stacksUtils';

export default function Overview() {
  const { stacksUser, stacksNetwork } = useStacks();
  const [positions, setPositions] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreatePosition, setShowCreatePosition] = useState(false);
  const [amount, setAmount] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [isHoveringCreate, setIsHoveringCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState(null);

  const loadPositions = async () => {
    if (!stacksUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch current price first
      const price = await fetchCurrentPrice();
      setCurrentPrice(price);

      // Fetch positions
      const userPositions = await fetchAllPositions(stacksUser.profile.stxAddress.testnet);
      const positionsWithStats = await Promise.all(
        userPositions.map(async (pos) => {
          const stats = await calculatePositionStats(pos, price);
          return { ...pos, ...stats };
        })
      );

      setPositions(positionsWithStats);
    } catch (err) {
      console.error('Error loading positions:', err);
      setError('Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 30000);
    return () => clearInterval(interval);
  }, [stacksUser]);

  const handleCreatePosition = async () => {
    if (!stacksUser) {
      alert('Please connect your wallet first');
      return;
    }

    if (!amount || !closeAt) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const amountInMicroSTX = Number(amount) * 1000000;
      
      if (amountInMicroSTX <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (Number(closeAt) <= 0) {
        throw new Error('Invalid closing block height');
      }

      const postConditions = [
        makeStandardSTXPostCondition(
          stacksUser.profile.stxAddress.testnet,
          FungibleConditionCode.Greater,
          amountInMicroSTX
        )
      ];

      const options = {
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "bitforward",
        functionName: "open-position",
        functionArgs: [
          uintCV(amountInMicroSTX),
          uintCV(Number(closeAt)),
          boolCV(true)
        ],
        network: stacksNetwork,
        postConditions,
        onFinish: async ({ txId }) => {
          console.log('Transaction:', txId);
          setTransactionId(txId);
          
          try {
            setShowCreatePosition(false);
            setAmount('');
            setCloseAt('');
            
            alert(`Position creation initiated! Transaction ID: ${txId}`);

            
            // Refresh positions
          
            try {
              const response = await fetch('http://localhost:3000/api/position/new', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: stacksUser.profile.stxAddress.devnet }),
              });
          
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
              }
          
              const data = await response.json();
              return data;
            } catch (error) {
              console.error('Error fetching new position:', error);
              throw error;
            }
            await loadPositions();
          } catch (error) {
            console.error('Error refreshing positions:', error);
          }
        },
        onCancel: () => {
          console.log('Transaction canceled by user');
          setIsSubmitting(false);
        }
      };

      await openContractCall(options);
    } catch (error) {
      console.error('Error creating position:', error);
      alert('Failed to create position: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h3 className="text-xl font-semibold mb-4">Welcome to BitForward</h3>
          <p className="text-gray-400 text-center">
            Connect your Stacks wallet to view and create positions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 relative">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Your Positions</h2>
          <div className="text-gray-400">
            Current Price: {formatSTX(currentPrice)} STX
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <button
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => setShowCreatePosition(!showCreatePosition)}
              onMouseEnter={() => setIsHoveringCreate(true)}
              onMouseLeave={() => setIsHoveringCreate(false)}
              disabled={isSubmitting}
            >
              {showCreatePosition ? 'Cancel' : 'Create New Position'}
            </button>
            {isHoveringCreate && !showCreatePosition && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-800 text-gray-200 px-3 py-1 rounded text-sm">
                Open a long or hedge position
              </div>
            )}
          </div>
        </div>

        {showCreatePosition && (
          <div className="mb-6 bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Create New Position</h3>
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Amount (STX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  placeholder="Enter amount in STX"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Close at Block Height</label>
                <input
                  type="number"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  placeholder="Enter block height"
                  disabled={isSubmitting}
                />
              </div>
              <button
                onClick={handleCreatePosition}
                disabled={isSubmitting || !amount || !closeAt}
                className={`w-full ${
                  isSubmitting || !amount || !closeAt
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white px-4 py-2 rounded transition-colors flex items-center justify-center`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Create Position'
                )}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            <span className="ml-2 text-gray-400">Loading positions...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <p className="text-red-500">{error}</p>
            <button
              onClick={loadPositions}
              className="mt-4 text-indigo-500 hover:text-indigo-400"
            >
              Try Again
            </button>
          </div>
        ) : positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Entry Price</th>
                  <th className="pb-2">Current Price</th>
                  <th className="pb-2">P/L</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => (
                  <tr key={index} className="border-t border-gray-800">
                    <td className="py-3">{formatSTX(position.amount)} STX</td>
                    <td className="py-3">
                      <span className={position.long ? 'text-green-500' : 'text-blue-500'}>
                        {position.long ? 'Long' : 'Hedge'}
                      </span>
                    </td>
                    <td className="py-3">{formatSTX(position.openPrice)} STX</td>
                    <td className="py-3">{formatSTX(currentPrice)} STX</td>
                    <td className={`py-3 ${position.gainsPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {position.gainsPercentage.toFixed(2)}%
                    </td>
                    <td className="py-3">
                      {position.isActive ? (
                        <span className="text-green-500">Active</span>
                      ) : (
                        <span className="text-gray-500">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No positions found</p>
            <p className="text-gray-500 text-sm mt-2">
              Create a new position to start trading
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6">
        <PriceSetter 
          currentPrice={currentPrice}
          onPriceSet={(newPrice) => {
            setCurrentPrice(newPrice);
          }}
        />
      </div>
    </div>
  );
}