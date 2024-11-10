import React, { useState, useEffect } from 'react';
import { useStacks } from '../../context/StacksContext';
import { formatSTX } from '../../utils/stacksUtils';
import { fetchPositionHistory } from '../../utils/stacksUtils';

const History = () => {
  const { stacksUser } = useStacks();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState(null);

  const calculateEntryPrice = (openValue, amount) => {
    return formatSTX(openValue / (amount / 1000000));
  };

  const handleCopyTxId = async (txId) => {
    try {
      await navigator.clipboard.writeText(txId);
      setCopiedTxId(txId);
      setTimeout(() => setCopiedTxId(null), 2000); // Reset after 2 seconds
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

        // Process the historical positions
        const processedHistory = positionHistory.map(position => ({
          id: `${position.owner}-${position.openBlock}`,
          type: position.long ? 'Long' : 'Hedge',
          amount: formatSTX(position.amount),
          openBlock: position.openBlock,
          closingBlock: position.closingBlock,
          entryPrice: calculateEntryPrice(position.openValue, position.amount),
          closePrice: formatSTX(position.closePrice),
          premium: formatSTX(position.premium),
          matched: position.matched,
          closedAt: new Date(position.closedAt).toLocaleString(),
          txId: position.closeTransaction?.txid || 'N/A',
          pnl: calculatePnL(position)
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
    // Convert values from microSTX to STX
    const amount = position.amount / 1000000;
    const openValue = position.openValue / 1000000;
    const closePrice = position.closePrice / 1000000;
    
    // Calculate initial and final position values
    const initialPositionValue = amount; // Amount of STX initially put in
    let finalPositionValue;
    
    if (position.long) {
        // For long positions: final value changes proportionally with price
        finalPositionValue = amount * (closePrice / (openValue / amount));
    } else {
        // For short positions: final value changes inversely with price
        finalPositionValue = amount * ((openValue / amount) / closePrice);
    }
    
    // Calculate percentage gain/loss
    const pnlPercentage = ((finalPositionValue - initialPositionValue) / initialPositionValue) * 100;
    
    return pnlPercentage.toFixed(2);
  };

  if (!stacksUser) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="text-center py-8 text-gray-400">
          Connect your wallet to view position history
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <span className="ml-2 text-gray-400">Loading history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Position History</h2>
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
      ) : history.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Entry Price</th>
                <th className="px-4 py-2 text-left">Exit Price</th>
                <th className="px-4 py-2 text-left">Premium</th>
                <th className="px-4 py-2 text-left">P/L</th>
                <th className="px-4 py-2 text-left">Closed At</th>
                <th className="px-4 py-2 text-left">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {history.map((position) => (
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
                  <td className="px-4 py-2">{position.entryPrice}</td>
                  <td className="px-4 py-2">{position.closePrice}</td>
                  <td className="px-4 py-2">{position.premium}</td>
                  <td className={`px-4 py-2 ${
                    parseFloat(position.pnl) >= 0 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {position.pnl}%
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-400">
                    {position.closedAt}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleCopyTxId(position.txId)}
                      className="text-indigo-500 hover:text-indigo-400 text-sm flex items-center space-x-1"
                    >
                      <span className="truncate max-w-[100px]">
                        {position.txId.substring(0, 8)}...
                      </span>
                      <span className="text-xs text-gray-500">
                        {copiedTxId === position.txId ? '(Copied!)' : '(Click to copy)'}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No position history found
        </div>
      )}
    </div>
  );
};

export default History;