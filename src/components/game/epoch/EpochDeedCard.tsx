import { useState } from "react";
import { groupLabel, lotsOfGroup, spaceAt } from "@/game/board";
import {
  canBuildOn,
  deedAt,
  deedTokenId,
  epochRent,
  houseCost,
  missingForGroup,
  rentLadder,
  salvageValue,
} from "@/game/epoch/engine";
import { HOUSE_MULT, MAX_HOUSES, type EpochCity } from "@/game/epoch/types";
import { groupClass } from "@/game/tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EpochDeedCard({
  city,
  spaceId,
  onBuild,
  onSell,
  onOffer,
}: {
  city: EpochCity;
  spaceId: number;
  onBuild?: (spaceId: number) => void;
  onSell?: (spaceId: number) => void;
  onOffer?: (spaceId: number, price: number) => void;
}) {
  const space = spaceAt(spaceId);
  const deed = deedAt(city, spaceId);
  const owner = deed ? city.players.find((p) => p.id === deed.ownerId) : undefined;
  const you = city.players.find((p) => p.isHuman);
  const yours = Boolean(you && deed && deed.ownerId === you.id);
  const queued = you ? (city.intents.you?.builds.includes(spaceId) ?? false) : false;
  const buildable = you ? canBuildOn(city, you.id, spaceId) : false;
  const houses = deed?.houses ?? 0;
  const rentNow = deed ? epochRent(city, spaceId, city.dice[0] + city.dice[1] || 7) : (space.rent ?? 0);
  const salvage = deed ? salvageValue(deed) : 0;
  const cost = houseCost(spaceId);
  const outgoing = you ? city.offers.find((o) => o.fromId === you.id && o.spaceId === spaceId) : undefined;
  const missing =
    space.group && space.group !== "transit" && space.group !== "utility" && you
      ? missingForGroup(city, you.id, space.group)
      : [];
  const [price, setPrice] = useState(String(space.price ?? 100));

  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-tile-line bg-tile text-tile-ink shadow-[0_12px_28px_rgb(0_0_0/0.18)]">
      {space.group && <div className={cn("h-3", groupClass(space.group))} />}
      <div className="p-3">
        <p className="text-[10px] tracking-[0.16em] text-tile-muted uppercase">
          {deed ? deed.tokenId : deedTokenId(spaceId)} · {space.group ? groupLabel(space.group) : space.kind}
        </p>
        <h3 className="font-display text-lg font-semibold tracking-tight">{space.name}</h3>
        <p className={cn("mt-1 text-sm", owner ? "text-tile-ink" : "text-tile-muted")}>
          {owner ? `Held by ${owner.name}${owner.isHuman ? " (you)" : ""}` : "Unowned — no one has minted this deed"}
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {space.price ? (
            <>
              <dt className="text-tile-muted">Land</dt>
              <dd className="text-right tabular-nums">${space.price}</dd>
            </>
          ) : null}
          {space.kind === "property" && (
            <>
              <dt className="text-tile-muted">Houses</dt>
              <dd className="text-right tabular-nums">{houses >= MAX_HOUSES ? "Hotel" : houses}</dd>
              <dt className="text-tile-muted">Rent now</dt>
              <dd className="text-right tabular-nums">${rentNow}</dd>
              {houses < MAX_HOUSES && space.price ? (
                <>
                  <dt className="text-tile-muted">Next house</dt>
                  <dd className="text-right tabular-nums">
                    ${cost} · ×{HOUSE_MULT[houses + 1]}
                  </dd>
                </>
              ) : null}
            </>
          )}
          {space.kind === "transit" && (
            <>
              <dt className="text-tile-muted">1 / 2 / 3 / 4</dt>
              <dd className="text-right tabular-nums">$25 / 50 / 100 / 200</dd>
            </>
          )}
          {space.kind === "utility" && (
            <>
              <dt className="text-tile-muted">Rent</dt>
              <dd className="text-right">4×, then +6× per extra plant</dd>
            </>
          )}
        </dl>
        {space.kind === "property" && (
          <ul className="mt-2 space-y-0.5 text-xs text-tile-muted">
            {rentLadder(spaceId).map((row) => (
              <li key={row.label} className="flex justify-between gap-2">
                <span>{row.label}</span>
                <span className="tabular-nums text-tile-ink">${row.amount}</span>
              </li>
            ))}
          </ul>
        )}
        {space.kind === "property" && space.group && missing.length > 0 && yours && (
          <p className="mt-2 text-xs text-tile-muted">
            Own the full {groupLabel(space.group)} ({lotsOfGroup(space.group).map((id) => spaceAt(id).short).join(", ")})
            before houses. Still need {missing.map((id) => spaceAt(id).short).join(", ")}.
          </p>
        )}
        {space.kind === "property" && space.group && missing.length === 0 && yours && (
          <p className="mt-2 text-xs text-tile-muted">Row complete. Houses raise rent on this deed and travel with it.</p>
        )}

        {yours && (
          <div className="mt-3 flex flex-wrap gap-2">
            {onBuild && space.kind === "property" && (buildable || queued) && (
              <Button type="button" size="sm" variant={queued ? "secondary" : "primary"} onClick={() => onBuild(spaceId)}>
                {queued ? "Queued this epoch" : `Queue house $${cost}`}
              </Button>
            )}
            {onSell && (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      `Salvage ${deed?.tokenId} and its ${houses} improvement${houses === 1 ? "" : "s"} for $${salvage}? Houses leave with the land.`,
                    )
                  ) {
                    onSell(spaceId);
                  }
                }}
              >
                Bank salvage ${salvage}
              </Button>
            )}
          </div>
        )}

        {!yours && deed && onOffer && you && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-tile-muted">
              Ask {owner?.name} to sell. They review next epoch — you will not know this window.
            </p>
            {outgoing ? (
              <p className="text-sm text-tile-ink">Offer of ${outgoing.price} is waiting on {owner?.name}.</p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-9 w-24 rounded-[var(--radius-sm)] border border-tile-line bg-tile px-2 text-sm text-tile-ink tabular-nums"
                  aria-label="Offer price"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onOffer(spaceId, Number(price))}
                  disabled={Number(price) < 1 || (you.cash < Number(price))}
                >
                  Offer to buy
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
