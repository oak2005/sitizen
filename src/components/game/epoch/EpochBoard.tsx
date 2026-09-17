import { includedSquares, sideSlots, spaceAt, tableSquare } from "@/game/board";
import { computersReady, loopSize, remainingMs } from "@/game/epoch/engine";
import { MARKS_PER_GO, MAX_EPOCH, TIER_EPOCH, LAND_EPOCH, type EpochCity } from "@/game/epoch/types";
import { useEpochStore } from "@/game/epoch/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DicePair } from "../Dice";
import { SpaceTile } from "../SpaceTile";

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function EdgeTiles({
  ids,
  city,
  loop,
  direction,
}: {
  ids: number[];
  city: EpochCity;
  loop: number;
  direction: "top" | "right" | "bottom" | "left";
}) {
  const selected = useEpochStore((s) => s.selected);
  const select = useEpochStore((s) => s.select);
  const occupants = (id: number) => city.players.filter((p) => p.position === id);
  const dense = ids.length > 12;
  const newest = city.districtTier > 0 ? city.districtTier : 0;
  const freshFrom = newest > 0 ? 40 + (newest - 1) * 4 : -1;
  const freshTo = newest > 0 ? freshFrom + 3 : -1;

  return (
    <div
      className={cn(
        "flex h-full w-full min-h-0 min-w-0",
        direction === "top" && "flex-row",
        direction === "bottom" && "flex-row-reverse",
        direction === "left" && "flex-col-reverse",
        direction === "right" && "flex-col",
      )}
    >
      {ids.map((id) => {
        const space = spaceAt(id);
        const deed = city.deeds.find((d) => d.spaceId === id);
        const ownedBy = deed ? (city.players.find((p) => p.id === deed.ownerId) ?? null) : null;
        return (
          <SpaceTile
            key={id}
            space={space}
            occupants={occupants(id)}
            ownedBy={ownedBy}
            selected={selected === id}
            current={false}
            houses={deed?.houses ?? 0}
            loop={loop}
            dense={dense}
            fresh={id >= freshFrom && id <= freshTo}
            onSelect={() => select(selected === id ? null : id)}
            className="min-h-0 min-w-0 flex-1"
          />
        );
      })}
    </div>
  );
}

function CornerTile({
  id,
  city,
  loop,
  col,
  row,
}: {
  id: number;
  city: EpochCity;
  loop: number;
  col: number;
  row: number;
}) {
  const selected = useEpochStore((s) => s.selected);
  const select = useEpochStore((s) => s.select);
  const space = spaceAt(id);
  const deed = city.deeds.find((d) => d.spaceId === id);
  const ownedBy = deed ? (city.players.find((p) => p.id === deed.ownerId) ?? null) : null;
  const occupants = city.players.filter((p) => p.position === id);
  return (
    <SpaceTile
      space={space}
      col={col}
      row={row}
      occupants={occupants}
      ownedBy={ownedBy}
      selected={selected === id}
      current={false}
      houses={deed?.houses ?? 0}
      loop={loop}
      goNote={`${MARKS_PER_GO} Marks`}
      onSelect={() => select(selected === id ? null : id)}
    />
  );
}

export function EpochBoard({ city }: { city: EpochCity }) {
  const now = useEpochStore((s) => s.now);
  const commitRoll = useEpochStore((s) => s.commitRoll);
  const left = remainingMs(city, now);
  const ready = computersReady(city);
  const open = city.phase === "open";
  const loop = loopSize(city);
  const square = tableSquare(city.districtTier);
  const edges = sideSlots(loop);
  const included = includedSquares(city.districtTier)
    .map((item) => item.name.replace(/ Square$/, ""))
    .join(" + ");
  const tilt = city.districtTier === 0;

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,56rem)]">
      <div
        className="gc-table gc-wood rounded-[1.25rem] p-2 shadow-[0_28px_70px_rgb(0_0_0/0.55)] sm:rounded-[1.6rem] sm:p-3"
        data-square={square.tone}
        data-theme={city.boardTheme || undefined}
      >
        <p className="mb-2 px-1 text-center text-[10px] tracking-[0.16em] text-fg-subtle uppercase sm:text-[11px]">
          {square.name}
          {city.districtTier > 0
            ? ` · this board holds ${included} · ${loop} spaces`
            : ` · ${loop} spaces`}
        </p>
        <div className={tilt ? "gc-tilt" : undefined}>
          <div
            className="gc-felt relative isolate grid min-w-0 overflow-hidden rounded-[0.9rem] sm:rounded-[1.05rem]"
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              gridTemplateColumns: "minmax(2.55rem, 12.2%) 1fr minmax(2.55rem, 12.2%)",
              gridTemplateRows: "minmax(2.55rem, 12.2%) 1fr minmax(2.55rem, 12.2%)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 z-[3] rounded-[0.9rem] shadow-[inset_0_0_0_6px_rgb(58_42_28/0.9)] sm:rounded-[1.05rem]" />
            <CornerTile id={20} city={city} loop={loop} col={1} row={1} />
            <div className="h-full min-h-0 min-w-0" style={{ gridColumn: 2, gridRow: 1 }}>
              <EdgeTiles ids={edges[2]} city={city} loop={loop} direction="top" />
            </div>
            <CornerTile id={30} city={city} loop={loop} col={3} row={1} />
            <div className="h-full min-h-0 min-w-0" style={{ gridColumn: 1, gridRow: 2 }}>
              <EdgeTiles ids={edges[1]} city={city} loop={loop} direction="left" />
            </div>
            <div
              className="relative z-0 flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden px-2 text-center sm:gap-1.5 sm:px-3"
              style={{ gridColumn: 2, gridRow: 2 }}
            >
              <p className="rounded-full border border-fg/15 bg-bg/40 px-2 py-0.5 text-[9px] tracking-[0.14em] text-fg-subtle uppercase backdrop-blur-sm sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
                {square.name} · {square.from}–{square.to}
              </p>
              <p className="font-display text-base font-semibold tracking-tight text-fg sm:text-[1.15rem] md:text-2xl">
                Sitizen
              </p>
              <p className={cn("font-display text-xl tabular-nums sm:text-2xl md:text-3xl", left <= 8000 ? "text-warn" : "text-fg")}>
                {clock(left)}
              </p>
              <p className="hidden max-w-[18rem] text-[10px] text-fg-subtle sm:block">
                {city.districtTier === 0 ? "Founders table" : `Holds ${included}`}
              </p>
              <DicePair values={city.dice} rolling={false} />
              <Button
                type="button"
                variant="go"
                size="lg"
                className="mt-0.5 min-h-11 min-w-[8.5rem] shadow-[0_8px_20px_rgb(0_0_0/0.35)] sm:min-w-[9.5rem]"
                onClick={commitRoll}
                disabled={!open}
              >
                Roll dice
              </Button>
              <p className="max-w-[18rem] text-[10px] leading-snug text-fg-muted sm:text-xs">
                {ready ? "Computers already committed." : "Waiting on computers."} Ops ${city.opsPool} · Community ${city.communityPool}
                {city.jackpot ? ` · Park $${city.jackpot}` : ""}
              </p>
              <p className="hidden max-w-[17rem] text-[10px] text-fg-subtle sm:block">
                {city.districtTier >= 50
                  ? `Final board · epoch ${MAX_EPOCH}`
                  : `+1 seat / ${TIER_EPOCH} · next board at epoch ${(city.districtTier + 1) * LAND_EPOCH}`}
              </p>
            </div>
            <div className="h-full min-h-0 min-w-0" style={{ gridColumn: 3, gridRow: 2 }}>
              <EdgeTiles ids={edges[3]} city={city} loop={loop} direction="right" />
            </div>
            <CornerTile id={10} city={city} loop={loop} col={1} row={3} />
            <div className="h-full min-h-0 min-w-0" style={{ gridColumn: 2, gridRow: 3 }}>
              <EdgeTiles ids={edges[0]} city={city} loop={loop} direction="bottom" />
            </div>
            <CornerTile id={0} city={city} loop={loop} col={3} row={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
