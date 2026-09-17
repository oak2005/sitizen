import { Cl, hexToCV, cvToValue, cvToHex, type ClarityValue } from "@stacks/transactions";
import { CONTRACTS, hiroApi, splitContract, STACKS_NETWORK } from "./sitizen";

async function callRead(contractId: string, fn: string, args: ClarityValue[] = [], sender?: string): Promise<unknown> {
  const parts = splitContract(contractId);
  if (!parts) throw new Error(`Bad contract id: ${contractId}`);
  const body = {
    sender: sender || parts.address,
    arguments: args.map((cv) => {
      const hex = cvToHex(cv);
      return hex.startsWith("0x") ? hex : `0x${hex}`;
    }),
  };
  const url = `${hiroApi()}/v2/contracts/call-read/${parts.address}/${parts.name}/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hiro read ${fn} failed (${res.status}): ${text.slice(0, 180)}`);
  }
  const json = (await res.json()) as { okay?: boolean; result?: string; cause?: string };
  if (!json.okay || !json.result) throw new Error(json.cause || `Read ${fn} not okay`);
  const hex = json.result.startsWith("0x") ? json.result : `0x${json.result}`;
  return unwrap(cvToValue(hexToCV(hex)));
}

function unwrap(value: unknown): unknown {
  if (value && typeof value === "object") {
    const row = value as { type?: string; value?: unknown };
    if (row.type === "ok" || row.type === "some") return unwrap(row.value);
    if (row.type === "none") return null;
    if ("value" in row && (typeof row.value === "bigint" || typeof row.value === "number" || typeof row.value === "string")) {
      return row.value;
    }
  }
  return value;
}

function asBig(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  if (value && typeof value === "object" && "value" in (value as object)) return asBig((value as { value: unknown }).value);
  return 0n;
}

function asPrincipal(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const row = value as { value?: unknown; address?: string };
    if (typeof row.address === "string") return row.address;
    if (typeof row.value === "string") return row.value;
  }
  return null;
}

export type CitySnapshot = {
  humans: number;
  districts: number;
  loop: number;
  epoch: number;
  epochOpen: boolean;
  opsStx: bigint;
  communityStx: bigint;
  sitzVault: bigint;
  network: typeof STACKS_NETWORK;
};

export async function loadCitySnapshot(): Promise<CitySnapshot> {
  const [humans, districts, loop, epoch, epochOpen, opsStx, communityStx, sitzVault] = await Promise.all([
    callRead(CONTRACTS.city, "human-count"),
    callRead(CONTRACTS.city, "district-count"),
    callRead(CONTRACTS.city, "loop-size"),
    callRead(CONTRACTS.city, "get-epoch"),
    callRead(CONTRACTS.city, "is-epoch-open"),
    callRead(CONTRACTS.treasury, "ops-balance"),
    callRead(CONTRACTS.treasury, "community-balance"),
    callRead(CONTRACTS.token, "get-yield-vault"),
  ]);
  return {
    humans: Number(asBig(humans)),
    districts: Number(asBig(districts)),
    loop: Number(asBig(loop)),
    epoch: Number(asBig(epoch)),
    epochOpen: Boolean(epochOpen),
    opsStx: asBig(opsStx),
    communityStx: asBig(communityStx),
    sitzVault: asBig(sitzVault),
    network: STACKS_NETWORK,
  };
}

export async function loadSeat(address: string): Promise<{
  human: boolean;
  lastLanded: { space: number; epoch: number } | null;
}> {
  const [human, landed] = await Promise.all([
    callRead(CONTRACTS.city, "is-human-seat", [Cl.principal(address)]),
    callRead(CONTRACTS.city, "get-last-landed", [Cl.principal(address)]),
  ]);
  let lastLanded: { space: number; epoch: number } | null = null;
  if (landed && typeof landed === "object") {
    const row = landed as { space?: unknown; epoch?: unknown };
    lastLanded = { space: Number(asBig(row.space)), epoch: Number(asBig(row.epoch)) };
  }
  return { human: Boolean(human), lastLanded };
}

export async function loadDeed(id: number): Promise<{ owner: string | null; houses: number; cost: bigint }> {
  const [owner, houses, cost] = await Promise.all([
    callRead(CONTRACTS.deed, "get-owner", [Cl.uint(id)]),
    callRead(CONTRACTS.deed, "get-houses", [Cl.uint(id)]),
    callRead(CONTRACTS.deed, "house-cost", [Cl.uint(id)]),
  ]);
  return { owner: asPrincipal(owner), houses: Number(asBig(houses)), cost: asBig(cost) };
}

export async function loadDeeds(ids: number[]): Promise<Map<number, { owner: string | null; houses: number }>> {
  const out = new Map<number, { owner: string | null; houses: number }>();
  const chunk = 8;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const rows = await Promise.all(slice.map((id) => loadDeed(id)));
    slice.forEach((id, n) => out.set(id, { owner: rows[n]!.owner, houses: rows[n]!.houses }));
  }
  return out;
}
