import { sanitizeName } from "./engine";
import type {
  ActionKind,
  DrawnCard,
  GameState,
  LogEntry,
  LogTone,
  Phase,
  Player,
  TokenId,
  WinReason,
} from "./types";
import { BOARD_SIZE } from "./types";

const TOKENS: TokenId[] = ["ivory", "rust", "steel", "pine"];
const PHASES: Phase[] = ["awaiting_roll", "awaiting_action", "game_over"];
const ACTIONS: ActionKind[] = ["none", "buy", "jail", "card"];
const TONES: LogTone[] = ["neutral", "good", "bad", "system"];
const WIN: WinReason[] = ["bankrupt"];
const MAX_PLAYERS = 4;
const MAX_LOG = 50;
const MAX_JSON = 80_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function asToken(value: unknown, fallback: TokenId): TokenId {
  return TOKENS.includes(value as TokenId) ? (value as TokenId) : fallback;
}

function parsePlayer(raw: unknown, index: number): Player | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.slice(0, 32) : null;
  if (!id) return null;
  const token = asToken(raw.token, TOKENS[Math.min(index, TOKENS.length - 1)]!);
  return {
    id,
    name: sanitizeName(typeof raw.name === "string" ? raw.name : "Player"),
    isHuman: Boolean(raw.isHuman) && index === 0,
    token,
    money: asInt(raw.money, 0, 5_000_000, 0),
    position: asInt(raw.position, 0, BOARD_SIZE - 1, 0),
    inJail: Boolean(raw.inJail),
    jailTurns: asInt(raw.jailTurns, 0, 6, 0),
    jailFree: asInt(raw.jailFree, 0, 8, 0),
    bankrupt: Boolean(raw.bankrupt),
  };
}

function parseLog(raw: unknown): { log: LogEntry[]; logSeq: number } {
  if (!Array.isArray(raw)) return { log: [], logSeq: 1 };
  const log: LogEntry[] = [];
  for (const row of raw.slice(-MAX_LOG)) {
    if (!isRecord(row) || typeof row.text !== "string") continue;
    log.push({
      id: asInt(row.id, 1, 1_000_000, log.length + 1),
      text: row.text.slice(0, 240),
      tone: TONES.includes(row.tone as LogTone) ? (row.tone as LogTone) : "neutral",
    });
  }
  const logSeq = log.reduce((m, e) => Math.max(m, e.id), log.length);
  return { log, logSeq };
}

function parseCard(raw: unknown): DrawnCard | null {
  if (!isRecord(raw)) return null;
  if (raw.deck !== "fortune" && raw.deck !== "chance") return null;
  if (typeof raw.text !== "string" || typeof raw.cardId !== "string") return null;
  return {
    deck: raw.deck,
    text: raw.text.slice(0, 240),
    cardId: raw.cardId.slice(0, 40),
  };
}

/** Rebuild a GameState from untrusted JSON — known fields only. */
export function parseGameState(raw: unknown): GameState {
  if (!isRecord(raw)) throw new Error("Invalid save");
  if (!Array.isArray(raw.players) || raw.players.length < 2 || raw.players.length > MAX_PLAYERS) {
    throw new Error("Invalid save");
  }
  const players: Player[] = [];
  const seen = new Set<string>();
  raw.players.forEach((row, index) => {
    const player = parsePlayer(row, index);
    if (!player) throw new Error("Invalid save");
    if (seen.has(player.id)) throw new Error("Invalid save");
    seen.add(player.id);
    players.push(player);
  });
  if (!players.some((p) => p.isHuman)) throw new Error("Invalid save");

  const ownersRaw = Array.isArray(raw.owners) ? raw.owners : [];
  const owners: (string | null)[] = Array.from({ length: BOARD_SIZE }, (_, i) => {
    const id = ownersRaw[i];
    if (id == null) return null;
    if (typeof id !== "string") return null;
    return seen.has(id) ? id : null;
  });

  const piles = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .filter((id): id is string => typeof id === "string")
          .slice(0, 64)
          .map((id) => id.slice(0, 40))
      : [];

  const { log, logSeq } = parseLog(raw.log);
  const phase = PHASES.includes(raw.phase as Phase) ? (raw.phase as Phase) : "awaiting_roll";
  const action = ACTIONS.includes(raw.action as ActionKind) ? (raw.action as ActionKind) : "none";
  const die = (n: unknown) => asInt(n, 1, 6, 1);
  const current = asInt(raw.current, 0, players.length - 1, 0);
  const rawId = typeof raw.gameId === "string" ? raw.gameId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : "";

  return {
    gameId: rawId.length >= 8 ? rawId : "legacy",
    players,
    current,
    owners,
    phase,
    action: phase === "game_over" ? "none" : action,
    card: parseCard(raw.card),
    dice: [die(Array.isArray(raw.dice) ? raw.dice[0] : 1), die(Array.isArray(raw.dice) ? raw.dice[1] : 1)],
    lastRoll: [
      asInt(Array.isArray(raw.lastRoll) ? raw.lastRoll[0] : 0, 0, 6, 0),
      asInt(Array.isArray(raw.lastRoll) ? raw.lastRoll[1] : 0, 0, 6, 0),
    ],
    doublesStreak: asInt(raw.doublesStreak, 0, 3, 0),
    jackpot: asInt(raw.jackpot, 0, 5_000_000, 0),
    round: asInt(raw.round, 1, 10_000, 1),
    turnsPlayed: asInt(raw.turnsPlayed, 0, 100_000, 0),
    log,
    logSeq,
    winnerId: typeof raw.winnerId === "string" && seen.has(raw.winnerId) ? raw.winnerId : null,
    winReason: WIN.includes(raw.winReason as WinReason) ? (raw.winReason as WinReason) : null,
    maxRounds: 0,
    fortunePile: piles(raw.fortunePile),
    chancePile: piles(raw.chancePile),
  };
}

export function serializeGameState(state: GameState): string {
  const trimmed: GameState = {
    ...state,
    log: state.log.slice(-MAX_LOG),
    players: state.players.map((p) => ({ ...p, name: sanitizeName(p.name) })),
  };
  const json = JSON.stringify(trimmed);
  if (json.length > MAX_JSON) throw new Error("Save too large");
  return json;
}

export function parseStoredState(raw: unknown): GameState {
  if (typeof raw === "string") {
    if (raw.length > MAX_JSON) throw new Error("Save too large");
    return parseGameState(JSON.parse(raw) as unknown);
  }
  return parseGameState(raw);
}
