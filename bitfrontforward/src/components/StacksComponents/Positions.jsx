import React from 'react';

const Positions = () => {
  // Mock data - replace with actual data from your context
  const positions = [
    { id: 1, asset: 'BTC-USD', size: '0.5', entryPrice: '45000', currentPrice: '46000', pnl: '+500', type: 'Long' },
    { id: 2, asset: 'ETH-USD', size: '2.0', entryPrice: '2800', currentPrice: '2750', pnl: '-100', type: 'Short' }
  ];

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Open Positions</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-2 text-left">Asset</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Size</th>
              <th className="px-4 py-2 text-left">Entry Price</th>
              <th className="px-4 py-2 text-left">Current Price</th>
              <th className="px-4 py-2 text-left">PnL</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id} className="border-b border-gray-700">
                <td className="px-4 py-2 font-medium">{position.asset}</td>
                <td className="px-4 py-2">
                  <span 
                    className={`px-2 py-1 rounded text-sm ${
                      position.type === 'Long' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {position.type}
                  </span>
                </td>
                <td className="px-4 py-2">{position.size}</td>
                <td className="px-4 py-2">${position.entryPrice}</td>
                <td className="px-4 py-2">${position.currentPrice}</td>
                <td className={`px-4 py-2 ${
                  position.pnl.startsWith('+') 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  ${position.pnl}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Positions;