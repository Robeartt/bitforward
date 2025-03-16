import React, { useState, useEffect } from 'react';

const MarketOverview = () => {
  const [marketData, setMarketData] = useState({
    price: 0,
    premium: 0,
    blockHeight: 0
  });

  const fetchData = async () => {
    const [price, premium, blockHeight] = await Promise.all([
      fetchCurrentPrice(),
      fetchCurrentPremium(),
      getCurrentBlock()
    ]);
    setMarketData({ price, premium, blockHeight });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const calculatePremiumPercentage = () => {
    console.log(marketData.premium);
    return (marketData.premium * 100);
  };

  return (
    <div className="grid grid-cols-3 gap-4 py-6 px-6 mt-4 bg-gray-800 rounded-lg">
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-400">Current Price</h3>
        <p className="text-2xl font-bold text-green-500">
          ${marketData.price.toFixed(2)}
        </p>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-400">Premium</h3>
        <p className="text-2xl font-bold text-blue-500">
          {calculatePremiumPercentage().toFixed(2)}%
        </p>
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-400">Block Height</h3>
        <p className="text-2xl font-bold text-purple-500">
          {marketData.blockHeight.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default MarketOverview;