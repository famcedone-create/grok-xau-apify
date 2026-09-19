export type Side = "buy" | "sell" | "exit" | "mixed" | "none";
export type Bias = "buy" | "sell" | "neutral";
export type ScanSource = "apify";
export type LiveStatus = "pending" | "live" | "unavailable";

export const LIVE_UNAVAILABLE = "DATI LIVE NON DISPONIBILI";

export type RawPost = {
  id: string;
  handle: string;
  name?: string;
  text: string;
  postedAt: string;
  url: string;
  likes?: number;
  avatar?: string;
};

export type ClassifiedPost = RawPost & {
  side: Side;
  isBuy: boolean;
  isSell: boolean;
  isExit: boolean;
  hasTp: boolean;
  tps: number[];
  goldRelated: boolean;
};

export type TpLevel = {
  price: number;
  count: number;
  sides: Array<"buy" | "sell">;
};

export type Snapshot = {
  id: number;
  scannedAt: string;
  source: ScanSource;
  windowMinutes: number;
  buyCount: number;
  sellCount: number;
  exitCount: number;
  tpCount: number;
  totalPosts: number;
  goldPrice: number | null;
  bias: Bias;
  summary: string;
  posts: ClassifiedPost[];
  tps: TpLevel[];
};

export type HistoryPoint = {
  scannedAt: string;
  buyCount: number;
  sellCount: number;
  exitCount: number;
  tpCount: number;
  totalPosts: number;
  goldPrice: number | null;
};

export type GoldQuote = {
  price: number;
  updatedAt: string;
};

export type DeskState = {
  snapshot: Snapshot | null;
  history: HistoryPoint[];
  gold: GoldQuote | null;
  nextScanAt: string;
  minIntervalMs: number;
  lastError: string | null;
  liveStatus: LiveStatus;
};
