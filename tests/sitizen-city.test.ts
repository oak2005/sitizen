import { initSimnet, type Simnet } from "@stacks/clarinet-sdk";
import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifest = resolve(dirname(fileURLToPath(import.meta.url)), "../Clarinet.toml");

const ERR_TOO_EARLY = 407;
const ERR_NOT_ENOUGH = 409;

let simnet: Simnet;
let deployer: string;
let humans: string[];
let bot: string;

beforeEach(async () => {
  simnet = await initSimnet(manifest);
  const accounts = simnet.getAccounts();
  deployer = accounts.get("deployer")!;
  humans = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => accounts.get(`wallet_${n}`)!);
  bot = accounts.get("faucet")!;

  const city = Cl.contractPrincipal(deployer, "sitizen-city");
  expect(
    simnet.callPublicFn("sz-deed", "set-city-contract", [city], deployer).result,
  ).toBeOk(Cl.bool(true));
  expect(
    simnet.callPublicFn("stx-treasury", "set-city-contract", [city], deployer).result,
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

function join(who: string) {
  return simnet.callPublicFn("sitizen-city", "join", [], who);
}

function lot(id: number) {
  return simnet.callReadOnlyFn("sz-deed", "get-lot", [Cl.uint(id)], deployer).result;
}

describe("sitizen-city", () => {
  it("7 humans cannot open Lantern; 8th human unlocks ids 40-43 with utility last", () => {
    for (let i = 0; i < 7; i++) {
      expect(join(humans[i]!).result).toBeOk(Cl.uint(i + 1));
    }
    expect(simnet.callReadOnlyFn("sitizen-city", "human-count", [], deployer).result).toBeUint(7);
    expect(simnet.callPublicFn("sitizen-city", "open-district", [Cl.uint(1)], humans[0]!).result).toBeErr(
      Cl.uint(ERR_NOT_ENOUGH),
    );
    expect(lot(40)).toBeNone();

    expect(join(humans[7]!).result).toBeOk(Cl.uint(8));
    expect(simnet.callReadOnlyFn("sitizen-city", "human-count", [], deployer).result).toBeUint(8);

    expect(simnet.callPublicFn("sitizen-city", "open-district", [Cl.uint(1)], humans[0]!).result).toBeOk(
      Cl.tuple({
        n: Cl.uint(1),
        lots: Cl.list([Cl.uint(40), Cl.uint(41), Cl.uint(42), Cl.uint(43)]),
        "utility-last": Cl.uint(43),
      }),
    );

    expect(lot(40)).toBeSome(
      Cl.tuple({ kind: Cl.uint(1), printed: Cl.uint(420), group: Cl.uint(9) }),
    );
    expect(lot(41)).toBeSome(
      Cl.tuple({ kind: Cl.uint(1), printed: Cl.uint(420), group: Cl.uint(9) }),
    );
    expect(lot(42)).toBeSome(
      Cl.tuple({ kind: Cl.uint(1), printed: Cl.uint(460), group: Cl.uint(9) }),
    );
    expect(lot(43)).toBeSome(
      Cl.tuple({ kind: Cl.uint(3), printed: Cl.uint(150), group: Cl.uint(0) }),
    );
    expect(simnet.callReadOnlyFn("sitizen-city", "loop-size", [], deployer).result).toBeUint(44);
    expect(simnet.callReadOnlyFn("sitizen-city", "district-lots", [Cl.uint(1)], deployer).result).toBeList(
      [Cl.uint(40), Cl.uint(41), Cl.uint(42), Cl.uint(43)],
    );
  });

  it("computers do not count toward the 8-human gate", () => {
    for (let i = 0; i < 7; i++) {
      join(humans[i]!);
    }
    expect(
      simnet.callPublicFn("sitizen-city", "register-computer", [Cl.principal(bot)], deployer).result,
    ).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("sitizen-city", "human-count", [], deployer).result).toBeUint(7);
    expect(simnet.callReadOnlyFn("sitizen-city", "is-computer", [Cl.principal(bot)], deployer).result).toBeBool(
      true,
    );
    expect(simnet.callPublicFn("sitizen-city", "open-district", [Cl.uint(1)], humans[0]!).result).toBeErr(
      Cl.uint(ERR_NOT_ENOUGH),
    );
  });

  it("claim too early fails; next epoch mints SZ-01 if still unowned", () => {
    const alice = humans[0]!;
    expect(join(alice).result).toBeOk(Cl.uint(1));
    expect(simnet.callPublicFn("sitizen-city", "open-epoch", [], alice).result).toBeOk(Cl.uint(1));
    expect(
      simnet.callPublicFn("sitizen-city", "commit-intent", [Cl.bool(true), Cl.none()], alice).result,
    ).toBeOk(Cl.bool(true));
    expect(simnet.callPublicFn("sitizen-city", "close-epoch", [], alice).result).toBeOk(Cl.uint(1));
    expect(simnet.callPublicFn("sitizen-city", "land", [Cl.uint(1)], alice).result).toBeOk(Cl.uint(1));
    expect(simnet.callPublicFn("sitizen-city", "claim", [], alice).result).toBeErr(Cl.uint(ERR_TOO_EARLY));

    expect(simnet.callPublicFn("sitizen-city", "settle", [], alice).result).toBeOk(Cl.uint(1));
    expect(simnet.callPublicFn("sitizen-city", "open-epoch", [], alice).result).toBeOk(Cl.uint(2));
    expect(simnet.callPublicFn("sitizen-city", "claim", [], alice).result).toBeOk(Cl.uint(1));
    expect(simnet.callReadOnlyFn("sz-deed", "get-owner", [Cl.uint(1)], deployer).result).toBeOk(
      Cl.some(Cl.principal(alice)),
    );
  });

  it("rent skim is 5% STX to treasury (civic tax, not SITZ)", () => {
    const tenant = humans[0]!;
    const landlord = humans[1]!;
    join(tenant);
    join(landlord);
    const amount = 100_000_000;
    const skim = 5_000_000;
    expect(
      simnet.callPublicFn(
        "sitizen-city",
        "pay-rent",
        [Cl.principal(landlord), Cl.uint(amount)],
        tenant,
      ).result,
    ).toBeOk(Cl.tuple({ net: Cl.uint(amount - skim), skim: Cl.uint(skim) }));
    // two joins = 60 STX ops + 3 STX skim ops
    expect(simnet.callReadOnlyFn("stx-treasury", "ops-balance", [], deployer).result).toBeUint(
      60_000_000 + 3_000_000,
    );
    expect(simnet.callReadOnlyFn("stx-treasury", "community-balance", [], deployer).result).toBeUint(
      40_000_000 + 2_000_000,
    );
    expect(simnet.callReadOnlyFn("circuit-token", "get-ops-sitz", [], deployer).result).toBeUint(0);
  });

  it("close cannot be delayed by a bot flag", () => {
    const alice = humans[0]!;
    join(alice);
    expect(
      simnet.callPublicFn("sitizen-city", "register-computer", [Cl.principal(bot)], deployer).result,
    ).toBeOk(Cl.bool(true));
    expect(simnet.callPublicFn("sitizen-city", "open-epoch", [], alice).result).toBeOk(Cl.uint(1));
    expect(
      simnet.callPublicFn("sitizen-city", "commit-intent", [Cl.bool(false), Cl.none()], alice).result,
    ).toBeOk(Cl.bool(true));
    expect(simnet.callPublicFn("sitizen-city", "set-bot-wait", [Cl.bool(true)], bot).result).toBeOk(
      Cl.bool(true),
    );
    expect(simnet.callPublicFn("sitizen-city", "close-epoch", [], alice).result).toBeOk(Cl.uint(1));
    expect(simnet.callReadOnlyFn("sitizen-city", "is-epoch-open", [], deployer).result).toBeBool(false);
  });
});
