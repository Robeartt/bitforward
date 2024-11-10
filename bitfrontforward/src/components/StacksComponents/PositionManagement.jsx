import React, { useState, useEffect } from 'react';
import { useStacks } from '../../context/StacksContext';
import { 
  fetchAllPositions, 
  fetchCurrentPrice, 
  calculateProfitLoss, 
  formatSTX,
  calculatePositionStats,
  getCurrentBlock 
} from '../../utils/stacksUtils';

const PositionManagement = () => {
  const { stacksUser } = useStacks();
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);

  const fetchMatchablePositions = async () => {
    try {
      setLoading(true);
      
      // Fetch current price
      const price = await fetchCurrentPrice();
      setCurrentPrice(price);

      // Fetch all positions
      const allPositions = await fetchAllPositions();
      const currentBlock = await getCurrentBlock();

      // Filter for matchable positions:
      // 1. match is null
      // 2. not expired (closing block > current block)
      const matchablePositions = allPositions.filter(pos => 
        pos.matched === null && // Filter for unmatched positions
        pos.closingBlock > currentBlock // Filter for non-expired positions
      );

      console.log('Matchable positions:', positionsWithStats);
      setPositions(positionsWithStats);
    } catch (err) {
      console.error('Error fetching matchable positions:', err);
      setError('Failed to fetch matchable positions');
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const allPositions = await fetchAllPositions();
      
      // Filter for history:
      // 1. matched is not null OR
      // 2. expired positions
      const currentBlock = await getCurrentBlock();
      const historicalPositions = allPositions.filter(pos => 
        pos.matched !== null || // Matched positions
        pos.closingBlock <= currentBlock // Expired positions
      );

      // Add profit/loss calculations
      const historyWithProfitLoss = historicalPositions.map(pos => {
        const { profit, profitPercentage } = calculateProfitLoss(pos, currentPrice);
        return { ...pos, profit, profitPercentage };
      });

      setHistory(historyWithProfitLoss);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to fetch position history');
      setHistory([]);
    }
  };

  const handleMatch = async (position1, position2) => {
    if (!stacksUser || !position1 || !position2) {
      setError('Invalid positions selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Here you would implement the match transaction
      console.log('Matching positions:', position1.owner, position2.owner);
      
      // Refresh data after matching
      await fetchMatchablePositions();
      await fetchHistory();
      setSelectedPosition(null);
    } catch (err) {
      console.error('Error matching positions:', err);
      setError(err.message || 'Failed to match positions');
    } finally {
      setLoading(false);
    }
  };

  const calculateLength = (openBlock, closeBlock) => {
    if (!openBlock || !closeBlock) return '-';
    return `${closeBlock - openBlock} blocks`;
  };

  useEffect(() => {
    if (stacksUser) {
      fetchMatchablePositions();
      fetchHistory();
      
      // Set up refresh interval
      const interval = setInterval(() => {
        fetchMatchablePositions();
        fetchHistory();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [stacksUser]);

  // Early return for loading state
  if (loading && positions.length === 0 && history.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-center py-8 text-gray-400">
          Connect your wallet to view positions
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Match Block */}
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
                  <tr 
                    key={index} 
                    className={`border-t border-gray-800 ${
                      selectedPosition?.owner === position.owner 
                        ? 'bg-gray-800' 
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        position.long ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {position.long ? 'Long' : 'Hedge'}
                      </span>
                    </td>
                    <td className="p-2">{formatSTX(position.amount)}</td>
                    <td className="p-2">{position.openBlock}</td>
                    <td className="p-2">{position.closingBlock}</td>
                    <td className="p-2">{formatSTX(position.premium)}</td>
                    <td className="p-2 font-mono text-sm">
                      {position.owner?.slice(0, 8)}...{position.owner?.slice(-8)}
                    </td>
                    <td className="p-2">
                      {selectedPosition ? (
                        selectedPosition.owner !== position.owner ? (
                          <button
                            onClick={() => handleMatch(selectedPosition, position)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
                            disabled={loading}
                          >
                            Match
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedPosition(null)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setSelectedPosition(position)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedPosition && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-300">
                Selected position: {selectedPosition.owner?.slice(0, 8)}...{selectedPosition.owner?.slice(-8)} ({selectedPosition.long ? 'Long' : 'Hedge'})
                {' - '}{formatSTX(selectedPosition.amount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Select another position to match with this one
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Block */}
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Position History
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-400">Profit</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400">Loss</span>
              </div>
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
                  <th className="p-2">Length</th>
                  <th className="p-2">Premium</th>
                  <th className="p-2">Profit/Loss</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={index} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.long ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {item.long ? 'Long' : 'Hedge'}
                      </span>
                    </td>
                    <td className="p-2 font-medium">
                      <div className="flex flex-col">
                        <span>{formatSTX(item.amount)}</span>
                        <span className="text-xs text-gray-400">
                          Entry: {formatSTX(item.openValue)}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      {calculateLength(item.openBlock, item.closingBlock)}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col">
                        <span>{formatSTX(item.premium)}</span>
                        <span className="text-xs text-gray-400">
                          {((item.premium / item.amount) * 100).toFixed(2)}% of position
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className={`flex flex-col ${item.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <span>{item.profit >= 0 ? '+' : ''}{formatSTX(Math.abs(item.profit))}</span>
                        <span className="text-xs">
                          ({item.profit >= 0 ? '+' : ''}{item.profitPercentage.toFixed(2)}%)
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {history.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No position history available
            </div>
          )}

          <div className="mt-4 text-xs text-gray-400">
            Note: Profit/Loss calculations include premiums and fees
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default PositionManagement;