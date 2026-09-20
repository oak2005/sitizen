"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cl } from "@stacks/transactions";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Button } from "@/components/ui/button";
import { isPurchasable, spaceAt, SPACES } from "@/game/board";
import { LIVE_JOIN_STX, BAIL_MARKS, COSMETIC_SKINS, COSMETIC_THEMES, MARKS_PER_GO } from "@/game/epoch/types";
import { liveRentStx } from "@/lib/live-rent";
import { emptyMarks, grantGoMarks, loadMarks, spendBail, unlockCosmetic, wrappedGo, type LiveMarks } from "@/lib/live-marks";
import {
  APP_NAME,
  CONTRACTS,
  contractsReady,
  deedId,
  DEED_PREFIX,
  deployerAddress,
  explorerAddr,
  explorerTx,
  isTestnetAddress,
  LIVE_JOIN_USTX,
  microToStx,
  nextUnlockAt,
  publicError,
  sitzAsset,
  sitzToMicro,
  TOKEN_SYMBOL,
} from "@/lib/sitizen";
import { loadCitySnapshot, loadDeed, loadDeeds, loadSeat, loadSitzBalance, type CitySnapshot } from "@/lib/city-reads";
import {
  callCity,
  connectWallet,
  disconnectWallet,
  ftSendEq,
  restoreWalletAsync,
  stxSendEq,
  type WalletSession,
} from "@/lib/stacks-wallet";

type Roll = { a: number; b: number; dest: number };

export function LiveCity() {
  const ready = contractsReady();
  const [wallet, setWallet] = useState<WalletSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [snap, setSnap] = useState<CitySnapshot | null>(null);
  const [human, setHuman] = useState(false);
  const [lastLanded, setLastLanded] = useState<{ space: number; epoch: number } | null>(null);
  const [lien, setLien] = useState(0n);
  const [jailed, setJailed] = useState(false);
  const [selected, setSelected] = useState<number | null>(1);
  const [deed, setDeed] = useState<{ owner: string | null; houses: number; cost: bigint } | null>(null);
  const [owners, setOwners] = useState<Map<number, { owner: string | null; houses: number }>>(new Map());
  const [saleStx, setSaleStx] = useState("200");
  const [wantClaim, setWantClaim] = useState(true);
  const [wantBuild, setWantBuild] = useState(false);
  const [committedEpoch, setCommittedEpoch] = useState<number | null>(null);
  const [landedEpoch, setLandedEpoch] = useState<number | null>(null);
  const [roll, setRoll] = useState<Roll | null>(null);
  const [sitzBal, setSitzBal] = useState(0n);
  const [faucetAmt, setFaucetAmt] = useState("100");
  const [sendAmt, setSendAmt] = useState("20");
  const [sendTo, setSendTo] = useState("");
  const [mk, setMk] = useState<LiveMarks>(emptyMarks());

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
      setLien(seat.lien);
      setJailed(seat.jailed);
      setSitzBal(await loadSitzBalance(address));
      setMk(loadMarks(address));
    } else {
      setMk(emptyMarks());
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
    refresh(wallet?.address).catch((err: unknown) => setError(publicError(err)));
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

  async function run(label: string, fn: () => Promise<string>): Promise<boolean> {
    setBusy(label);
    setError(null);
    setTxid(null);
    try {
      const id = await fn();
      setTxid(id);
      await refresh(wallet?.address);
      return true;
    } catch (err) {
      setError(publicError(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function onConnect() {
    setError(null);
    try {
      setWallet(await connectWallet());
    } catch (err) {
      setError(publicError(err));
    }
  }

  async function onDisconnect() {
    await disconnectWallet();
    setWallet(null);
    setHuman(false);
    setLastLanded(null);
    setLien(0n);
    setJailed(false);
    setSitzBal(0n);
    setMk(emptyMarks());
  }

  async function callFn(
    label: string,
    functionName: string,
    functionArgs: Parameters<typeof callCity>[0]["functionArgs"],
    postConditions: Parameters<typeof callCity>[0]["postConditions"] = [],
    contract = CONTRACTS.city,
  ) {
    if (!wallet) return false;
    return run(label, async () => {
      const { txid: id } = await callCity({
        contract: functionName === "improve" ? CONTRACTS.deed : contract,
        functionName,
        functionArgs,
        address: wallet.address,
        postConditions,
      });
      return id;
    });
  }

  async function onJoin() {
    if (!wallet) return;
    await callFn("join", "join", [], [stxSendEq(wallet.address, LIVE_JOIN_USTX)]);
  }

  async function onOpen() {
    await callFn("open", "open-epoch", []);
  }

  async function onCommit() {
    const build = wantBuild && selected != null ? Cl.some(Cl.uint(selected)) : Cl.none();
    await callFn("commit", "commit-intent", [Cl.bool(wantClaim), build]);
    if (ready) {
      const city = await loadCitySnapshot();
      setCommittedEpoch(city.epoch);
    }
  }

  async function onClose() {
    await callFn("close", "close-epoch", []);
  }

  async function onSettle() {
    await callFn("settle", "settle", []);
  }

  function onRoll() {
    const loop = snap?.loop ?? 40;
    const from = lastLanded?.space ?? 0;
    const buf = new Uint8Array(2);
    crypto.getRandomValues(buf);
    const a = (buf[0]! % 6) + 1;
    const b = (buf[1]! % 6) + 1;
    const dest = (from + a + b) % loop;
    setRoll({ a, b, dest });
    setSelected(dest);
  }

  async function onLand() {
    if (!snap || !wallet || !roll) return;
    const dest = roll.dest;
    if (!Number.isInteger(dest) || dest < 0 || dest >= snap.loop) {
      setError("Roll first, then land on that space.");
      return;
    }
    const from = lastLanded?.space ?? 0;
    const passedGo = wrappedGo(from, roll.a + roll.b, snap.loop);
    const ok = await callFn("land", "land", [Cl.uint(dest)]);
    if (!ok) return;
    if (ready) {
      const city = await loadCitySnapshot();
      setLandedEpoch(city.epoch);
    }
    if (passedGo) {
      const next = grantGoMarks(loadMarks(wallet.address));
      setMk(next);
    }
  }

  function onBail() {
    if (!wallet) return;
    const result = spendBail(loadMarks(wallet.address));
    setMk(result.next);
    setError(result.ok ? null : result.note);
    if (result.ok) setTxid(null);
  }

  function onCosmetic(kind: "skin" | "theme", id: string) {
    if (!wallet) return;
    const result = unlockCosmetic(loadMarks(wallet.address), kind, id);
    setMk(result.next);
    setError(result.ok ? null : result.note);
  }

  async function onClaim() {
    await callFn("claim", "claim", []);
  }

  async function onImprove() {
    if (!wallet || selected == null || !deed) return;
    await callFn("improve", "improve", [Cl.uint(selected)], [stxSendEq(wallet.address, deed.cost)]);
  }

  async function onList() {
    if (!wallet) return;
    const stx = Number(saleStx);
    if (!Number.isInteger(stx) || stx <= 0 || stx > 1_000_000) {
      setError("Sale price must be a whole STX amount between 1 and 1,000,000.");
      return;
    }
    const micro = BigInt(stx) * 1_000_000n;
    const fee = (micro * 25n) / 1000n;
    await callFn("list", "pay-listing-fee", [Cl.uint(micro)], [stxSendEq(wallet.address, fee)]);
  }

  async function onPayRent() {
    if (!wallet || !deed?.owner || selected == null || !snap) return;
    const dice = roll ? roll.a + roll.b : 7;
    const stx = liveRentStx({
      spaceId: selected,
      houses: deed.houses,
      owner: deed.owner,
      owners,
      loop: snap.loop,
      dice,
    });
    if (stx <= 0) {
      setError("No rent due on that lot.");
      return;
    }
    const micro = BigInt(stx) * 1_000_000n;
    await callFn("rent", "pay-rent", [Cl.principal(deed.owner), Cl.uint(micro)], [stxSendEq(wallet.address, micro)]);
  }

  async function onDistrict() {
    if (!snap) return;
    await callFn("district", "open-district", [Cl.uint(snap.districts + 1)]);
  }

  async function onGenesis() {
    await callFn("genesis", "genesis", [], [], CONTRACTS.token);
  }

  async function onFaucet() {
    if (!wallet) return;
    const n = Number(faucetAmt);
    if (!Number.isInteger(n) || n <= 0 || n > 10_000) {
      setError("Faucet 1–10,000 SITZ.");
      return;
    }
    await callFn("faucet", "faucet", [Cl.principal(wallet.address), Cl.uint(sitzToMicro(n))], [], CONTRACTS.token);
  }

  async function onSendSitz() {
    if (!wallet) return;
    const n = Number(sendAmt);
    if (!Number.isInteger(n) || n <= 0 || n > 1_000_000) {
      setError("Send a whole SITZ amount between 1 and 1,000,000.");
      return;
    }
    if (!isTestnetAddress(sendTo)) {
      setError("Recipient must be a testnet ST… address.");
      return;
    }
    const micro = sitzToMicro(n);
    await callFn(
      "sitz",
      "transfer",
      [Cl.uint(micro), Cl.principal(wallet.address), Cl.principal(sendTo.trim()), Cl.none()],
      [ftSendEq(wallet.address, micro, sitzAsset())],
      CONTRACTS.token,
    );
  }

  async function onDrip() {
    await callFn("drip", "drip-sitz", []);
  }

  const unlock = snap ? nextUnlockAt(snap.humans) : 8;
  const selectedSpace = selected != null ? spaceAt(selected) : null;
  const mine = Boolean(wallet && deed?.owner === wallet.address);
  const epochOpen = Boolean(snap?.epochOpen);
  const epoch = snap?.epoch ?? 0;
  const canClaim = Boolean(human && lastLanded && epoch > lastLanded.epoch);
  const canClose = epochOpen;
  const canCommit = epochOpen && human && committedEpoch !== epoch;
  const canLand = Boolean(human && !epochOpen && epoch > 0 && landedEpoch !== epoch);
  const canSettle = Boolean(!epochOpen && epoch > 0);
  const canOpen = !epochOpen;
  const nextDistrict = (snap?.districts ?? 0) + 1;
  const canDistrict = Boolean(snap && snap.humans >= nextDistrict * 8);
  const landedOwner = selected != null ? owners.get(selected)?.owner : null;
  const rentDue =
    wallet && landedOwner && landedOwner !== wallet.address && selected != null && snap
      ? liveRentStx({
          spaceId: selected,
          houses: owners.get(selected)?.houses ?? 0,
          owner: landedOwner,
          owners,
          loop: snap.loop,
          dice: roll ? roll.a + roll.b : 7,
        })
      : 0;
  const mins = snap ? Math.max(1, Math.round(snap.epochLength / 60)) : 10;
  const isDeployer = Boolean(wallet && deployerAddress() && wallet.address === deployerAddress());
  const vaultReady = Boolean(snap && snap.sitzVault >= 10_000_000n);

  return (
    <div className="min-h-dvh bg-bg text-fg" data-felt={mk.theme || undefined}>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link to="/" className="font-display text-base font-medium tracking-tight">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <Link to="/litepaper" className="text-xs text-fg-muted hover:text-fg">
              Rules
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <p className="text-[11px] tracking-[0.22em] text-fg-subtle uppercase">Live City · Stacks testnet</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="mt-3 max-w-xl text-base text-fg-muted">
          Sign in with Leather or Xverse. Join is {LIVE_JOIN_STX} STX. Then run an epoch: Open → Commit → Close → Land →
          Settle. Claim unowned land the following epoch.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {wallet ? (
            <>
              <a
                className="rounded-full border border-border bg-bg-elevated px-3 py-1 font-mono text-xs text-fg"
                href={explorerAddr(wallet.address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {shortAddr(wallet.address)}
              </a>
              <Button variant="ghost" size="sm" onClick={() => void onDisconnect()}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={() => void onConnect()} disabled={Boolean(busy)}>
              Connect wallet to sign in
            </Button>
          )}
          <Button variant="go" onClick={() => void onJoin()} disabled={!wallet || !ready || human || Boolean(busy)}>
            {busy === "join" ? "Confirm in wallet…" : `Join · ${LIVE_JOIN_STX} STX`}
          </Button>
        </div>

        {!ready && (
          <p className="mt-4 max-w-xl text-sm text-warn">
            Contracts are not wired in this preview. On Vercel, set the four ST… IDs in env.
          </p>
        )}
        {error && <p className="mt-4 max-w-xl text-sm text-bad">{error}</p>}
        {txid && (
          <p className="mt-4 text-sm text-good">
            Posted.{" "}
            <a className="underline" href={explorerTx(txid)} target="_blank" rel="noopener noreferrer">
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
          <Fact k={`${TOKEN_SYMBOL} wallet`} v={wallet ? microToStx(sitzBal) : "—"} />
          <Fact k="Epoch" v={snap ? `${snap.epoch}${snap.epochOpen ? " · open" : snap.epoch ? " · closed" : " · none"}` : "—"} />
          <Fact k="Your seat" v={human ? (jailed ? "Seated · lien" : "Seated") : wallet ? "Not seated" : "Connect"} />
          <Fact k="Marks" v={wallet ? `${mk.marks} · +${mk.minted}/−${mk.burned}` : "—"} />
          <Fact k="Last landed" v={lastLanded ? `${deedId(lastLanded.space)} · ep ${lastLanded.epoch}` : "—"} />
        </dl>
        {lien > 0n && (
          <p className="mt-3 text-sm text-warn">
            Lien {microToStx(lien)} STX{jailed ? " · in civic hold" : ""}
          </p>
        )}

        <section className="mt-8 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4 sm:p-5">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Epoch</p>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            Testnet window is {mins} minutes, or sooner once every seated human has committed. One human can close right
            after their own commit. Bots cannot block close. Dice is rolled here; the chain records the space you land.
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <Button className="w-full" variant="secondary" onClick={() => void onOpen()} disabled={!wallet || !ready || !canOpen || Boolean(busy)}>
                {busy === "open" ? "Confirm in wallet…" : "1. Open epoch"}
              </Button>
            </li>
            <li>
              <Button className="w-full" variant="secondary" onClick={() => void onCommit()} disabled={!wallet || !ready || !canCommit || Boolean(busy)}>
                {busy === "commit" ? "Confirm in wallet…" : committedEpoch === epoch && epochOpen ? "Committed" : "2. Commit"}
              </Button>
            </li>
            <li>
              <Button className="w-full" variant="secondary" onClick={() => void onClose()} disabled={!wallet || !ready || !canClose || Boolean(busy)}>
                {busy === "close" ? "Confirm in wallet…" : "3. Close epoch"}
              </Button>
            </li>
            <li>
              <Button className="w-full" variant="secondary" onClick={onRoll} disabled={!canLand || Boolean(busy)}>
                {roll ? `Rolled ${roll.a}+${roll.b} → ${spaceAt(roll.dest)?.short ?? roll.dest}` : "4a. Roll 2d6"}
              </Button>
            </li>
            <li>
              <Button className="w-full" variant="go" onClick={() => void onLand()} disabled={!wallet || !ready || !canLand || !roll || Boolean(busy)}>
                {busy === "land" ? "Confirm in wallet…" : roll ? `4b. Land ${deedId(roll.dest)}` : "4b. Land"}
              </Button>
            </li>
            <li>
              <Button className="w-full" variant="secondary" onClick={() => void onSettle()} disabled={!wallet || !ready || !canSettle || Boolean(busy)}>
                {busy === "settle" ? "Confirm in wallet…" : "5. Settle"}
              </Button>
            </li>
          </ol>
          <div className="mt-4 flex flex-col gap-2 text-sm text-fg-muted">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={wantClaim} onChange={(e) => setWantClaim(e.target.checked)} />
              Commit: claim last-landed next epoch if still unowned
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wantBuild}
                onChange={(e) => setWantBuild(e.target.checked)}
                disabled={!mine}
              />
              Commit: improve the selected deed (you must own a full colour row)
            </label>
          </div>
          {canDistrict && (
            <Button className="mt-4" variant="primary" onClick={() => void onDistrict()} disabled={!wallet || !ready || Boolean(busy)}>
              {busy === "district" ? "Confirm in wallet…" : `Open district ${nextDistrict} (4 lots)`}
            </Button>
          )}
        </section>

        <section className="mt-8 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4 sm:p-5">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{TOKEN_SYMBOL} · token tax</p>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            Civic tax is STX. Token tax is {TOKEN_SYMBOL}. They never mix. {TOKEN_SYMBOL} never pays rent and never
            changes house cost. Every send takes 5%: 40% vault · 25% ops · 20% community · 15% burn. Holding{" "}
            {TOKEN_SYMBOL} earns nothing until deeds exist and drip runs. Drip skips if the vault is under 10{" "}
            {TOKEN_SYMBOL}.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact k="Supply" v={snap ? microToStx(snap.sitzSupply) : "—"} />
            <Fact k="Vault" v={snap ? microToStx(snap.sitzVault) : "—"} />
            <Fact k={`Ops ${TOKEN_SYMBOL}`} v={snap ? microToStx(snap.sitzOps) : "—"} />
            <Fact k="Community" v={snap ? microToStx(snap.sitzCommunity) : "—"} />
          </dl>
          {isDeployer && (
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <Button variant="secondary" onClick={() => void onGenesis()} disabled={!ready || Boolean(busy)}>
                {busy === "genesis" ? "Confirm in wallet…" : "Genesis mint"}
              </Button>
              <label className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
                Faucet to this wallet
                <input
                  className="mt-1 h-10 w-28 rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm text-fg"
                  inputMode="numeric"
                  value={faucetAmt}
                  onChange={(e) => setFaucetAmt(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                />
              </label>
              <Button variant="secondary" onClick={() => void onFaucet()} disabled={!ready || Boolean(busy)}>
                {busy === "faucet" ? "Confirm in wallet…" : `Faucet ${faucetAmt || "0"} ${TOKEN_SYMBOL}`}
              </Button>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
              Send to (ST…)
              <input
                className="mt-1 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 font-mono text-xs text-fg"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value.trim())}
                placeholder="ST…"
              />
            </label>
            <label className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
              Amount
              <input
                className="mt-1 h-10 w-28 rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm text-fg"
                inputMode="numeric"
                value={sendAmt}
                onChange={(e) => setSendAmt(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
              />
            </label>
            <Button
              variant="secondary"
              onClick={() => void onSendSitz()}
              disabled={!wallet || !ready || sitzBal === 0n || Boolean(busy)}
            >
              {busy === "sitz" ? "Confirm in wallet…" : `Send · 5% tax`}
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-fg-subtle">
            Last drip epoch {snap ? snap.lastDripEpoch : "—"}. Drip pays deed owners by houses (1/3/6/10/16/25). Unowned
            lots get 0. The live city from Phase 5 has no drip-sitz yet — Send still fills the vault.
          </p>
          <Button
            className="mt-3"
            variant="primary"
            onClick={() => void onDrip()}
            disabled={!wallet || !ready || !vaultReady || (snap?.epoch ?? 0) < 1 || Boolean(busy)}
          >
            {busy === "drip" ? "Confirm in wallet…" : `Drip vault to deeds`}
          </Button>
        </section>

        <section className="mt-8 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4 sm:p-5">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Marks · standing</p>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            {MARKS_PER_GO} Marks when you wrap past GO. They never pay rent and never change house cost. This table’s
            join is {LIVE_JOIN_STX} STX on-chain — Marks cannot cut it. Cosmetics are local to this browser + wallet.
            A bail bond is standing only; an on-chain lien still needs STX amnesty.
          </p>
          <p className="mt-3 text-sm text-fg">
            {mk.marks} Marks{mk.bondReady ? " · bail prepaid" : ""}
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={onBail}
            disabled={!wallet || mk.marks < BAIL_MARKS || mk.bondReady}
          >
            Bail bond · {BAIL_MARKS} Mk
          </Button>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Pawn skins</p>
              <div className="mt-2 flex flex-col gap-2">
                {COSMETIC_SKINS.map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant={mk.skin === item.id ? "primary" : "secondary"}
                    onClick={() => onCosmetic("skin", item.id)}
                    disabled={!wallet || (!mk.skins.includes(item.id) && mk.marks < item.cost)}
                  >
                    {mk.skins.includes(item.id) ? `Wear ${item.label}` : `${item.label} · ${item.cost} Mk`}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Board themes</p>
              <div className="mt-2 flex flex-col gap-2">
                {COSMETIC_THEMES.map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant={mk.theme === item.id ? "primary" : "secondary"}
                    onClick={() => onCosmetic("theme", item.id)}
                    disabled={!wallet || (!mk.themes.includes(item.id) && mk.marks < item.cost)}
                  >
                    {mk.themes.includes(item.id) ? `Use ${item.label}` : `${item.label} · ${item.cost} Mk`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <section>
            <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Founders Square</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {lots.map((space) => {
                const rec = owners.get(space.id);
                const label = deedId(space.id);
                const active = selected === space.id;
                const here = lastLanded?.space === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setSelected(space.id)}
                    className={`rounded-[var(--radius-md)] border px-3 py-2 text-left ${
                      active ? "border-fg/50 bg-bg-subtle" : "border-border bg-bg-elevated"
                    } ${here && mk.skin === "gilt" ? "ring-1 ring-token-ivory" : ""} ${here && mk.skin === "onyx" ? "ring-1 ring-fg-subtle" : ""} ${here && mk.skin === "jade" ? "ring-1 ring-good" : ""}`}
                  >
                    <span className="block font-mono text-[11px] text-fg-subtle">
                      {label}
                      {here ? " · here" : ""}
                    </span>
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
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="secondary" onClick={() => void onClaim()} disabled={!wallet || !canClaim || Boolean(busy)}>
                    {busy === "claim" ? "Confirm in wallet…" : "Claim last-landed"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void onImprove()}
                    disabled={!wallet || !mine || !deed || deed.houses >= 5 || selectedSpace.kind !== "property" || Boolean(busy)}
                  >
                    {busy === "improve"
                      ? "Confirm in wallet…"
                      : `Improve · ${deed ? microToStx(deed.cost) : "—"} STX`}
                  </Button>
                  {rentDue > 0 && (
                    <Button variant="danger" onClick={() => void onPayRent()} disabled={!wallet || !human || Boolean(busy)}>
                      {busy === "rent" ? "Confirm in wallet…" : `Pay rent · ${rentDue} STX`}
                    </Button>
                  )}
                  <label className="mt-2 text-[10px] tracking-[0.16em] text-fg-subtle uppercase">
                    List sale (STX)
                    <input
                      className="mt-1 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm text-fg"
                      inputMode="numeric"
                      value={saleStx}
                      onChange={(e) => setSaleStx(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                    />
                  </label>
                  <Button variant="secondary" onClick={() => void onList()} disabled={!wallet || !human || Boolean(busy)}>
                    {busy === "list" ? "Confirm in wallet…" : "List · 2.5% STX fee"}
                  </Button>
                </div>
                <p className="mt-3 text-[11px] text-fg-subtle">
                  Claim only works the epoch after you land, and only if the lot is still unowned. Rent is STX (5% civic
                  skim). {TOKEN_SYMBOL} never pays rent.
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
