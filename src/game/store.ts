import { create } from "zustand";
import { jailDecision, shouldBuy } from "./ai";
import { playBad, playCash, playDice, playTick, unlockAudio } from "./audio";
import {
  acknowledgeCard,
  applyRoll,
  buyProperty,
  createGame,
  currentPlayer,
  declineBuy,
  jailPay,
  jailRoll,
  jailUseCard,
  resolveLanding,
  rollDice,
  stepForward,
} from "./engine";
import type { GameState } from "./types";

const BOT_THINK_MS = 520;
const STEP_MS = 90;
const ROLL_MS = 620;

function delay(ms: number): Promise<void> {
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = reduced ? Math.min(40, ms) : ms;
  return new Promise((resolve) => {
    window.setTimeout(resolve, wait);
  });
}

type Store = {
  game: GameState | null;
  busy: boolean;
  rolling: boolean;
  selected: number | null;
  startGame: (name: string, botCount: 2 | 3) => void;
  resumeGame: (game: GameState) => void;
  toMenu: () => void;
  select: (id: number | null) => void;
  roll: () => void;
  buy: () => void;
  pass: () => void;
  jailPay: () => void;
  jailRoll: () => void;
  jailCard: () => void;
  ackCard: () => void;
};

let runId = 0;

export const useGameStore = create<Store>((set, get) => {
  const commit = (game: GameState, extra?: Partial<Store>) => {
    set({ game, ...extra });
  };

  const animateSteps = async (steps: number, generation: number): Promise<void> => {
    for (let i = 0; i < steps; i++) {
      if (generation !== runId) return;
      const game = get().game;
      if (!game) return;
      commit(stepForward(game));
      playTick();
      await delay(STEP_MS);
    }
  };

  const afterMove = async (generation: number): Promise<void> => {
    if (generation !== runId) return;
    const game = get().game;
    if (!game) return;
    const next = resolveLanding(game, Math.random);
    commit(next);
    const last = next.log[next.log.length - 1];
    if (last?.tone === "good") playCash();
    if (last?.tone === "bad") playBad();
    await botLoop(generation);
  };

  const performMove = async (steps: number, generation: number): Promise<void> => {
    await animateSteps(steps, generation);
    await afterMove(generation);
  };

  const botLoop = async (generation: number): Promise<void> => {
    while (generation === runId) {
      const game = get().game;
      if (!game || game.phase === "game_over") {
        set({ busy: false, rolling: false });
        return;
      }
      const player = currentPlayer(game);
      if (player.isHuman) {
        set({ busy: false, rolling: false });
        return;
      }
      set({ busy: true });
      await delay(BOT_THINK_MS);
      if (generation !== runId) return;
      const latest = get().game;
      if (!latest || latest.phase === "game_over") continue;
      if (currentPlayer(latest).isHuman) {
        set({ busy: false });
        return;
      }
      if (latest.phase === "awaiting_roll") {
        await doRoll(generation, false);
        continue;
      }
      if (latest.action === "buy") {
        const buy = shouldBuy(latest, Math.random);
        commit(buy ? buyProperty(latest) : declineBuy(latest));
        if (buy) playCash();
        continue;
      }
      if (latest.action === "card") {
        await delay(640);
        if (generation !== runId) return;
        const g = get().game;
        if (!g) return;
        commit(acknowledgeCard(g, Math.random));
        continue;
      }
      if (latest.action === "jail") {
        const choice = jailDecision(latest);
        if (choice === "card") {
          commit(jailUseCard(latest));
          continue;
        }
        if (choice === "pay") {
          commit(jailPay(latest));
          continue;
        }
        await doJailRoll(generation);
        continue;
      }
      set({ busy: false });
      return;
    }
  };

  const doRoll = async (generation: number, human: boolean): Promise<void> => {
    const game = get().game;
    if (!game || game.phase !== "awaiting_roll") return;
    if (human && !currentPlayer(game).isHuman) return;
    set({ rolling: true, busy: true });
    playDice();
    await delay(ROLL_MS);
    if (generation !== runId) return;
    const latest = get().game;
    if (!latest) return;
    const dice = rollDice(Math.random);
    const result = applyRoll(latest, dice);
    commit(result.state, { rolling: false });
    if (result.kind === "jail") {
      playBad();
      await botLoop(generation);
      return;
    }
    await performMove(result.steps, generation);
  };

  const doJailRoll = async (generation: number): Promise<void> => {
    const game = get().game;
    if (!game || game.action !== "jail") return;
    set({ rolling: true, busy: true });
    playDice();
    await delay(ROLL_MS);
    if (generation !== runId) return;
    const latest = get().game;
    if (!latest) return;
    const dice = rollDice(Math.random);
    const result = jailRoll(latest, dice);
    commit(result.state, { rolling: false });
    if (result.kind === "move") {
      await performMove(result.steps, generation);
      return;
    }
    await botLoop(generation);
  };

  return {
    game: null,
    busy: false,
    rolling: false,
    selected: null,
    startGame: (name, botCount) => {
      unlockAudio();
      runId += 1;
      const game = createGame({ humanName: name, botCount });
      set({ game, busy: false, rolling: false, selected: null });
    },
    resumeGame: (game) => {
      unlockAudio();
      runId += 1;
      set({ game, busy: false, rolling: false, selected: null });
      if (game.phase !== "game_over") {
        const player = currentPlayer(game);
        if (!player.isHuman) void botLoop(runId);
      }
    },
    toMenu: () => {
      runId += 1;
      set({ game: null, busy: false, rolling: false, selected: null });
    },
    select: (id) => set({ selected: id }),
    roll: () => {
      const { game, busy } = get();
      if (!game || busy || game.phase !== "awaiting_roll") return;
      if (!currentPlayer(game).isHuman) return;
      const generation = runId;
      void doRoll(generation, true);
    },
    buy: () => {
      const { game, busy } = get();
      if (!game || busy || game.action !== "buy") return;
      if (!currentPlayer(game).isHuman) return;
      commit(buyProperty(game));
      playCash();
      void botLoop(runId);
    },
    pass: () => {
      const { game, busy } = get();
      if (!game || busy || game.action !== "buy") return;
      if (!currentPlayer(game).isHuman) return;
      commit(declineBuy(game));
      void botLoop(runId);
    },
    jailPay: () => {
      const { game, busy } = get();
      if (!game || busy || game.action !== "jail") return;
      if (!currentPlayer(game).isHuman) return;
      commit(jailPay(game));
      void botLoop(runId);
    },
    jailRoll: () => {
      const { game, busy } = get();
      if (!game || busy || game.action !== "jail") return;
      if (!currentPlayer(game).isHuman) return;
      void doJailRoll(runId);
    },
    jailCard: () => {
      const { game, busy } = get();
      if (!game || busy || game.action !== "jail") return;
      if (!currentPlayer(game).isHuman) return;
      commit(jailUseCard(game));
      void botLoop(runId);
    },
    ackCard: () => {
      const { game, busy } = get();
      if (!game || busy || game.action !== "card") return;
      if (!currentPlayer(game).isHuman) return;
      commit(acknowledgeCard(game, Math.random));
      void botLoop(runId);
    },
  };
});
