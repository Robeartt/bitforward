import React, { useState, useEffect } from 'react';
import { useStacks } from '../../context/StacksContext';
import { History as HistoryIcon } from 'lucide-react';

const History = () => {
  const { stacksUser } = useStacks();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState(null);

  const calculateUsdValue = (amount, openValue) => {
    return (openValue / 1000000).toFixed(2);
  };

  const calculatePremiumAmount = (amount, premium) => {
    return formatSTX(premium);
  };

  const handleCopyTxId = async (txId) => {
    try {
      await navigator.clipboard.writeText(txId);
      setCopiedTxId(txId);
      setTimeout(() => setCopiedTxId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!stacksUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const positionHistory = await fetchPositionHistory();
        const processedHistory = positionHistory.map(position => ({
          id: `${position.owner}-${position.openBlock}`,
          type: position.long ? 'Long' : 'Hedge',
          amount: formatSTX(position.amount),
          usdValue: calculateUsdValue(position.amount, position.openValue),
          entryPrice: formatSTX(position.openValue / (position.amount / 1000000)),
          closePrice: formatSTX(position.closePrice),
          premiumAmount: calculatePremiumAmount(position.amount, position.premium),
          premiumPercentage: ((position.premium / position.amount) * 100).toFixed(2),
          matched: position.matched,
          closedAt: new Date(position.closedAt).toLocaleString(),
          txId: position.closeTransaction?.txid || 'N/A',
          pnl: calculatePnL(position),
          pnlValue: calculatePnLValue(position)
        }));

        setHistory(processedHistory);
        setLoading(false);
      } catch (err) {
        console.error('Error loading history:', err);
        setError('Failed to load position history. Please try again later.');
        setLoading(false);
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, [stacksUser]);

  const calculatePnL = (position) => {
    const amount = position.amount / 1000000;
    const openValue = position.openValue / 1000000;
    const closePrice = position.closePrice / 1000000;

    const initialPositionValue = amount;
    let finalPositionValue = amount * ((openValue / amount) / closePrice);

    let pnlPercentage = ((finalPositionValue - initialPositionValue) / initialPositionValue) * 100;
    if (position.long) {
      pnlPercentage *= -1
    }
    return pnlPercentage.toFixed(2);
  };

  const calculatePnLValue = (position) => {
    const pnlPercentage = parseFloat(calculatePnL(position));
    const initialValue = position.amount / 1000000;
    return (initialValue * (pnlPercentage / 100)).toFixed(2);
  };

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" />
            Position History
          </h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          Connect your wallet to view position history
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" />
            Position History
          </h3>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <span className="ml-2 text-gray-400">Loading history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" />
            Position History
          </div>
          <div className="text-sm text-gray-400">
            {history.length} closed positions
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
                  <th className="p-2">Entry Price</th>
                  <th className="p-2">Exit Price</th>
                  <th className="p-2">Premium</th>
                  <th className="p-2">Address</th>
                  <th className="p-2">P/L</th>
                  <th className="p-2">Close Time</th>
                  <th className="p-2">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.map((position) => (
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
                    <td className="p-2">{position.entryPrice}</td>
                    <td className="p-2">{position.closePrice}</td>
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
                    <td className="p-2 text-sm text-gray-400">
                      {position.closedAt}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleCopyTxId(position.txId)}
                        className="text-indigo-500 hover:text-indigo-400 text-sm"
                      >
                        {position.txId.substring(0, 8)}...
                        {copiedTxId === position.txId && (
                          <span className="text-xs text-gray-500 ml-1">(Copied!)</span>
                        )}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      No position history found
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

export default History;