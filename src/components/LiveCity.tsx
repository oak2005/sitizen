"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cl } from "@stacks/transactions";
import { AuthSlot } from "@/components/AuthSlot";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Button } from "@/components/ui/button";
import { isPurchasable, spaceAt, SPACES } from "@/game/board";
import { LIVE_JOIN_STX } from "@/game/epoch/types";
import {
  APP_NAME,
  CONTRACTS,
  contractsReady,
  deedId,
  DEED_PREFIX,
  explorerAddr,
  explorerTx,
  LIVE_JOIN_USTX,
  microToStx,
  nextUnlockAt,
  STACKS_NETWORK,
  TOKEN_SYMBOL,
} from "@/lib/sitizen";
import { loadCitySnapshot, loadDeed, loadDeeds, loadSeat, type CitySnapshot } from "@/lib/city-reads";
import {
  callCity,
  connectWallet,
  disconnectWallet,
  restoreWalletAsync,
  stxSendEq,
  type WalletSession,
} from "@/lib/stacks-wallet";

export function LiveCity() {
  const ready = contractsReady();
  const [wallet, setWallet] = useState<WalletSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [snap, setSnap] = useState<CitySnapshot | null>(null);
  const [human, setHuman] = useState(false);
  const [lastLanded, setLastLanded] = useState<{ space: number; epoch: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(1);
  const [deed, setDeed] = useState<{ owner: string | null; houses: number; cost: bigint } | null>(null);
  const [owners, setOwners] = useState<Map<number, { owner: string | null; houses: number }>>(new Map());
  const [saleStx, setSaleStx] = useState("200");

  const refresh = useCallback(async (address?: string) => {
    if (!ready) return;
    const city = await loadCitySnapshot();
    setSnap(city);
    const ids = SPACES.filter((s) => s.id < city.loop && isPurchasable(s)).map((s) => s.id);
    setOwners(await loadDeeds(ids));
    if (address) {
      const seat = await loadSeat(address);
      setHuman(seat.human);
      setLastLanded(seat.lastLanded);
    }
  }, [ready]);

  useEffect(() => {
    let cancelled = false;
    restoreWalletAsync()
      .then((session) => {
        if (!cancelled && session) setWallet(session);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refresh(wallet?.address).catch((err: unknown) => setError(String(err)));
  }, [refresh, wallet?.address]);

  useEffect(() => {
    if (!ready || selected == null) return;
    loadDeed(selected)
      .then(setDeed)
      .catch(() => setDeed(null));
  }, [ready, selected, txid]);

  const lots = useMemo(() => {
    const loop = snap?.loop ?? 40;
    return SPACES.filter((s) => s.id < loop && isPurchasable(s));
  }, [snap?.loop]);

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label);
    setError(null);
    setTxid(null);
    try {
      const id = await fn();
      setTxid(id);
      await refresh(wallet?.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function onConnect() {
    setError(null);
    try {
      setWallet(await connectWallet());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onJoin() {
    if (!wallet) return;
    if (STACKS_NETWORK === "mainnet") {
      setError("Mainnet join is $50 of STX (TWAP), not a hardcoded amount.");
      return;
    }
    await run("join", async () => {
      const { txid: id } = await callCity({
        contract: CONTRACTS.city,
        functionName: "join",
        functionArgs: [],
        address: wallet.address,
        postConditions: [stxSendEq(wallet.address, LIVE_JOIN_USTX)],
      });
      return id;
    });
  }

  async function onClaim() {
    if (!wallet) return;
    await run("claim", async () => {
      const { txid: id } = await callCity({
        contract: CONTRACTS.city,
        functionName: "claim",
        functionArgs: [],
        address: wallet.address,
        postConditions: [],
      });
      return id;
    });
  }

  async function onImprove() {
    if (!wallet || selected == null || !deed) return;
    await run("improve", async () => {
      const { txid: id } = await callCity({
        contract: CONTRACTS.deed,
        functionName: "improve",
        functionArgs: [Cl.uint(selected)],
        address: wallet.address,
        postConditions: [stxSendEq(wallet.address, deed.cost)],
      });
      return id;
    });
  }

  async function onList() {
    if (!wallet) return;
    const stx = Number(saleStx);
    if (!Number.isInteger(stx) || stx <= 0) {
      setError("Sale price must be a whole STX amount.");
      return;
    }
    const micro = BigInt(stx) * 1_000_000n;
    const fee = (micro * 25n) / 1000n;
    await run("list", async () => {
      const { txid: id } = await callCity({
        contract: CONTRACTS.city,
        functionName: "pay-listing-fee",
        functionArgs: [Cl.uint(micro)],
        address: wallet.address,
        postConditions: [stxSendEq(wallet.address, fee)],
      });
      return id;
    });
  }

  const unlock = snap ? nextUnlockAt(snap.humans) : 8;
  const selectedSpace = selected != null ? spaceAt(selected) : null;
  const mine = Boolean(wallet && deed?.owner === wallet.address);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link to="/" className="font-display text-base font-medium tracking-tight">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <Link to="/litepaper" className="text-xs text-fg-muted hover:text-fg">
              Litepaper
            </Link>
            <Link to="/" className="text-xs text-fg-muted hover:text-fg">
              Computer City
            </Link>
            <AuthSlot />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <p className="text-[11px] tracking-[0.22em] text-fg-subtle uppercase">Live City · Stacks {STACKS_NETWORK}</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="mt-3 max-w-xl text-base text-fg-muted">
          You sit. The city keeps. Join is {LIVE_JOIN_STX} STX on testnet. Deeds are {DEED_PREFIX}-XX. Token is {TOKEN_SYMBOL}.
          No seed in this browser. Leather and Xverse sign on your device.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {wallet ? (
            <>
              <a
                className="rounded-full border border-border bg-bg-elevated px-3 py-1 font-mono text-xs text-fg"
                href={explorerAddr(wallet.address)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddr(wallet.address)}
              </a>
              <Button variant="ghost" size="sm" onClick={() => disconnectWallet().then(() => setWallet(null))}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={onConnect} disabled={Boolean(busy)}>
              Connect Leather / Xverse
            </Button>
          )}
          <Button
            variant="go"
            onClick={onJoin}
            disabled={!wallet || !ready || human || STACKS_NETWORK === "mainnet" || Boolean(busy)}
          >
            {busy === "join" ? "Confirm in wallet…" : `Join · ${LIVE_JOIN_STX} STX`}
          </Button>
        </div>

        {!ready && (
          <p className="mt-4 max-w-xl text-sm text-warn">
            Contract IDs are empty. Paste {`NEXT_PUBLIC_CITY_CONTRACT`} (and deed, token, treasury) in Vercel env or
            `.env.local`. Never put a seed there.
          </p>
        )}
        {error && <p className="mt-4 max-w-xl text-sm text-bad">{error}</p>}
        {txid && (
          <p className="mt-4 text-sm text-good">
            Posted.{" "}
            <a className="underline" href={explorerTx(txid)} target="_blank" rel="noreferrer">
              Open in explorer
            </a>
          </p>
        )}

        <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Fact k="Humans seated" v={snap ? String(snap.humans) : "—"} />
          <Fact k="Next unlock" v={unlock ? `${unlock} humans` : "All open"} />
          <Fact k="STX ops" v={snap ? `${microToStx(snap.opsStx)} STX` : "—"} />
          <Fact k="STX community" v={snap ? `${microToStx(snap.communityStx)} STX` : "—"} />
          <Fact k={`${TOKEN_SYMBOL} vault`} v={snap ? microToStx(snap.sitzVault) : "—"} />
          <Fact k="Epoch" v={snap ? `${snap.epoch}${snap.epochOpen ? " · open" : ""}` : "—"} />
          <Fact k="Loop" v={snap ? `${snap.loop} spaces` : "Founders Square 40"} />
          <Fact k="Your seat" v={human ? "Human" : wallet ? "Not seated" : "Connect"} />
        </dl>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section>
            <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Founders Square</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {lots.map((space) => {
                const rec = owners.get(space.id);
                const label = deedId(space.id);
                const active = selected === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setSelected(space.id)}
                    className={`rounded-[var(--radius-md)] border px-3 py-2 text-left ${
                      active ? "border-fg/50 bg-bg-subtle" : "border-border bg-bg-elevated"
                    }`}
                  >
                    <span className="block font-mono text-[11px] text-fg-subtle">{label}</span>
                    <span className="block text-sm text-fg">{space.short}</span>
                    <span className="block text-[11px] text-fg-muted">
                      {rec?.owner ? `${rec.houses} house${rec.houses === 1 ? "" : "s"} · ${shortAddr(rec.owner)}` : "unowned"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4">
            <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Deed</p>
            {selectedSpace && (
              <>
                <h2 className="mt-2 font-display text-xl">{selectedSpace.name}</h2>
                <p className="font-mono text-xs text-fg-subtle">{deedId(selectedSpace.id)}</p>
                <p className="mt-2 text-sm text-fg-muted">
                  {deed?.owner ? `Owner ${shortAddr(deed.owner)}` : "Unowned"}
                  {deed ? ` · houses ${deed.houses}` : ""}
                </p>
                {lastLanded && (
                  <p className="mt-2 text-xs text-fg-subtle">
                    Last landed {deedId(lastLanded.space)} epoch {lastLanded.epoch}
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="secondary" onClick={onClaim} disabled={!wallet || !human || Boolean(busy)}>
                    {busy === "claim" ? "Confirm in wallet…" : "Claim last-landed"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onImprove}
                    disabled={!wallet || !mine || !deed || deed.houses >= 5 || selectedSpace.kind !== "property" || Boolean(busy)}
                  >
                    {busy === "improve"
                      ? "Confirm in wallet…"
                      : `Improve · ${deed ? microToStx(deed.cost) : "—"} STX`}
                  </Button>
                  <label className="mt-2 text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
                    List sale (STX)
                    <input
                      className="mt-1 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm text-fg"
                      inputMode="numeric"
                      value={saleStx}
                      onChange={(e) => setSaleStx(e.target.value.replace(/[^\d]/g, ""))}
                    />
                  </label>
                  <Button variant="secondary" onClick={onList} disabled={!wallet || !human || Boolean(busy)}>
                    {busy === "list" ? "Confirm in wallet…" : "List · 2.5% STX fee"}
                  </Button>
                </div>
                <p className="mt-3 text-[11px] text-fg-subtle">
                  Post-conditions are deny-mode and exact STX amounts. Civic tax is STX. {TOKEN_SYMBOL} never pays rent.
                </p>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg-elevated px-4 py-3">
      <dt className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{k}</dt>
      <dd className="mt-1 text-sm text-fg">{v}</dd>
    </div>
  );
}

function shortAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
