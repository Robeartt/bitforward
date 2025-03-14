import { useState, useEffect } from "react";

interface UsePremiumOptions {
  initialValue?: string;
  minValue?: number;
  maxValue?: number;
}

export const usePremium = (options: UsePremiumOptions = {}) => {
  const {
    initialValue = "0.00",
    minValue = 0,
    maxValue = Number.MAX_SAFE_INTEGER,
  } = options;

  const [premiumAmount, setPremiumAmount] = useState<string>(initialValue);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handlePremiumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal points
    const value = e.target.value.replace(/[^0-9.]/g, "");

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return;
    }

    setPremiumAmount(value);
  };

  useEffect(() => {
    const numValue = parseFloat(premiumAmount);

    if (isNaN(numValue)) {
      setIsValid(false);
      setErrorMessage("Please enter a valid number");
    } else if (numValue < minValue) {
      setIsValid(false);
      setErrorMessage(`Minimum premium is ${minValue}`);
    } else if (numValue > maxValue) {
      setIsValid(false);
      setErrorMessage(`Maximum premium is ${maxValue}`);
    } else {
      setIsValid(true);
      setErrorMessage("");
    }
  }, [premiumAmount, minValue, maxValue]);

  return {
    premiumAmount,
    setPremiumAmount,
    handlePremiumChange,
    isValid,
    errorMessage,
    premiumValue: parseFloat(premiumAmount) || 0,
  };
};

export default usePremium;
