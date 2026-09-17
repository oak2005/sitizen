import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOARD_GRID, CIRCUIT_SPACES, GROUPS, SPACES, blockContiguous, boardGridSize, circuitOrder, colourGroupsContiguous, cornersPinned, expansionAt, expansionEdge, foundersIntact, spaceGrid, spaceSide, tableCount, tableSquare, uniquePerimeter } from "../board.ts";
import {
  botIntent,
  canBuildOn,
  claimOf,
  commitHuman,
  computersReady,
  createCity,
  createOffer,
  deedTokenId,
  epochRent,
  houseCost,
  humanReady,
  joinFeeFor,
  jumpCity,
  loopSize,
  netWorth,
  remainingMs,
  respondOffer,
  runCommunityPayout,
  salvageValue,
  sellDeed,
  settleEpoch,
  spendBail,
  queueBuild,
  toggleClaim,
  unlockCosmetic,
  utilityMult,
  wealthGini,
} from "./engine.ts";
import { AMNESTY_PCT, BAIL_CAP, BAIL_MARKS, DEMO_EPOCH_MS, HOUSE_MULT, JOIN_FEE, LAND_EPOCH, MARKS_PER_GO, MAX_EPOCH, PAYOUT_MIN, PROTOCOL_TAX, STARTING_CASH, TIER_EPOCH, TOKEN_BURN_SHARE, TOKEN_COMMUNITY_SHARE, TOKEN_OPS_SHARE, TOKEN_TAX, TOKEN_YIELD_SHARE } from "./types.ts";

function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function botsPass(city: ReturnType<typeof createCity>) {
  for (const p of city.players) {
    if (p.isHuman) continue;
    city.intents[p.id] = { kind: "pass", dice: null, claim: false, builds: [], offerResponses: {} };
  }
}

describe("epoch city", () => {
  it("charges join fees and starts computers ready", () => {
    const city = createCity({ humanName: "Oak", botCount: 3, now: 1_000, rng: rngFrom(1) });
    assert.equal(city.players.length, 4);
    assert.ok(city.players.every((p) => p.cash === STARTING_CASH - JOIN_FEE));
    assert.equal(city.treasury, JOIN_FEE * 4);
    assert.equal(city.opsPool + city.communityPool, city.treasury);
    assert.equal(city.opsPool, Math.round(JOIN_FEE * 4 * 0.6));
    assert.equal(city.communityPool, JOIN_FEE * 4 - city.opsPool);
    assert.equal(computersReady(city), true);
    assert.equal(humanReady(city), false);
    assert.equal(remainingMs(city, 1_000), DEMO_EPOCH_MS);
  });

  it("keeps colour rows contiguous so utilities sit outside the set", () => {
    assert.equal(colourGroupsContiguous(), true);
    assert.deepEqual(GROUPS.rose, [11, 12, 13]);
    assert.deepEqual(GROUPS.pine, [31, 32, 33]);
    assert.deepEqual(GROUPS.amber, [40, 41, 42]);
    assert.deepEqual(GROUPS.utility.slice(0, 3), [14, 29, 43]);
    assert.equal(GROUPS.utility.length, 52);
    assert.equal(SPACES[14]!.kind, "utility");
    assert.equal(SPACES[12]!.kind, "property");
    assert.equal(SPACES[43]!.kind, "utility");
    assert.equal(SPACES[43]!.name, "Beacon Grid");
    assert.equal(SPACES[42]!.kind, "property");
    assert.equal(expansionAt(50)?.utility.id, 239);
    assert.equal(spaceSide(0), "corner");
    assert.equal(spaceSide(10), "corner");
    assert.equal(uniquePerimeter(40), true);
    assert.equal(uniquePerimeter(44), true);
    assert.equal(uniquePerimeter(240), true);
    assert.equal(cornersPinned(40), true);
    assert.equal(cornersPinned(44), true);
    assert.equal(cornersPinned(240), true);
  });

  it("does not auto-mint on landing — it opens a claim for next epoch", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(3) });
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 2] });
    city = settleEpoch(city, rngFrom(3), 10);
    const you = city.players[0]!;
    assert.equal(you.position, 3);
    assert.equal(city.deeds.length, 0);
    const claim = claimOf(city, "you");
    assert.ok(claim);
    assert.equal(claim!.spaceId, 3);
  });

  it("mints only when the lander claims next epoch", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(4) });
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 2] });
    city = settleEpoch(city, rngFrom(4), 10);
    botsPass(city);
    city = toggleClaim(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(4), 20);
    const deed = city.deeds.find((d) => d.spaceId === 3);
    assert.ok(deed);
    assert.equal(deed!.tokenId, "SZ-03");
    assert.equal(deed!.ownerId, "you");
    assert.equal(claimOf(city, "you"), undefined);
  });

  it("houses multiply rent on the same deed", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(5) });
    city.deeds = [
      { spaceId: 1, tokenId: deedTokenId(1), ownerId: "you", houses: 0 },
      { spaceId: 3, tokenId: deedTokenId(3), ownerId: "you", houses: 0 },
    ];
    assert.equal(epochRent(city, 1, 7), 16 * 2 * HOUSE_MULT[0]);
    city.deeds[0]!.houses = 1;
    assert.equal(epochRent(city, 1, 7), 16 * 2 * HOUSE_MULT[1]);
  });

  it("refuses houses until the whole colour row is owned", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(6) });
    city.deeds = [{ spaceId: 31, tokenId: "SZ-31", ownerId: "you", houses: 0 }];
    assert.equal(canBuildOn(city, "you", 31), false);
    city.deeds.push(
      { spaceId: 32, tokenId: "SZ-32", ownerId: "you", houses: 0 },
      { spaceId: 33, tokenId: "SZ-33", ownerId: "you", houses: 0 },
    );
    assert.equal(canBuildOn(city, "you", 31), true);
  });

  it("salvage sells land and houses together", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(7) });
    city.deeds = [{ spaceId: 1, tokenId: "SZ-01", ownerId: "you", houses: 2 }];
    const expected = salvageValue(city.deeds[0]!);
    const before = city.players[0]!.cash;
    city = sellDeed(city, 1);
    assert.equal(city.deeds.length, 0);
    assert.equal(city.players[0]!.cash, before + expected);
  });

  it("offers to buy are reviewed next epoch", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(8) });
    city.deeds = [{ spaceId: 6, tokenId: "SZ-06", ownerId: "bot-0", houses: 0 }];
    city = createOffer(city, 6, 100);
    assert.equal(city.offers.length, 1);
    assert.equal(city.offers[0]!.createdEpoch, 1);
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(8), 30);
    assert.equal(city.deeds[0]!.ownerId, "bot-0");
    assert.equal(city.epoch, 2);
    assert.equal(city.offers.length, 1);
    const ada = city.players.find((p) => p.id === "bot-0")!;
    assert.equal(city.intents[ada.id]?.offerResponses[city.offers[0]!.id], "accept");
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(8), 40);
    const deed = city.deeds.find((d) => d.spaceId === 6)!;
    assert.equal(deed.ownerId, "you");
  });

  it("declined offers leave the deed with the holder", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(9) });
    city.deeds = [{ spaceId: 6, tokenId: "SZ-06", ownerId: "bot-0", houses: 0 }];
    city = createOffer(city, 6, 10);
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(9), 50);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(9), 60);
    assert.equal(city.deeds[0]!.ownerId, "bot-0");
  });

  it("human can decline an incoming offer next epoch", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(19) });
    city.deeds = [{ spaceId: 1, tokenId: "SZ-01", ownerId: "you", houses: 0 }];
    city.offers = [{ id: "off-1", fromId: "bot-0", toId: "you", spaceId: 1, price: 200, createdEpoch: 0 }];
    city = respondOffer(city, "off-1", "decline");
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(19), 70);
    assert.equal(city.deeds[0]!.ownerId, "you");
    assert.equal(city.offers.length, 0);
  });

  it("skims rent tax and jails with a lien instead of eliminating", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(10) });
    city.deeds = [{ spaceId: 39, tokenId: "SZ-39", ownerId: "bot-0", houses: 0 }];
    city.players[0]!.cash = 10;
    city.players[0]!.position = 37;
    const ownerBefore = city.players[1]!.cash;
    const treasuryBefore = city.treasury;
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 1] });
    city = settleEpoch(city, rngFrom(10), 80);
    const you = city.players.find((p) => p.id === "you")!;
    assert.equal(you.cash, 0);
    assert.equal(you.inJail, true);
    const paid = 10;
    const tax = Math.round(paid * PROTOCOL_TAX);
    assert.equal(city.treasury, treasuryBefore + tax);
    assert.equal(city.players[1]!.cash, ownerBefore + (paid - tax));
    assert.equal(city.deeds[0]!.ownerId, "bot-0");
  });

  it("clears a lien and still rolls when cash covers it", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(11) });
    city.players[0]!.inJail = true;
    city.players[0]!.lien = 50;
    city.players[0]!.cash = 200;
    city.players[0]!.position = 10;
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [2, 3] });
    city = settleEpoch(city, rngFrom(11), 90);
    const you = city.players[0]!;
    assert.equal(you.inJail, false);
    assert.equal(you.position, 15);
    assert.equal(you.cash, 150);
  });

  it("grants Marks for passing GO, not a cash salary", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(12) });
    const cash = city.players[0]!.cash;
    city.players[0]!.position = 38;
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 2] });
    city = settleEpoch(city, rngFrom(12), 100);
    const you = city.players[0]!;
    assert.equal(you.position, 1);
    assert.equal(you.marks, MARKS_PER_GO);
    assert.equal(you.cash, cash);
  });

  it("walks the redesigned square and still grants Marks at GO", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(91) });
    city = jumpCity(city, 101, 1, rngFrom(91));
    city.players[0]!.position = 43;
    city.players[0]!.marks = 0;
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 1] });
    city = settleEpoch(city, rngFrom(91), 2);
    const you = city.players[0]!;
    assert.equal(you.position, 1);
    assert.equal(you.marks, MARKS_PER_GO);
  });

  it("leaves Founders onto Lantern lots after Crown Point", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(92) });
    city = jumpCity(city, 101, 1, rngFrom(92));
    city.players[0]!.position = 38;
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 1] });
    city = settleEpoch(city, rngFrom(92), 3);
    assert.equal(city.players[0]!.position, 40);
  });

  it("queues a house only on a completed row", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(13) });
    city.deeds = [
      { spaceId: 1, tokenId: "SZ-01", ownerId: "you", houses: 0 },
      { spaceId: 3, tokenId: "SZ-03", ownerId: "you", houses: 0 },
    ];
    city = queueBuild(city, 1);
    const cash = city.players[0]!.cash;
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(13), 110);
    assert.equal(city.deeds.find((d) => d.spaceId === 1)!.houses, 1);
    assert.equal(city.players[0]!.cash, cash - houseCost(1));
  });

  it("after ten epochs adds one player and does not open new land", () => {
    let city = createCity({ humanName: "You", botCount: 3, now: 0, rng: rngFrom(14) });
    const startSeats = city.players.length;
    for (let i = 0; i < TIER_EPOCH; i++) {
      botsPass(city);
      city = commitHuman(city, { kind: "pass", dice: null });
      city = settleEpoch(city, rngFrom(14 + i), i * 10 + 1);
    }
    assert.equal(city.epoch, TIER_EPOCH + 1);
    assert.equal(city.players.length, startSeats + 1);
    assert.equal(city.districtOpen, false);
    assert.equal(loopSize(city), 40);
  });

  it("adds one more player every ten epochs", () => {
    let city = createCity({ humanName: "You", botCount: 3, now: 0, rng: rngFrom(21) });
    const startSeats = city.players.length;
    for (let i = 0; i < 20; i++) {
      botsPass(city);
      city = commitHuman(city, { kind: "pass", dice: null });
      city = settleEpoch(city, rngFrom(21 + i), i + 1);
    }
    assert.equal(city.epoch, 21);
    assert.equal(city.players.length, startSeats + 2);
    assert.equal(city.districtTier, 0);
  });

  it("after one hundred epochs lays a new board that holds Founders plus Lantern", () => {
    let city = createCity({ humanName: "You", botCount: 3, now: 0, rng: rngFrom(50) });
    const startSeats = city.players.length;
    for (let i = 0; i < LAND_EPOCH; i++) {
      botsPass(city);
      city = commitHuman(city, { kind: "pass", dice: null });
      city = settleEpoch(city, rngFrom(50 + i), i + 1);
    }
    assert.equal(city.epoch, LAND_EPOCH + 1);
    assert.equal(city.players.length, startSeats + 10);
    assert.equal(city.districtOpen, true);
    assert.equal(city.districtTier, 1);
    assert.equal(loopSize(city), 44);
    assert.equal(boardGridSize(1), BOARD_GRID);
    assert.equal(tableCount(1), 2);
    assert.equal(uniquePerimeter(44), true);
    assert.equal(foundersIntact(44), true);
    assert.deepEqual(spaceGrid(0, 44), { col: 11, row: 11 });
    assert.deepEqual(spaceGrid(10, 44), { col: 1, row: 11 });
    assert.deepEqual(spaceGrid(20, 44), { col: 1, row: 1 });
    assert.deepEqual(spaceGrid(30, 44), { col: 11, row: 1 });
    assert.equal(spaceSide(40, 44), "right");
    assert.equal(spaceSide(43, 44), "right");
    assert.equal(expansionEdge(1), 3);
    assert.deepEqual(circuitOrder(44).slice(-4), [40, 41, 42, 43]);
    assert.equal(spaceSide(10, 44), "corner");
    assert.equal(blockContiguous([40, 41, 42, 43], 44), true);
    assert.equal(tableSquare(1).name, "Lantern Square");
    assert.ok(city.log.some((e) => e.text.includes("Lantern")));
    assert.ok(city.log.some((e) => e.text.includes("new board")));
    assert.ok(city.log.some((e) => e.text.includes("same square")));
  });

  it("after two hundred epochs the new board holds Founders, Lantern, and Iris", () => {
    let city = createCity({ humanName: "You", botCount: 3, now: 0, rng: rngFrom(60) });
    for (let i = 0; i < 200; i++) {
      botsPass(city);
      city = commitHuman(city, { kind: "pass", dice: null });
      city = settleEpoch(city, rngFrom(60 + i), i + 1);
    }
    assert.equal(city.epoch, 201);
    assert.equal(city.districtTier, 2);
    assert.equal(loopSize(city), 48);
    assert.equal(tableCount(2), 3);
    assert.equal(foundersIntact(48), true);
    assert.equal(uniquePerimeter(48), true);
    assert.equal(SPACES[44]!.group, "iris");
    assert.equal(SPACES[47]!.kind, "utility");
    assert.equal(spaceSide(44, 48), "top");
    assert.equal(spaceSide(47, 48), "top");
    assert.equal(spaceSide(40, 48), "right");
    assert.equal(circuitOrder(48)[circuitOrder(48).indexOf(29)! + 1], 44);
    assert.equal(blockContiguous([44, 45, 46, 47], 48), true);
    assert.equal(blockContiguous([40, 41, 42, 43], 48), true);
    assert.equal(cornersPinned(48), true);
    assert.equal(tableSquare(2).name, "Iris Square");
    assert.deepEqual(spaceGrid(10, 48), { col: 1, row: 11 });
  });

  it("caps growth at epoch 5000 with 51 folded tables on one square", () => {
    let city = createCity({ humanName: "You", botCount: 3, now: 0, rng: rngFrom(70) });
    city.epoch = MAX_EPOCH;
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(70), 1);
    assert.equal(city.districtTier, 50);
    assert.equal(loopSize(city), 240);
    assert.equal(city.players.length, city.originSeats + 500);
    assert.equal(boardGridSize(50), BOARD_GRID);
    assert.equal(tableCount(50), 51);
    assert.equal(uniquePerimeter(240), true);
    assert.equal(foundersIntact(240), true);
    const afterSeats = city.players.length;
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(71), 2);
    assert.equal(city.districtTier, 50);
    assert.equal(city.players.length, afterSeats);
  });

  it("keeps the original 40-space corners on the starting table", () => {
    assert.equal(boardGridSize(0), BOARD_GRID);
    assert.deepEqual(spaceGrid(0), { col: 11, row: 11 });
    assert.deepEqual(spaceGrid(10), { col: 1, row: 11 });
    assert.deepEqual(spaceGrid(20), { col: 1, row: 1 });
    assert.deepEqual(spaceGrid(30), { col: 11, row: 1 });
    assert.equal(CIRCUIT_SPACES.length, 40);
    assert.equal(uniquePerimeter(40), true);
    assert.deepEqual(circuitOrder(40), Array.from({ length: 40 }, (_, i) => i));
    assert.equal(tableSquare(0).name, "Founders Square");
  });

  it("keeps Founders intact on every later board through epoch 5000", () => {
    for (let tier = 0; tier <= 50; tier++) {
      const loop = 40 + 4 * tier;
      assert.equal(uniquePerimeter(loop), true, `overlap at loop ${loop}`);
      assert.equal(cornersPinned(loop), true, `corners at loop ${loop}`);
      assert.equal(foundersIntact(loop), true, `founders moved at loop ${loop}`);
      assert.equal(circuitOrder(loop).length, loop);
      assert.equal(tableCount(tier), 1 + tier);
      assert.deepEqual(spaceGrid(0, loop), { col: 11, row: 11 });
      assert.deepEqual(spaceGrid(10, loop), { col: 1, row: 11 });
      assert.deepEqual(spaceGrid(20, loop), { col: 1, row: 1 });
      assert.deepEqual(spaceGrid(30, loop), { col: 11, row: 1 });
      if (tier >= 1) {
        const exp = expansionAt(tier)!;
        const block = [...exp.lots.map((lot) => lot.id), exp.utility.id];
        assert.equal(blockContiguous(block, loop), true, `split row at tier ${tier}`);
        assert.equal(spaceSide(block[0]!, loop), spaceSide(block[3]!, loop), `row split across edges at ${tier}`);
        assert.notEqual(spaceSide(block[0]!, loop), "corner");
      }
    }
  });

  it("jumpCity opens Lantern Square as one board holding Founders plus Lantern lots", () => {
    let city = createCity({ humanName: "You", botCount: 3, now: 0, rng: rngFrom(90) });
    city = jumpCity(city, 101, 1, rngFrom(90));
    assert.equal(city.epoch, 101);
    assert.equal(city.districtTier, 1);
    assert.equal(loopSize(city), 44);
    assert.equal(tableSquare(city.districtTier).name, "Lantern Square");
    assert.equal(tableCount(1), 2);
    assert.equal(foundersIntact(44), true);
    assert.equal(spaceSide(10, 44), "corner");
    assert.equal(jumpCity(city, Number.NaN).epoch, 101);
    assert.equal(jumpCity(city, 1.5).epoch, 101);
    assert.equal(jumpCity(city, 9000).epoch, 101);
  });

  it("houses stay on the deed when a later square is laid", () => {
    let city = createCity({ humanName: "You", botCount: 3, now: 0, rng: rngFrom(93) });
    city.deeds = [{ spaceId: 1, tokenId: "SZ-01", ownerId: "you", houses: 3 }];
    city = jumpCity(city, 201, 1, rngFrom(93));
    assert.equal(city.districtTier, 2);
    assert.equal(loopSize(city), 48);
    assert.equal(city.deeds[0]!.houses, 3);
    assert.equal(city.deeds[0]!.spaceId, 1);
    assert.equal(spaceSide(1, 48), "bottom");
    assert.equal(spaceSide(40, 48), "right");
    assert.equal(spaceSide(44, 48), "top");
    assert.equal(tableSquare(2).name, "Iris Square");
  });

  it("hard computers claim the lot that completes their row", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(80), difficulty: "hard" });
    const bot = city.players[1]!;
    city.deeds = [
      { spaceId: 6, tokenId: "SZ-06", ownerId: bot.id, houses: 0 },
      { spaceId: 7, tokenId: "SZ-07", ownerId: bot.id, houses: 0 },
    ];
    city.claims = [{ playerId: bot.id, spaceId: 8, epoch: 1 }];
    bot.cash = 900;
    const intent = botIntent(city, bot, rngFrom(80));
    assert.equal(intent.claim, true);
  });

  it("hard computers refuse a cheap sale of a completed row", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(81), difficulty: "hard" });
    const bot = city.players[1]!;
    city.deeds = [
      { spaceId: 31, tokenId: "SZ-31", ownerId: bot.id, houses: 1 },
      { spaceId: 32, tokenId: "SZ-32", ownerId: bot.id, houses: 1 },
      { spaceId: 33, tokenId: "SZ-33", ownerId: bot.id, houses: 1 },
    ];
    city.offers = [
      { id: "off-1", fromId: "you", toId: bot.id, spaceId: 31, price: 300, createdEpoch: 0 },
    ];
    city.epoch = 2;
    const intent = botIntent(city, bot, rngFrom(81));
    assert.equal(intent.offerResponses["off-1"], "decline");
  });

  it("easy computers skip an expensive claim when cash is thin", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(82), difficulty: "easy" });
    const bot = city.players[1]!;
    city.claims = [{ playerId: bot.id, spaceId: 39, epoch: 1 }];
    bot.cash = 480;
    const intent = botIntent(city, bot, rngFrom(82));
    assert.equal(intent.claim, false);
  });

  it("rejects non-finite or oversized buy offers", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(83) });
    city.deeds = [{ spaceId: 1, tokenId: "SZ-01", ownerId: "bot-0", houses: 0 }];
    city.players[0]!.cash = 2000;
    assert.equal(createOffer(city, 1, Number.POSITIVE_INFINITY).offers.length, 0);
    assert.equal(createOffer(city, 1, Number.NaN).offers.length, 0);
    assert.equal(createOffer(city, 1, 2_000_000).offers.length, 0);
    assert.equal(createOffer(city, -4, 60).offers.length, 0);
    assert.equal(createOffer(city, 1.7, 60).offers.length, 0);
    const ok = createOffer(city, 1, 60);
    assert.equal(ok.offers.length, 1);
    assert.equal(ok.offers[0]!.price, 60);
  });

  it("scales utility rent with a third plant", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(51) });
    city.districtOpen = true;
    city.districtTier = 1;
    city.deeds = [{ spaceId: 14, tokenId: "SZ-14", ownerId: "you", houses: 0 }];
    assert.equal(utilityMult(1), 4);
    assert.equal(epochRent(city, 14, 7), 4 * 7);
    city.deeds.push({ spaceId: 29, tokenId: "SZ-29", ownerId: "you", houses: 0 });
    assert.equal(epochRent(city, 14, 7), 10 * 7);
    city.deeds.push({ spaceId: 43, tokenId: "SZ-43", ownerId: "you", houses: 0 });
    assert.equal(epochRent(city, 14, 7), 16 * 7);
  });

  it("timeout rest still lets computers resolve", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(15) });
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(15), DEMO_EPOCH_MS);
    assert.equal(city.epoch, 2);
    assert.ok(city.players.some((p) => !p.isHuman && p.position !== 0));
  });

  it("net worth counts land and houses", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(16) });
    city.deeds = [{ spaceId: 1, tokenId: "SZ-01", ownerId: "you", houses: 2 }];
    const you = city.players[0]!;
    const lot = SPACES[1]!.price!;
    assert.equal(netWorth(city, "you"), you.cash + lot + 2 * houseCost(1));
  });

  it("splits the rent skim 60/40 without changing what the player paid", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(10) });
    city.deeds = [{ spaceId: 39, tokenId: "SZ-39", ownerId: "bot-0", houses: 0 }];
    city.players[0]!.cash = 10;
    city.players[0]!.position = 37;
    const ownerBefore = city.players[1]!.cash;
    const opsBefore = city.opsPool;
    const communityBefore = city.communityPool;
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 1] });
    city = settleEpoch(city, rngFrom(10), 80);
    const paid = 10;
    const tax = Math.round(paid * PROTOCOL_TAX);
    const ops = Math.round(tax * 0.6);
    assert.equal(city.opsPool, opsBefore + ops);
    assert.equal(city.communityPool, communityBefore + (tax - ops));
    assert.equal(city.treasury, city.opsPool + city.communityPool);
    assert.equal(city.players[1]!.cash, ownerBefore + (paid - tax));
    assert.equal(city.metrics.length, 1);
    assert.equal(city.metrics[0]!.epoch, 1);
  });

  it("pays 25% of the community pool to the top three rent collectors every 20 epochs", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(91) });
    city.epoch = 20;
    city.communityPool = 400;
    city.opsPool = 600;
    city.treasury = 1000;
    city.players[0]!.rentCycle = 300;
    city.players[1]!.rentCycle = 200;
    city.players[2]!.rentCycle = 100;
    const cash0 = city.players[0]!.cash;
    const cash1 = city.players[1]!.cash;
    const cash2 = city.players[2]!.cash;
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(91), 1);
    const pot = Math.floor(400 * 0.25);
    assert.equal(city.players[0]!.cash, cash0 + Math.floor(pot * 0.5));
    assert.equal(city.players[1]!.cash, cash1 + Math.floor(pot * 0.3));
    assert.equal(city.players[2]!.cash, cash2 + (pot - Math.floor(pot * 0.5) - Math.floor(pot * 0.3)));
    assert.equal(city.communityPool, 400 - pot + 2 * 80);
    assert.equal(city.players[0]!.rentCycle, 0);
    assert.equal(city.lastPayoutEpoch, 20);
  });

  it("skips the community payout when the pool is under the floor", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(92) });
    city.communityPool = PAYOUT_MIN - 1;
    city.opsPool = 600;
    city.treasury = city.opsPool + city.communityPool;
    city.players[0]!.rentCycle = 80;
    const cash = city.players[0]!.cash;
    assert.equal(runCommunityPayout(city), false);
    assert.equal(city.players[0]!.cash, cash);
    assert.equal(city.communityPool, PAYOUT_MIN - 1);
    assert.ok(city.log.some((e) => e.text.includes("skipped")));
  });

  it("spends Marks on a bail bond without changing rent math", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(93) });
    const you = city.players[0]!;
    you.marks = BAIL_MARKS;
    you.lien = 150;
    you.inJail = true;
    city = spendBail(city);
    assert.equal(city.players[0]!.marks, 0);
    assert.equal(city.players[0]!.lien, 0);
    assert.equal(city.players[0]!.inJail, false);
    city.deeds = [
      { spaceId: 1, tokenId: "SZ-01", ownerId: "you", houses: 0 },
      { spaceId: 3, tokenId: "SZ-03", ownerId: "you", houses: 0 },
    ];
    assert.equal(epochRent(city, 1, 7), 16 * 2);
    const poor = spendBail(city);
    assert.equal(poor.players[0]!.marks, 0);
  });

  it("rejects oversized bail when Marks are short and caps the clear at $200", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(94) });
    city.players[0]!.marks = BAIL_MARKS;
    city.players[0]!.lien = 500;
    city.players[0]!.inJail = true;
    city = spendBail(city);
    assert.equal(city.players[0]!.lien, 500 - BAIL_CAP);
    assert.equal(city.players[0]!.inJail, true);
  });

  it("cuts the human join fee with Marks and leaves computer fees unchanged", () => {
    const city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(95), joinMarks: 50 });
    assert.equal(joinFeeFor(50).fee, JOIN_FEE - 50);
    assert.equal(city.players[0]!.cash, STARTING_CASH - (JOIN_FEE - 50));
    assert.ok(city.players.filter((p) => !p.isHuman).every((p) => p.cash === STARTING_CASH - JOIN_FEE));
    const fees = JOIN_FEE - 50 + JOIN_FEE * 2;
    assert.equal(city.treasury, fees);
    assert.equal(city.opsPool + city.communityPool, fees);
    assert.equal(joinFeeFor(1.5).fee, JOIN_FEE);
    assert.equal(joinFeeFor(-4).fee, JOIN_FEE);
  });

  it("applies lien amnesty from ops after five unpaid epochs", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(96) });
    const you = city.players[0]!;
    you.lien = 100;
    you.inJail = true;
    you.lienStreak = 4;
    you.cash = 0;
    const ops = city.opsPool;
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(96), 1);
    const cut = Math.round(100 * AMNESTY_PCT);
    assert.equal(city.players[0]!.lien, 100 - cut);
    assert.equal(city.players[0]!.inJail, true);
    assert.equal(city.players[0]!.cash, 0);
    assert.equal(city.opsPool, ops - cut);
    assert.equal(city.communityPool, Math.round(JOIN_FEE * 3 * 0.4));
    assert.equal(city.metrics[0]!.amnestyPaid, 1);
    assert.equal(city.metrics[0]!.lienRecovered, 0);
  });

  it("does not spend community funds on amnesty when ops is empty", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(97) });
    city.players[0]!.lien = 80;
    city.players[0]!.inJail = true;
    city.players[0]!.lienStreak = 5;
    city.players[0]!.cash = 0;
    city.opsPool = 0;
    const community = city.communityPool;
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(97), 1);
    assert.equal(city.players[0]!.lien, 80);
    assert.equal(city.communityPool, community);
  });

  it("unlocks a cosmetic with Marks and refuses unknown ids", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(98) });
    city.players[0]!.marks = 80;
    city = unlockCosmetic(city, "theme", "slate");
    assert.equal(city.boardTheme, "slate");
    assert.equal(city.players[0]!.marks, 0);
    assert.ok(city.unlockedThemes.includes("slate"));
    const blocked = unlockCosmetic(city, "theme", "../hack");
    assert.equal(blocked.boardTheme, "slate");
    assert.equal(wealthGini([0, 0, 0]), 0);
    assert.ok(wealthGini([1, 100, 1000]) > 0.4);
  });

  it("prepaid bail bond covers a rent shortfall without changing the owner's receipt", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(99) });
    city.players[0]!.marks = BAIL_MARKS;
    city = spendBail(city);
    assert.equal(city.players[0]!.bondReady, true);
    assert.equal(city.players[0]!.marks, 0);
    city.deeds = [{ spaceId: 39, tokenId: "SZ-39", ownerId: "bot-0", houses: 0 }];
    city.players[0]!.cash = 10;
    city.players[0]!.position = 37;
    const ownerBefore = city.players[1]!.cash;
    const due = epochRent(city, 39, 2);
    assert.ok(due > 10);
    botsPass(city);
    city = commitHuman(city, { kind: "roll", dice: [1, 1] });
    city = settleEpoch(city, rngFrom(99), 80);
    const tax = Math.round(10 * PROTOCOL_TAX);
    assert.equal(city.players[1]!.cash, ownerBefore + (10 - tax));
    assert.equal(city.players[0]!.bondReady, false);
    const missing = due - 10;
    if (missing <= BAIL_CAP) {
      assert.equal(city.players[0]!.lien, 0);
      assert.equal(city.players[0]!.inJail, false);
    } else {
      assert.equal(city.players[0]!.lien, missing - BAIL_CAP);
      assert.equal(city.players[0]!.inJail, true);
    }
  });

  it("records mint/burn, both pools, gini, and lien occupancy each epoch", () => {
    let city = createCity({ humanName: "You", botCount: 2, now: 0, rng: rngFrom(100) });
    botsPass(city);
    city = commitHuman(city, { kind: "pass", dice: null });
    city = settleEpoch(city, rngFrom(100), 1);
    const row = city.metrics[0]!;
    assert.equal(row.epoch, 1);
    assert.equal(typeof row.cashMinted, "number");
    assert.equal(typeof row.cashBurned, "number");
    assert.equal(typeof row.marksMinted, "number");
    assert.equal(typeof row.marksBurned, "number");
    assert.equal(row.opsPool, city.opsPool);
    assert.equal(row.communityPool, city.communityPool);
    assert.ok(row.gini >= 0 && row.gini <= 1);
    assert.equal(row.lienSeats, 0);
    assert.equal(row.amnestyPaid, 0);
    assert.equal(row.lienRecovered, 0);
    assert.ok(city.log.some((e) => e.text.includes("Economy e1")));
  });

  it("keeps SITZ token tax at 5% and splits it without remainder", () => {
    assert.equal(TOKEN_TAX, PROTOCOL_TAX);
    assert.equal(
      TOKEN_YIELD_SHARE + TOKEN_OPS_SHARE + TOKEN_COMMUNITY_SHARE + TOKEN_BURN_SHARE,
      1,
    );
  });
});
