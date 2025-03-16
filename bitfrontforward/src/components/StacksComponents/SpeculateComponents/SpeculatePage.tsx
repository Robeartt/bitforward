import React, { useState, useEffect } from "react";
import { Dropdown } from "./Dropdown";
import { AmountInput } from "./AmountInput";
import { ExpirySelector } from "./ExpirySelector";
import { LeverageSlider } from "./LeverageSlider";
import { AssetType } from "./types";
import { useStacks } from "../../../context/StacksContext";
import { getBurnBlockHeight, createPosition } from "../../../utils/stacksUtils";

const SpeculatePage: React.FC = () => {
  const { stacksUser, stacksNetwork, prices } = useStacks();
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString(),
  );

  // State for burn block height
  const [burnBlockHeight, setBurnBlockHeight] = useState<number>(0);

  // Direction selection
  const [isLong, setIsLong] = useState<boolean>(true);

  // Asset selection state
  const [selectedAsset, setSelectedAsset] = useState<AssetType>(
    "European Currency (EURO)",
  );
  const assetOptions = ["European Currency (EURO)", "US Dollar (USD)"];

  // Amount input state
  const [assetAmount, setAssetAmount] = useState("");
  const [btcAmount, setBtcAmount] = useState("");

  // Premium state
  const [premiumPercentage, setPremiumPercentage] = useState("");
  const [premiumBtcAmount, setPremiumBtcAmount] = useState("");
  const [premiumAssetAmount, setPremiumAssetAmount] = useState("");
  const [isUpdatingPremium, setIsUpdatingPremium] = useState(false);

  // Time state
  const [timeRemaining, setTimeRemaining] = useState("24:00:00");
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Leverage state
  const [leverage, setLeverage] = useState(1.2);
  const [counterpartyLeverage, setCounterpartyLeverage] = useState(1.2);

  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);

  // Get currency code based on selected asset
  const getCurrencyCode = (): string => {
    return selectedAsset === "European Currency (EURO)" ? "EUR" : "USD";
  };

  // Get asset price from context
  const getAssetPrice = (): number => {
    return selectedAsset === "European Currency (EURO)" ? prices.EUR : prices.USD;
  };

  // Convert between asset and BTC amounts
  useEffect(() => {
    const assetPrice = getAssetPrice();

    if (assetAmount && assetPrice > 0) {
      const calculatedBtcAmount = parseFloat(assetAmount) / assetPrice;
      setBtcAmount(calculatedBtcAmount.toFixed(8));
    }
  }, [assetAmount, selectedAsset, prices]);

  useEffect(() => {
    const assetPrice = getAssetPrice();

    if (btcAmount && assetPrice > 0) {
      const calculatedAssetAmount = parseFloat(btcAmount) * assetPrice;
      setAssetAmount(calculatedAssetAmount.toFixed(2));
    }
  }, [btcAmount, selectedAsset, prices]);

  // Update premium values when percentage changes
  useEffect(() => {
    if (isUpdatingPremium) return;

    if (premiumPercentage && btcAmount) {
      setIsUpdatingPremium(true);
      const percentage = parseFloat(premiumPercentage) / 100;
      const btcValue = parseFloat(btcAmount) * percentage;
      setPremiumBtcAmount(btcValue.toFixed(8));

      const assetPrice = getAssetPrice();
      const assetValue = btcValue * assetPrice;
      setPremiumAssetAmount(assetValue.toFixed(2));
      setIsUpdatingPremium(false);
    }
  }, [premiumPercentage, btcAmount, selectedAsset, prices]);

  // Update premium percentage and asset amount when BTC amount changes
  useEffect(() => {
    if (isUpdatingPremium) return;

    if (premiumBtcAmount && btcAmount) {
      setIsUpdatingPremium(true);
      const btcValue = parseFloat(premiumBtcAmount);
      const totalBtc = parseFloat(btcAmount);

      if (totalBtc > 0) {
        const percentage = (btcValue / totalBtc) * 100;
        setPremiumPercentage(percentage.toFixed(2));
      }

      const assetPrice = getAssetPrice();
      const assetValue = btcValue * assetPrice;
      setPremiumAssetAmount(assetValue.toFixed(2));
      setIsUpdatingPremium(false);
    }
  }, [premiumBtcAmount, btcAmount, prices]);

  // Update premium percentage and BTC amount when asset amount changes
  useEffect(() => {
    if (isUpdatingPremium) return;

    if (premiumAssetAmount && assetAmount) {
      setIsUpdatingPremium(true);
      const assetValue = parseFloat(premiumAssetAmount);
      const totalAsset = parseFloat(assetAmount);

      if (totalAsset > 0) {
        const percentage = (assetValue / totalAsset) * 100;
        setPremiumPercentage(percentage.toFixed(2));
      }

      const assetPrice = getAssetPrice();
      if (assetPrice > 0) {
        const btcValue = assetValue / assetPrice;
        setPremiumBtcAmount(btcValue.toFixed(8));
      }
      setIsUpdatingPremium(false);
    }
  }, [premiumAssetAmount, assetAmount, prices]);

  // Fetch current burn block height
  useEffect(() => {
    const fetchBurnBlockHeight = async () => {
      try {
        const height = await getBurnBlockHeight();
        setBurnBlockHeight(height);
        console.log("Current burn block height:", height);
      } catch (err) {
        console.error("Failed to fetch burn block height:", err);
        // Default fallback value
        setBurnBlockHeight(12345);
      }
    };

    fetchBurnBlockHeight();

    // Refresh burn block height every minute
    const interval = setInterval(fetchBurnBlockHeight, 60000);
    return () => clearInterval(interval);
  }, []);

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

  // Calculate closing block height
  const calculateClosingBlock = (): number => {
    // Estimate 10 minutes per block on average for Bitcoin
    const minutesTotal = days * 24 * 60 + hours * 60 + minutes;
    const blocksToAdd = Math.ceil(minutesTotal / 10);
    return burnBlockHeight + blocksToAdd;
  };

  // Reset the form after successful position creation
  const resetForm = () => {
    setBtcAmount("");
    setAssetAmount("");
    setPremiumPercentage("");
    setPremiumBtcAmount("");
    setPremiumAssetAmount("");
    setDays(0);
    setHours(0);
    setMinutes(0);
    setLeverage(1.2);
    setCounterpartyLeverage(1.2);
  };

  // Handle position creation
  const handleCreatePosition = async () => {
    if (!stacksUser) {
      setError("Please connect your wallet first");
      return;
    }

    if (!btcAmount || parseFloat(btcAmount) <= 0) {
      setError("Please enter a valid BTC amount");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessTxId(null);

      // Convert values to appropriate formats
      const amountMicroBTC = Math.floor(parseFloat(btcAmount) * 100000000); // Convert to satoshis

      // Calculate premium in microBTC (positive or negative based on position)
      let premiumMicroBTC = Math.floor(parseFloat(premiumBtcAmount || "0") * 100000000);
      if (!isLong) {
        // For short positions, premium is negative
        premiumMicroBTC = -premiumMicroBTC;
      }

      // Convert leverage to the required format (scalar is 100000000)
      const longLeverageValue = Math.floor(leverage * 100000000);
      const shortLeverageValue = Math.floor(counterpartyLeverage * 100000000);

      // Get the asset code (3 characters)
      const assetCode = getCurrencyCode();

      // Calculate closing block
      const closingBlock = calculateClosingBlock();

      // Get sender address from wallet for post-conditions
      const senderAddress = stacksUser.profile.stxAddress.testnet;

      console.log("Creating position with parameters:", {
        senderAddress,
        amount: amountMicroBTC,
        closingBlock,
        isLong,
        asset: assetCode,
        premium: premiumMicroBTC,
        longLeverage: longLeverageValue,
        shortLeverage: shortLeverageValue
      });

      // Use createPosition with proper post-conditions
      await createPosition(stacksNetwork, {
        amount: amountMicroBTC,
        closingBlock,
        isLong,
        asset: assetCode,
        premium: premiumMicroBTC,
        longLeverage: longLeverageValue,
        shortLeverage: shortLeverageValue,
        senderAddress, // Pass sender address for post-conditions
        onFinish: (data) => {
          console.log('Position created successfully', data);
          setSuccessTxId(data.txId);
          setIsSubmitting(false);
          resetForm();
        },
        onCancel: (error) => {
          console.error('Transaction canceled or failed:', error);
          setError(`Transaction failed: ${error?.message || 'Unknown error'}`);
          setIsSubmitting(false);
        }
      });
    } catch (err: any) {
      console.error('Error creating position:', err);
      setError(`Failed to create position: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  // Update countdown timer
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
      {/* Display error if any */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-500 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Display success message */}
      {successTxId && (
        <div className="mb-4 p-3 bg-green-900 bg-opacity-30 border border-green-500 text-green-300 rounded-lg">
          Position created successfully! Transaction ID: {successTxId.substring(0, 10)}...
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Trading Interface Section */}
        <div className="terminal-container terminal-section">
          <div className="terminal-header">SPECULATE</div>
          <div className="terminal-panel">
            <div className="mb-4 text-sm terminal-label">
              TRADING INTERFACE
            </div>

            <div className="flex flex-col gap-5">
              {/* Position Direction Selector */}
              <div>
                <h3 className="mb-1.5 text-sm text-neutral-400">Position Direction</h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className={`flex-1 py-3 px-4 rounded-lg ${isLong
                      ? "bg-green-900 bg-opacity-30 border border-green-500 text-green-400"
                      : "bg-slate-800 text-gray-400"
                      }`}
                    onClick={() => setIsLong(true)}
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-3 px-4 rounded-lg ${!isLong
                      ? "bg-red-900 bg-opacity-30 border border-red-500 text-red-400"
                      : "bg-slate-800 text-gray-400"
                      }`}
                    onClick={() => setIsLong(false)}
                  >
                    Short
                  </button>
                </div>
              </div>

              {/* Asset Selector */}
              <Dropdown
                label="Asset"
                selected={selectedAsset}
                options={assetOptions}
                onSelect={(option) => setSelectedAsset(option as AssetType)}
              />

              {/* Amount inputs */}
              <div className="flex gap-5 mb-5 max-md:flex-col max-md:gap-2.5">
                <AmountInput
                  label={`Amount in ${getCurrencyCode()}`}
                  value={assetAmount}
                  currencyCode={getCurrencyCode()}
                  onChange={setAssetAmount}
                />

                <AmountInput
                  label="Amount in sBTC"
                  value={btcAmount}
                  currencyCode="sBTC"
                  onChange={setBtcAmount}
                />
              </div>

              {/* Premium inputs */}
              <div className="flex gap-5 mb-5 max-md:flex-col max-md:gap-2.5">
                <div className="flex-1">
                  <h3 className="mb-1.5 text-sm text-neutral-400">Premium Percentage</h3>
                  <input
                    className="p-3 w-full text-base text-white rounded bg-slate-800 border-none"
                    type="text"
                    placeholder="0"
                    value={premiumPercentage}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (/^\d*\.?\d*$/.test(newValue)) {
                        setPremiumPercentage(newValue);
                      }
                    }}
                  />
                  <p className="mt-1.5 text-sm text-neutral-400">%</p>
                </div>

                <AmountInput
                  label={`Premium in ${getCurrencyCode()}`}
                  value={premiumAssetAmount}
                  currencyCode={getCurrencyCode()}
                  onChange={setPremiumAssetAmount}
                />

                <AmountInput
                  label="Premium in sBTC"
                  value={premiumBtcAmount}
                  currencyCode="sBTC"
                  onChange={setPremiumBtcAmount}
                />
              </div>

              {/* Expiry selector */}
              <ExpirySelector
                timeRemaining={timeRemaining}
                onTimeChange={handleTimeChange}
              />

              {/* Leverage sliders */}
              <div>
                <h3 className="mb-1.5 text-sm text-neutral-400">Your Leverage</h3>
                <LeverageSlider
                  value={leverage}
                  min={1.0}
                  max={10.0}
                  onChange={setLeverage}
                />
              </div>

              <div>
                <h3 className="mb-1.5 text-sm text-neutral-400">Counterparty Leverage</h3>
                <LeverageSlider
                  value={counterpartyLeverage}
                  min={1.0}
                  max={10.0}
                  onChange={setCounterpartyLeverage}
                />
              </div>

              {/* Submit button */}
              <button
                className="p-4 mt-5 w-full font-medium text-center text-white bg-orange-500 rounded transition-all cursor-pointer border-none duration-[0.2s] ease-[ease] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreatePosition}
                disabled={isSubmitting || !stacksUser}
              >
                {isSubmitting
                  ? 'CREATING POSITION...'
                  : `PROPOSE ${isLong ? 'LONG' : 'SHORT'} CONTRACT`}
              </button>

              {/* Contract parameters summary */}
              <div className="mt-4 p-4 bg-slate-900 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Contract Parameters:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-500">Direction:</div>
                  <div>{isLong ? "Long" : "Short"}</div>

                  <div className="text-gray-500">Asset:</div>
                  <div>{getCurrencyCode()}</div>

                  <div className="text-gray-500">Amount:</div>
                  <div>{btcAmount || "0"} sBTC</div>

                  <div className="text-gray-500">Premium:</div>
                  <div>
                    {premiumPercentage || "0"}% ({premiumBtcAmount || "0"} sBTC)
                  </div>

                  <div className="text-gray-500">Your Leverage:</div>
                  <div>{leverage.toFixed(1)}x</div>

                  <div className="text-gray-500">Counterparty Leverage:</div>
                  <div>{counterpartyLeverage.toFixed(1)}x</div>

                  <div className="text-gray-500">Current Bitcoin Block:</div>
                  <div>{burnBlockHeight}</div>

                  <div className="text-gray-500">Expiry Block:</div>
                  <div>#{calculateClosingBlock()} (in approx. {days}d {hours}h {minutes}m)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SpeculatePage;