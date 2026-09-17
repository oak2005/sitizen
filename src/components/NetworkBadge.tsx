import { STACKS_NETWORK } from "@/lib/sitizen";

export function NetworkBadge({ className = "" }: { className?: string }) {
  const live = STACKS_NETWORK === "mainnet";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] uppercase ${
        live
          ? "border-warn/40 bg-warn/10 text-warn"
          : "border-border bg-bg-elevated text-fg-subtle"
      } ${className}`}
    >
      Stacks {live ? "mainnet" : "testnet"}
    </span>
  );
}
