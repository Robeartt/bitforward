import React from "react";
import { TradingInterface } from "./TradingInterface";

interface BitForwardTradingAppProps {
  // Add any props if needed
}

const BitForwardTradingApp: React.FC<BitForwardTradingAppProps> = () => {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <TradingInterface />
    </>
  );
};

export default BitForwardTradingApp;
