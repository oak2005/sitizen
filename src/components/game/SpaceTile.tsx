import { ArrowRight, Droplets, Landmark, Lightbulb, Lock, ScrollText, Shuffle, TrainFront, Trees, Zap } from "lucide-react";
import { LOOP, spaceSide } from "@/game/board";
import { groupClass, TOKEN_CLASS } from "@/game/tokens";
import { cn } from "@/lib/utils";
import type { SpaceDef } from "@/game/types";
import { TokenStack, type TokenBearer } from "./Tokens";

function CornerArt({ space, goNote }: { space: SpaceDef; goNote?: string }) {
  if (space.kind === "go") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-0.5 overflow-hidden p-0.5 text-center">
        <ArrowRight className="size-3.5 sm:size-5" strokeWidth={2.2} />
        <span className="font-display text-[8px] font-semibold tracking-wide sm:text-[11px]">GO</span>
        <span className="hidden text-[8px] text-tile-muted sm:block">{goNote ?? "Collect $200"}</span>
      </div>
    );
  }
  if (space.kind === "jail") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-0.5 overflow-hidden p-0.5 text-center">
        <Lock className="size-3.5 sm:size-5" />
        <span className="font-display text-[8px] font-semibold sm:text-[11px]">Jail</span>
        <span className="hidden text-[8px] text-tile-muted sm:block">Visiting</span>
      </div>
    );
  }
  if (space.kind === "park") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-0.5 overflow-hidden p-0.5 text-center">
        <Trees className="size-3.5 sm:size-5" />
        <span className="font-display text-[8px] font-semibold sm:text-[11px]">Park</span>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-0.5 overflow-hidden p-0.5 text-center">
      <Landmark className="size-3.5 sm:size-5" />
      <span className="font-display text-[8px] font-semibold leading-tight sm:text-[11px]">Go to Jail</span>
    </div>
  );
}

function KindIcon({ space }: { space: SpaceDef }) {
  if (space.kind === "chance") return <Shuffle className="size-2.5 sm:size-3.5" />;
  if (space.kind === "fortune") return <ScrollText className="size-2.5 sm:size-3.5" />;
  if (space.kind === "transit") return <TrainFront className="size-2.5 sm:size-3.5" />;
  if (space.kind === "utility") {
    if (space.id === 14) return <Zap className="size-2.5 sm:size-3.5" />;
    if (space.id === 29) return <Droplets className="size-2.5 sm:size-3.5" />;
    return <Lightbulb className="size-2.5 sm:size-3.5" />;
  }
  return null;
}

function HousePips({ houses, side }: { houses: number; side: ReturnType<typeof spaceSide> }) {
  if (houses <= 0) return null;
  const hotel = houses >= 5;
  return (
    <span
      aria-hidden
      className={cn(
        "absolute z-[2] flex items-center gap-px",
        side === "bottom" && "top-[3%] left-1/2 -translate-x-1/2",
        side === "top" && "bottom-[3%] left-1/2 -translate-x-1/2",
        side === "left" && "top-1/2 right-[3%] -translate-y-1/2 flex-col",
        side === "right" && "top-1/2 left-[3%] -translate-y-1/2 flex-col",
        side === "corner" && "top-0.5 left-0.5",
      )}
    >
      {hotel ? (
        <span className="h-1.5 w-3 rounded-[1px] bg-tile sm:h-2 sm:w-4" />
      ) : (
        Array.from({ length: houses }, (_, i) => (
          <span key={i} className="size-1 rounded-[1px] bg-tile sm:size-1.5" />
        ))
      )}
    </span>
  );
}

export function SpaceTile({
  space,
  col,
  row,
  occupants,
  ownedBy,
  selected,
  current,
  onSelect,
  houses = 0,
  goNote,
  loop = LOOP,
  fresh = false,
  dense = false,
  className,
}: {
  space: SpaceDef;
  col?: number;
  row?: number;
  occupants: TokenBearer[];
  ownedBy: TokenBearer | null;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
  houses?: number;
  goNote?: string;
  loop?: number;
  fresh?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const side = spaceSide(space.id, loop);
  const special =
    space.kind === "go" || space.kind === "jail" || space.kind === "park" || space.kind === "gotojail";
  const cornerArt = side === "corner" && special;
  const barClass = space.group ? groupClass(space.group) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={col && row ? { gridColumn: col, gridRow: row } : undefined}
      aria-label={houses > 0 ? `${space.name}, ${houses >= 5 ? "hotel" : `${houses} houses`}` : space.name}
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden bg-tile text-tile-ink",
        "border border-tile-line/80",
        current && "z-10 ring-2 ring-inset ring-tile-ink",
        selected && "z-10 ring-2 ring-inset ring-group-clay",
        fresh && "z-[2] ring-1 ring-inset ring-group-amber",
        side === "corner" && "z-[1]",
        className,
      )}
    >
      {barClass && (side === "bottom" || (side === "corner" && !special)) && (
        <span className={cn("absolute inset-x-0 top-0 h-[22%]", barClass)} />
      )}
      {barClass && side === "top" && <span className={cn("absolute inset-x-0 bottom-0 h-[22%]", barClass)} />}
      {barClass && side === "left" && <span className={cn("absolute inset-y-0 right-0 w-[22%]", barClass)} />}
      {barClass && side === "right" && <span className={cn("absolute inset-y-0 left-0 w-[22%]", barClass)} />}

      <HousePips houses={houses} side={side} />

      {ownedBy && (
        <span
          className={cn(
            "absolute z-[2] size-1.5 rounded-full ring-1 ring-tile sm:size-2",
            TOKEN_CLASS[ownedBy.token],
            side === "bottom" && "right-0.5 bottom-0.5",
            side === "top" && "top-0.5 left-0.5",
            side === "left" && "top-0.5 left-0.5",
            side === "right" && "right-0.5 bottom-0.5",
            side === "corner" && "top-0.5 right-0.5",
          )}
        />
      )}

      {cornerArt ? (
        <CornerArt space={space} goNote={goNote} />
      ) : (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-px overflow-hidden px-0.5",
            side === "left" && "[writing-mode:vertical-rl] rotate-180",
            side === "right" && "[writing-mode:vertical-rl]",
          )}
        >
          {!dense && <KindIcon space={space} />}
          <span
            className={cn(
              "max-w-full truncate font-display font-semibold leading-tight",
              dense ? "text-[6px] sm:text-[7px]" : "text-[7px] sm:text-[9px] md:text-[10px]",
            )}
          >
            {space.short}
          </span>
          {space.price && !dense ? (
            <span className="hidden text-[8px] tabular-nums text-tile-muted sm:inline">${space.price}</span>
          ) : null}
          {space.tax && !dense ? (
            <span className="hidden text-[8px] tabular-nums text-tile-muted sm:inline">${space.tax}</span>
          ) : null}
        </div>
      )}

      {occupants.length > 0 && (
        <div
          className={cn(
            "absolute z-20",
            side === "bottom" && "bottom-0.5 left-0.5",
            side === "top" && "top-0.5 right-0.5",
            side === "left" && "bottom-0.5 left-0.5",
            side === "right" && "top-0.5 right-0.5",
            side === "corner" && "bottom-1 left-1/2 -translate-x-1/2",
          )}
        >
          <TokenStack players={occupants} compact />
        </div>
      )}
    </button>
  );
}
