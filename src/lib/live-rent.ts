import { GROUPS, spaceAt } from "@/game/board";
import { HOUSE_MULT, MAX_HOUSES } from "@/game/epoch/types";

export function liveRentStx(opts: {
  spaceId: number;
  houses: number;
  owner: string;
  owners: Map<number, { owner: string | null; houses: number }>;
  loop: number;
  dice: number;
}): number {
  const space = spaceAt(opts.spaceId);
  if (!space || opts.spaceId >= opts.loop) return 0;
  if (space.kind === "transit") {
    const n = GROUPS.transit.filter((id) => opts.owners.get(id)?.owner === opts.owner).length;
    return 25 * 2 ** Math.max(0, n - 1);
  }
  if (space.kind === "utility") {
    const n = GROUPS.utility.filter((id) => id < opts.loop && opts.owners.get(id)?.owner === opts.owner).length;
    return (n >= 2 ? 10 : 4) * Math.max(1, opts.dice);
  }
  const base = space.rent ?? 0;
  const group = space.group;
  const set =
    Boolean(group) &&
    group !== "transit" &&
    group !== "utility" &&
    (GROUPS[group ?? ""] ?? []).every((id) => opts.owners.get(id)?.owner === opts.owner);
  const houses = Math.min(MAX_HOUSES, Math.max(0, Math.floor(opts.houses)));
  return base * (set ? 2 : 1) * (HOUSE_MULT[houses] ?? 1);
}
