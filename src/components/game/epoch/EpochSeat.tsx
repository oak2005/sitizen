import { deedsOf } from "@/game/epoch/engine";
import type { EpochCity, EpochPlayer } from "@/game/epoch/types";
import { TOKEN_CLASS, pawnSkinClass } from "@/game/tokens";
import { cn } from "@/lib/utils";

export function EpochSeat({
  city,
  player,
  compact = false,
  className,
}: {
  city: EpochCity;
  player: EpochPlayer;
  compact?: boolean;
  className?: string;
}) {
  const lots = deedsOf(city, player.id).length;
  if (compact) {
    return (
      <div
        className={cn(
          "flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg-elevated/95 px-2 py-1",
          player.isHuman && "border-fg/30",
          className,
        )}
      >
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-[10px] font-semibold uppercase",
            TOKEN_CLASS[player.token],
            pawnSkinClass(player.pawnSkin),
          )}
        >
          {player.name.slice(0, 1)}
        </span>
        <span className="max-w-[4.5rem] truncate text-xs font-medium">{player.name}</span>
        <span className="text-xs font-semibold tabular-nums">${player.cash}</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full border border-border bg-bg-elevated/92 px-2.5 py-2",
        player.isHuman && "border-fg/30",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full text-sm font-semibold uppercase ring-2 ring-bg",
          TOKEN_CLASS[player.token],
          pawnSkinClass(player.pawnSkin),
        )}
      >
        {player.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {player.name}
          {player.isHuman ? " · You" : ""}
        </p>
        <p className="text-[11px] text-fg-subtle">
          {player.inJail ? `Jail · lien $${player.lien}` : `${lots} deeds`}
        </p>
      </div>
      <p className="pr-1 text-sm font-semibold tabular-nums">${player.cash}</p>
    </div>
  );
}
