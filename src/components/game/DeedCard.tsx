import { GROUP_LABEL, spaceAt } from "@/game/board";
import { calcRent, ownsGroup } from "@/game/engine";
import { groupClass } from "@/game/tokens";
import { SET_RENT_MULT, type GameState } from "@/game/types";
import { cn } from "@/lib/utils";

export function DeedCard({ game, spaceId }: { game: GameState; spaceId: number }) {
  const space = spaceAt(spaceId);
  const owner = game.players.find((p) => p.id === game.owners[spaceId]);
  const rent = owner ? calcRent(game, spaceId, game.dice[0] + game.dice[1] || 7) : (space.rent ?? 0);
  const monopoly = Boolean(space.group && owner && ownsGroup(game, owner.id, space.group));

  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-tile-line bg-tile text-tile-ink shadow-[0_12px_28px_rgb(0_0_0/0.18)]">
      {space.group && <div className={cn("h-3", groupClass(space.group))} />}
      <div className="p-3">
        <p className="text-[10px] tracking-[0.16em] text-tile-muted uppercase">
          {space.group ? GROUP_LABEL[space.group] : space.kind}
        </p>
        <h3 className="font-display text-lg font-semibold tracking-tight">{space.name}</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {space.price ? (
            <>
              <dt className="text-tile-muted">Price</dt>
              <dd className="text-right tabular-nums">${space.price}</dd>
            </>
          ) : null}
          {space.kind === "property" && (
            <>
              <dt className="text-tile-muted">Rent</dt>
              <dd className="text-right tabular-nums">${space.rent}</dd>
              <dt className="text-tile-muted">Full row</dt>
              <dd className="text-right tabular-nums">${(space.rent ?? 0) * SET_RENT_MULT}</dd>
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
              <dd className="text-right">4× or 10× dice</dd>
            </>
          )}
          {space.tax ? (
            <>
              <dt className="text-tile-muted">Tax</dt>
              <dd className="text-right tabular-nums">${space.tax}</dd>
            </>
          ) : null}
          <dt className="text-tile-muted">Owner</dt>
          <dd className="truncate text-right">{owner?.name ?? "Unowned"}</dd>
          {owner && isFinite(rent) && space.price ? (
            <>
              <dt className="text-tile-muted">Current rent</dt>
              <dd className="text-right tabular-nums">${rent}</dd>
            </>
          ) : null}
        </dl>
        {monopoly && <p className="mt-2 text-xs text-tile-muted">This row is complete — rent is doubled.</p>}
      </div>
    </article>
  );
}
