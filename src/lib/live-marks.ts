import {
  BAIL_MARKS,
  COSMETIC_SKINS,
  COSMETIC_THEMES,
  MARKS_PER_GO,
  type CosmeticSkinId,
  type CosmeticThemeId,
} from "@/game/epoch/types";

const PREFIX = "sitizen-marks-v1:";
const SKIN_IDS = new Set<string>(COSMETIC_SKINS.map((item) => item.id));
const THEME_IDS = new Set<string>(COSMETIC_THEMES.map((item) => item.id));

export type LiveMarks = {
  address: string;
  marks: number;
  minted: number;
  burned: number;
  skins: string[];
  themes: string[];
  skin: string;
  theme: string;
  bondReady: boolean;
};

export function emptyMarks(address = ""): LiveMarks {
  return { address, marks: 0, minted: 0, burned: 0, skins: [], themes: [], skin: "", theme: "", bondReady: false };
}

function key(address: string): string {
  return `${PREFIX}${address}`;
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

export function sanitizeMarks(raw: unknown, address: string): LiveMarks {
  const w = emptyMarks(address);
  if (!raw || typeof raw !== "object") return w;
  const rec = raw as Record<string, unknown>;
  const marks = Number(rec.marks);
  if (Number.isInteger(marks) && marks >= 0 && marks <= 1_000_000_000) w.marks = marks;
  const minted = Number(rec.minted);
  if (Number.isInteger(minted) && minted >= 0) w.minted = minted;
  const burned = Number(rec.burned);
  if (Number.isInteger(burned) && burned >= 0) w.burned = burned;
  w.skins = cleanList(rec.skins, SKIN_IDS);
  w.themes = cleanList(rec.themes, THEME_IDS);
  if (typeof rec.skin === "string" && SKIN_IDS.has(rec.skin) && w.skins.includes(rec.skin)) w.skin = rec.skin;
  if (typeof rec.theme === "string" && THEME_IDS.has(rec.theme) && w.themes.includes(rec.theme)) w.theme = rec.theme;
  w.bondReady = rec.bondReady === true;
  return w;
}

export function loadMarks(address: string): LiveMarks {
  if (typeof window === "undefined" || !address) return emptyMarks(address);
  try {
    const raw = window.localStorage.getItem(key(address));
    if (!raw) return emptyMarks(address);
    return sanitizeMarks(JSON.parse(raw) as unknown, address);
  } catch {
    return emptyMarks(address);
  }
}

export function saveMarks(wallet: LiveMarks): void {
  if (typeof window === "undefined" || !wallet.address) return;
  try {
    window.localStorage.setItem(key(wallet.address), JSON.stringify(sanitizeMarks(wallet, wallet.address)));
  } catch {
    /* private mode */
  }
}

export function grantGoMarks(wallet: LiveMarks): LiveMarks {
  const next = { ...wallet, marks: wallet.marks + MARKS_PER_GO, minted: wallet.minted + MARKS_PER_GO };
  saveMarks(next);
  return next;
}

export function spendBail(wallet: LiveMarks): { ok: boolean; next: LiveMarks; note: string } {
  if (wallet.bondReady) return { ok: false, next: wallet, note: "Bail bond already prepaid." };
  if (wallet.marks < BAIL_MARKS) {
    return { ok: false, next: wallet, note: `Need ${BAIL_MARKS} Marks for a bail bond.` };
  }
  const next = {
    ...wallet,
    marks: wallet.marks - BAIL_MARKS,
    burned: wallet.burned + BAIL_MARKS,
    bondReady: true,
  };
  saveMarks(next);
  return {
    ok: true,
    next,
    note: `Spent ${BAIL_MARKS} Marks. Bond is standing only — on-chain liens still need STX amnesty. Rent math unchanged.`,
  };
}

export function unlockCosmetic(
  wallet: LiveMarks,
  kind: "skin" | "theme",
  id: string,
): { ok: boolean; next: LiveMarks; note: string } {
  const catalog = kind === "skin" ? COSMETIC_SKINS : COSMETIC_THEMES;
  const item = catalog.find((row) => row.id === id);
  if (!item) return { ok: false, next: wallet, note: "Unknown cosmetic." };
  const owned = kind === "skin" ? wallet.skins : wallet.themes;
  if (owned.includes(item.id)) {
    const next =
      kind === "skin" ? { ...wallet, skin: item.id } : { ...wallet, theme: item.id };
    saveMarks(next);
    return { ok: true, next, note: `Equipped ${item.label}. No rent effect.` };
  }
  if (wallet.marks < item.cost) {
    return { ok: false, next: wallet, note: `Need ${item.cost} Marks for ${item.label}.` };
  }
  const next: LiveMarks =
    kind === "skin"
      ? {
          ...wallet,
          marks: wallet.marks - item.cost,
          burned: wallet.burned + item.cost,
          skins: [...wallet.skins, item.id],
          skin: item.id,
        }
      : {
          ...wallet,
          marks: wallet.marks - item.cost,
          burned: wallet.burned + item.cost,
          themes: [...wallet.themes, item.id],
          theme: item.id,
        };
  saveMarks(next);
  return { ok: true, next, note: `Unlocked ${item.label}. Cosmetics never change rent or house cost.` };
}

export function wrappedGo(from: number, steps: number, loop: number): boolean {
  if (!Number.isInteger(from) || !Number.isInteger(steps) || !Number.isInteger(loop) || loop <= 0) return false;
  return from + steps >= loop;
}

export type { CosmeticSkinId, CosmeticThemeId };
