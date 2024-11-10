import { useState, useEffect } from 'react';
import { uintCV } from '@stacks/transactions/dist/clarity';
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

  useEffect(() => {
    const loadPositions = async () => {
      if (!stacksUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const price = await fetchCurrentPrice();
        setCurrentPrice(price);
        const userPositions = await fetchAllPositions(stacksUser.profile.stxAddress.testnet);
        const allPositions = await positionService.getAllPositions(
          stacksUser.profile.stxAddress.testnet
        );
        const positionsWithStats = await Promise.all(
          userPositions.map(async (pos) => {
            const stats = await calculatePositionStats(pos, price);
            return { ...pos, ...stats };
          })
        );



        setPositions(positionsWithStats);
        setLoading(false);
      } catch (err) {
        console.error('Error loading positions:', err);
        setError('Failed to load positions');
        setLoading(false);
      }
    };

    loadPositions();
    const interval = setInterval(loadPositions, 30000);
    return () => clearInterval(interval);
  }, [stacksUser]);

  const handleCreatePosition = async () => {
    if (!stacksUser) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const amountInMicroSTX = Number(amount) * 1000000; // Convert STX to microSTX
      
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
        functionName: "open-position",
        functionArgs: [
          uintCV(amountInMicroSTX),
          uintCV(Number(closeAt))
        ],
        network: stacksNetwork,
        postConditions,
        onFinish: ({ txId }) => {
          //call api
          console.log('Transaction:', txId);
          alert('Position creation initiated! Transaction ID: ' + txId);
          setShowCreatePosition(false);
          setAmount('');
          setCloseAt('');
        },
      };

      await openContractCall(options);
    } catch (error) {
      console.error('Error creating position:', error);
      alert('Failed to create position: ' + error.message);
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

        {/* Create Position Button */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <button
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => setShowCreatePosition(!showCreatePosition)}
              onMouseEnter={() => setIsHoveringCreate(true)}
              onMouseLeave={() => setIsHoveringCreate(false)}
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

        {/* Create Position Form */}
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
                />
              </div>
              <button
                onClick={handleCreatePosition}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Create Position
              </button>
            </div>
          </div>
        )}

        {/* Positions List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            <span className="ml-2 text-gray-400">Loading positions...</span>
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

      {/* Price Setter in bottom right corner */}
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