import type { TokenId } from "../types";

export type BotDifficulty = "easy" | "hard";

export type EpochPhase = "open" | "settling";

export type EpochIntentKind = "roll" | "pass" | "idle";

export type OfferDecision = "accept" | "decline";

export interface EpochIntent {
  kind: EpochIntentKind;
  dice: [number, number] | null;
  claim: boolean;
  builds: number[];
  offerResponses: Record<string, OfferDecision>;
}

export interface EpochPlayer {
  id: string;
  name: string;
  isHuman: boolean;
  token: TokenId;
  cash: number;
  marks: number;
  position: number;
  inJail: boolean;
  lien: number;
  rentCycle: number;
  lienStreak: number;
  pawnSkin: string | null;
  bondReady: boolean;
}

export interface Deed {
  spaceId: number;
  tokenId: string;
  ownerId: string;
  houses: number;
}

export interface Claim {
  playerId: string;
  spaceId: number;
  epoch: number;
}

export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  spaceId: number;
  price: number;
  createdEpoch: number;
}

export interface EpochLog {
  id: number;
  text: string;
  tone: "neutral" | "good" | "bad" | "system";
}

export interface EpochMetric {
  epoch: number;
  cashMinted: number;
  cashBurned: number;
  marksMinted: number;
  marksBurned: number;
  opsPool: number;
  communityPool: number;
  gini: number;
  lienSeats: number;
  lienStreakMax: number;
  amnestyPaid: number;
  lienRecovered: number;
}

export interface EpochCity {
  cityId: string;
  epoch: number;
  phase: EpochPhase;
  openedAt: number;
  players: EpochPlayer[];
  deeds: Deed[];
  claims: Claim[];
  offers: TradeOffer[];
  intents: Record<string, EpochIntent>;
  treasury: number;
  opsPool: number;
  communityPool: number;
  lastPayoutEpoch: number;
  jackpot: number;
  districtOpen: boolean;
  districtTier: number;
  originSeats: number;
  difficulty: BotDifficulty;
  log: EpochLog[];
  logSeq: number;
  offerSeq: number;
  dice: [number, number];
  lastSettled: number;
  boardTheme: string;
  unlockedSkins: string[];
  unlockedThemes: string[];
  metrics: EpochMetric[];
  epochCashMinted: number;
  epochCashBurned: number;
  epochMarksMinted: number;
  epochMarksBurned: number;
}

export const JOIN_FEE = 200;
export const PROTOCOL_TAX = 0.05;
export const MARKS_PER_GO = 15;
export const DEMO_EPOCH_MS = 40_000;
export const REAL_EPOCH_HOURS = 6;
export const MAX_HOUSES = 5;
export const HOUSE_MULT = [1, 3, 6, 10, 16, 25] as const;
export const SALVAGE = 0.7;
export const STARTING_CASH = 1500;
export const BUILD_COST_RATIO = 0.45;
export const TIER_EPOCH = 10;
export const LAND_EPOCH = 100;
export const MAX_EPOCH = 5000;
export const MAX_EXPANSIONS = 50;
export const MAX_SEAT_WAVES = 500;

export const OPS_SHARE = 0.6;
export const COMMUNITY_SHARE = 0.4;
export const PAYOUT_EVERY = 20;
export const PAYOUT_SHARE = 0.25;
export const PAYOUT_SPLIT = [0.5, 0.3, 0.2] as const;
export const PAYOUT_MIN = 80;

export const BAIL_MARKS = 40;
export const BAIL_CAP = 200;

export const JOIN_MARK_VALUE = 1;
export const JOIN_DISCOUNT_MAX = 100;
export const JOIN_FEE_FLOOR = 100;

export const AMNESTY_STREAK = 5;
export const AMNESTY_PCT = 0.3;

/** Live City SITZ token. Never pays rent. Never rewrites printed cash prices. */
export const TOKEN_TAX = 0.05;
export const TOKEN_YIELD_SHARE = 0.4;
export const TOKEN_OPS_SHARE = 0.25;
export const TOKEN_COMMUNITY_SHARE = 0.2;
export const TOKEN_BURN_SHARE = 0.15;
export const TOKEN_LISTING_FEE = 0.025;
export const TOKEN_YIELD_MIN = 10;

/** Live City (testnet/mainnet). Computer City still uses JOIN_FEE cash units. */
export const LIVE_JOIN_STX = 50;
export const LIVE_HUMANS_PER_DISTRICT = 8;

export const COSMETIC_SKINS = [
  { id: "gilt", label: "Gilt pawn", cost: 60 },
  { id: "onyx", label: "Onyx pawn", cost: 60 },
  { id: "jade", label: "Jade pawn", cost: 80 },
] as const;

export const COSMETIC_THEMES = [
  { id: "slate", label: "Slate felt", cost: 80 },
  { id: "dusk", label: "Dusk felt", cost: 80 },
  { id: "brass", label: "Brass rail", cost: 100 },
] as const;

export type CosmeticSkinId = (typeof COSMETIC_SKINS)[number]["id"];
export type CosmeticThemeId = (typeof COSMETIC_THEMES)[number]["id"];

export function tableBand(tier: number): { from: number; to: number; spaces: number } {
  const t = Math.max(0, Math.min(MAX_EXPANSIONS, Math.floor(tier)));
  return {
    from: t === 0 ? 1 : t * LAND_EPOCH,
    to: Math.min(MAX_EPOCH, (t + 1) * LAND_EPOCH),
    spaces: 40 + 4 * t,
  };
}
