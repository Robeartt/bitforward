import React from "react";
import { MarketDataItem } from "./MarketDataItem";

interface MarketDataProps {
  // Add any props if needed
}

export const MarketData: React.FC<MarketDataProps> = () => {
  return (
    <section
      className="flex gap-5 justify-between max-sm:flex-wrap max-sm:gap-2.5"
      aria-labelledby="market-data-heading"
    >
      <h2 id="market-data-heading" className="sr-only">
        Market Data
      </h2>

      <MarketDataItem
        label="BTC/USD"
        value="$65,246.82"
        change="+2.4%"
        isPositive={true}
      />

      <MarketDataItem
        label="ETH/USD"
        value="$3,128.65"
        change="-0.8%"
        isPositive={false}
      />

      <MarketDataItem label="EUR/USD" value="$1.0876" />

      <MarketDataItem label="Volatility Index" value="27.35" />
    </section>
  );
};
