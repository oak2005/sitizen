import type { EpochCity } from "@/game/epoch/types";
import { cn } from "@/lib/utils";

export function EpochLog({ city }: { city: EpochCity }) {
  const entries = city.log.slice(-16).reverse();
  return (
    <section className="hidden min-h-0 flex-1 flex-col rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4 lg:flex">
      <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Table talk</p>
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
