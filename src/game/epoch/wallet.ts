import { COSMETIC_SKINS, COSMETIC_THEMES, JOIN_DISCOUNT_MAX } from "./types";

const KEY = "gc-epoch-wallet";
const SKIN_IDS = new Set<string>(COSMETIC_SKINS.map((item) => item.id));
const THEME_IDS = new Set<string>(COSMETIC_THEMES.map((item) => item.id));

export interface EpochWallet {
  marks: number;
  skins: string[];
  themes: string[];
  theme: string;
  skin: string;
}

export function emptyWallet(): EpochWallet {
  return { marks: 0, skins: [], themes: [], theme: "", skin: "" };
}

function cleanList(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.has(item)) continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

export function sanitizeWallet(raw: unknown): EpochWallet {
  const w = emptyWallet();
  if (!raw || typeof raw !== "object") return w;
  const rec = raw as Record<string, unknown>;
  const marks = Number(rec.marks);
  if (Number.isInteger(marks) && marks >= 0 && marks <= 1_000_000_000) w.marks = marks;
  w.skins = cleanList(rec.skins, SKIN_IDS);
  w.themes = cleanList(rec.themes, THEME_IDS);
  if (typeof rec.theme === "string" && THEME_IDS.has(rec.theme) && w.themes.includes(rec.theme)) w.theme = rec.theme;
  if (typeof rec.skin === "string" && SKIN_IDS.has(rec.skin) && w.skins.includes(rec.skin)) w.skin = rec.skin;
  return w;
}

export function loadWallet(): EpochWallet {
  if (typeof window === "undefined") return emptyWallet();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyWallet();
    return sanitizeWallet(JSON.parse(raw) as unknown);
  } catch {
    return emptyWallet();
  }
}

export function saveWallet(wallet: EpochWallet): void {
  if (typeof window === "undefined") return;
  const clean = sanitizeWallet(wallet);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* quota / private mode */
  }
}

export function clampJoinSpend(marks: number, available: number): number {
  if (!Number.isInteger(marks) || marks < 0) return 0;
  return Math.min(JOIN_DISCOUNT_MAX, available, marks);
}
