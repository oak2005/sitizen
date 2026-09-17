import { CIRCUIT_SPACES, spaceGrid } from "@/game/board";
import { currentPlayer } from "@/game/engine";
import { useGameStore } from "@/game/store";
import { DicePair } from "./Dice";
import { SpaceTile } from "./SpaceTile";

export function Board() {
  const game = useGameStore((s) => s.game);
  const rolling = useGameStore((s) => s.rolling);
  const selected = useGameStore((s) => s.selected);
  const select = useGameStore((s) => s.select);
  if (!game) return null;
  const turn = currentPlayer(game);
  const occupants = (id: number) => game.players.filter((p) => !p.bankrupt && p.position === id);

  return (
    <div className="mx-auto w-full max-w-[min(100%,42rem)]">
      <div
        className="relative grid aspect-square w-full overflow-hidden rounded-[var(--radius-md)] bg-felt shadow-[0_24px_48px_rgb(0_0_0/0.35)]"
        style={{
          gridTemplateColumns: "1.38fr repeat(9, 1fr) 1.38fr",
          gridTemplateRows: "1.38fr repeat(9, 1fr) 1.38fr",
        }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-md)] shadow-[inset_0_0_0_7px_var(--color-rail)]" />
        {CIRCUIT_SPACES.map((space) => {
          const { col, row } = spaceGrid(space.id);
          const ownerId = game.owners[space.id];
          const ownedBy = ownerId ? (game.players.find((p) => p.id === ownerId) ?? null) : null;
          return (
            <SpaceTile
              key={space.id}
              space={space}
              col={col}
              row={row}
              occupants={occupants(space.id)}
              ownedBy={ownedBy && !ownedBy.bankrupt ? ownedBy : null}
              selected={selected === space.id}
              current={turn.position === space.id && !turn.bankrupt}
              onSelect={() => select(selected === space.id ? null : space.id)}
            />
          );
        })}
        <div
          className="relative col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-center gap-2 bg-felt-deep px-3 text-center"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--color-felt) 70%, white) 0, var(--color-felt-deep) 62%)",
          }}
        >
          <div className="flex size-14 items-center justify-center rounded-full border border-fg/15 sm:size-20">
            <div className="size-8 rotate-45 border border-fg/25 sm:size-11" />
          </div>
          <p className="font-display text-[1.05rem] font-semibold tracking-tight text-fg sm:text-2xl">
            Sitizen
          </p>
          <p className="hidden text-[10px] tracking-[0.18em] text-fg-subtle uppercase sm:block">Own the city</p>
          <DicePair values={game.dice} rolling={rolling} />
          <p className="max-w-[16rem] truncate text-[10px] text-fg-muted sm:text-xs">
            {game.phase === "game_over"
              ? "Circuit complete"
              : `${turn.name}'s turn · Round ${game.round}`}
          </p>
        </div>
      </div>
    </div>
  );
}
