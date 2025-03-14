import React from "react";
import { AmountInputProps } from "./types";

export const AmountInput: React.FC<AmountInputProps> = ({
  label,
  value,
  currencyCode,
  onChange,
  placeholder = "0",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow numbers and decimal points
    if (/^\d*\.?\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex-1">
      <h3 className="mb-1.5 text-sm text-neutral-400">{label}</h3>
      <input
        className="p-3 w-full text-base text-white rounded bg-slate-800 border-none"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        aria-label={label}
      />
      <p className="mt-1.5 text-sm text-neutral-400">{currencyCode}</p>
    </div>
  );
};
