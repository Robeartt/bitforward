import React, { useState, useEffect } from 'react';
import { useStacks } from '../../context/StacksContext';
import { fetchCurrentPrice, formatSTX } from '../../utils/stacksUtils';
import { fetchAllPositions, getCurrentBlock } from '../../utils/stacksUtils';

const Positions = () => {
  const { stacksUser } = useStacks();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBlock, setCurrentBlock] = useState(0);

  const calculatePnL = (position, currentPrice) => {
    // Convert values from microSTX to STX
    const amount = position.amount / 1000000;
    const openValue = position.openValue / 1000000;
    
    // Calculate initial and current position values
    const initialPositionValue = amount; // Amount of STX initially put in
    let currentPositionValue;
    
    if (position.long) {
        // For long positions: current value changes proportionally with price
        currentPositionValue = amount * (currentPrice / (openValue / amount));
    } else {
        // For short positions: current value changes inversely with price
        currentPositionValue = amount * ((openValue / amount) / currentPrice);
    }
    
    // Calculate percentage gain/loss
    const pnlPercentage = ((currentPositionValue - initialPositionValue) / initialPositionValue) * 100;
    
    return pnlPercentage.toFixed(2);
};

  useEffect(() => {
    const loadPositions = async () => {
      if (!stacksUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get current price and block
        const [currentPrice, block] = await Promise.all([
          fetchCurrentPrice(),
          getCurrentBlock()
        ]);
        setCurrentBlock(block);

        // Fetch positions from the contract
        const allPositions = await fetchAllPositions();

        // Filter for matched positions and process them
        const matchedPositions = allPositions
          .filter(position => position.matched !== null)
          .map(position => ({
            id: `${position.owner}-${position.openBlock}`,
            type: position.long ? 'Long' : 'Hedge',
            amount: formatSTX(position.amount),
            openBlock: position.openBlock,
            closingBlock: position.closingBlock,
            blocksElapsed: block - position.openBlock,
            blocksLeft: position.closingBlock - block,
            premium: formatSTX(position.premium),
            pnl: calculatePnL(position, currentPrice)
          }));

        setPositions(matchedPositions);
        setLoading(false);
      } catch (err) {
        console.error('Error loading positions:', err);
        setError('Failed to load positions. Please try again later.');
        setLoading(false);
      }
    };

    loadPositions();
    const interval = setInterval(loadPositions, 30000);
    return () => clearInterval(interval);
  }, [stacksUser]);

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="text-center py-8 text-gray-400">
          Connect your wallet to view positions
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <span className="ml-2 text-gray-400">Loading positions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Matched Positions</h2>
        <div className="text-sm text-gray-400">
          Current Block: {currentBlock}
        </div>
      </div>

      {error ? (
        <div className="text-center py-4">
          <div className="text-red-500 mb-2">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
            }}
            className="text-sm text-indigo-500 hover:text-indigo-400"
          >
            Try again
          </button>
        </div>
      ) : positions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Amount/Value</th>
                <th className="px-4 py-2 text-left">Blocks Elapsed</th>
                <th className="px-4 py-2 text-left">Blocks Left</th>
                <th className="px-4 py-2 text-left">Premium</th>
                <th className="px-4 py-2 text-left">P/L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id} className="border-b border-gray-700">
                  <td className="px-4 py-2">
                    <span 
                      className={`px-2 py-1 rounded text-xs ${
                        position.type === 'Long' 
                          ? 'bg-green-600' 
                          : 'bg-blue-600'
                      }`}
                    >
                      {position.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">{position.amount}</td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-gray-400">{position.blocksElapsed}</span>
                    <span className="text-xs text-gray-500 ml-1">({position.openBlock})</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-gray-400">{position.blocksLeft}</span>
                    <span className="text-xs text-gray-500 ml-1">({position.closingBlock})</span>
                  </td>
                  <td className="px-4 py-2">{position.premium}</td>
                  <td className={`px-4 py-2 ${
                    parseFloat(position.pnl) >= 0 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {position.pnl}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No matched positions found
        </div>
      )}
    </div>
  );
};

export default Positions;