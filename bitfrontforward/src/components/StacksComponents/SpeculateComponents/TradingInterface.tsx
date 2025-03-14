import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Dropdown } from "./Dropdown";
import { AmountInput } from "./AmountInput";
import { ExpirySelector } from "./ExpirySelector";
import { LeverageSlider } from "./LeverageSlider";
import { MarketData } from "./MarketData";
import { AssetType, PremiumType } from "./types";

interface TradingInterfaceProps {
  // Add any props if needed
}

export const TradingInterface: React.FC<TradingInterfaceProps> = () => {
  const navigate = useNavigate();

  // Asset selection state
  const [selectedAsset, setSelectedAsset] = useState<AssetType>(
    "European Currency (EURO)",
  );
  const assetOptions = ["European Currency (EURO)", "US Dollar (USD)"];

  // Premium selection state
  const [selectedPremium, setSelectedPremium] = useState<PremiumType>("Hedge");
  const premiumOptions = ["Hedge", "Long", "Short"];

  // Amount input state
  const [longAmount, setLongAmount] = useState("");
  const [hedgeAmount, setHedgeAmount] = useState("");

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

  // Start countdown timer
  useEffect(() => {
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
      clearInterval(countdownInterval);
    };
  }, []);

  const handleProposeLongContract = (): void => {
    navigate("/fund");
  };

  return (
    <main className="min-h-screen text-white bg-gray-900">
      <Header />

      <section className="p-5">
        <h1 className="mb-5 text-base text-orange-500">SPECULATE/STABILIZE</h1>

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
            onSelect={(option) => setSelectedPremium(option as PremiumType)}
          />

          <AmountInput
            label={`${selectedPremium} Amount in ${getCurrencyCode()}`}
            value={longAmount}
            currencyCode={getCurrencyCode()}
            onChange={setLongAmount}
          />

          <AmountInput
            label={`${selectedPremium} Amount in BTC`}
            value={hedgeAmount}
            currencyCode={getCurrencyCode()}
            onChange={setHedgeAmount}
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

        <button
          className="p-4 mt-10 mb-5 w-full font-medium text-center text-white bg-orange-500 rounded transition-all cursor-pointer border-none duration-[0.2s] ease-[ease]"
          onClick={handleProposeLongContract}
        >
          PROPOSE LONG CONTRACT
        </button>

        <MarketData />
      </section>
    </main>
  );
};
