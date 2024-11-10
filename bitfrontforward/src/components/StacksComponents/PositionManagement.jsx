import React, { useState, useEffect } from 'react';

const PositionManagement = () => {
    const [positions, setPositions] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPosition, setSelectedPosition] = useState(null);
  
    useEffect(() => {
      fetchPositions();
      fetchHistory();
    }, []);
  
    const fetchPositions = async () => {
      try {
        const response = await fetch('/api/positions');
        const data = await response.json();
        setPositions(data);
      } catch (err) {
        setError('Failed to fetch positions');
      }
    };
  
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/positions/history');
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        setError('Failed to fetch history');
      }
    };
  
    const handleMatch = async (position1, position2) => {
      setLoading(true);
      setError(null);
  
      try {
        console.log('Matching positions:', position1.address, position2.address);
        // Implement match logic here
        await fetchPositions();
        setSelectedPosition(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

const formatSTX = (value) => {
    if (value === undefined || value === null) return '-';
    return `${value.toLocaleString()} STX`;
  };

  const calculateLength = (openBlock, closeBlock) => {
    if (!openBlock || !closeBlock) return '-';
    return `${closeBlock - openBlock} blocks`;
  };

  const calculateProfitLoss = (position) => {
    if (!position.openValue || !position.closeValue) return '-';
    
    const difference = position.closeValue - position.openValue;
    const percentage = ((difference / position.openValue) * 100).toFixed(2);
    
    const isProfit = position.long ? difference > 0 : difference < 0;
    const absoluteDiff = Math.abs(difference);

    return (
      <div className={`flex flex-col ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
        <span>{isProfit ? '+' : '-'}{formatSTX(absoluteDiff)}</span>
        <span className="text-xs">({isProfit ? '+' : ''}{percentage}%)</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Match Block with detailed table */}
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 16l-4-4 4-4M4 8l4 4-4 4"/>
            </svg>
            Match Positions
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
                      selectedPosition?.address === position.address 
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
                      {position.address?.slice(0, 8)}...{position.address?.slice(-8)}
                    </td>
                    <td className="p-2">
                      {selectedPosition ? (
                        selectedPosition.address !== position.address ? (
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
                Selected position: {selectedPosition.address?.slice(0, 8)}...{selectedPosition.address?.slice(-8)} ({selectedPosition.long ? 'Long' : 'Hedge'})
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
                      {calculateProfitLoss(item)}
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