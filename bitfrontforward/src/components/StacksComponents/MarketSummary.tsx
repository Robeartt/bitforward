import React from "react";

const MarketSummary: React.FC = () => {
  return (
    <div className="p-6 mb-5 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-orange-500 border-opacity-20">
      <div className="mb-6 text-lg font-semibold tracking-wide text-orange-500">
        MARKET SUMMARY
      </div>
      <div className="grid gap-6 grid-cols-[1fr]">
        <div className="p-5 rounded-lg bg-slate-950 bg-opacity-80">
          <div className="mb-4 text-sm text-neutral-400">
            CRYPTOCURRENCY PRICES
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between">
              <span className="text-white">BTC/USD</span>
              <span className="text-green-500">$65,246.82</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white">ETH/USD</span>
              <span className="text-red-600">$3,128.65</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white">SOL/USD</span>
              <span className="text-green-500">$125.32</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSummary;
