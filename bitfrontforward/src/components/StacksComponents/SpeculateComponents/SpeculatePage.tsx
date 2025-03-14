import React, { useState, useEffect } from "react";
import { Dropdown } from "./Dropdown";
import { AmountInput } from "./AmountInput";
import { ExpirySelector } from "./ExpirySelector";
import { LeverageSlider } from "./LeverageSlider";
import { AssetType, PremiumType } from "./types";

const SpeculatePage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString(),
  );

  // Asset selection state
  const [selectedAsset, setSelectedAsset] = useState<AssetType>(
    "European Currency (EURO)",
  );
  const assetOptions = ["European Currency (EURO)", "US Dollar (USD)"];

  // Premium selection state
  const [selectedPremium, setSelectedPremium] = useState<PremiumType>("Hedge");
  const premiumOptions = ["Hedge", "Long", "Short"];

  // Amount input state
  const [euroAmount, setEuroAmount] = useState("");
  const [btcAmount, setBtcAmount] = useState("");

  // Time state
  const [timeRemaining, setTimeRemaining] = useState("24:00:00");
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Leverage state
  const [leverage, setLeverage] = useState(5.2);

  // Get currency code based on selected asset
  const getCurrencyCode = (): string => {
    return selectedAsset === "European Currency (EURO)" ? "EURO" : "USD";
  };

  // Handle time changes from ExpirySelector
  const handleTimeChange = (
    newDays: number,
    newHours: number,
    newMinutes: number,
  ): void => {
    setDays(newDays);
    setHours(newHours);
    setMinutes(newMinutes);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // Start countdown timer
    let totalSeconds = 24 * 60 * 60;
    const updateCountdown = () => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeRemaining(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0",
        )}:${String(seconds).padStart(2, "0")}`,
      );

      if (totalSeconds > 0) totalSeconds--;
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <main className="container mx-auto py-8 px-4 font-mono">
      <div className="grid grid-cols-1 gap-6">
        {/* Trading Interface Section */}
        <div className="terminal-container terminal-section">
          <div className="terminal-header">SPECULATE</div>
          <div className="grid grid-cols-[2fr_1fr] gap-6 max-lg:grid-cols-1">
            <div className="terminal-panel">
              <div className="mb-4 text-sm terminal-label">
                TRADING INTERFACE
              </div>

              <div className="flex flex-col gap-5">
                <Dropdown
                  label="Asset"
                  selected={selectedAsset}
                  options={assetOptions}
                  onSelect={(option) => setSelectedAsset(option as AssetType)}
                />

                <div className="flex gap-5 mb-5 max-md:flex-col max-md:gap-2.5">
                  <Dropdown
                    label="Premium"
                    selected={selectedPremium}
                    options={premiumOptions}
                    sublabel={getCurrencyCode()}
                    onSelect={(option) =>
                      setSelectedPremium(option as PremiumType)
                    }
                  />

                  <AmountInput
                    label={`${selectedPremium} Amount in ${getCurrencyCode()}`}
                    value={euroAmount}
                    currencyCode={getCurrencyCode()}
                    onChange={setEuroAmount}
                  />

                  <AmountInput
                    label={`${selectedPremium} Amount in BTC`}
                    value={btcAmount}
                    currencyCode="BTC"
                    onChange={setBtcAmount}
                  />
                </div>

                <ExpirySelector
                  timeRemaining={timeRemaining}
                  onTimeChange={handleTimeChange}
                />

                <LeverageSlider
                  value={leverage}
                  min={1.2}
                  max={7.7}
                  onChange={setLeverage}
                />

                <button className="p-4 mt-5 w-full font-medium text-center text-white bg-orange-500 rounded transition-all cursor-pointer border-none duration-[0.2s] ease-[ease]">
                  PROPOSE LONG CONTRACT
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="terminal-panel">
                <div className="mb-4 text-sm terminal-label">MARKET DATA</div>
                <div className="flex flex-col gap-4 terminal-text">
                  <div className="flex justify-between">
                    <span className="terminal-label">BTC/USD</span>
                    <span className="terminal-value">$65,246.82</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="terminal-label">24h Change</span>
                    <span className="terminal-positive">+2.6%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="terminal-label">24h High</span>
                    <span className="terminal-value">$66,120.45</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="terminal-label">24h Low</span>
                    <span className="terminal-value">$63,890.12</span>
                  </div>
                </div>
              </div>

              <div className="terminal-panel">
                <div className="mb-4 text-sm terminal-label">
                  POSITION SUMMARY
                </div>
                <div className="flex flex-col gap-4 terminal-text">
                  <div className="flex justify-between">
                    <span className="terminal-label">Open Positions</span>
                    <span className="terminal-value">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="terminal-label">Total Value</span>
                    <span className="terminal-value">$12,450.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="terminal-label">Unrealized P/L</span>
                    <span className="terminal-positive">+$1,245.32</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Book Section */}
        <div className="terminal-container terminal-section">
          <div className="terminal-header">ORDER BOOK</div>
          <div className="grid grid-cols-[1fr_1fr] gap-6 max-md:grid-cols-1">
            <div className="terminal-panel">
              <div className="mb-4 text-sm terminal-label">BIDS</div>
              <div className="flex flex-col gap-2 terminal-text">
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 mb-2">
                  <span className="terminal-label">Price (USD)</span>
                  <span className="terminal-label">Amount (BTC)</span>
                  <span className="terminal-label">Total (USD)</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-positive">65,230.45</span>
                  <span className="terminal-value">0.5421</span>
                  <span className="terminal-value">35,361.62</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-positive">65,225.12</span>
                  <span className="terminal-value">0.8932</span>
                  <span className="terminal-value">58,259.07</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-positive">65,220.78</span>
                  <span className="terminal-value">1.2451</span>
                  <span className="terminal-value">81,201.39</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-positive">65,215.33</span>
                  <span className="terminal-value">0.3245</span>
                  <span className="terminal-value">21,162.38</span>
                </div>
              </div>
            </div>

            <div className="terminal-panel">
              <div className="mb-4 text-sm terminal-label">ASKS</div>
              <div className="flex flex-col gap-2 terminal-text">
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4 mb-2">
                  <span className="terminal-label">Price (USD)</span>
                  <span className="terminal-label">Amount (BTC)</span>
                  <span className="terminal-label">Total (USD)</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-negative">65,240.67</span>
                  <span className="terminal-value">0.2341</span>
                  <span className="terminal-value">15,272.84</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-negative">65,245.89</span>
                  <span className="terminal-value">0.5678</span>
                  <span className="terminal-value">37,046.62</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-negative">65,250.12</span>
                  <span className="terminal-value">0.9876</span>
                  <span className="terminal-value">64,441.02</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                  <span className="terminal-negative">65,255.45</span>
                  <span className="terminal-value">0.4321</span>
                  <span className="terminal-value">28,196.88</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Trades Section */}
        <div className="terminal-container terminal-section">
          <div className="terminal-header">RECENT TRADES</div>
          <div className="terminal-panel">
            <div className="flex flex-col gap-2 terminal-text">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 mb-2">
                <span className="terminal-label">Time</span>
                <span className="terminal-label">Price (USD)</span>
                <span className="terminal-label">Amount (BTC)</span>
                <span className="terminal-label">Type</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
                <span className="terminal-value">{currentTime}</span>
                <span className="terminal-positive">65,246.82</span>
                <span className="terminal-value">0.1245</span>
                <span className="terminal-positive">BUY</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
                <span className="terminal-value">{currentTime}</span>
                <span className="terminal-negative">65,240.67</span>
                <span className="terminal-value">0.0876</span>
                <span className="terminal-negative">SELL</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
                <span className="terminal-value">{currentTime}</span>
                <span className="terminal-positive">65,245.89</span>
                <span className="terminal-value">0.3421</span>
                <span className="terminal-positive">BUY</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
                <span className="terminal-value">{currentTime}</span>
                <span className="terminal-negative">65,242.33</span>
                <span className="terminal-value">0.5678</span>
                <span className="terminal-negative">SELL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SpeculatePage;
