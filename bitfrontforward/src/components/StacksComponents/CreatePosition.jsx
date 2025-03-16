import { useState, useEffect } from "react";
import { useStacks } from "../../context/StacksContext";
import { createPosition } from "../../services/positionService";
import { TrendingUp, TrendingDown } from "lucide-react";

function CreatePosition({ onSuccess }) {
  const { stacksUser } = useStacks();
  const [formData, setFormData] = useState({
    isLong: true,
    amount: "",
    leverage: 1,
    counterpartyLeverage: 1, // Default counterparty leverage
    entryPrice: 67500, // Default to current market price
    expiryDays: 7, // Default expiry in days
    expiryHours: 0, // Default expiry hours
    expiryMinutes: 0, // Default expiry minutes
    stopLossPrice: "", // Stop loss price
    takeProfitPrice: "", // Take profit price
    collateralType: "STX", // Default collateral type
    slippageTolerance: 0.5, // Default slippage tolerance in percentage
    referralCode: "", // Optional referral code
  });

  // Calculate expiry date based on days, hours, and minutes
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState("--:--:--");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // Handle different input types
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));

      // Update expiry date if time-related fields change
      if (
        name === "expiryDays" ||
        name === "expiryHours" ||
        name === "expiryMinutes"
      ) {
        updateDateTime();
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Functions to handle time inputs
  const incrementTime = (unit) => {
    const maxValues = {
      expiryDays: 365,
      expiryHours: 23,
      expiryMinutes: 59,
    };

    if (formData[unit] < maxValues[unit]) {
      setFormData((prev) => ({
        ...prev,
        [unit]: prev[unit] + 1,
      }));
      updateDateTime();
    }
  };

  const decrementTime = (unit) => {
    if (formData[unit] > 0) {
      setFormData((prev) => ({
        ...prev,
        [unit]: prev[unit] - 1,
      }));
      updateDateTime();
    }
  };

  const updateTimeInput = (unit, value) => {
    const numValue = parseInt(value) || 0;
    const maxValues = {
      expiryDays: 365,
      expiryHours: 23,
      expiryMinutes: 59,
    };

    setFormData((prev) => ({
      ...prev,
      [unit]: Math.min(Math.max(0, numValue), maxValues[unit]),
    }));

    updateDateTime();
  };

  const updateDateTime = () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + formData.expiryDays);
    newDate.setHours(newDate.getHours() + formData.expiryHours);
    newDate.setMinutes(newDate.getMinutes() + formData.expiryMinutes);
    setExpiryDate(newDate);

    // Calculate time remaining
    const totalSeconds =
      formData.expiryDays * 24 * 60 * 60 +
      formData.expiryHours * 60 * 60 +
      formData.expiryMinutes * 60;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setTimeRemaining(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    );
  };

  const formatDate = () => {
    return expiryDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = () => {
    return expiryDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDirectionChange = (isLong) => {
    setFormData((prev) => ({ ...prev, isLong }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stacksUser) {
      setError("Please connect your wallet first");
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (formData.leverage < 1) {
      setError("Leverage must be at least 1x");
      return;
    }

    // Validate stop loss for long positions
    if (
      formData.isLong &&
      formData.stopLossPrice &&
      parseFloat(formData.stopLossPrice) >= formData.entryPrice
    ) {
      setError(
        "Stop loss price must be lower than entry price for long positions",
      );
      return;
    }

    // Validate stop loss for short positions
    if (
      !formData.isLong &&
      formData.stopLossPrice &&
      parseFloat(formData.stopLossPrice) <= formData.entryPrice
    ) {
      setError(
        "Stop loss price must be higher than entry price for short positions",
      );
      return;
    }

    // Validate take profit for long positions
    if (
      formData.isLong &&
      formData.takeProfitPrice &&
      parseFloat(formData.takeProfitPrice) <= formData.entryPrice
    ) {
      setError(
        "Take profit price must be higher than entry price for long positions",
      );
      return;
    }

    // Validate take profit for short positions
    if (
      !formData.isLong &&
      formData.takeProfitPrice &&
      parseFloat(formData.takeProfitPrice) >= formData.entryPrice
    ) {
      setError(
        "Take profit price must be lower than entry price for short positions",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const newPosition = await createPosition(formData);

      if (onSuccess) {
        onSuccess(newPosition);
      }

      // Reset form or show success message
      setSuccess("Position created successfully!");
      setFormData({
        isLong: true,
        amount: "",
        leverage: 1,
        counterpartyLeverage: 1,
        entryPrice: 67500,
        expiryDays: 7,
        expiryHours: 0,
        expiryMinutes: 0,
        stopLossPrice: "",
        takeProfitPrice: "",
        collateralType: "STX",
        slippageTolerance: 0.5,
        referralCode: "",
      });
      updateDateTime();
    } catch (err) {
      console.error("Failed to create position:", err);
      setError("Failed to create position. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate liquidation price based on direction and leverage
  const calculateLiquidationPrice = () => {
    if (!formData.entryPrice || !formData.leverage) return "N/A";

    const liquidationThreshold = (1 / formData.leverage) * 0.9; // 90% of the leverage threshold

    if (formData.isLong) {
      return (formData.entryPrice * (1 - liquidationThreshold)).toFixed(2);
    } else {
      return (formData.entryPrice * (1 + liquidationThreshold)).toFixed(2);
    }
  };

  // Calculate required margin
  const calculateRequiredMargin = () => {
    if (!formData.amount || !formData.entryPrice || !formData.leverage)
      return 0;

    const positionValue = formData.amount * formData.entryPrice;
    return (positionValue / formData.leverage).toFixed(2);
  };

  // Calculate fees
  const calculateFees = () => {
    if (!formData.amount || !formData.entryPrice) return 0;

    const positionValue = formData.amount * formData.entryPrice;
    return (positionValue * 0.001).toFixed(2); // 0.1% fee
  };

  // Calculate premium
  const calculatePremium = () => {
    if (!formData.amount || !formData.entryPrice || !formData.leverage)
      return 0;

    // Premium calculation based on position size, leverage, and expiry time
    const positionValue = formData.amount * formData.entryPrice;
    const expiryFactor = 1 + (formData.expiryDays / 30) * 0.05; // 5% per month
    const leverageFactor = 1 + (formData.leverage - 1) * 0.02; // 2% per leverage point above 1

    // Premium is higher for longer expiry and higher leverage
    const premium = positionValue * 0.005 * expiryFactor * leverageFactor;
    return premium.toFixed(2);
  };

  // Initialize expiry date when component mounts
  useEffect(() => {
    updateDateTime();
  }, []);

  // Add custom CSS for slider thumbs
  const sliderStyles = `
    .slider-orange::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fc6432;
      cursor: pointer;
      border: 2px solid #fc6432;
    }

    .slider-orange::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fc6432;
      cursor: pointer;
      border: 2px solid #fc6432;
    }

    .slider-orange:focus {
      outline: none;
    }

    .slider-orange::-ms-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fc6432;
      cursor: pointer;
      border: 2px solid #fc6432;
    }
  `;

  return (
    <div className="w-full">
      <style>{sliderStyles}</style>
      <div className="mb-6 text-lg font-semibold text-[#fc6432]">
        CREATE POSITION
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-500 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-900 bg-opacity-30 border border-green-500 text-green-300 rounded-lg">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="md:col-span-2">
          <label className="block text-sm text-neutral-400 mb-2">
            Position Direction
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
                formData.isLong
                  ? "bg-green-900 bg-opacity-30 border border-green-500 text-green-400"
                  : "bg-slate-800 text-gray-400"
              }`}
              onClick={() => handleDirectionChange(true)}
            >
              <TrendingUp size={16} />
              <span>Long</span>
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
                !formData.isLong
                  ? "bg-red-900 bg-opacity-30 border border-red-500 text-red-400"
                  : "bg-slate-800 text-gray-400"
              }`}
              onClick={() => handleDirectionChange(false)}
            >
              <TrendingDown size={16} />
              <span>Short</span>
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-neutral-400 mb-2">
            Position Size (BTC)
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.01"
            step="0.01"
            min="0.001"
            className="w-full p-3 bg-slate-800 border-none rounded-lg text-white"
            required
          />
          <p className="mt-1 text-xs text-neutral-400">Minimum: 0.001 BTC</p>
        </div>

        <div className="md:col-span-2 mt-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm text-neutral-400 mb-2">
                Leverage (x)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  name="leverage"
                  value={formData.leverage}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  step="0.1"
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-orange"
                  style={{
                    WebkitAppearance: "none",
                  }}
                />
                <span className="text-white font-mono w-12 text-center">
                  {formData.leverage}x
                </span>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm text-neutral-400 mb-2">
                Counterparty Leverage (x)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  name="counterpartyLeverage"
                  value={formData.counterpartyLeverage}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  step="0.1"
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-orange"
                  style={{
                    WebkitAppearance: "none",
                  }}
                />
                <span className="text-white font-mono w-12 text-center">
                  {formData.counterpartyLeverage}x
                </span>
              </div>
            </div>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Set the leverage for your position and the counterparty
          </p>
        </div>

        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-2.5">
            <label className="block text-sm text-neutral-400">
              Expires (EDT)
            </label>
            <div className="text-sm text-neutral-400">
              <span>TIME REMAINING: </span>
              <span>{timeRemaining}</span>
            </div>
          </div>
          <div className="flex gap-5 mb-5 max-md:flex-col max-md:gap-2.5">
            <div className="flex-1">
              <div className="text-sm text-neutral-400 mb-1">Days</div>
              <div className="flex overflow-hidden rounded bg-slate-800">
                <button
                  type="button"
                  className="p-3 text-white cursor-pointer border-none bg-slate-800 hover:bg-slate-700"
                  onClick={() => decrementTime("expiryDays")}
                >
                  -
                </button>
                <input
                  type="text"
                  className="flex-1 p-3 text-center text-white bg-slate-800 border-none"
                  value={formData.expiryDays}
                  onChange={(e) =>
                    updateTimeInput("expiryDays", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="p-3 text-white cursor-pointer border-none bg-slate-800 hover:bg-slate-700"
                  onClick={() => incrementTime("expiryDays")}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-neutral-400 mb-1">Hours</div>
              <div className="flex overflow-hidden rounded bg-slate-800">
                <button
                  type="button"
                  className="p-3 text-white cursor-pointer border-none bg-slate-800 hover:bg-slate-700"
                  onClick={() => decrementTime("expiryHours")}
                >
                  -
                </button>
                <input
                  type="text"
                  className="flex-1 p-3 text-center text-white bg-slate-800 border-none"
                  value={formData.expiryHours}
                  onChange={(e) =>
                    updateTimeInput("expiryHours", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="p-3 text-white cursor-pointer border-none bg-slate-800 hover:bg-slate-700"
                  onClick={() => incrementTime("expiryHours")}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-neutral-400 mb-1">Minutes</div>
              <div className="flex overflow-hidden rounded bg-slate-800">
                <button
                  type="button"
                  className="p-3 text-white cursor-pointer border-none bg-slate-800 hover:bg-slate-700"
                  onClick={() => decrementTime("expiryMinutes")}
                >
                  -
                </button>
                <input
                  type="text"
                  className="flex-1 p-3 text-center text-white bg-slate-800 border-none"
                  value={formData.expiryMinutes}
                  onChange={(e) =>
                    updateTimeInput("expiryMinutes", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="p-3 text-white cursor-pointer border-none bg-slate-800 hover:bg-slate-700"
                  onClick={() => incrementTime("expiryMinutes")}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-5 max-md:flex-col max-md:gap-2.5">
            <div className="flex-1 p-3 rounded bg-slate-800">
              <div className="text-sm text-neutral-400 mb-1">Date</div>
              <div className="flex justify-between items-center">
                <span>{formatDate()}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>
            <div className="flex-1 p-3 rounded bg-slate-800">
              <div className="text-sm text-neutral-400 mb-1">Time</div>
              <div className="flex justify-between items-center">
                <span>{formatTime()}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 mt-2">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center justify-between w-full p-3 bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition-colors"
          >
            <span className="font-medium">Advanced Settings</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-300 ${
                showAdvancedSettings ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 overflow-hidden transition-all duration-300 ${
              showAdvancedSettings
                ? "max-h-[500px] opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Stop Loss Price (Optional)
              </label>
              <input
                type="number"
                name="stopLossPrice"
                value={formData.stopLossPrice}
                onChange={handleChange}
                placeholder={
                  formData.isLong
                    ? "Lower than entry price"
                    : "Higher than entry price"
                }
                className="w-full p-3 bg-slate-800 border-none rounded-lg text-white"
              />
              <p className="mt-1 text-xs text-neutral-400">
                {formData.isLong
                  ? "Set a price below entry to limit losses"
                  : "Set a price above entry to limit losses"}
              </p>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Take Profit Price (Optional)
              </label>
              <input
                type="number"
                name="takeProfitPrice"
                value={formData.takeProfitPrice}
                onChange={handleChange}
                placeholder={
                  formData.isLong
                    ? "Higher than entry price"
                    : "Lower than entry price"
                }
                className="w-full p-3 bg-slate-800 border-none rounded-lg text-white"
              />
              <p className="mt-1 text-xs text-neutral-400">
                {formData.isLong
                  ? "Set a price above entry to secure profits"
                  : "Set a price below entry to secure profits"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Collateral Type
          </label>
          <select
            name="collateralType"
            value={formData.collateralType}
            onChange={handleChange}
            className="w-full p-3 bg-slate-800 border-none rounded-lg text-white"
          >
            <option value="STX">STX</option>
            <option value="BTC">BTC</option>
            <option value="USDA">USDA</option>
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Select the asset to use as collateral
          </p>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Slippage Tolerance (%)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              name="slippageTolerance"
              value={formData.slippageTolerance}
              onChange={handleChange}
              min="0.1"
              max="5"
              step="0.1"
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-orange"
              style={{
                WebkitAppearance: "none",
              }}
            />
            <span className="text-white font-mono w-12 text-center">
              {formData.slippageTolerance}%
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Maximum price difference tolerated when executing
          </p>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Referral Code (Optional)
          </label>
          <input
            type="text"
            name="referralCode"
            value={formData.referralCode}
            onChange={handleChange}
            placeholder="Enter referral code"
            className="w-full p-3 bg-slate-800 border-none rounded-lg text-white"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Enter a referral code to earn rewards
          </p>
        </div>

        <div className="md:col-span-2 p-4 bg-slate-900 rounded-lg mt-4">
          <h3 className="text-sm text-neutral-400 mb-3">Position Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-neutral-400">Entry Price</p>
              <p className="text-white">${formData.entryPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Liquidation Price</p>
              <p className="text-white">${calculateLiquidationPrice()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Counterparty Leverage</p>
              <p className="text-white">{formData.counterpartyLeverage}x</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Required Margin</p>
              <p className="text-white">${calculateRequiredMargin()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Fees</p>
              <p className="text-white">${calculateFees()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Premium</p>
              <p className="text-[#fc6432]">${calculatePremium()}</p>
            </div>
            {formData.stopLossPrice && (
              <div>
                <p className="text-xs text-neutral-400">Stop Loss</p>
                <p className="text-red-400">${formData.stopLossPrice}</p>
              </div>
            )}
            {formData.takeProfitPrice && (
              <div>
                <p className="text-xs text-neutral-400">Take Profit</p>
                <p className="text-green-400">${formData.takeProfitPrice}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-400">Collateral</p>
              <p className="text-white">{formData.collateralType}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Slippage</p>
              <p className="text-white">{formData.slippageTolerance}%</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 mt-4">
          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#fc6432] text-white rounded-lg hover:bg-[#ff8a61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !stacksUser}
          >
            {loading ? "Creating Position..." : "Create Position"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreatePosition;
