import type { NamedGroupId, TokenId } from "./types";

export const TOKEN_CLASS: Record<TokenId, string> = {
  ivory: "bg-token-ivory text-accent-fg",
  rust: "bg-token-rust text-fg",
  steel: "bg-token-steel text-fg",
  pine: "bg-token-pine text-fg",
  clay: "bg-group-clay text-fg",
  gold: "bg-group-sand text-accent-fg",
  dusk: "bg-group-navy text-fg",
  rose: "bg-group-rose text-fg",
  navy: "bg-group-navy text-fg",
  wine: "bg-group-brick text-fg",
};

export const TOKEN_HEX: Record<TokenId, string> = {
  ivory: "#f3ead8",
  rust: "#b24a40",
  steel: "#6a8494",
  pine: "#3d6b4f",
  clay: "#c56e45",
  gold: "#9a8b52",
  dusk: "#2c3d6b",
  rose: "#b88193",
  navy: "#2c3d6b",
  wine: "#7a2e3a",
};

export const PAWN_SKIN_CLASS: Record<string, string> = {
  gilt: "ring-2 ring-group-amber",
  onyx: "ring-2 ring-tile-ink",
  jade: "ring-2 ring-group-pine",
};

export function pawnSkinClass(skin: string | null | undefined): string {
  if (!skin) return "";
  return PAWN_SKIN_CLASS[skin] ?? "";
}

export const GROUP_CLASS: Record<NamedGroupId, string> = {
  brown: "bg-group-brown",
  sky: "bg-group-sky",
  rose: "bg-group-rose",
  clay: "bg-group-clay",
  brick: "bg-group-brick",
  sand: "bg-group-sand",
  pine: "bg-group-pine",
  navy: "bg-group-navy",
  amber: "bg-group-amber",
  iris: "bg-group-iris",
  frost: "bg-group-frost",
  plum: "bg-group-plum",
  moss: "bg-group-moss",
  transit: "bg-group-transit",
  utility: "bg-group-utility",
};

const ROW_PALETTE = [
  "bg-group-amber",
  "bg-group-iris",
  "bg-group-frost",
  "bg-group-plum",
  "bg-group-moss",
  "bg-group-brick",
  "bg-group-sand",
  "bg-group-clay",
  "bg-group-sky",
  "bg-group-rose",
] as const;

export function groupClass(group: string | undefined): string {
  if (!group) return "bg-group-utility";
  if (group in GROUP_CLASS) return GROUP_CLASS[group as NamedGroupId];
  const n = Number(String(group).replace(/^row-/, ""));
  if (Number.isFinite(n) && n > 0) return ROW_PALETTE[(n - 1) % ROW_PALETTE.length]!;
  return "bg-group-utility";
}
