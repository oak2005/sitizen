"use client";

import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveCircuitGame } from "@/game/saves";
import { useGameStore } from "@/game/store";
import type { GameState } from "@/game/types";

let persistQueue: Promise<void> = Promise.resolve();

function persist(state: GameState) {
  persistQueue = persistQueue
    .then(() => saveCircuitGame({ data: { state } }))
    .then(() => undefined)
    .catch(() => {
      /* signed out / network — guest play continues */
    });
  return persistQueue;
}

export function SaveBridge() {
  const { user, isPending } = useCurrentUserState();
  const game = useGameStore((s) => s.game);
  const lastRef = useRef<GameState | null>(null);

  useEffect(() => {
    if (lastRef.current && !game && user && !isPending) {
      void persist(lastRef.current);
    }
    lastRef.current = game;
  }, [game, user, isPending]);

  useEffect(() => {
    if (isPending || !user || !game) return;
    const wait = game.phase === "game_over" ? 80 : 900;
    const id = window.setTimeout(() => {
      void persist(game);
    }, wait);
    return () => window.clearTimeout(id);
  }, [user, isPending, game]);

  useEffect(() => {
    if (isPending || !user) return;
    const id = window.setInterval(() => {
      if (lastRef.current) void persist(lastRef.current);
    }, 2500);
    return () => window.clearInterval(id);
  }, [user, isPending]);

  return null;
}