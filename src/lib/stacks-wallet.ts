import type { ClarityValue, ContractIdString, PostCondition } from "@stacks/transactions";
import { STACKS_NETWORK } from "./sitizen";

export type WalletSession = {
  address: string;
};

function pickStxAddress(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as Record<string, unknown>;
  const bags: unknown[] = [];
  if (Array.isArray(rec.addresses)) bags.push(...rec.addresses);
  const nested = rec.addresses as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object") {
    if (Array.isArray(nested.stx)) bags.push(...nested.stx);
    if (Array.isArray(nested.stacks)) bags.push(...nested.stacks);
  }
  for (const item of bags) {
    if (!item || typeof item !== "object") continue;
    const row = item as { address?: string; symbol?: string; type?: string };
    const addr = String(row.address ?? "");
    if (!addr) continue;
    if (row.symbol === "STX" || row.type === "stacks" || addr.startsWith("ST") || addr.startsWith("SP")) {
      return addr;
    }
  }
  return null;
}

export async function connectWallet(): Promise<WalletSession> {
  const { connect, getLocalStorage } = await import("@stacks/connect");
  const result = await connect({ forceWalletSelect: true });
  const fromResult = pickStxAddress(result);
  if (fromResult) return { address: fromResult };
  const stored = pickStxAddress(getLocalStorage());
  if (stored) return { address: stored };
  throw new Error("Leather or Xverse did not return a Stacks address.");
}

export function restoreWallet(): WalletSession | null {
  if (typeof window === "undefined") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stored = (window as unknown as { __sitizen?: WalletSession }).__sitizen;
    const raw = window.localStorage.getItem("blockstack-session") ?? window.localStorage.getItem("stacks-session");
    void stored;
    void raw;
  } catch {
    /* ignore */
  }
  return null;
}

export async function restoreWalletAsync(): Promise<WalletSession | null> {
  if (typeof window === "undefined") return null;
  const { getLocalStorage, isConnected } = await import("@stacks/connect");
  try {
    if (typeof isConnected === "function" && !isConnected()) return null;
  } catch {
    /* older connect */
  }
  const stored = pickStxAddress(getLocalStorage());
  return stored ? { address: stored } : null;
}

export async function disconnectWallet(): Promise<void> {
  const { disconnect } = await import("@stacks/connect");
  disconnect();
}

export async function callCity(opts: {
  contract: string;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditions?: PostCondition[];
  address: string;
}): Promise<{ txid: string }> {
  const { request } = await import("@stacks/connect");
  const result = await request("stx_callContract", {
    contract: opts.contract as ContractIdString,
    functionName: opts.functionName,
    functionArgs: opts.functionArgs,
    network: STACKS_NETWORK,
    postConditionMode: "deny",
    postConditions: opts.postConditions ?? [],
  });
  const txid = (result as { txid?: string }).txid;
  if (!txid) throw new Error("Wallet did not return a txid.");
  return { txid };
}

export function stxSendEq(address: string, amount: bigint): PostCondition {
  return {
    type: "stx-postcondition",
    address,
    condition: "eq",
    amount: amount.toString(),
  } as PostCondition;
}
