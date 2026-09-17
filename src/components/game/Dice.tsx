import { cn } from "@/lib/utils";

const PIPS: Record<number, string[]> = {
  1: ["c"],
  2: ["tl", "br"],
  3: ["tl", "c", "br"],
  4: ["tl", "tr", "bl", "br"],
  5: ["tl", "tr", "c", "bl", "br"],
  6: ["tl", "tr", "ml", "mr", "bl", "br"],
};

const POS: Record<string, string> = {
  tl: "top-[18%] left-[18%]",
  tr: "top-[18%] right-[18%]",
  ml: "top-1/2 left-[18%] -translate-y-1/2",
  mr: "top-1/2 right-[18%] -translate-y-1/2",
  bl: "bottom-[18%] left-[18%]",
  br: "bottom-[18%] right-[18%]",
  c: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

function Face({ value }: { value: number }) {
  const pips = PIPS[value] ?? PIPS[1];
  return (
    <div className="relative size-full rounded-[20%] bg-tile shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]">
      {pips!.map((p) => (
        <span key={p} className={cn("absolute size-[18%] rounded-full bg-tile-ink", POS[p])} />
      ))}
    </div>
  );
}

export function DicePair({
  values,
  rolling,
}: {
  values: [number, number];
  rolling: boolean;
}) {
  return (
    <div className="flex items-center gap-2" aria-label={`Dice ${values[0]} and ${values[1]}`}>
      {values.map((value, i) => (
        <div
          key={i}
          className={cn(
            "size-9 rounded-[20%] sm:size-11",
            rolling && "animate-spin",
          )}
        >
          <Face value={rolling ? ((i + value) % 6) + 1 : value} />
        </div>
      ))}
    </div>
  );
}
