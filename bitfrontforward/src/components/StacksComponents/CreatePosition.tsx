import React, { useState } from "react";
import PremiumInput from "./PremiumInput";

interface CreatePositionProps {
  onCreatePosition?: (premiumAmount: string) => void;
}

const CreatePosition: React.FC<CreatePositionProps> = ({
  onCreatePosition,
}) => {
  const [premiumAmount, setPremiumAmount] = useState<string>("0.00");

  const handlePremiumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal points
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setPremiumAmount(value);
  };

  const handleCreatePosition = () => {
    if (onCreatePosition) {
      onCreatePosition(premiumAmount);
    }
  };

  return (
    <div className="p-6 mb-5 rounded-xl border border-solid backdrop-blur-[10px] bg-slate-950 bg-opacity-50 border-orange-500 border-opacity-20">
      <div className="mb-6 text-lg font-semibold tracking-wide text-orange-500">
        <p className="text-orange-500">CREATE POSITION</p>
      </div>
      <div className="flex flex-col items-center px-0 py-6">
        <div className="mb-4 text-base text-center text-neutral-400">
          <p>Configure your position settings</p>
        </div>

        {/* Premium Amount Input */}
        <div className="w-full max-w-md mb-6">
          <PremiumInput value={premiumAmount} onChange={handlePremiumChange} />
        </div>

        <div className="mb-5 text-sm text-gray-500">
          Create a new position to start trading
        </div>

        <button
          onClick={handleCreatePosition}
          className="px-6 py-3 text-center text-white bg-orange-500 rounded-lg transition-all cursor-pointer duration-[0.2s] ease-[ease] hover:bg-orange-600"
        >
          CREATE NEW POSITION
        </button>
      </div>
    </div>
  );
};

export default CreatePosition;
