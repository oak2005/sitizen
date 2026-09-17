"use client";

import { useEffect } from "react";
import { AuthSlot } from "@/components/AuthSlot";
import { currentPlayer } from "@/game/engine";
import { useEpochStore } from "@/game/epoch/store";
import { useGameStore } from "@/game/store";
import { EpochApp } from "./epoch/EpochApp";
import { ActionPanel } from "./ActionPanel";
import { Board } from "./Board";
import { GameOver } from "./GameOver";
import { LogFeed } from "./LogFeed";
import { PlayerList } from "./PlayerList";
import { SaveBridge } from "./SaveBridge";
import { StartScreen } from "./StartScreen";

export function GameApp() {
  const game = useGameStore((s) => s.game);
  const city = useEpochStore((s) => s.city);
  const busy = useGameStore((s) => s.busy);
  const roll = useGameStore((s) => s.roll);
  const buy = useGameStore((s) => s.buy);
  const pass = useGameStore((s) => s.pass);
  const ackCard = useGameStore((s) => s.ackCard);
  const toMenu = useGameStore((s) => s.toMenu);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!game || busy || game.phase === "game_over") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const player = currentPlayer(game);
      if (!player.isHuman) return;
      if ((event.key === " " || event.key === "r") && game.phase === "awaiting_roll") {
        event.preventDefault();
        roll();
      }
      if (event.key === "Enter" && game.action === "buy") buy();
      if (event.key === "p" && game.action === "buy") pass();
      if (event.key === "Enter" && game.action === "card") ackCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, busy, roll, buy, pass, ackCard]);

  if (city) return <EpochApp />;

  if (!game) {
    return (
      <>
        <StartScreen />
        <SaveBridge />
      </>
    );
  }

  const you = game.players.find((p) => p.isHuman);

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-display text-base font-medium tracking-tight">Sitizen</p>
          <p className="text-xs text-fg-subtle">
            Round {game.round}
            {you ? ` · $${you.money}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AuthSlot />
          <button type="button" onClick={toMenu} className="text-xs text-fg-muted hover:text-fg">
            Leave
          </button>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-clip px-3 pb-4 lg:flex-row lg:items-start lg:px-5">
        <div className="min-w-0 flex-1">
          <Board />
        </div>
        <aside className="flex w-full min-w-0 flex-col gap-3 lg:w-80 lg:shrink-0">
          <PlayerList />
          <ActionPanel />
          <LogFeed />
        </aside>
      </div>
      <GameOver />
      <SaveBridge />
    </div>
  );
}
