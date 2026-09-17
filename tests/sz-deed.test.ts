import { initSimnet, type Simnet } from "@stacks/clarinet-sdk";
import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifest = resolve(dirname(fileURLToPath(import.meta.url)), "../Clarinet.toml");

let simnet: Simnet;
let deployer: string;
let city: string;
let owner: string;
let other: string;

const ERR_NOT_OWNER = 200;
const ERR_NOT_CITY = 201;
const ERR_OWNED = 205;
const ERR_NO_ROW = 207;
const ERR_NO_HOUSES = 208;

const SKY = [6, 7, 8] as const;
const HOUSE_COST_CANAL = 45_000_000; // max(40, round(100 * 0.45)) STX in micro-STX

beforeEach(async () => {
  simnet = await initSimnet(manifest);
  const accounts = simnet.getAccounts();
  deployer = accounts.get("deployer")!;
  city = accounts.get("wallet_2")!;
  owner = accounts.get("wallet_1")!;
  other = accounts.get("wallet_3")!;

  expect(
    simnet.callPublicFn("sz-deed", "set-city-contract", [Cl.principal(city)], deployer).result,
  ).toBeOk(Cl.bool(true));
  expect(
    simnet.callPublicFn(
      "stx-treasury",
      "set-deed-contract",
      [Cl.contractPrincipal(deployer, "sz-deed")],
      deployer,
    ).result,
  ).toBeOk(Cl.bool(true));
});

function mint(id: number, to: string, sender = city) {
  return simnet.callPublicFn("sz-deed", "mint", [Cl.uint(id), Cl.principal(to)], sender);
}

function houses(id: number) {
  return simnet.callReadOnlyFn("sz-deed", "get-houses", [Cl.uint(id)], deployer).result;
}

function nftOwner(id: number) {
  return simnet.callReadOnlyFn("sz-deed", "get-owner", [Cl.uint(id)], deployer).result;
}

describe("sz-deed", () => {
  it("cannot mint twice", () => {
    expect(mint(1, owner).result).toBeOk(Cl.uint(1));
    expect(mint(1, other).result).toBeErr(Cl.uint(ERR_OWNED));
    expect(nftOwner(1)).toBeOk(Cl.some(Cl.principal(owner)));
    expect(houses(1)).toBeUint(0);
  });

  it("non-city cannot mint", () => {
    expect(mint(1, owner, owner).result).toBeErr(Cl.uint(ERR_NOT_CITY));
  });

  it("cannot improve without the full colour row", () => {
    expect(mint(6, owner).result).toBeOk(Cl.uint(6));
    expect(
      simnet.callPublicFn("sz-deed", "improve", [Cl.uint(6)], owner).result,
    ).toBeErr(Cl.uint(ERR_NO_ROW));
    expect(houses(6)).toBeUint(0);
  });

  it("3-lot sky row then house 1, house cost to treasury, no SITZ", () => {
    for (const id of SKY) {
      expect(mint(id, owner).result).toBeOk(Cl.uint(id));
    }
    expect(simnet.callReadOnlyFn("sz-deed", "house-cost", [Cl.uint(6)], deployer).result).toBeUint(
      HOUSE_COST_CANAL,
    );
    expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(6)], owner).result).toBeOk(Cl.uint(1));
    expect(houses(6)).toBeUint(1);
    expect(houses(7)).toBeUint(0);
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(
      (HOUSE_COST_CANAL * 60) / 100,
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      HOUSE_COST_CANAL - (HOUSE_COST_CANAL * 60) / 100,
    );
  });

  it("transfer keeps houses = 3", () => {
    for (const id of SKY) {
      mint(id, owner);
    }
    expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(6)], owner).result).toBeOk(Cl.uint(1));
    expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(6)], owner).result).toBeOk(Cl.uint(2));
    expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(6)], owner).result).toBeOk(Cl.uint(3));
    expect(houses(6)).toBeUint(3);

    expect(
      simnet.callPublicFn(
        "sz-deed",
        "transfer",
        [Cl.uint(6), Cl.principal(owner), Cl.principal(other)],
        owner,
      ).result,
    ).toBeOk(Cl.bool(true));
    expect(nftOwner(6)).toBeOk(Cl.some(Cl.principal(other)));
    expect(houses(6)).toBeUint(3);
  });

  it("non-owner cannot improve", () => {
    for (const id of SKY) {
      mint(id, owner);
    }
    expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(6)], other).result).toBeErr(
      Cl.uint(ERR_NOT_OWNER),
    );
    expect(houses(6)).toBeUint(0);
  });

  it("utility and transit houses stay 0", () => {
    expect(mint(14, owner).result).toBeOk(Cl.uint(14));
    expect(mint(5, owner).result).toBeOk(Cl.uint(5));
    expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(14)], owner).result).toBeErr(
      Cl.uint(ERR_NO_HOUSES),
    );
    expect(simnet.callPublicFn("sz-deed", "improve", [Cl.uint(5)], owner).result).toBeErr(
      Cl.uint(ERR_NO_HOUSES),
    );
    expect(houses(14)).toBeUint(0);
    expect(houses(5)).toBeUint(0);
  });

  it("listing fee stub is 2.5% STX to treasury, city only", () => {
    simnet.callPublicFn("stx-treasury", "set-city-contract", [Cl.principal(city)], deployer);
    const sale = 200_000_000;
    const fee = (sale * 25) / 1000;
    expect(
      simnet.callPublicFn("sz-deed", "take-listing-fee", [Cl.uint(sale)], city).result,
    ).toBeOk(Cl.uint(fee));
    expect(simnet.callPublicFn("sz-deed", "take-listing-fee", [Cl.uint(sale)], owner).result).toBeErr(
      Cl.uint(ERR_NOT_CITY),
    );
  });
});
