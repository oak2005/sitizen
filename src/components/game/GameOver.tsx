import { netWorth } from "@/game/engine";
import { useGameStore } from "@/game/store";
import { TOKEN_CLASS } from "@/game/tokens";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GameOver() {
  const game = useGameStore((s) => s.game);
  const toMenu = useGameStore((s) => s.toMenu);
  if (!game || game.phase !== "game_over") return null;
  const winner = game.players.find((p) => p.id === game.winnerId);
  const human = game.players.find((p) => p.isHuman);
  const youWin = winner?.isHuman === true;
  const ranked = [...game.players].sort((a, b) => netWorth(game, b.id) - netWorth(game, a.id));

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/80 px-4">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-6 shadow-[0_24px_60px_rgb(0_0_0/0.4)]">
        <p className="text-[11px] tracking-[0.2em] text-fg-subtle uppercase">Bankruptcy</p>
        <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">
          {youWin ? "You own the city" : `${winner?.name ?? "A rival"} wins`}
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          {youWin
            ? "A player went broke. You held the highest net worth."
            : human?.bankrupt
              ? "You went bankrupt. The remaining fortune went to the stronger estate."
              : "A rival posted the higher net worth after the table lost a player."}
        </p>
        <ol className="mt-5 space-y-2">
          {ranked.map((player, i) => (
            <li key={player.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-bg-subtle px-3 py-2">
              <span className="w-4 text-xs text-fg-subtle tabular-nums">{i + 1}</span>
              <span className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold uppercase", TOKEN_CLASS[player.token])}>
                {player.name.slice(0, 1)}
              </span>
              <span className="flex-1 truncate text-sm">{player.name}</span>
              <span className="text-sm tabular-nums text-fg-muted">${netWorth(game, player.id)}</span>
            </li>
          ))}
        </ol>
        <Button className="mt-6 w-full" size="lg" onClick={toMenu}>
          Play again
        </Button>
      </div>
    </div>
  );
}
