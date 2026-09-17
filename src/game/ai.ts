import { spaceAt } from "./board";
import { currentPlayer, ownedCount, wouldCompleteSet } from "./engine";
import { JAIL_FINE, type GameState } from "./types";

export type JailChoice = "pay" | "roll" | "card";

export function shouldBuy(state: GameState, rng: () => number = Math.random): boolean {
  const player = currentPlayer(state);
  const space = spaceAt(player.position);
  const price = space.price ?? 0;
  if (price <= 0 || player.money < price) return false;
  const remaining = player.money - price;
  if (remaining < 80) return false;
  if (wouldCompleteSet(state, player.id, space.id) && remaining >= 50) return true;
  if (space.kind === "transit" && remaining >= 150) return rng() > 0.2;
  if (space.kind === "utility") return remaining >= 200 && rng() > 0.35;
  if (price >= 350) return remaining >= 350 && rng() > 0.4;
  if (price <= 120) return remaining >= 100 && rng() > 0.15;
  return remaining >= 180 && rng() > 0.28;
}

export function jailDecision(state: GameState): JailChoice {
  const player = currentPlayer(state);
  if (player.jailFree > 0 && player.jailTurns >= 1) return "card";
  const deeds = ownedCount(state, player.id);
  if (player.jailTurns >= 3) {
    return player.money >= JAIL_FINE ? "pay" : "roll";
  }
  if (deeds >= 4 && player.money > 220) return "pay";
  if (player.money < JAIL_FINE + 40) return "roll";
  return "roll";
}
