"use client";
import React, { useState, useEffect } from "react";
import Header from "./Header";
import MarketSummary from "./MarketSummary";
import PriceDisplay from "./PriceDisplay";

const Dashboard: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString(),
  );
  const [leverage, setLeverage] = useState<number>(1.2);
  const [premiumAmount, setPremiumAmount] = useState<string>("0.00");

  function updateTime() {
    setCurrentTime(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    const timer = setInterval(() => {
      updateTime();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePremiumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal points
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setPremiumAmount(value);
  };

  return (
    <div className="p-5 min-h-screen bg-gray-900">
      <Header isConnected={isConnected} currentTime={currentTime} />

      <div className="flex gap-5 justify-end items-center px-5 py-2.5 mb-5">
        <div className="text-sm text-gray-500">Current Price: 1.25 BTC</div>
        <button className="px-5 py-2.5 ml-4 text-sm text-white whitespace-nowrap bg-orange-500 rounded-md transition-all cursor-pointer border-[none] duration-[0.2s] ease-[ease] max-sm:px-4 max-sm:py-2 max-sm:text-xs">
          CONNECT WALLET
        </button>
      </div>

      <div className="p-6 mb-5 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-orange-500 border-opacity-20">
        <div className="mb-6 text-lg font-semibold tracking-wide text-orange-500">
          <p className="text-orange-500">OVERVIEW</p>
          <p>
            <br />
          </p>
        </div>
        <div className="mb-6" />
        <div className="flex flex-col items-center px-0 py-10">
          <div className="mb-4 text-base text-center text-neutral-400">
            <p>Configure your position settings</p>
          </div>
          <div className="mb-5 text-sm text-gray-500">
            Create a new position to start trading
          </div>

          {/* Premium Amount Field */}
          <div className="w-full max-w-xs mb-6">
            <label className="block mb-2 text-sm font-medium text-neutral-400">
              Premium Amount
            </label>
            <div className="relative">
              <input
                type="text"
                value={premiumAmount}
                onChange={handlePremiumChange}
                className="w-full px-4 py-2 text-white bg-slate-800 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter premium amount"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500">BTC</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Set the premium amount for your position
            </p>
          </div>

          <div className="px-6 py-3 text-center text-white bg-orange-500 rounded-lg transition-all cursor-pointer duration-[0.2s] ease-[ease]">
            <p>CREATE NEW POSITION</p>
          </div>
        </div>
      </div>

      <MarketSummary />
      <PriceDisplay />
    </div>
  );
};

export default Dashboard;
