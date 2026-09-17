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

/** This build is Live City on Stacks testnet only. */
export const STACKS_NETWORK = "testnet" as const;

const CONTRACT_ID = /^ST[0-9A-Z]{20,}\.[A-Za-z][A-Za-z0-9\-_]*$/;
const STX_ADDR = /^ST[0-9A-Z]{20,}$/;

export function isTestnetAddress(addr: string): boolean {
  return STX_ADDR.test(addr.trim());
}

export function isTestnetContract(id: string): boolean {
  return CONTRACT_ID.test(id.trim());
}

export const CONTRACTS = {
  city: readEnv("NEXT_PUBLIC_CITY_CONTRACT"),
  deed: readEnv("NEXT_PUBLIC_DEED_CONTRACT"),
  token: readEnv("NEXT_PUBLIC_TOKEN_CONTRACT"),
  treasury: readEnv("NEXT_PUBLIC_TREASURY_CONTRACT"),
  ops: readEnv("NEXT_PUBLIC_OPS_ADDRESS"),
};

export function contractsReady(): boolean {
  return (
    isTestnetContract(CONTRACTS.city) &&
    isTestnetContract(CONTRACTS.deed) &&
    isTestnetContract(CONTRACTS.token) &&
    isTestnetContract(CONTRACTS.treasury)
  );
}

export function splitContract(id: string): { address: string; name: string } | null {
  if (!isTestnetContract(id)) return null;
  const i = id.lastIndexOf(".");
  return { address: id.slice(0, i), name: id.slice(i + 1) };
}

export function deedId(spaceId: number): string {
  const n = Math.max(0, Math.floor(Number(spaceId)) || 0);
  return `${DEED_PREFIX}-${String(n).padStart(n >= 100 ? 3 : 2, "0")}`;
}

export function hiroApi(): string {
  return "https://api.testnet.hiro.so";
}

export function explorerTx(txid: string): string {
  const id = txid.replace(/[^0-9a-fx]/gi, "");
  return `https://explorer.hiro.so/txid/${id}?chain=testnet`;
}

export function explorerAddr(addr: string): string {
  if (!isTestnetAddress(addr) && !isTestnetContract(addr)) return "https://explorer.hiro.so/?chain=testnet";
  return `https://explorer.hiro.so/address/${addr}?chain=testnet`;
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

export function publicError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/\b(mnemonic|private key|secret|seed phrase|24 words)\b/gi, "[redacted]").slice(0, 240);
}
