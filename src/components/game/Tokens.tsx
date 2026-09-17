import { cn } from "@/lib/utils";
import { TOKEN_CLASS, pawnSkinClass } from "@/game/tokens";
import type { TokenId } from "@/game/types";

export type TokenBearer = { id: string; name: string; token: TokenId; pawnSkin?: string | null };

export function TokenStack({ players, compact }: { players: TokenBearer[]; compact?: boolean }) {
  if (players.length === 0) return null;
  const shown = players.slice(0, 4);
  const extra = players.length - shown.length;
  return (
    <div className={cn("grid grid-cols-2 gap-px", compact ? "w-7" : "w-9")}>
      {shown.map((player) => (
        <span
          key={player.id}
          title={player.name}
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold uppercase ring-1 ring-tile-ink/50",
            compact ? "size-3.5 text-[7px]" : "size-4 text-[8px] sm:size-5 sm:text-[9px]",
            TOKEN_CLASS[player.token],
            player.token === "ivory" && "ring-tile-ink",
            pawnSkinClass(player.pawnSkin),
          )}
        >
          {player.name.slice(0, 1)}
        </span>
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-tile-line font-semibold text-tile-ink ring-1 ring-tile-ink/50",
            compact ? "size-3.5 text-[7px]" : "size-4 text-[8px] sm:size-5 sm:text-[9px]",
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
