import React, { useState, useEffect } from 'react';
import { useStacks } from '../../context/StacksContext';
import { LineChart } from 'lucide-react';

const Positions = () => {
  const { stacksUser } = useStacks();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBlock, setCurrentBlock] = useState(0);

  const calculatePnL = (position, currentPrice) => {
    const amount = position.amount / 1000000;
    const openValue = position.openValue / 1000000;

    const initialPositionValue = amount;
    let currentPositionValue = amount * ((openValue / amount) / currentPrice);

    let pnlPercentage = ((currentPositionValue - initialPositionValue) / initialPositionValue) * 100;
    if (position.long) {
      pnlPercentage *= -1;
    }
    return {
      percentage: pnlPercentage.toFixed(2),
      value: (initialPositionValue * (pnlPercentage / 100)).toFixed(2)
    };
  };

  const calculateUsdValue = (amount, openValue) => {
    return (openValue / 1000000).toFixed(2);
  };

  const calculatePremiumAmount = (amount, premium) => {
    // premium is already in STX terms and scaled by 1000000
    return formatSTX(premium);
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

        const [currentPrice, block] = await Promise.all([
          fetchCurrentPrice(),
          getCurrentBlock()
        ]);
        setCurrentBlock(block);

        const allPositions = await fetchAllPositions();
        const matchedPositions = allPositions
          .filter(position => position.matched !== null)
          .map(position => {
            const pnlCalc = calculatePnL(position, currentPrice);
            return {
              id: `${position.owner}-${position.openBlock}`,
              type: position.long ? 'Long' : 'Hedge',
              amount: formatSTX(position.amount),
              openBlock: position.openBlock,
              closingBlock: position.closingBlock,
              blocksElapsed: block - position.openBlock,
              blocksLeft: position.closingBlock - block,
              premiumAmount: calculatePremiumAmount(position.amount, position.premium),
              premiumPercentage: ((position.premium / position.amount) * 100).toFixed(2),
              usdValue: calculateUsdValue(position.amount, position.openValue),
              pnl: pnlCalc.percentage,
              pnlValue: pnlCalc.value,
              openValue: position.openValue,
              matched: position.matched
            };
          });

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
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Open Positions
          </h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          Connect your wallet to view positions
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Open Positions
          </h3>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <span className="ml-2 text-gray-400">Loading positions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Open Positions
          </div>
          <div className="text-sm text-gray-400">
            {positions.length} open positions
          </div>
        </h3>
      </div>

      {error ? (
        <div className="p-4">
          <div className="bg-red-900/20 border border-red-900 text-red-500 p-4 rounded-lg">
            {error}
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
              className="ml-4 text-sm text-indigo-500 hover:text-indigo-400"
            >
              Try again
            </button>
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
                  <th className="p-2">Blocks Elapsed</th>
                  <th className="p-2">Blocks Left</th>
                  <th className="p-2">Premium</th>
                  <th className="p-2">Address</th>
                  <th className="p-2">P/L</th>
                </tr>
              </thead>
              <tbody>
                {positions.length > 0 ? positions.map((position) => (
                  <tr key={position.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${position.type === 'Long' ? 'bg-green-600' : 'bg-blue-600'
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
                    <td className="p-2">
                      <span className="text-sm text-gray-400">{position.blocksElapsed}</span>
                      <span className="text-xs text-gray-500 ml-1">({position.openBlock})</span>
                    </td>
                    <td className="p-2">
                      <span className="text-sm text-gray-400">{position.blocksLeft}</span>
                      <span className="text-xs text-gray-500 ml-1">({position.closingBlock})</span>
                    </td>
                    <td className="p-2">
                      <div className={position.type === 'Hedge' ? 'text-green-500' : 'text-red-500'}>
                        {position.type === 'Hedge' ? '-' : '+'}{position.premiumPercentage}%
                      </div>
                      <div className={position.type === 'Hedge' ? 'text-sm text-green-500' : 'text-sm text-red-500'}>
                        {position.premiumAmount}
                      </div>
                    </td>
                    <td className="p-2 font-mono text-sm">
                      {position.matched?.slice(0, 8)}...{position.matched?.slice(-8)}
                    </td>
                    <td className={`p-2 ${parseFloat(position.pnl) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                      <div>{position.pnl}%</div>
                      <div className="text-sm">
                        {position.pnlValue}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No matched positions found
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

export default Positions;