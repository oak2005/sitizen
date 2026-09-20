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

export const SITZ_UNIT = 1_000_000n;
export const SITZ_YIELD_MIN = 10n;

export function deployerAddress(): string {
  return splitContract(CONTRACTS.token)?.address ?? splitContract(CONTRACTS.city)?.address ?? "";
}

export function sitzAsset(): string {
  return `${CONTRACTS.token}::sitz`;
}

export function sitzToMicro(n: number): bigint {
  return BigInt(Math.trunc(n)) * SITZ_UNIT;
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
  const cleaned = raw.replace(/\b(mnemonic|private key|secret|seed phrase|24 words)\b/gi, "[redacted]");
  const code = Number((cleaned.match(/\bu(\d{3})\b/) ?? cleaned.match(/err u(\d+)/i) ?? cleaned.match(/\((\d{3})\)/))?.[1] ?? NaN);
  if (Number.isInteger(code) && CITY_ERR[code]) return CITY_ERR[code];
  return cleaned.slice(0, 240);
}

const CITY_ERR: Record<number, string> = {
  100: "Not the deployer.",
  101: "Paused.",
  102: "Already seated.",
  103: "Only the city contract may do that.",
  300: "Not the SITZ deployer.",
  301: "Only the city may drip SITZ.",
  304: "SITZ faucet is off on mainnet.",
  305: "Genesis already ran.",
  306: "Amount must be greater than zero.",
  308: "SITZ already dripped this epoch.",
  309: "Sender must be the wallet signing.",
  400: "Not the deployer.",
  401: "Not ops.",
  402: "City is paused.",
  403: "You are not seated. Join first.",
  404: "Already seated.",
  405: "Epoch is still open. Close it first.",
  406: "Epoch is closed. Open a new one, or commit while it is open.",
  407: "Too early. Every seated human must commit, or wait 10 minutes.",
  408: "You already committed this epoch.",
  409: "Not enough humans for that district.",
  410: "Wrong district number.",
  411: "No last-landed lot to claim, or that space is off the board.",
  412: "That lot is already owned.",
  413: "You already landed this epoch.",
  415: "Amount must be greater than zero.",
  416: "Settle this epoch before opening the next.",
  417: "Only a human seat can claim.",
  418: "No lien to cut.",
  419: "Could not unlock that district.",
};

