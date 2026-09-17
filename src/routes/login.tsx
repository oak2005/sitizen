"use client";

import { useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  captureSessionToken,
  signIn,
} from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCK_AFTER = 5;
const LOCK_MS = 30_000;

function sessionToken(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  if (!("token" in data)) return undefined;
  const token = (data as { token?: unknown }).token;
  return typeof token === "string" ? token : undefined;
}

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fails = useRef(0);
  const lockUntil = useRef(0);

  async function onEmail(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (Date.now() < lockUntil.current) {
      setError("Too many attempts. Wait a moment and try again.");
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail) || trimmedEmail.length > 254) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Password must be 8–128 characters.");
      return;
    }
    if (mode === "up") {
      const handle = name.trim();
      if (handle.length < 1 || handle.length > 18) {
        setError("Choose a name up to 18 characters.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const { data, error: err } = await authClient.signUp.email({
          email: trimmedEmail,
          password,
          name: name.trim(),
        });
        if (err) {
          const msg = (err.message || "").toLowerCase();
          if (msg.includes("exist") || msg.includes("already")) {
            throw new Error("An account with that email already exists. Sign in instead.");
          }
          throw new Error("Could not create the account. Use a different email or a longer password.");
        }
        captureSessionToken(sessionToken(data));
      } else {
        const { data, error: err } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        });
        if (err) throw new Error("Email or password is incorrect.");
        captureSessionToken(sessionToken(data));
      }
      fails.current = 0;
      await authClient.getSession();
      await navigate({ to: "/" });
    } catch (err) {
      fails.current += 1;
      if (fails.current >= LOCK_AFTER) {
        lockUntil.current = Date.now() + LOCK_MS;
        fails.current = 0;
        setError("Too many attempts. Wait a moment and try again.");
      } else {
        const message = err instanceof Error ? err.message : "Sign-in failed.";
        if (mode === "in") setError("Email or password is incorrect.");
        else setError(message);
      }
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-6">
        <p className="font-display text-xs tracking-[0.2em] text-fg-subtle uppercase">Sitizen</p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          {mode === "in" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Save your circuit and pick it up on any device. Guests can still play without an account.
        </p>

        {authEnabled && emailAndPasswordEnabled && (
          <form className="mt-6 space-y-3" onSubmit={onEmail} autoComplete={mode === "in" ? "on" : "off"}>
            {mode === "up" && (
              <label className="block" htmlFor="account-name">
                <span className="text-xs tracking-[0.14em] text-fg-subtle uppercase">Name</span>
                <input
                  id="account-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 18))}
                  maxLength={18}
                  autoComplete="nickname"
                  className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm outline-none ring-accent/40 focus:ring-2"
                />
              </label>
            )}
            <label className="block" htmlFor="account-email">
              <span className="text-xs tracking-[0.14em] text-fg-subtle uppercase">Email</span>
              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                inputMode="email"
                required
                spellCheck={false}
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm outline-none ring-accent/40 focus:ring-2"
              />
            </label>
            <label className="block" htmlFor="account-password">
              <span className="text-xs tracking-[0.14em] text-fg-subtle uppercase">Password</span>
              <input
                id="account-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                minLength={8}
                maxLength={128}
                required
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm outline-none ring-accent/40 focus:ring-2"
              />
            </label>
            {mode === "up" && (
              <p className="text-xs text-fg-subtle">Use at least 8 characters. Stored hashed — we never see the plaintext.</p>
            )}
            {error && (
              <p className="text-sm text-bad" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
          </form>
        )}

        {authEnabled && emailAndPasswordEnabled && (
          <button
            type="button"
            className="mt-3 text-sm text-fg-muted hover:text-fg"
            onClick={() => {
              setMode((m) => (m === "in" ? "up" : "in"));
              setError(null);
            }}
          >
            {mode === "in" ? "Need an account? Create one" : "Already registered? Sign in"}
          </button>
        )}

        <div className="mt-6 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((provider) => (
              <Button
                key={provider.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
              >
                Continue with {provider.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-fg-subtle">Sign-in is disabled.</p>
          )}
        </div>
        <Link to="/" className="mt-6 inline-flex text-sm text-fg-muted hover:text-fg">
          Back to the board
        </Link>
      </div>
    </main>
  );
}