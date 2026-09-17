import { useGameStore } from "@/game/store";
import { cn } from "@/lib/utils";

export function LogFeed() {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const entries = game.log.slice(-12).reverse();
  return (
    <section className="hidden min-h-0 flex-1 flex-col rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4 lg:flex">
      <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Ledger</p>
      <ol className="mt-2 space-y-1.5 overflow-auto text-sm">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              "text-fg-muted",
              entry.tone === "good" && "text-good",
              entry.tone === "bad" && "text-bad",
              entry.tone === "system" && "text-fg",
            )}
          >
            {entry.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
