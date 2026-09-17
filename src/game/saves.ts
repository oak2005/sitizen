import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseStoredState, serializeGameState } from "./parse-state";
import type { GameState } from "./types";

const SaveInput = z.object({
  state: z.unknown(),
});

export type HistoryItem = {
  id: number;
  youWon: boolean;
  winnerName: string;
  updatedAt: string;
};

type SaveRow = {
  id: number;
  status: string;
  state: unknown;
  winner_id: string | null;
  you_won: boolean | null;
  updated_at: Date | string;
};

function storedGameId(raw: unknown): string {
  try {
    return parseStoredState(raw).gameId;
  } catch {
    return "";
  }
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function winnerName(state: GameState): string {
  const winner = state.players.find((p) => p.id === state.winnerId);
  return winner?.name ?? "—";
}

function youWon(state: GameState): boolean {
  const human = state.players.find((p) => p.isHuman);
  return Boolean(human && state.winnerId === human.id);
}

export const saveCircuitGame = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const parsed = SaveInput.parse(input);
    const encoded = typeof parsed.state === "string" ? parsed.state : JSON.stringify(parsed.state);
    if (encoded.length > 80_000) throw new Error("Save too large");
    return parsed;
  })
  .handler(async ({ context, data }) => {
    const state = parseStoredState(data.state);
    const payload = serializeGameState(state);
    const status = state.phase === "game_over" ? "finished" : "active";
    const sql = await (await import("@/lib/db")).getSql();

    const active = await sql<{ id: number; state: unknown }>`
      select id, state from circuit_saves
      where user_id = ${context.userId} and status = 'active'
      limit 1
    `;

    const won = status === "finished" ? youWon(state) : null;
    const winId = status === "finished" ? state.winnerId : null;

    if (active[0]) {
      const existingId = storedGameId(active[0].state);
      if (status === "finished" && existingId && existingId !== state.gameId) {
        const inserted = await sql.query<{ id: number }>(
          `insert into circuit_saves (user_id, status, state, winner_id, you_won)
           values ($1, $2, $3::jsonb, $4, $5)
           returning id`,
          [context.userId, status, payload, winId, won],
        );
        return { ok: true as const, id: inserted[0]?.id ?? 0 };
      }
      await sql.query(
        `update circuit_saves
         set state = $1::jsonb, status = $2, winner_id = $3, you_won = $4, updated_at = now()
         where id = $5 and user_id = $6`,
        [payload, status, winId, won, active[0].id, context.userId],
      );
      return { ok: true as const, id: active[0].id };
    }

    const inserted = await sql.query<{ id: number }>(
      `insert into circuit_saves (user_id, status, state, winner_id, you_won)
       values ($1, $2, $3::jsonb, $4, $5)
       returning id`,
      [context.userId, status, payload, winId, won],
    );
    return { ok: true as const, id: inserted[0]?.id ?? 0 };
  });

export const loadActiveCircuit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await (await import("@/lib/db")).getSql();
    const rows = await sql<SaveRow>`
      select id, status, state, winner_id, you_won, updated_at
      from circuit_saves
      where user_id = ${context.userId} and status = 'active'
      order by updated_at desc
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    try {
      const state = parseStoredState(row.state);
      if (state.phase === "game_over") return null;
      return { id: row.id, state, updatedAt: iso(row.updated_at) };
    } catch {
      return null;
    }
  });

export const listCircuitHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await (await import("@/lib/db")).getSql();
    const rows = await sql<SaveRow>`
      select id, status, state, winner_id, you_won, updated_at
      from circuit_saves
      where user_id = ${context.userId} and status = 'finished'
      order by updated_at desc
      limit 8
    `;
    const items: HistoryItem[] = [];
    for (const row of rows) {
      try {
        const state = parseStoredState(row.state);
        items.push({
          id: row.id,
          youWon: Boolean(row.you_won) || youWon(state),
          winnerName: winnerName(state),
          updatedAt: iso(row.updated_at),
        });
      } catch {
        /* skip corrupt rows */
      }
    }
    return items;
  });
