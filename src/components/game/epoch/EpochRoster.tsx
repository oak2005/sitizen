import { CIRCUIT_SPACES, districtSpaces, isPurchasable, tableSquare } from "@/game/board";
import { deedAt } from "@/game/epoch/engine";
import { LAND_EPOCH, MAX_EPOCH, TIER_EPOCH, type EpochCity } from "@/game/epoch/types";
import { groupClass } from "@/game/tokens";
import { cn } from "@/lib/utils";
import { useEpochStore } from "@/game/epoch/store";

export function EpochRoster({ city, nested = false }: { city: EpochCity; nested?: boolean }) {
  const select = useEpochStore((s) => s.select);
  const selected = useEpochStore((s) => s.selected);
  const lots = [...CIRCUIT_SPACES, ...districtSpaces(city.districtTier)].filter(isPurchasable);
  const yours = lots.filter((s) => deedAt(city, s.id)?.ownerId === "you");

  return (
    <section className={cn(!nested && "rounded-[var(--radius-md)] border border-border bg-bg-elevated p-3")}>
      <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">City deeds · {lots.length} lots</p>
      {yours.length > 0 && (
        <p className="mt-1 text-xs text-fg-muted">
          You hold {yours.length}: {yours.map((s) => s.short).join(", ")}
        </p>
      )}
      <ul className="mt-2 max-h-48 space-y-1 overflow-auto pr-1 text-sm">
        {lots.map((space) => {
          const deed = deedAt(city, space.id);
          const owner = deed ? city.players.find((p) => p.id === deed.ownerId) : undefined;
          return (
            <li key={space.id}>
              <button
                type="button"
                onClick={() => select(space.id)}
                className={cn(
                  "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left hover:bg-bg-subtle sm:min-h-0",
                  selected === space.id && "bg-bg-subtle",
                )}
              >
                <span className={cn("size-2.5 shrink-0 rounded-sm", space.group ? groupClass(space.group) : "bg-fg-subtle")} />
                <span className="min-w-0 flex-1 truncate text-fg">{space.name}</span>
                <span className="shrink-0 text-[11px] text-fg-subtle tabular-nums">
                  {owner ? owner.name : "—"}
                  {deed && deed.houses > 0 ? ` · ${deed.houses === 5 ? "H" : deed.houses}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-fg-subtle">
        {city.districtTier > 0
          ? `${tableSquare(city.districtTier).name} holds Founders plus ${city.districtTier} later row${city.districtTier === 1 ? "" : "s"} on one square · ${40 + 4 * city.districtTier} spaces. Next board after epoch ${Math.min(MAX_EPOCH, (city.districtTier + 1) * LAND_EPOCH)}.`
          : `One new seat every ${TIER_EPOCH} epochs. A new square every ${LAND_EPOCH} epochs through ${MAX_EPOCH}, holding every previous lot on the same table.`}
      </p>
    </section>
  );
}
