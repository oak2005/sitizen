import { spaceAt } from "@/game/board";
import { claimOf, pendingOffersTo, remainingMs } from "@/game/epoch/engine";
import { useEpochStore } from "@/game/epoch/store";
import {
  BAIL_CAP,
  BAIL_MARKS,
  COSMETIC_SKINS,
  COSMETIC_THEMES,
  type EpochCity,
} from "@/game/epoch/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EpochDeedCard } from "./EpochDeedCard";

export function EpochPanel({ city }: { city: EpochCity }) {
  const selected = useEpochStore((s) => s.selected);
  const now = useEpochStore((s) => s.now);
  const commitRoll = useEpochStore((s) => s.commitRoll);
  const commitPass = useEpochStore((s) => s.commitPass);
  const toggleBuild = useEpochStore((s) => s.toggleBuild);
  const toggleClaim = useEpochStore((s) => s.toggleClaim);
  const sellDeed = useEpochStore((s) => s.sellDeed);
  const offerBuy = useEpochStore((s) => s.offerBuy);
  const respondOffer = useEpochStore((s) => s.respondOffer);
  const spendBail = useEpochStore((s) => s.spendBail);
  const unlockCosmetic = useEpochStore((s) => s.unlockCosmetic);
  const you = city.players.find((p) => p.isHuman);
  const queued = city.intents.you?.builds ?? [];
  const left = remainingMs(city, now);
  const open = city.phase === "open";
  const claim = you ? claimOf(city, you.id) : undefined;
  const willClaim = city.intents.you?.claim ?? false;
  const incoming = you ? pendingOffersTo(city, you.id) : [];
  const responses = city.intents.you?.offerResponses ?? {};
  const lastMetric = city.metrics[city.metrics.length - 1];

  return (
    <section className="min-w-0 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4">
      <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">This epoch</p>
      <h2 className="mt-1 font-display text-lg font-medium tracking-tight">
        {you?.inJail && you.lien > 0 ? "Clear the lien, then roll" : "Buy, offer, then roll"}
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Computers already submitted. Nothing auto-buys. Land, then mint next epoch. Ask a holder to sell — they answer next epoch. Pine, Willow and Grove must all be yours before houses.
        {you?.inJail && you.lien > 0 ? ` Jail holds you for $${you.lien}.` : ""}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <p className="rounded-[var(--radius-sm)] border border-border bg-bg-subtle px-2 py-1.5 text-fg-muted">
          Ops <span className="font-medium tabular-nums text-fg">${city.opsPool}</span>
        </p>
        <p className="rounded-[var(--radius-sm)] border border-border bg-bg-subtle px-2 py-1.5 text-fg-muted">
          Community <span className="font-medium tabular-nums text-fg">${city.communityPool}</span>
        </p>
      </div>

      {claim && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-bg-subtle p-3">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Claim</p>
          <p className="mt-1 text-sm text-fg">
            {spaceAt(claim.spaceId).name} is unowned. Mint {`SZ-${String(claim.spaceId).padStart(2, "0")}`} for $
            {spaceAt(claim.spaceId).price} this epoch, or pass.
          </p>
          <Button type="button" size="sm" className="mt-2" variant={willClaim ? "secondary" : "primary"} onClick={toggleClaim} disabled={!open}>
            {willClaim ? "Will mint this epoch" : `Buy ${spaceAt(claim.spaceId).short} $${spaceAt(claim.spaceId).price}`}
          </Button>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Offers to you</p>
          {incoming.map((offer) => {
            const from = city.players.find((p) => p.id === offer.fromId);
            const decision = responses[offer.id];
            return (
              <div key={offer.id} className="rounded-[var(--radius-md)] border border-border bg-bg-subtle p-3">
                <p className="text-sm text-fg">
                  {from?.name} offers ${offer.price} for {spaceAt(offer.spaceId).name}. Answer this epoch.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant={decision === "accept" ? "primary" : "secondary"} onClick={() => respondOffer(offer.id, "accept")} disabled={!open}>
                    Accept
                  </Button>
                  <Button type="button" size="sm" variant={decision === "decline" ? "danger" : "ghost"} onClick={() => respondOffer(offer.id, "decline")} disabled={!open}>
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {you && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-bg-subtle p-3">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Marks · {you.marks}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {BAIL_MARKS} Marks clears up to ${BAIL_CAP} of a lien, or prepays the next shortfall. Cosmetics do not change rent.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2 min-h-11"
            variant="secondary"
            onClick={spendBail}
            disabled={!open || you.marks < BAIL_MARKS}
          >
            {you.lien > 0 ? `Bail bond · ${BAIL_MARKS} Mk` : you.bondReady ? "Bond ready" : `Prepay bail · ${BAIL_MARKS} Mk`}
          </Button>
          <p className="mt-3 text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Pawn skins</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {COSMETIC_SKINS.map((item) => {
              const owned = city.unlockedSkins.includes(item.id);
              const on = you.pawnSkin === item.id;
              return (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={on ? "primary" : "ghost"}
                  className="min-h-11"
                  disabled={!open || (!owned && you.marks < item.cost)}
                  onClick={() => unlockCosmetic("skin", item.id)}
                >
                  {item.label}
                  {owned ? "" : ` · ${item.cost}`}
                </Button>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Board themes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {COSMETIC_THEMES.map((item) => {
              const owned = city.unlockedThemes.includes(item.id);
              const on = city.boardTheme === item.id;
              return (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={on ? "primary" : "ghost"}
                  className="min-h-11"
                  disabled={!open || (!owned && you.marks < item.cost)}
                  onClick={() => unlockCosmetic("theme", item.id)}
                >
                  {item.label}
                  {owned ? "" : ` · ${item.cost}`}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {queued.length > 0 && (
        <p className="mt-2 text-xs text-good">Queued builds: {queued.map((id) => spaceAt(id).short).join(", ")}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="min-w-[8.5rem] flex-1" variant="go" onClick={commitRoll} disabled={!open}>
          Roll dice
        </Button>
        <Button variant="secondary" className="flex-1" onClick={commitPass} disabled={!open}>
          Rest
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle tabular-nums">
        {open ? `${Math.ceil(left / 1000)}s left · auto-rest if the window closes` : "Settling"}
      </p>
      {lastMetric && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-fg-subtle">
          <div>
            e{lastMetric.epoch} gini{" "}
            <span className="tabular-nums text-fg">{lastMetric.gini.toFixed(3)}</span>
          </div>
          <div>
            cash{" "}
            <span className="tabular-nums text-fg">
              +{lastMetric.cashMinted}/−{lastMetric.cashBurned}
            </span>
          </div>
          <div>
            marks{" "}
            <span className="tabular-nums text-fg">
              +{lastMetric.marksMinted}/−{lastMetric.marksBurned}
            </span>
          </div>
          <div>
            liens{" "}
            <span className="tabular-nums text-fg">
              {lastMetric.lienSeats}
              {lastMetric.lienStreakMax ? ` · streak ${lastMetric.lienStreakMax}` : ""}
              {lastMetric.lienRecovered ? ` · recovered ${lastMetric.lienRecovered}` : ""}
              {lastMetric.amnestyPaid ? ` · amnesty ${lastMetric.amnestyPaid}` : ""}
            </span>
          </div>
        </dl>
      )}

      {selected != null && (
        <div className="mt-3">
          <EpochDeedCard city={city} spaceId={selected} onBuild={toggleBuild} onSell={sellDeed} onOffer={offerBuy} />
        </div>
      )}

      <ol className="mt-3 space-y-1 lg:hidden">
        {city.log
          .slice(-4)
          .reverse()
          .map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "text-xs text-fg-muted",
                entry.tone === "good" && "text-good",
                entry.tone === "bad" && "text-bad",
                entry.tone === "system" && "text-fg",
              )}
            >
              {entry.text}
            </li>
          ))}
      </ol>
    </section>
  );
}
