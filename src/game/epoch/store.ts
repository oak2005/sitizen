import { create } from "zustand";
import {
  commitHuman,
  createCity,
  createOffer as createOfferFn,
  jumpCity,
  remainingMs,
  queueBuild as queueBuildFn,
  respondOffer as respondOfferFn,
  sellDeed as sellDeedFn,
  settleEpoch,
  spendBail as spendBailFn,
  toggleClaim as toggleClaimFn,
  unlockCosmetic as unlockCosmeticFn,
} from "./engine";
import { clampJoinSpend, loadWallet, saveWallet, type EpochWallet } from "./wallet";
import { LAND_EPOCH, MAX_EXPANSIONS, DEMO_EPOCH_MS, type BotDifficulty, type EpochCity, type OfferDecision } from "./types";

function rollDice(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

function persistFromCity(city: EpochCity): void {
  const you = city.players.find((p) => p.isHuman);
  const wallet: EpochWallet = {
    marks: Math.max(0, you?.marks ?? 0),
    skins: city.unlockedSkins.slice(),
    themes: city.unlockedThemes.slice(),
    theme: city.boardTheme,
    skin: you?.pawnSkin ?? "",
  };
  saveWallet(wallet);
}

type EpochStore = {
  city: EpochCity | null;
  selected: number | null;
  now: number;
  startCity: (name: string, botCount: 2 | 3, difficulty?: BotDifficulty, joinMarks?: number) => void;
  leave: () => void;
  select: (id: number | null) => void;
  commitRoll: () => void;
  commitPass: () => void;
  toggleBuild: (spaceId: number) => void;
  toggleClaim: () => void;
  sellDeed: (spaceId: number) => void;
  offerBuy: (spaceId: number, price: number) => void;
  respondOffer: (offerId: string, decision: OfferDecision) => void;
  spendBail: () => void;
  unlockCosmetic: (kind: "skin" | "theme", id: string) => void;
  tick: (now: number) => void;
  previewBand: (tier: number) => void;
};

export const useEpochStore = create<EpochStore>((set, get) => ({
  city: null,
  selected: null,
  now: Date.now(),
  startCity: (name, botCount, difficulty = "easy", joinMarks = 0) => {
    const wallet = loadWallet();
    const spend = clampJoinSpend(joinMarks, wallet.marks);
    wallet.marks -= spend;
    saveWallet(wallet);
    set({
      city: createCity({
        humanName: name,
        botCount,
        now: Date.now(),
        difficulty,
        joinMarks: spend,
        startingMarks: wallet.marks,
        theme: wallet.theme,
        skin: wallet.skin,
        unlockedSkins: wallet.skins,
        unlockedThemes: wallet.themes,
      }),
      selected: null,
      now: Date.now(),
    });
  },
  leave: () => {
    const { city } = get();
    if (city) persistFromCity(city);
    set({ city: null, selected: null });
  },
  select: (id) => set({ selected: id }),
  commitRoll: () => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    const withIntent = commitHuman(city, { kind: "roll", dice: rollDice() });
    const next = settleEpoch(withIntent, Math.random, Date.now());
    persistFromCity(next);
    set({ city: next, now: Date.now() });
  },
  commitPass: () => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    const withIntent = commitHuman(city, { kind: "pass", dice: null });
    const next = settleEpoch(withIntent, Math.random, Date.now());
    persistFromCity(next);
    set({ city: next, now: Date.now() });
  },
  toggleBuild: (spaceId) => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    set({ city: queueBuildFn(city, spaceId) });
  },
  toggleClaim: () => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    set({ city: toggleClaimFn(city) });
  },
  sellDeed: (spaceId) => {
    const { city } = get();
    if (!city) return;
    set({ city: sellDeedFn(city, spaceId), selected: null });
  },
  offerBuy: (spaceId, price) => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    set({ city: createOfferFn(city, spaceId, price) });
  },
  respondOffer: (offerId, decision) => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    set({ city: respondOfferFn(city, offerId, decision) });
  },
  spendBail: () => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    const next = spendBailFn(city);
    persistFromCity(next);
    set({ city: next });
  },
  unlockCosmetic: (kind, id) => {
    const { city } = get();
    if (!city || city.phase !== "open") return;
    if (kind !== "skin" && kind !== "theme") return;
    if (typeof id !== "string") return;
    const next = unlockCosmeticFn(city, kind, id);
    persistFromCity(next);
    set({ city: next });
  },
  tick: (now) => {
    const { city } = get();
    if (!city || city.phase !== "open") {
      set({ now });
      return;
    }
    if (remainingMs(city, now) > 0) {
      set({ now });
      return;
    }
    const next = settleEpoch(commitHuman(city, { kind: "pass", dice: null }), Math.random, now);
    persistFromCity(next);
    set({ city: next, now });
  },
  previewBand: (tier) => {
    const t = Math.floor(Number(tier));
    if (!Number.isInteger(t) || t < 0 || t > MAX_EXPANSIONS) return;
    const epoch = t === 0 ? 1 : t * LAND_EPOCH + 1;
    const current = get().city;
    const human = current?.players.find((p) => p.isHuman);
    const bots: 2 | 3 = current?.originSeats === 3 ? 2 : 3;
    const base = createCity({
      humanName: human?.name || "You",
      botCount: bots,
      now: Date.now(),
      difficulty: current?.difficulty ?? "easy",
    });
    const next = t === 0 ? base : jumpCity(base, epoch, Date.now());
    set({ city: next, selected: null, now: Date.now() });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("gc-table-band", (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (typeof detail !== "number" || !Number.isInteger(detail)) return;
    useEpochStore.getState().previewBand(detail);
  });
}

export { DEMO_EPOCH_MS };
