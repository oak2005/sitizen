export function NetworkBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-bg-elevated px-3 py-1 text-[10px] tracking-[0.16em] text-fg-subtle uppercase ${className}`}
    >
      Stacks testnet
    </span>
  );
}
