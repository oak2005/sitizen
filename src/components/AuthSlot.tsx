"use client";

import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-24 animate-pulse rounded-full bg-fg/10" />;
  }
  return (
    <>
      <SignedOut>
        <Link
          to="/login"
          className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium text-fg-muted hover:text-fg"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <div className="max-w-[10rem] truncate text-xs text-fg-muted [&_button]:text-xs">
          <UserButton />
        </div>
      </SignedIn>
    </>
  );
}
