"use client";

import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AuthSlot } from "@/components/AuthSlot";
import { remainingMs } from "@/game/epoch/engine";
import { tableSquare } from "@/game/board";
import { useEpochStore } from "@/game/epoch/store";
import { EpochBoard } from "./EpochBoard";
import { EpochLog } from "./EpochLog";
import { EpochPanel } from "./EpochPanel";
import { EpochPlayers } from "./EpochPlayers";
import { EpochRoster } from "./EpochRoster";
import { EpochSeat } from "./EpochSeat";

export function EpochApp() {
  const city = useEpochStore((s) => s.city);
  const now = useEpochStore((s) => s.now);
  const leave = useEpochStore((s) => s.leave);
  const commitRoll = useEpochStore((s) => s.commitRoll);
  const tick = useEpochStore((s) => s.tick);

  useEffect(() => {
    const id = window.setInterval(() => tick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [tick]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!city || city.phase !== "open") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === " " || event.key === "r") {
        event.preventDefault();
        commitRoll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [city, commitRoll]);

  if (!city) return null;
  const you = city.players.find((p) => p.isHuman);
  const left = remainingMs(city, now);
  const square = tableSquare(city.districtTier);

  return (
    <div className="gc-sky relative flex min-h-dvh min-w-0 flex-col overflow-x-clip text-fg">
      <header className="relative z-10 flex min-w-0 items-center justify-between gap-2 border-b border-border bg-bg/70 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="min-w-0">
          <p className="font-display text-base font-medium tracking-tight">Sitizen</p>
          <p className="truncate text-xs text-fg-subtle">
            Computer City · {square.name} · {city.epoch}
            {you ? ` · $${you.cash} · ${you.marks} Mk` : ""}
            {` · ${Math.ceil(left / 1000)}s`}
            {city.districtOpen ? ` · ${40 + 4 * city.districtTier} spaces` : ""}
            {` · ${city.difficulty}`}
            {` · ${city.players.length} seats`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-border bg-bg-elevated px-3 py-1 text-[10px] tracking-[0.16em] text-fg-subtle uppercase sm:inline">
            City mode
          </span>
          <Link to="/litepaper" className="hidden text-xs text-fg-muted hover:text-fg sm:inline">
            Litepaper
          </Link>
          <Link to="/live" className="hidden text-xs text-fg-muted hover:text-fg sm:inline">
            Live
          </Link>
          <AuthSlot />
          <button type="button" onClick={leave} className="min-h-11 px-1 text-xs text-fg-muted hover:text-fg">
            Leave
          </button>
        </div>
      </header>

      <div className="relative z-10 border-b border-border bg-bg/60 px-3 py-2 backdrop-blur-md lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {city.players.slice(0, 8).map((player) => (
            <EpochSeat key={player.id} city={city} player={player} compact />
          ))}
          {city.players.length > 8 && (
            <span className="flex min-h-11 shrink-0 items-center rounded-full border border-border bg-bg-elevated px-3 text-xs text-fg-subtle">
              +{city.players.length - 8}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 mx-auto grid w-full min-w-0 flex-1 grid-cols-1 gap-3 overflow-x-clip px-3 py-3 lg:grid-cols-[15.5rem_minmax(0,1fr)_20rem] lg:items-start lg:gap-4 lg:px-5 lg:py-5">
        <div className="order-2 min-w-0 lg:order-1 lg:flex lg:flex-col lg:gap-3">
          <div className="hidden lg:block">
            <EpochPlayers city={city} />
          </div>
          <div className="hidden lg:block">
            <EpochRoster city={city} />
          </div>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <EpochBoard city={city} />
        </div>

        <aside className="order-3 flex min-w-0 flex-col gap-3 lg:order-3">
          <EpochPanel city={city} />
          <div className="lg:hidden">
            <EpochPlayers city={city} />
          </div>
          <details className="rounded-[var(--radius-md)] border border-border bg-bg-elevated lg:hidden">
            <summary className="min-h-11 cursor-pointer list-none px-3 py-2 text-sm text-fg">
              City deeds
            </summary>
            <div className="border-t border-border p-1">
              <EpochRoster city={city} nested />
            </div>
          </details>
          <EpochLog city={city} />
        </aside>
      </div>
    </div>
  );
}
