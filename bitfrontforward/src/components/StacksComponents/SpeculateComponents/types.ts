export type AssetType = "European Currency (EURO)" | "US Dollar (USD)";
export type PremiumType = "Hedge" | "Long" | "Short";

export interface DropdownProps {
  selected: string;
  options: string[];
  label: string;
  sublabel?: string;
  onSelect: (option: string) => void;
}

export interface AmountInputProps {
  label: string;
  value: string;
  currencyCode: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface TimeControlProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (value: string) => void;
}

export interface LeverageSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export interface MarketDataItemProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}
