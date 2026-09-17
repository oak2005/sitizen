import { deedsOf, netWorth } from "@/game/epoch/engine";
import type { EpochCity } from "@/game/epoch/types";
import { TOKEN_CLASS, pawnSkinClass } from "@/game/tokens";
import { cn } from "@/lib/utils";

export function EpochPlayers({ city }: { city: EpochCity }) {
  const ranked = [...city.players].sort((a, b) => netWorth(city, b.id) - netWorth(city, a.id));
  return (
    <section className="rounded-[var(--radius-md)] border border-border bg-bg-elevated p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Standings</p>
        <p className="text-[11px] text-fg-subtle tabular-nums">{city.players.length} seats</p>
      </div>
      <ol className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
        {ranked.map((player, i) => {
          return (
            <li
              key={player.id}
              className={cn("flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1.5", player.isHuman && "bg-bg-subtle")}
            >
              <span className="w-4 shrink-0 text-[11px] text-fg-subtle tabular-nums">{i + 1}</span>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold uppercase", TOKEN_CLASS[player.token], pawnSkinClass(player.pawnSkin))}>
                {player.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {player.name}
                  {player.isHuman ? " · You" : ""}
                </p>
                <p className="truncate text-[11px] text-fg-subtle">
                  {player.inJail ? `Jail · $${player.lien}` : `${deedsOf(city, player.id).length} deeds`}
                </p>
              </div>
              <p className="shrink-0 text-right text-sm font-medium tabular-nums">
                ${player.cash}
                {player.marks > 0 ? (
                  <span className="block text-[10px] font-normal text-fg-subtle">{player.marks} Mk</span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
