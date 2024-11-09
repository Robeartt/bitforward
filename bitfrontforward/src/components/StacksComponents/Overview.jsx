import { useState, useEffect } from 'react';
import { useStacks } from '../../context/StacksContext';
import { 
  fetchPositionData, 
  fetchCurrentPrice, 
  calculatePositionStats, 
  formatSTX,
  fetchAllPositions 
} from '../../utils/stacksUtils';

export default function Overview() {
  const { stacksUser } = useStacks();
  const [positions, setPositions] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPositions = async () => {
      if (!stacksUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get current price
        const price = await fetchCurrentPrice();
        setCurrentPrice(price);

        // Get positions for connected wallet
        const userPositions = await fetchAllPositions(stacksUser.profile.stxAddress.testnet);
        
        // Calculate stats for each position
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
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPositions, 30000);
    return () => clearInterval(interval);
  }, [stacksUser]);

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h3 className="text-xl font-semibold mb-4">Welcome to BitForward</h3>
          <p className="text-gray-400 text-center mb-6">
            Connect your Stacks wallet to view your positions and start trading
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Network: Testnet</span>
            </div>
            <div className="flex items-center ml-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Current Price: {formatSTX(currentPrice)} STX</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <span className="ml-2 text-gray-400">Loading positions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-red-500 text-center py-12">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Your Positions</h2>
          <div className="text-gray-400">
            Current Price: {formatSTX(currentPrice)} STX
          </div>
        </div>

        {positions.length > 0 ? (
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
                      <span className={position.long ? 'text-green-500' : 'text-red-500'}>
                        {position.long ? 'Long' : 'Short'}
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
              Open a new position to start trading
            </p>
          </div>
        )}
      </div>
    </div>
  );
}