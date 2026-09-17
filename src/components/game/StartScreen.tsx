"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { listCircuitHistory, loadActiveCircuit, type HistoryItem } from "@/game/saves";
import { useEpochStore } from "@/game/epoch/store";
import { useGameStore } from "@/game/store";
import { AuthSlot } from "@/components/AuthSlot";
import type { BotDifficulty } from "@/game/epoch/types";
import { JOIN_DISCOUNT_MAX, JOIN_FEE, JOIN_FEE_FLOOR } from "@/game/epoch/types";
import { joinFeeFor } from "@/game/epoch/engine";
import { loadWallet } from "@/game/epoch/wallet";

type PlayMode = "table" | "epoch";

export function StartScreen() {
  const user = useCurrentUser();
  const { isPending } = useCurrentUserState();
  const startGame = useGameStore((s) => s.startGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const startCity = useEpochStore((s) => s.startCity);
  const [mode, setMode] = useState<PlayMode>("epoch");
  const [name, setName] = useState("");
  const [bots, setBots] = useState<2 | 3>(3);
  const [difficulty, setDifficulty] = useState<BotDifficulty>("easy");
  const [joinMarks, setJoinMarks] = useState(0);
  const [walletMarks, setWalletMarks] = useState(0);
  const [rules, setRules] = useState(false);
  const [active, setActive] = useState<{ updatedAt: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingSave, setLoadingSave] = useState(false);
  const resolved = name.trim() || user?.displayName || "You";
  const maxJoinSpend = Math.min(JOIN_DISCOUNT_MAX, walletMarks);
  const joinQuote = joinFeeFor(Math.min(joinMarks, maxJoinSpend));

  useEffect(() => {
    setWalletMarks(loadWallet().marks);
  }, []);

  useEffect(() => {
    if (isPending || !user) {
      setActive(null);
      setHistory([]);
      return;
    }
    let cancelled = false;
    const load = () =>
      Promise.all([loadActiveCircuit(), listCircuitHistory()])
        .then(([saved, rows]) => {
          if (cancelled) return;
          setActive(saved ? { updatedAt: saved.updatedAt } : null);
          setHistory(rows);
        })
        .catch(() => {
          /* keep the last successful load */
        });
    void load();
    const retryA = window.setTimeout(load, 700);
    const retryB = window.setTimeout(load, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(retryA);
      window.clearTimeout(retryB);
    };
  }, [user, isPending]);

  async function continueSaved() {
    setLoadingSave(true);
    try {
      const saved = await loadActiveCircuit();
      if (saved) {
        useEpochStore.getState().leave();
        resumeGame(saved.state);
      }
    } catch {
      setActive(null);
    } finally {
      setLoadingSave(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-[11px] tracking-[0.22em] text-fg-subtle uppercase">
            {mode === "epoch" ? "Computer City · preview" : "Table Circuit · 1.0.1"}
          </p>
          <NetworkBadge />
          <Link to="/live" className="text-xs text-fg-muted hover:text-fg">
            Live City
          </Link>
        </div>
        <AuthSlot />
      </header>

      <div className="flex flex-1 flex-col justify-center py-8">
        <div className="mb-8 flex justify-center">
          <MiniBoard />
        </div>
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Sitizen</h1>
        <p className="mt-3 max-w-md text-base text-fg-muted">
          {mode === "epoch"
            ? "You buy lots yourself. Offers wait a full epoch. Every 100 epochs a new square is laid that holds every previous lot and house, plus a new colour row and its utility on that same table. Never a side lane."
            : "Buy the block. Collect rent. Outlast the table. One human against computer tycoons on a forty-space city circuit."}
        </p>

        <p className="mt-6 text-xs tracking-[0.14em] text-fg-subtle uppercase">Mode</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              { id: "epoch" as const, label: "Computer City", hint: "How the live city plays" },
              { id: "table" as const, label: "Table Circuit", hint: "Classic 1v computers" },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`h-14 rounded-[var(--radius-md)] border px-3 text-left ${
                mode === item.id ? "border-fg/40 bg-bg-subtle text-fg" : "border-border bg-bg-elevated text-fg-muted"
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-[11px] text-fg-subtle">{item.hint}</span>
            </button>
          ))}
        </div>

        {user && active && mode === "table" && (
          <Button className="mt-6 w-full" size="lg" onClick={() => void continueSaved()} disabled={loadingSave}>
            {loadingSave ? "Loading…" : "Continue saved game"}
          </Button>
        )}

        <label htmlFor="player-name" className="mt-8 block text-xs tracking-[0.14em] text-fg-subtle uppercase">
          Your name
        </label>
        <input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 18))}
          placeholder={user?.displayName || "You"}
          maxLength={18}
          className="mt-2 h-12 w-full rounded-[var(--radius-md)] border border-border bg-bg-elevated px-4 text-base text-fg outline-none ring-accent/40 placeholder:text-fg-subtle focus:ring-2"
        />

        <p className="mt-6 text-xs tracking-[0.14em] text-fg-subtle uppercase">Rivals</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([2, 3] as const).map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setBots(count)}
              className={`h-12 rounded-[var(--radius-md)] border text-sm font-medium ${
                bots === count ? "border-fg/40 bg-bg-subtle text-fg" : "border-border bg-bg-elevated text-fg-muted"
              }`}
            >
              {count} computers
            </button>
          ))}
        </div>

        {mode === "epoch" && (
          <>
            <p className="mt-6 text-xs tracking-[0.14em] text-fg-subtle uppercase">Computer difficulty</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "easy" as const, label: "Easy", hint: "Buys loose, builds slowly" },
                  { id: "hard" as const, label: "Hard", hint: "Blocks sets, keeps cash, builds" },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDifficulty(item.id)}
                  className={`h-14 rounded-[var(--radius-md)] border px-3 text-left ${
                    difficulty === item.id ? "border-fg/40 bg-bg-subtle text-fg" : "border-border bg-bg-elevated text-fg-muted"
                  }`}
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-[11px] text-fg-subtle">{item.hint}</span>
                </button>
              ))}
            </div>
            {walletMarks > 0 && (
              <>
                <p className="mt-6 text-xs tracking-[0.14em] text-fg-subtle uppercase">Join discount</p>
                <p className="mt-2 text-sm text-fg-muted">
                  You have {walletMarks} Marks. Spend them to cut your ${JOIN_FEE} join fee (floor ${JOIN_FEE_FLOOR}). Computers still pay ${JOIN_FEE}.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="join-marks"
                    type="range"
                    min={0}
                    max={maxJoinSpend}
                    step={1}
                    value={Math.min(joinMarks, maxJoinSpend)}
                    onChange={(e) => setJoinMarks(Number(e.target.value))}
                    className="h-11 w-full"
                  />
                  <span className="w-24 shrink-0 text-right text-sm tabular-nums text-fg">
                    {joinQuote.spent} Mk
                  </span>
                </div>
                <p className="mt-1 text-xs text-fg-subtle">You pay ${joinQuote.fee} to join.</p>
              </>
            )}
          </>
        )}

        <Button
          className="mt-6 w-full"
          size="lg"
          variant={mode === "table" && active ? "secondary" : "primary"}
          onClick={() => {
            if (mode === "table") {
              if (active && !window.confirm("Start a new game? This replaces your saved circuit.")) return;
              useEpochStore.getState().leave();
              startGame(resolved, bots);
              return;
            }
            useGameStore.getState().toMenu();
            startCity(resolved, bots, difficulty, joinQuote.spent);
          }}
        >
          {mode === "epoch" ? "Enter Computer City" : active ? "Start a new game" : "Start game"}
        </Button>
        <p className="mt-3 text-sm text-fg-muted">
          <Link to="/litepaper" className="underline-offset-4 hover:underline">
            Read the litepaper
          </Link>
          {" · "}
          <Link to="/live" className="underline-offset-4 hover:underline">
            Live City
          </Link>
          {!user && (
            <>
              {" · "}
              <Link to="/login" className="underline-offset-4 hover:underline">
                Sign in
              </Link>{" "}
              to save table games across devices.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setRules((v) => !v)}
          className="mt-3 text-sm text-fg-muted hover:text-fg"
        >
          {rules ? "Hide rules" : "How to play"}
        </button>
        {rules && mode === "epoch" && (
          <ul className="mt-4 space-y-2 text-sm text-fg-muted">
            <li>Computers submit the instant an epoch opens. The clock never waits on them.</li>
            <li>Landing on empty land does not auto-buy. You claim it next epoch, or leave it.</li>
            <li>Owned lots show who holds them. Offer to buy — they accept or decline next epoch.</li>
            <li>Houses only after you own the whole colour row (Pinecrest, Willow Green, and Highgrove together, and so on). Utilities sit outside those rows.</li>
            <li>Every 10 epochs one new computer joins (until epoch 5000). Every 100 epochs a new square is laid that holds every previous lot and house plus a new colour row and its utility on the same table. Never a side lane. Utilities never sit between a colour row.</li>
            <li>If you cannot pay, jail plus a lien. You are not eliminated — your lots still collect. After five unpaid epochs, ops covers 30% of the lien.</li>
            <li>Join fees and the 5% rent skim split 60/40 into ops and community. Every 20 epochs the top three rent collectors share 25% of the community pool.</li>
            <li>Marks (15 per GO) buy a bail bond, a join discount on the next city, or pawn/board cosmetics. They never change rent.</li>
          </ul>
        )}
        {rules && mode === "table" && (
          <ul className="mt-4 space-y-2 text-sm text-fg-muted">
            <li>Roll two dice and move clockwise. Passing GO pays $200, minus $35 upkeep per deed you own.</li>
            <li>Buy empty deeds. Landing on a rival's deed costs rent. A complete colour row doubles rent.</li>
            <li>Transit rent climbs with each line you own. Utilities charge 4× or 10× the dice.</li>
            <li>Taxes fill Civic Park. Land there to take the pot.</li>
            <li>Three doubles, or the Go-to-Jail corner, send you to jail. Pay $50, use a card, or roll doubles.</li>
            <li>The circuit ends at the first bankruptcy. Highest net worth among the remaining players wins.</li>
          </ul>
        )}

        {user && history.length > 0 && mode === "table" && (
          <section className="mt-8">
            <p className="text-xs tracking-[0.14em] text-fg-subtle uppercase">Recent results</p>
            <ul className="mt-2 divide-y divide-border rounded-[var(--radius-md)] border border-border">
              {history.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className={row.youWon ? "text-good" : "text-fg-muted"}>
                    {row.youWon ? "Won" : "Lost"} · {row.winnerName}
                  </span>
                  <span className="text-xs text-fg-subtle tabular-nums">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function MiniBoard() {
  const marks = [
    "bg-group-brick",
    "bg-group-sand",
    "bg-group-navy",
    "bg-group-clay",
    "bg-group-pine",
    "bg-group-sky",
    "bg-group-rose",
    "bg-group-brown",
  ];
  return (
    <div className="grid size-28 grid-cols-5 grid-rows-5 overflow-hidden rounded-[var(--radius-sm)] border-2 border-rail bg-felt">
      {Array.from({ length: 25 }, (_, i) => {
        const r = Math.floor(i / 5);
        const c = i % 5;
        const edge = r === 0 || r === 4 || c === 0 || c === 4;
        if (!edge) return <div key={i} className="bg-felt-deep" />;
        return (
          <div key={i} className="relative bg-tile">
            <span className={`absolute inset-x-0 top-0 h-1 ${marks[i % marks.length]}`} />
          </div>
        );
      })}
    </div>
  );
}
