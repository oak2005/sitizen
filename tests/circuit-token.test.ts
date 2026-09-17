import { initSimnet, type Simnet } from "@stacks/clarinet-sdk";
import { Cl, cvToValue } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifest = resolve(dirname(fileURLToPath(import.meta.url)), "../Clarinet.toml");

const UNIT = 1_000_000;
const HUNDRED = 100 * UNIT;
const TAX = 5 * UNIT;
const VAULT_CUT = 2 * UNIT;
const OPS_CUT = 1.25 * UNIT;
const COMMUNITY_CUT = 1 * UNIT;
const BURN_CUT = 0.75 * UNIT;

const ERR_NOT_CITY = 301;
const ERR_MAINNET = 304;

let simnet: Simnet;
let deployer: string;
let city: string;
let alice: string;
let bob: string;
let holder: string;

beforeEach(async () => {
  simnet = await initSimnet(manifest);
  const accounts = simnet.getAccounts();
  deployer = accounts.get("deployer")!;
  city = accounts.get("wallet_2")!;
  alice = accounts.get("wallet_1")!;
  bob = accounts.get("wallet_3")!;
  holder = accounts.get("wallet_4")!;
});

function okUint(result: unknown): bigint {
  const v = cvToValue(result as Parameters<typeof cvToValue>[0]);
  if (typeof v === "bigint") return v;
  if (v && typeof v === "object" && "value" in (v as object)) {
    const inner = (v as { value: unknown }).value;
    if (typeof inner === "bigint") return inner;
    if (typeof inner === "number") return BigInt(inner);
    if (typeof inner === "string") return BigInt(inner);
  }
  if (typeof v === "number") return BigInt(v);
  if (typeof v === "string") return BigInt(v);
  throw new Error(`not uint: ${JSON.stringify(v)}`);
}

function faucet(to: string, amount: number) {
  expect(
    simnet.callPublicFn("circuit-token", "faucet", [Cl.principal(to), Cl.uint(amount)], deployer).result,
  ).toBeOk(Cl.bool(true));
}

function transfer(amount: number, from: string, to: string) {
  return simnet.callPublicFn(
    "circuit-token",
    "transfer",
    [Cl.uint(amount), Cl.principal(from), Cl.principal(to), Cl.none()],
    from,
  );
}

describe("circuit-token / SITZ", () => {
  it("100 token transfer takes 5 tax: 2 vault, 1.25 ops, 1 community, 0.75 burn", () => {
    faucet(alice, HUNDRED);
    const { result } = transfer(HUNDRED, alice, bob);
    expect(result).toBeOk(
      Cl.tuple({
        net: Cl.uint(HUNDRED - TAX),
        tax: Cl.uint(TAX),
        yield: Cl.uint(VAULT_CUT),
        ops: Cl.uint(OPS_CUT),
        community: Cl.uint(COMMUNITY_CUT),
        burn: Cl.uint(BURN_CUT),
      }),
    );
    expect(simnet.callReadOnlyFn("circuit-token", "get-yield-vault", [], deployer).result).toBeUint(VAULT_CUT);
    expect(simnet.callReadOnlyFn("circuit-token", "get-ops-sitz", [], deployer).result).toBeUint(OPS_CUT);
    expect(simnet.callReadOnlyFn("circuit-token", "get-community-sitz", [], deployer).result).toBeUint(
      COMMUNITY_CUT,
    );
    expect(simnet.callReadOnlyFn("circuit-token", "get-balance", [Cl.principal(bob)], deployer).result).toBeOk(
      Cl.uint(HUNDRED - TAX),
    );
    expect(simnet.callReadOnlyFn("circuit-token", "get-total-supply", [], deployer).result).toBeOk(
      Cl.uint(HUNDRED - BURN_CUT),
    );
  });

  it("civic tax is STX and token tax is SITZ — two layers, never mixed", () => {
    faucet(alice, HUNDRED);
    transfer(HUNDRED, alice, bob);
    expect(simnet.callReadOnlyFn("circuit-token", "get-ops-sitz", [], deployer).result).toBeUint(OPS_CUT);
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(0);
    expect(simnet.callPublicFn("stx-treasury", "join", [], alice).result).toBeOk(
      Cl.tuple({ ops: Cl.uint(30_000_000), community: Cl.uint(20_000_000) }),
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(30_000_000);
    expect(simnet.callReadOnlyFn("circuit-token", "get-ops-sitz", [], deployer).result).toBeUint(OPS_CUT);
  });

  it("holder-only token earns 0 drip", () => {
    faucet(alice, 500 * UNIT);
    transfer(500 * UNIT, alice, bob);
    expect(simnet.callReadOnlyFn("circuit-token", "get-yield-vault", [], deployer).result).toBeUint(10 * UNIT);
    faucet(holder, 40 * UNIT);
    const before = simnet.callReadOnlyFn("circuit-token", "get-balance", [Cl.principal(holder)], deployer).result;
    simnet.callPublicFn("circuit-token", "set-city-contract", [Cl.principal(city)], deployer);
    expect(simnet.callPublicFn("circuit-token", "drip", [Cl.uint(1)], city).result).toBeOk(
      Cl.tuple({
        skipped: Cl.bool(true),
        paid: Cl.uint(0),
        "total-weight": Cl.uint(0),
      }),
    );
    expect(
      simnet.callReadOnlyFn("circuit-token", "get-balance", [Cl.principal(holder)], deployer).result,
    ).toEqual(before);
  });

  it("non-city cannot drip", () => {
    simnet.callPublicFn("circuit-token", "set-city-contract", [Cl.principal(city)], deployer);
    expect(simnet.callPublicFn("circuit-token", "drip", [Cl.uint(1)], alice).result).toBeErr(
      Cl.uint(ERR_NOT_CITY),
    );
  });

  it("improved hotel earns more than an empty lot", () => {
    simnet.callPublicFn("sz-deed", "set-city-contract", [Cl.principal(city)], deployer);
    simnet.callPublicFn(
      "stx-treasury",
      "set-deed-contract",
      [Cl.contractPrincipal(deployer, "sz-deed")],
      deployer,
    );
    simnet.callPublicFn("circuit-token", "set-city-contract", [Cl.principal(city)], deployer);

    for (const id of [6, 7, 8]) {
      expect(
        simnet.callPublicFn("sz-deed", "mint", [Cl.uint(id), Cl.principal(alice)], city).result,
      ).toBeOk(Cl.uint(id));
    }
    expect(
      simnet.callPublicFn("sz-deed", "mint", [Cl.uint(1), Cl.principal(bob)], city).result,
    ).toBeOk(Cl.uint(1));
    for (let i = 0; i < 5; i++) {
      expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(6)], alice).result).toBeOk(Cl.uint(i + 1));
    }
    expect(simnet.callReadOnlyFn("sz-deed", "get-houses", [Cl.uint(6)], deployer).result).toBeUint(5);

    faucet(holder, 500 * UNIT);
    transfer(500 * UNIT, holder, deployer);
    const vault = 10 * UNIT;
    expect(simnet.callReadOnlyFn("circuit-token", "get-yield-vault", [], deployer).result).toBeUint(vault);

    const aliceBefore = okUint(
      simnet.callReadOnlyFn("circuit-token", "get-balance", [Cl.principal(alice)], deployer).result,
    );
    const bobBefore = okUint(
      simnet.callReadOnlyFn("circuit-token", "get-balance", [Cl.principal(bob)], deployer).result,
    );

    const drip = simnet.callPublicFn("circuit-token", "drip", [Cl.uint(1)], city);
    expect(drip.result).toBeOk(
      Cl.tuple({
        skipped: Cl.bool(false),
        paid: Cl.uint(9_999_997),
        "total-weight": Cl.uint(28),
      }),
    );

    const aliceAfter = okUint(
      simnet.callReadOnlyFn("circuit-token", "get-balance", [Cl.principal(alice)], deployer).result,
    );
    const bobAfter = okUint(
      simnet.callReadOnlyFn("circuit-token", "get-balance", [Cl.principal(bob)], deployer).result,
    );

    expect(aliceAfter - aliceBefore > bobAfter - bobBefore).toBe(true);
    expect(bobAfter - bobBefore > 0n).toBe(true);
  });

  it("faucet is deployer-gated and dies on mainnet", () => {
    expect(
      simnet.callPublicFn("circuit-token", "faucet", [Cl.principal(alice), Cl.uint(UNIT)], alice).result,
    ).toBeErr(Cl.uint(300));
    expect(simnet.callPublicFn("circuit-token", "seal-mainnet", [], deployer).result).toBeOk(Cl.bool(true));
    expect(
      simnet.callPublicFn("circuit-token", "faucet", [Cl.principal(alice), Cl.uint(UNIT)], deployer).result,
    ).toBeErr(Cl.uint(ERR_MAINNET));
  });
});
