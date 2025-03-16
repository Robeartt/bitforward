import React from "react";

interface PremiumInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currency?: string;
}

const PremiumInput: React.FC<PremiumInputProps> = ({
  value,
  onChange,
  currency = "BTC",
}) => {
  return (
    <div className="w-full max-w-xs">
      <label className="block mb-2 text-sm font-medium text-neutral-400">
        Premium Amount
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2 text-white bg-slate-800 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="Enter premium amount"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-500">{currency}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Set the premium amount for your position
      </p>
    </div>
  );
};

export default PremiumInput;
