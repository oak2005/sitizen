import { netWorth, ownedCount } from "@/game/engine";
import { useGameStore } from "@/game/store";
import { TOKEN_CLASS } from "@/game/tokens";
import { cn } from "@/lib/utils";

export function PlayerList() {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-1">
      {game.players.map((player, index) => {
        const active = index === game.current && game.phase !== "game_over";
        return (
          <div
            key={player.id}
            className={cn(
              "rounded-[var(--radius-md)] border bg-bg-elevated p-3",
              active ? "border-fg/30" : "border-border",
              player.bankrupt && "opacity-50",
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold uppercase", TOKEN_CLASS[player.token])}>
                {player.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {player.name}
                  {player.isHuman ? " · You" : ""}
                </p>
                <p className="text-[11px] text-fg-subtle">
                  {player.bankrupt
                    ? "Bankrupt"
                    : player.inJail
                      ? "In jail"
                      : `${ownedCount(game, player.id)} deeds`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium tabular-nums">${player.money}</p>
                <p className="text-[11px] text-fg-subtle tabular-nums">${netWorth(game, player.id)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
