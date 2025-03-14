import React from "react";
import { MarketDataItemProps } from "./types";

export const MarketDataItem: React.FC<MarketDataItemProps> = ({
  label,
  value,
  change,
  isPositive,
}) => {
  return (
    <article className="flex-1 max-md:text-sm max-sm:basis-[45%]">
      <h3 className="mb-1.5 text-sm text-neutral-400">{label}</h3>
      <p className="text-base font-medium">{value}</p>
      {change && (
        <p
          className={isPositive ? "text-green-500" : "text-red-600"}
          aria-label={`${isPositive ? "Increased" : "Decreased"} by ${change}`}
        >
          {change}
        </p>
      )}
    </article>
  );
};
