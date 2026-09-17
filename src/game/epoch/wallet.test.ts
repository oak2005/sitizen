import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JOIN_DISCOUNT_MAX } from "./types.ts";
import { clampJoinSpend, emptyWallet, sanitizeWallet } from "./wallet.ts";

describe("epoch wallet", () => {
  it("starts empty", () => {
    assert.deepEqual(emptyWallet(), { marks: 0, skins: [], themes: [], theme: "", skin: "" });
  });

  it("keeps catalog cosmetics and integer marks", () => {
    const w = sanitizeWallet({
      marks: 80,
      skins: ["gilt", "onyx"],
      themes: ["slate"],
      theme: "slate",
      skin: "gilt",
    });
    assert.equal(w.marks, 80);
    assert.deepEqual(w.skins, ["gilt", "onyx"]);
    assert.deepEqual(w.themes, ["slate"]);
    assert.equal(w.theme, "slate");
    assert.equal(w.skin, "gilt");
  });

  it("drops unknown ids, non-integers, and prototype keys", () => {
    const polluted = JSON.parse('{"marks":12,"skins":["gilt","../hack"],"themes":["nope"],"theme":"nope","skin":"gilt"}');
    const w = sanitizeWallet(polluted);
    assert.equal(w.marks, 12);
    assert.deepEqual(w.skins, ["gilt"]);
    assert.deepEqual(w.themes, []);
    assert.equal(w.theme, "");
    assert.equal(w.skin, "gilt");
    assert.equal(sanitizeWallet({ marks: 1.5 }).marks, 0);
    assert.equal(sanitizeWallet({ marks: -4 }).marks, 0);
    assert.equal(sanitizeWallet({ marks: Number.POSITIVE_INFINITY }).marks, 0);
    assert.equal(sanitizeWallet(null).marks, 0);
  });

  it("clamps join spend to wallet and the discount cap", () => {
    assert.equal(clampJoinSpend(50, 20), 20);
    assert.equal(clampJoinSpend(50, 80), 50);
    assert.equal(clampJoinSpend(JOIN_DISCOUNT_MAX + 40, 500), JOIN_DISCOUNT_MAX);
    assert.equal(clampJoinSpend(1.5, 100), 0);
    assert.equal(clampJoinSpend(-2, 100), 0);
  });
});
