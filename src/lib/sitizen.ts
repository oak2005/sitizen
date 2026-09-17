export const APP_NAME = "Sitizen";
export const TOKEN_SYMBOL = "SITZ";
export const DEED_PREFIX = "SZ";
export const LIVE_JOIN_USTX = 50_000_000n;
export const HUMANS_PER_DISTRICT = 8;
export const DISTRICT_GATES = [8, 16, 24] as const;

function readEnv(key: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const viteKey = key.replace(/^NEXT_PUBLIC_/, "VITE_");
  return String(env[key] ?? env[viteKey] ?? "").trim();
}

function readNetwork(): "testnet" | "mainnet" {
  const raw = readEnv("NEXT_PUBLIC_STACKS_NETWORK").toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

/** Live City host. Computer City does not use a chain. */
export const STACKS_NETWORK = readNetwork();

export const CONTRACTS = {
  city: readEnv("NEXT_PUBLIC_CITY_CONTRACT"),
  deed: readEnv("NEXT_PUBLIC_DEED_CONTRACT"),
  token: readEnv("NEXT_PUBLIC_TOKEN_CONTRACT"),
  treasury: readEnv("NEXT_PUBLIC_TREASURY_CONTRACT"),
  ops: readEnv("NEXT_PUBLIC_OPS_ADDRESS"),
};

export function contractsReady(): boolean {
  return Boolean(CONTRACTS.city && CONTRACTS.deed && CONTRACTS.token && CONTRACTS.treasury);
}

export function splitContract(id: string): { address: string; name: string } | null {
  const i = id.lastIndexOf(".");
  if (i <= 0 || i === id.length - 1) return null;
  return { address: id.slice(0, i), name: id.slice(i + 1) };
}

export function deedId(spaceId: number): string {
  const n = Math.max(0, Math.floor(Number(spaceId)) || 0);
  return `${DEED_PREFIX}-${String(n).padStart(n >= 100 ? 3 : 2, "0")}`;
}

export function hiroApi(): string {
  return STACKS_NETWORK === "mainnet" ? "https://api.mainnet.hiro.so" : "https://api.testnet.hiro.so";
}

export function explorerTx(txid: string): string {
  const chain = STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return `https://explorer.hiro.so/txid/${txid}?chain=${chain}`;
}

export function explorerAddr(addr: string): string {
  const chain = STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return `https://explorer.hiro.so/address/${addr}?chain=${chain}`;
}

export function nextUnlockAt(humans: number): number | null {
  for (const gate of DISTRICT_GATES) {
    if (humans < gate) return gate;
  }
  return null;
}

export function microToStx(u: bigint | number): string {
  const n = typeof u === "bigint" ? Number(u) / 1_000_000 : u / 1_000_000;
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
