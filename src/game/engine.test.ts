import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jailDecision, shouldBuy } from "./ai.ts";
import { CIRCUIT_SPACES, SPACES } from "./board.ts";
import {
  acknowledgeCard,
  applyRoll,
  buyProperty,
  calcRent,
  createGame,
  currentPlayer,
  declineBuy,
  jailPay,
  jailRoll,
  jailUseCard,
  moveAndResolve,
  netWorth,
  ownsGroup,
  rollDice,
  sanitizeName,
  sendToJail,
  shuffle,
  stepForward,
} from "./engine.ts";
import { JAIL_FINE, JAIL_POS, STARTING_CASH } from "./types.ts";

function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("board data", () => {
  it("has a 40-space circuit plus prepared expansion lots off the core loop", () => {
    assert.equal(CIRCUIT_SPACES.length, 40);
    assert.equal(SPACES.length, 240);
    assert.deepEqual(
      SPACES.map((s) => s.id),
      Array.from({ length: 240 }, (_, i) => i),
    );
  });
});

describe("sanitizeName", () => {
  it("strips tags and trims", () => {
    assert.equal(sanitizeName("  <b>Ada</b>  "), "bAda/b");
    assert.equal(sanitizeName(""), "You");
    assert.equal(sanitizeName("x".repeat(40)).length, 18);
  });
});

describe("core rules", () => {
  it("starts four players on GO with $1500", () => {
    const g = createGame({ humanName: "Oak", botCount: 3, rng: rngFrom(1) });
    assert.equal(g.players.length, 4);
    assert.equal(g.players[0]!.name, "Oak");
    assert.ok(g.players.every((p) => p.money === STARTING_CASH && p.position === 0));
  });

  it("moves and wraps with GO salary", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(2) });
    const first = applyRoll(g, [3, 4]);
    if (first.kind !== "move") throw new Error("move");
    g = moveAndResolve(first.state, 7, rngFrom(2));
    assert.equal(g.players[0]!.position, 7);
    g.players[0]!.position = 38;
    g.current = 0;
    g.phase = "awaiting_roll";
    g.action = "none";
    g.doublesStreak = 0;
    g.lastRoll = [0, 0];
    const wrap = applyRoll(g, [1, 2]);
    if (wrap.kind !== "move") throw new Error("move");
    g = moveAndResolve(wrap.state, 3, rngFrom(2));
    const you = g.players[0]!;
    assert.equal(you.position, 1);
    assert.ok(you.money >= STARTING_CASH + 200 - 60);
  });

  it("buys Ivory Lane then opponent pays rent", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(4) });
    const roll = applyRoll(g, [1, 2]);
    assert.equal(roll.kind, "move");
    if (roll.kind !== "move") return;
    g = moveAndResolve(roll.state, 1, rngFrom(4));
    assert.equal(g.action, "buy");
    assert.equal(currentPlayer(g).position, 1);
    g = buyProperty(g);
    assert.equal(g.owners[1], "you");
    assert.equal(g.players[0]!.money, STARTING_CASH - 60);
    assert.equal(g.current, 1);
    g.current = 1;
    g.players[1]!.position = 0;
    g.phase = "awaiting_roll";
    g.action = "none";
    g.doublesStreak = 0;
    g.lastRoll = [0, 0];
    const moved = applyRoll(g, [1, 2]);
    if (moved.kind !== "move") throw new Error("expected move");
    g = moveAndResolve(moved.state, 1, rngFrom(4));
    assert.equal(g.players[1]!.money, STARTING_CASH - 16);
    assert.equal(g.players[0]!.money, STARTING_CASH - 60 + 16);
  });

  it("doubles rent when a colour row is complete", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(5) });
    g.owners[1] = "you";
    g.owners[3] = "you";
    assert.ok(ownsGroup(g, "you", "brown"));
    assert.equal(calcRent(g, 1, 7), 32);
  });

  it("scales transit rent with lines owned", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(6) });
    g.owners[5] = "you";
    assert.equal(calcRent(g, 5, 7), 25);
    g.owners[15] = "you";
    assert.equal(calcRent(g, 5, 7), 50);
    g.owners[25] = "you";
    g.owners[35] = "you";
    assert.equal(calcRent(g, 5, 7), 200);
  });

  it("charges utilities from the dice", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(7) });
    g.owners[14] = "you";
    assert.equal(calcRent(g, 14, 8), 32);
    g.owners[29] = "you";
    assert.equal(calcRent(g, 14, 8), 80);
  });

  it("sends the player to jail on three doubles without collecting GO", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(8) });
    g.players[0]!.position = 38;
    let r = applyRoll(g, [1, 1]);
    assert.equal(r.kind, "move");
    g = r.state;
    r = applyRoll(g, [2, 2]);
    assert.equal(r.kind, "move");
    g = r.state;
    r = applyRoll(g, [3, 3]);
    assert.equal(r.kind, "jail");
    const you = r.state.players[0]!;
    assert.equal(you.position, JAIL_POS);
    assert.equal(you.inJail, true);
    assert.equal(you.money, STARTING_CASH);
    assert.equal(r.state.current, 1);
  });

  it("Go-to-Jail does not pay salary", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(9) });
    g.players[0]!.position = 28;
    const r = applyRoll(g, [1, 1]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 2, rngFrom(9));
    const you = g.players.find((p) => p.id === "you")!;
    assert.equal(you.position, JAIL_POS);
    assert.equal(you.inJail, true);
    assert.equal(you.money, STARTING_CASH);
  });

  it("collects tax into Civic Park then pays it out", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(10) });
    g.players[0]!.position = 3;
    const levy = applyRoll(g, [2, 3]);
    if (levy.kind !== "move") throw new Error("move");
    g = moveAndResolve(levy.state, 1, rngFrom(10));
    assert.equal(g.players[0]!.money, STARTING_CASH - 200);
    assert.equal(g.jackpot, 200);
    g.current = 0;
    g.players[0]!.position = 18;
    g.phase = "awaiting_roll";
    g.action = "none";
    g.doublesStreak = 0;
    g.lastRoll = [0, 0];
    const park = applyRoll(g, [2, 3]);
    if (park.kind !== "move") throw new Error("move");
    g = moveAndResolve(park.state, 2, rngFrom(10));
    const you = g.players[0]!;
    assert.equal(you.position, 20);
    assert.equal(you.money, STARTING_CASH);
    assert.equal(g.jackpot, 0);
  });

  it("bankruptcy hands leftover cash to the creditor", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(11) });
    g.owners[39] = "bot-0";
    g.players[0]!.money = 20;
    g.players[0]!.position = 38;
    const r = applyRoll(g, [2, 3]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 1, rngFrom(11));
    assert.equal(g.players[0]!.bankrupt, true);
    assert.equal(g.players[0]!.money, 0);
    assert.equal(g.owners[39], "bot-0");
    assert.ok(g.players[1]!.money > STARTING_CASH);
  });

  it("pays a jail fine and leaves", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(12) });
    g = sendToJail(g, "test jail");
    assert.equal(g.current, 1);
    g.current = 0;
    g.players[0]!.inJail = true;
    g.players[0]!.jailTurns = 1;
    g.phase = "awaiting_action";
    g.action = "jail";
    g = jailPay(g);
    assert.equal(g.players[0]!.inJail, false);
    assert.equal(g.players[0]!.money, STARTING_CASH - JAIL_FINE);
    assert.equal(g.phase, "awaiting_roll");
  });

  it("leaves jail on doubles and moves", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(13) });
    g.players[0]!.inJail = true;
    g.players[0]!.position = JAIL_POS;
    g.players[0]!.jailTurns = 1;
    g.phase = "awaiting_action";
    g.action = "jail";
    const result = jailRoll(g, [3, 3]);
    assert.equal(result.kind, "move");
    if (result.kind !== "move") return;
    g = moveAndResolve(result.state, result.steps, rngFrom(13));
    assert.equal(g.players[0]!.inJail, false);
    assert.equal(g.players[0]!.position, 16);
  });

  it("uses a jail-free card", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(14) });
    g.players[0]!.inJail = true;
    g.players[0]!.jailFree = 1;
    g.players[0]!.jailTurns = 1;
    g.phase = "awaiting_action";
    g.action = "jail";
    g = jailUseCard(g);
    assert.equal(g.players[0]!.jailFree, 0);
    assert.equal(g.players[0]!.inJail, false);
    assert.equal(g.phase, "awaiting_roll");
  });

  it("declining a buy leaves the deed in the bank", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(15) });
    const r = applyRoll(g, [2, 3]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 1, rngFrom(15));
    assert.equal(g.action, "buy");
    g = declineBuy(g);
    assert.equal(g.owners[1], null);
  });

  it("cannot buy without cash", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(16) });
    g.players[0]!.money = 10;
    const r = applyRoll(g, [2, 3]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 1, rngFrom(16));
    assert.notEqual(g.action, "buy");
    assert.equal(g.owners[1], null);
  });

  it("Fortune card can pay cash", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(17) });
    g.fortunePile = ["f-bank"];
    g.players[0]!.position = 1;
    const r = applyRoll(g, [2, 3]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 1, rngFrom(17));
    assert.equal(g.action, "card");
    g = acknowledgeCard(g, rngFrom(17));
    assert.equal(g.players[0]!.money, STARTING_CASH + 150);
  });

  it("Chance go-to-jail card jails without salary", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(18) });
    g.chancePile = ["c-jail"];
    g.players[0]!.position = 8;
    const r = applyRoll(g, [2, 3]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 1, rngFrom(18));
    assert.equal(g.action, "card");
    g = acknowledgeCard(g, rngFrom(18));
    const you = g.players.find((p) => p.id === "you")!;
    assert.equal(you.inJail, true);
    assert.equal(you.position, JAIL_POS);
    assert.equal(you.money, STARTING_CASH);
  });

  it("shuffle is a permutation", () => {
    const rng = rngFrom(99);
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(src, rng);
    assert.deepEqual([...out].sort((a, b) => a - b), src);
    assert.equal(src.join(","), "1,2,3,4,5,6,7,8");
  });

  it("AI buys to complete a cheap set when flush", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(19) });
    g.owners[1] = "you";
    g.players[0]!.position = 3;
    g.phase = "awaiting_action";
    g.action = "buy";
    assert.equal(shouldBuy(g, () => 0), true);
  });

  it("AI rolls in jail when poor", () => {
    const g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(20) });
    g.players[0]!.money = 40;
    g.players[0]!.inJail = true;
    g.players[0]!.jailTurns = 1;
    g.phase = "awaiting_action";
    g.action = "jail";
    assert.equal(jailDecision(g), "roll");
  });

  it("rounds do not end the game", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(21), maxRounds: 1 });
    g.round = 99;
    const r = applyRoll(g, [4, 6]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 10, rngFrom(21));
    assert.notEqual(g.phase, "game_over");
    assert.equal(g.players[0]!.position, 10);
  });

  it("first bankruptcy ends the game on net worth", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(21) });
    g.owners[39] = "bot-0";
    g.players[0]!.money = 20;
    g.players[0]!.position = 38;
    const r = applyRoll(g, [2, 3]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 1, rngFrom(21));
    assert.equal(g.players[0]!.bankrupt, true);
    assert.equal(g.phase, "game_over");
    assert.equal(g.winReason, "bankrupt");
    assert.equal(g.winnerId, "bot-0");
    assert.ok(netWorth(g, "bot-0") > netWorth(g, "you"));
  });

  it("bankrupt rival awards the richest remaining player", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(22) });
    g.owners[39] = "you";
    g.current = 1;
    g.players[1]!.money = 20;
    g.players[1]!.position = 38;
    g.phase = "awaiting_roll";
    g.action = "none";
    const r = applyRoll(g, [2, 3]);
    if (r.kind !== "move") throw new Error("move");
    g = moveAndResolve(r.state, 1, rngFrom(22));
    assert.equal(g.players[1]!.bankrupt, true);
    assert.equal(g.phase, "game_over");
    assert.equal(g.winReason, "bankrupt");
    assert.equal(g.winnerId, "you");
  });
});

describe("full simulated games", () => {
  it("finishes without negative cash or a stuck phase", () => {
    for (let seed = 1; seed <= 24; seed++) {
      const rng = rngFrom(seed * 997);
      let g = createGame({ humanName: "You", botCount: 3, rng, maxRounds: 80 });
      let guard = 0;
      while (g.phase !== "game_over" && guard++ < 8000) {
        for (const p of g.players) {
          assert.ok(p.money >= 0, `neg cash seed ${seed} ${p.name}`);
        }
        if (g.phase === "awaiting_roll") {
          const dice = rollDice(rng);
          const result = applyRoll(g, dice);
          g = result.state;
          if (result.kind === "move") g = moveAndResolve(g, result.steps, rng);
          continue;
        }
        if (g.action === "buy") {
          g = shouldBuy(g, rng) ? buyProperty(g) : declineBuy(g);
          continue;
        }
        if (g.action === "card") {
          g = acknowledgeCard(g, rng);
          continue;
        }
        if (g.action === "jail") {
          const choice = jailDecision(g);
          if (choice === "card") g = jailUseCard(g);
          else if (choice === "pay") g = jailPay(g);
          else {
            const result = jailRoll(g, rollDice(rng));
            g = result.state;
            if (result.kind === "move") g = moveAndResolve(g, result.steps, rng);
          }
          continue;
        }
        throw new Error(`stuck seed ${seed} phase=${g.phase} action=${g.action}`);
      }
      assert.equal(g.phase, "game_over", `unfinished seed ${seed} after ${guard}`);
      assert.ok(g.winnerId);
    }
  });
});

describe("stepForward", () => {
  it("collects GO exactly once per wrap", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(22) });
    g.players[0]!.position = 39;
    g = stepForward(g);
    assert.equal(g.players[0]!.position, 0);
    assert.equal(g.players[0]!.money, STARTING_CASH + 200);
  });

  it("charges deed upkeep when passing GO", () => {
    let g = createGame({ humanName: "You", botCount: 2, rng: rngFrom(23) });
    g.owners[1] = "you";
    g.players[0]!.position = 39;
    g = stepForward(g);
    assert.equal(g.players[0]!.money, STARTING_CASH + 200 - 35);
  });
});
