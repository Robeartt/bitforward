import React from "react";

const PriceDisplay: React.FC = () => {
  return (
    <div className="flex justify-between items-center px-0 py-5 max-md:flex-wrap max-md:gap-5 max-sm:flex-col max-sm:gap-4">
      <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
        <div className="mb-1.5 text-sm text-neutral-400">BTC/USD</div>
        <div className="mb-1.5 text-base font-semibold">$65,246.82</div>
      </div>
      <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
        <div className="mb-1.5 text-sm text-neutral-400">BTC/EURO</div>
        <div className="mb-1.5 text-base font-semibold">€60,128.45</div>
      </div>
      <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
        <div className="mb-1.5 text-sm text-neutral-400">EUR/USD</div>
        <div className="mb-1.5 text-base font-semibold">$1.0876</div>
      </div>
      <div className="text-white max-md:flex-[1_1_calc(50%_-_10px)] max-sm:w-full">
        <div className="mb-1.5 text-sm text-neutral-400">Volatility Index</div>
        <div className="mb-1.5 text-base font-semibold">27.35</div>
      </div>
    </div>
  );
};

export default PriceDisplay;
