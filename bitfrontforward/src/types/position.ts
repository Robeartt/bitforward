export interface Position {
  id?: string;
  address?: string;
  amount: number;
  closingBlock?: number;
  long: boolean;
  matched?: string;
  openBlock?: number;
  openValue: number;
  premium: number;
  closedAt?: number;
  closedAtBlock?: number;
  closeTransaction?: {
    txid: string;
  };
  closePrice?: number;
  status: "open" | "closed" | "pending";
}

export interface CreatePositionParams {
  amount: number;
  premium: number;
  long: boolean;
  openValue: number;
}
