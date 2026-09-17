export type SpaceKind =
  | "go"
  | "property"
  | "fortune"
  | "chance"
  | "tax"
  | "transit"
  | "utility"
  | "jail"
  | "park"
  | "gotojail";

export type NamedGroupId =
  | "brown"
  | "sky"
  | "rose"
  | "clay"
  | "brick"
  | "sand"
  | "pine"
  | "navy"
  | "amber"
  | "iris"
  | "frost"
  | "plum"
  | "moss"
  | "transit"
  | "utility";

export type GroupId = NamedGroupId | `row-${number}`;

export type TokenId = "ivory" | "rust" | "steel" | "pine" | "clay" | "gold" | "dusk" | "rose" | "navy" | "wine";

export type LogTone = "neutral" | "good" | "bad" | "system";

export type Phase = "awaiting_roll" | "awaiting_action" | "game_over";

export type ActionKind = "none" | "buy" | "jail" | "card";

export type WinReason = "bankrupt";

export type CardDeck = "fortune" | "chance";

export type CardEffect =
  | { type: "money"; amount: number }
  | { type: "goto"; position: number; collectGo: boolean }
  | { type: "jail" }
  | { type: "jailfree" }
  | { type: "back"; steps: number }
  | { type: "nearest"; kind: "transit" | "utility" }
  | { type: "repairs"; perProperty: number }
  | { type: "each"; amount: number };

export interface SpaceDef {
  id: number;
  name: string;
  short: string;
  kind: SpaceKind;
  group?: GroupId;
  price?: number;
  rent?: number;
  tax?: number;
}

export interface CardDef {
  id: string;
  deck: CardDeck;
  text: string;
  effect: CardEffect;
}

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  token: TokenId;
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  jailFree: number;
  bankrupt: boolean;
}

export interface LogEntry {
  id: number;
  text: string;
  tone: LogTone;
}

export interface DrawnCard {
  deck: CardDeck;
  text: string;
  cardId: string;
}

export interface GameState {
  gameId: string;
  players: Player[];
  current: number;
  owners: (string | null)[];
  phase: Phase;
  action: ActionKind;
  card: DrawnCard | null;
  dice: [number, number];
  lastRoll: [number, number];
  doublesStreak: number;
  jackpot: number;
  round: number;
  turnsPlayed: number;
  log: LogEntry[];
  logSeq: number;
  winnerId: string | null;
  winReason: WinReason | null;
  maxRounds: number;
  fortunePile: string[];
  chancePile: string[];
}

export const STARTING_CASH = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_POS = 10;
export const BOARD_SIZE = 40;
export const MAX_ROUNDS = 25;
export const SET_RENT_MULT = 2;
export const GO_UPKEEP = 35;
