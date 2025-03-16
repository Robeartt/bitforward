import React from "react";
import { TimeControlProps } from "./types";

export const TimeControl: React.FC<TimeControlProps> = ({
  label,
  value,
  onIncrement,
  onDecrement,
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow numbers
    if (/^\d*$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex-1">
      <h3>{label}</h3>
      <div className="flex overflow-hidden rounded bg-slate-800">
        <button
          className="p-3 text-white cursor-pointer border-none"
          onClick={onDecrement}
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <input
          type="text"
          className="flex-1 p-3 text-center text-white bg-slate-800 border-none"
          value={value}
          onChange={handleChange}
          aria-label={label}
        />
        <button
          className="p-3 text-white cursor-pointer border-none"
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
};
