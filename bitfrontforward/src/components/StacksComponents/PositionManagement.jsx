import React, { useState, useEffect } from 'react';

const PositionManagement = () => {
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [closeAddress, setCloseAddress] = useState('');

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

  const handlePositionSelect = (address) => {
    setSelectedPositions(prev => {
      if (prev.includes(address)) {
        return prev.filter(a => a !== address);
      }
      if (prev.length < 2) {
        return [...prev, address];
      }
      return [prev[1], address];
    });
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    if (selectedPositions.length !== 2) {
      setError('Please select exactly 2 positions to match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Matching positions:', selectedPositions[0], selectedPositions[1]);
      setSelectedPositions([]);
      await fetchPositions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Closing position:', closeAddress);
      setCloseAddress('');
      await fetchPositions();
      await fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top row with Match and Close blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Match Block */}
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
            <div className="overflow-y-auto max-h-64 mb-4">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-2">Select</th>
                    <th className="p-2">Address</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr 
                      key={index} 
                      className={`border-t border-gray-800 cursor-pointer hover:bg-gray-800 ${
                        selectedPositions.includes(position.address) ? 'bg-gray-800' : ''
                      }`}
                      onClick={() => handlePositionSelect(position.address)}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedPositions.includes(position.address)}
                          onChange={() => {}}
                          className="rounded bg-gray-700 border-gray-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-sm">{position.address?.slice(0, 8)}...</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          position.long ? 'bg-green-600' : 'bg-blue-600'
                        }`}>
                          {position.long ? 'Long' : 'Hedge'}
                        </span>
                      </td>
                      <td className="p-2 text-sm">{position.amount} STX</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleMatch}
              disabled={loading || selectedPositions.length !== 2}
              className={`w-full px-4 py-2 rounded-lg ${
                loading || selectedPositions.length !== 2
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } transition-colors`}
            >
              {loading ? 'Matching...' : 'Match Selected Positions'}
            </button>
          </div>
        </div>

        {/* Close Block */}
        <div className="bg-gray-900 rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Close Position
            </h3>
          </div>
          <div className="p-4">
            <form onSubmit={handleClose} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={closeAddress}
                  onChange={(e) => setCloseAddress(e.target.value)}
                  placeholder="Position Address"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !closeAddress}
                className={`w-full px-4 py-2 rounded-lg ${
                  loading || !closeAddress
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                } transition-colors`}
              >
                {loading ? 'Closing...' : 'Close Position'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Full-width History Block */}
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Position History
          </h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="p-2">Address</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Open Block</th>
                  <th className="p-2">Closing Block</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Premium</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={index} className="border-t border-gray-800">
                    <td className="p-2 text-sm">{item.address?.slice(0, 8)}...</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.long ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {item.long ? 'Long' : 'Hedge'}
                      </span>
                    </td>
                    <td className="p-2 text-sm">{item.amount} STX</td>
                    <td className="p-2 text-sm">{item.openBlock}</td>
                    <td className="p-2 text-sm">{item.closingBlock}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.matched ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        {item.matched ? 'Matched' : 'Closed'}
                      </span>
                    </td>
                    <td className="p-2 text-sm">{item.premium} STX</td>
                  </tr>
                ))}
              </tbody>
            </table>
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