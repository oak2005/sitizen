import { initSimnet, type Simnet } from "@stacks/clarinet-sdk";
import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const manifest = resolve(dirname(fileURLToPath(import.meta.url)), "../Clarinet.toml");

let simnet: Simnet;
let deployer: string;
let wallet1: string;
let wallet2: string;
let wallet3: string;
let wallet4: string;
let wallet5: string;

const JOIN = 50_000_000;
const OPS_JOIN = 30_000_000;
const COMMUNITY_JOIN = 20_000_000;

const ERR_NOT_OWNER = 100;
const ERR_PAUSED = 101;
const ERR_ALREADY_SEATED = 102;
const ERR_NOT_CITY = 103;
const ERR_NO_CITY = 104;
const ERR_INSUFFICIENT_OPS = 107;
const ERR_NOT_PAYOUT_EPOCH = 108;

beforeEach(async () => {
  simnet = await initSimnet(manifest);
  const accounts = simnet.getAccounts();
  deployer = accounts.get("deployer")!;
  wallet1 = accounts.get("wallet_1")!;
  wallet2 = accounts.get("wallet_2")!;
  wallet3 = accounts.get("wallet_3")!;
  wallet4 = accounts.get("wallet_4")!;
  wallet5 = accounts.get("wallet_5")!;
});

function setCity(city: string) {
  const { result } = simnet.callPublicFn(
    "stx-treasury",
    "set-city-contract",
    [Cl.principal(city)],
    deployer,
  );
  expect(result).toBeOk(Cl.bool(true));
}

describe("stx-treasury", () => {
  it("join 50 STX splits 30 ops / 20 community and records a seat", () => {
    const { result } = simnet.callPublicFn("stx-treasury", "join", [], wallet1);
    expect(result).toBeOk(
      Cl.tuple({
        ops: Cl.uint(OPS_JOIN),
        community: Cl.uint(COMMUNITY_JOIN),
      }),
    );

    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(OPS_JOIN);
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      COMMUNITY_JOIN,
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "human-count", [], deployer).result).toBeUint(1);
    expect(
      simnet.callReadOnlyFn("stx-treasury", "is-human-seat", [Cl.principal(wallet1)], deployer).result,
    ).toBeBool(true);
    expect(
      simnet.callReadOnlyFn("stx-treasury", "is-human-seat", [Cl.principal(wallet2)], deployer).result,
    ).toBeBool(false);
  });

  it("second join fails", () => {
    expect(simnet.callPublicFn("stx-treasury", "join", [], wallet1).result).toBeOk(
      Cl.tuple({
        ops: Cl.uint(OPS_JOIN),
        community: Cl.uint(COMMUNITY_JOIN),
      }),
    );
    expect(simnet.callPublicFn("stx-treasury", "join", [], wallet1).result).toBeErr(
      Cl.uint(ERR_ALREADY_SEATED),
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "human-count", [], deployer).result).toBeUint(1);
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(OPS_JOIN);
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      COMMUNITY_JOIN,
    );
  });

  it("ops plus community equals 50 STX after join", () => {
    simnet.callPublicFn("stx-treasury", "join", [], wallet2);
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(OPS_JOIN);
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      COMMUNITY_JOIN,
    );
  });

  it("non-city cannot skim", () => {
    setCity(wallet2);
    expect(
      simnet.callPublicFn("stx-treasury", "credit-skim", [Cl.uint(1_000_000)], wallet1).result,
    ).toBeErr(Cl.uint(ERR_NOT_CITY));
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(0);
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(0);
  });

  it("skim without a city set fails", () => {
    expect(
      simnet.callPublicFn("stx-treasury", "credit-skim", [Cl.uint(1_000_000)], wallet1).result,
    ).toBeErr(Cl.uint(ERR_NO_CITY));
  });

  it("city skim splits 60/40 STX", () => {
    setCity(wallet2);
    expect(simnet.callPublicFn("stx-treasury", "credit-skim", [Cl.uint(10_000_000)], wallet2).result).toBeOk(
      Cl.tuple({
        ops: Cl.uint(6_000_000),
        community: Cl.uint(4_000_000),
      }),
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(6_000_000);
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(4_000_000);
  });

  it("amnesty cannot touch community", () => {
    simnet.callPublicFn("stx-treasury", "join", [], wallet1);
    setCity(wallet2);

    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      COMMUNITY_JOIN,
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(OPS_JOIN);

    expect(
      simnet.callPublicFn(
        "stx-treasury",
        "amnesty",
        [Cl.principal(wallet1), Cl.uint(OPS_JOIN + 1)],
        wallet2,
      ).result,
    ).toBeErr(Cl.uint(ERR_INSUFFICIENT_OPS));
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      COMMUNITY_JOIN,
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(OPS_JOIN);

    expect(
      simnet.callPublicFn("stx-treasury", "amnesty", [Cl.principal(wallet3), Cl.uint(5_000_000)], wallet2)
        .result,
    ).toBeOk(Cl.uint(5_000_000));
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(25_000_000);
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      COMMUNITY_JOIN,
    );
  });

  it("non-city cannot amnesty", () => {
    simnet.callPublicFn("stx-treasury", "join", [], wallet1);
    setCity(wallet2);
    expect(
      simnet.callPublicFn("stx-treasury", "amnesty", [Cl.principal(wallet1), Cl.uint(1_000_000)], wallet1)
        .result,
    ).toBeErr(Cl.uint(ERR_NOT_CITY));
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(OPS_JOIN);
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      COMMUNITY_JOIN,
    );
  });

  it("non-owner cannot set city or pause", () => {
    expect(
      simnet.callPublicFn("stx-treasury", "set-city-contract", [Cl.principal(wallet2)], wallet1).result,
    ).toBeErr(Cl.uint(ERR_NOT_OWNER));
    expect(simnet.callPublicFn("stx-treasury", "set-paused", [Cl.bool(true)], wallet1).result).toBeErr(
      Cl.uint(ERR_NOT_OWNER),
    );
  });

  it("paused join is refused; unpause restores join", () => {
    simnet.callPublicFn("stx-treasury", "set-paused", [Cl.bool(true)], deployer);
    expect(simnet.callPublicFn("stx-treasury", "join", [], wallet1).result).toBeErr(Cl.uint(ERR_PAUSED));
    simnet.callPublicFn("stx-treasury", "set-paused", [Cl.bool(false)], deployer);
    expect(simnet.callPublicFn("stx-treasury", "join", [], wallet1).result).toBeOk(
      Cl.tuple({
        ops: Cl.uint(OPS_JOIN),
        community: Cl.uint(COMMUNITY_JOIN),
      }),
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "human-count", [], deployer).result).toBeUint(1);
  });

  it("community payout every 20 epochs is 50/30/20 and skips under the floor", () => {
    setCity(wallet2);
    expect(
      simnet.callPublicFn(
        "stx-treasury",
        "community-payout",
        [Cl.uint(20), Cl.list([Cl.principal(wallet1), Cl.principal(wallet3), Cl.principal(wallet4)])],
        wallet2,
      ).result,
    ).toBeOk(
      Cl.tuple({
        skipped: Cl.bool(true),
        paid: Cl.uint(0),
        first: Cl.uint(0),
        second: Cl.uint(0),
        third: Cl.uint(0),
      }),
    );

    expect(
      simnet.callPublicFn(
        "stx-treasury",
        "community-payout",
        [Cl.uint(21), Cl.list([Cl.principal(wallet1), Cl.principal(wallet3), Cl.principal(wallet4)])],
        wallet2,
      ).result,
    ).toBeErr(Cl.uint(ERR_NOT_PAYOUT_EPOCH));

    simnet.callPublicFn("stx-treasury", "join", [], wallet1);
    simnet.callPublicFn("stx-treasury", "join", [], wallet3);
    simnet.callPublicFn("stx-treasury", "join", [], wallet4);
    simnet.callPublicFn("stx-treasury", "join", [], wallet5);

    const pool = 80_000_000;
    const pot = (pool * 25) / 100;
    const a = (pot * 50) / 100;
    const b = (pot * 30) / 100;
    const c = pot - a - b;

    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(pool);

    expect(
      simnet.callPublicFn(
        "stx-treasury",
        "community-payout",
        [Cl.uint(40), Cl.list([Cl.principal(wallet1), Cl.principal(wallet3), Cl.principal(wallet4)])],
        wallet2,
      ).result,
    ).toBeOk(
      Cl.tuple({
        skipped: Cl.bool(false),
        paid: Cl.uint(pot),
        first: Cl.uint(a),
        second: Cl.uint(b),
        third: Cl.uint(c),
      }),
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      pool - pot,
    );
  });
});
