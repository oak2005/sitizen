import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "./engine.ts";
import { parseGameState, parseStoredState, serializeGameState } from "./parse-state.ts";

function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("parse-state", () => {
  it("round-trips a real game and keeps gameId", () => {
    const g = createGame({ humanName: "Oak", botCount: 2, rng: rngFrom(3) });
    const json = serializeGameState(g);
    const parsed = parseStoredState(json);
    assert.equal(parsed.gameId, g.gameId);
    assert.equal(parsed.players[0]!.name, "Oak");
    assert.equal(parsed.players.length, 3);
  });

  it("strips markup from names and drops unknown owner ids", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(4) });
    const raw = {
      ...g,
      players: g.players.map((p, i) => (i === 0 ? { ...p, name: "<img src=x onerror=alert(1)>Hack" } : p)),
      owners: ["nope", "you", null],
      extra: { nested: true },
    };
    const parsed = parseGameState(raw);
    assert.equal(parsed.players[0]!.name.includes("<"), false);
    assert.equal(parsed.owners[0], null);
    assert.equal(parsed.owners[1], "you");
    assert.equal("extra" in parsed, false);
  });

  it("only the first seat can be human", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(5) });
    const raw = {
      ...g,
      players: g.players.map((p) => ({ ...p, isHuman: true })),
    };
    const parsed = parseGameState(raw);
    assert.equal(parsed.players[0]!.isHuman, true);
    assert.equal(parsed.players[1]!.isHuman, false);
    assert.equal(parsed.players[2]!.isHuman, false);
  });

  it("rejects tiny or huge payloads", () => {
    assert.throws(() => parseGameState(null));
    assert.throws(() => parseGameState({ players: [] }));
    assert.throws(() => parseStoredState("x".repeat(90_000)));
  });

  it("ignores prototype pollution keys", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(6) });
    const json = serializeGameState(g).replace(
      /\}$/,
      ',"__proto__":{"phase":"game_over"},"constructor":{"prototype":{"phase":"game_over"}}}',
    );
    const parsed = parseStoredState(json);
    assert.equal(parsed.phase, "awaiting_roll");
  });
});
