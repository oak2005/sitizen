import { GROUPS, circuitOrder, expansionAt, isPurchasable, loopSizeForTier, lotsOfGroup, spaceAt, tableSquare, walkIndexOf } from "../board";
import { sanitizeName } from "../engine";
import type { GroupId, TokenId } from "../types";
import {
  AMNESTY_PCT,
  AMNESTY_STREAK,
  BAIL_CAP,
  BAIL_MARKS,
  BUILD_COST_RATIO,
  COSMETIC_SKINS,
  COSMETIC_THEMES,
  DEMO_EPOCH_MS,
  HOUSE_MULT,
  JOIN_DISCOUNT_MAX,
  JOIN_FEE,
  JOIN_FEE_FLOOR,
  JOIN_MARK_VALUE,
  LAND_EPOCH,
  MARKS_PER_GO,
  MAX_EPOCH,
  MAX_EXPANSIONS,
  MAX_HOUSES,
  MAX_SEAT_WAVES,
  OPS_SHARE,
  PAYOUT_EVERY,
  PAYOUT_MIN,
  PAYOUT_SHARE,
  PAYOUT_SPLIT,
  PROTOCOL_TAX,
  SALVAGE,
  STARTING_CASH,
  TIER_EPOCH,
  type BotDifficulty,
  type Claim,
  type Deed,
  type EpochCity,
  type EpochIntent,
  type EpochMetric,
  type EpochPlayer,
  type OfferDecision,
  type TradeOffer,
} from "./types";

export type Rng = () => number;

const BOTS: { name: string; token: TokenId }[] = [
  { name: "Ada", token: "rust" },
  { name: "Holt", token: "steel" },
  { name: "Vesper", token: "pine" },
  { name: "Mira", token: "rose" },
  { name: "Rhys", token: "clay" },
  { name: "Keel", token: "gold" },
  { name: "Otto", token: "dusk" },
  { name: "Wynn", token: "navy" },
  { name: "Brin", token: "wine" },
  { name: "Nia", token: "rose" },
  { name: "Cal", token: "gold" },
  { name: "Pax", token: "dusk" },
  { name: "Lumen", token: "steel" },
  { name: "Sage", token: "pine" },
  { name: "Quinn", token: "clay" },
  { name: "Tess", token: "navy" },
  { name: "Ivo", token: "wine" },
  { name: "Rowan", token: "rust" },
  { name: "Ned", token: "gold" },
  { name: "Ash", token: "dusk" },
];

export function deedTokenId(spaceId: number): string {
  const n = Math.max(0, Math.floor(Number(spaceId)) || 0);
  return `SZ-${String(n).padStart(n >= 100 ? 3 : 2, "0")}`;
}

export function loopSize(city: EpochCity): number {
  return loopSizeForTier(city.districtTier);
}

export function houseCost(spaceId: number): number {
  return Math.max(40, Math.round((spaceAt(spaceId).price ?? 0) * BUILD_COST_RATIO));
}

export function salvageValue(deed: Deed): number {
  const price = spaceAt(deed.spaceId).price ?? 0;
  return Math.round((price + deed.houses * houseCost(deed.spaceId)) * SALVAGE);
}

export function emptyIntent(): EpochIntent {
  return { kind: "idle", dice: null, claim: false, builds: [], offerResponses: {} };
}

export function cloneCity(city: EpochCity): EpochCity {
  return {
    ...city,
    players: city.players.map((p) => ({ ...p })),
    deeds: city.deeds.map((d) => ({ ...d })),
    claims: city.claims.map((c) => ({ ...c })),
    offers: city.offers.map((o) => ({ ...o })),
    intents: Object.fromEntries(
      Object.entries(city.intents).map(([k, v]) => [
        k,
        { ...v, builds: v.builds.slice(), offerResponses: { ...v.offerResponses } },
      ]),
    ),
    log: city.log.slice(-80),
    dice: [city.dice[0], city.dice[1]],
    unlockedSkins: (city.unlockedSkins ?? []).slice(),
    unlockedThemes: (city.unlockedThemes ?? []).slice(),
    metrics: (city.metrics ?? []).slice(-40),
  };
}

function log(city: EpochCity, text: string, tone: EpochCity["log"][number]["tone"] = "neutral"): void {
  city.logSeq += 1;
  city.log = [...city.log.slice(-70), { id: city.logSeq, text, tone }];
}

function syncTreasury(city: EpochCity): void {
  city.treasury = city.opsPool + city.communityPool;
}

export function creditTreasury(city: EpochCity, amount: number): { ops: number; community: number } {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (n === 0) return { ops: 0, community: 0 };
  const ops = Math.round(n * OPS_SHARE);
  const community = n - ops;
  city.opsPool += ops;
  city.communityPool += community;
  syncTreasury(city);
  return { ops, community };
}

function mintCash(city: EpochCity, amount: number): void {
  city.epochCashMinted += Math.max(0, Math.round(amount) || 0);
}

function burnCash(city: EpochCity, amount: number): void {
  city.epochCashBurned += Math.max(0, Math.round(amount) || 0);
}

function mintMarks(city: EpochCity, amount: number): void {
  city.epochMarksMinted += Math.max(0, Math.round(amount) || 0);
}

function burnMarks(city: EpochCity, amount: number): void {
  city.epochMarksBurned += Math.max(0, Math.round(amount) || 0);
}

export function wealthGini(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + Math.max(0, v), 0);
  if (total <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += (i + 1) * Math.max(0, sorted[i]!);
  }
  return Math.max(0, Math.min(1, (2 * acc) / (n * total) - (n + 1) / n));
}

export function joinFeeFor(joinMarks: number): { fee: number; spent: number } {
  const raw = Number(joinMarks);
  if (!Number.isInteger(raw) || raw < 0) return { fee: JOIN_FEE, spent: 0 };
  const spent = Math.min(JOIN_DISCOUNT_MAX, raw);
  const discount = Math.min(JOIN_FEE - JOIN_FEE_FLOOR, spent * JOIN_MARK_VALUE);
  return { fee: JOIN_FEE - discount, spent: discount };
}


export function deedAt(city: EpochCity, spaceId: number): Deed | undefined {
  return city.deeds.find((d) => d.spaceId === spaceId);
}

export function deedsOf(city: EpochCity, playerId: string): Deed[] {
  return city.deeds.filter((d) => d.ownerId === playerId);
}

export function ownsGroup(city: EpochCity, playerId: string, group: GroupId | string): boolean {
  const ids = lotsOfGroup(group);
  return ids.length > 0 && ids.every((id) => deedAt(city, id)?.ownerId === playerId);
}

export function missingForGroup(city: EpochCity, playerId: string, group: GroupId | string): number[] {
  return lotsOfGroup(group).filter((id) => deedAt(city, id)?.ownerId !== playerId);
}

export function utilityMult(held: number): number {
  if (held <= 0) return 0;
  return 4 + 6 * (held - 1);
}

export function epochRent(city: EpochCity, spaceId: number, diceTotal: number): number {
  const space = spaceAt(spaceId);
  const deed = deedAt(city, spaceId);
  if (!deed) return 0;
  if (space.kind === "transit") {
    const n = GROUPS.transit.filter((id) => deedAt(city, id)?.ownerId === deed.ownerId).length;
    return 25 * 2 ** Math.max(0, n - 1);
  }
  if (space.kind === "utility") {
    const n = GROUPS.utility.filter(
      (id) => id < loopSize(city) && deedAt(city, id)?.ownerId === deed.ownerId,
    ).length;
    return utilityMult(n) * diceTotal;
  }
  const base = space.rent ?? 0;
  const set =
    space.group && space.group !== "transit" && space.group !== "utility" && ownsGroup(city, deed.ownerId, space.group);
  const houses = Math.min(MAX_HOUSES, Math.max(0, deed.houses));
  return base * (set ? 2 : 1) * HOUSE_MULT[houses]!;
}

export function netWorth(city: EpochCity, playerId: string): number {
  const player = city.players.find((p) => p.id === playerId);
  if (!player) return 0;
  let worth = player.cash;
  for (const deed of deedsOf(city, playerId)) {
    worth += spaceAt(deed.spaceId).price ?? 0;
    worth += deed.houses * houseCost(deed.spaceId);
  }
  return worth;
}

function rollDice(rng: Rng): [number, number] {
  return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
}

export function claimOf(city: EpochCity, playerId: string): Claim | undefined {
  return city.claims.find((c) => c.playerId === playerId);
}

export function pendingOffersTo(city: EpochCity, playerId: string): TradeOffer[] {
  return city.offers.filter((o) => o.toId === playerId && o.createdEpoch < city.epoch);
}

export function outgoingOffers(city: EpochCity, playerId: string): TradeOffer[] {
  return city.offers.filter((o) => o.fromId === playerId);
}

export function fillBotIntents(city: EpochCity, rng: Rng): void {
  for (const player of city.players) {
    if (player.isHuman) continue;
    city.intents[player.id] = botIntent(city, player, rng);
    considerBotOffer(city, player, rng);
  }
}

function cashReserve(city: EpochCity, playerId: string): number {
  let threat = 80;
  for (const deed of city.deeds) {
    if (deed.ownerId === playerId) continue;
    threat = Math.max(threat, epochRent(city, deed.spaceId, 12));
  }
  return Math.min(480, Math.max(140, threat + 40));
}

function groupOwnedCount(city: EpochCity, playerId: string, group: string): number {
  return lotsOfGroup(group).filter((id) => deedAt(city, id)?.ownerId === playerId).length;
}

function claimScore(city: EpochCity, player: EpochPlayer, spaceId: number): number {
  const space = spaceAt(spaceId);
  const price = space.price ?? 0;
  if (!isPurchasable(space) || player.cash < price) return -1;
  const after = player.cash - price;
  if (after < 40) return -1;
  let score = 8;
  if (space.kind === "transit") score += 36;
  if (space.kind === "utility") score += 32;
  const group = space.group;
  if (group && group !== "transit" && group !== "utility") {
    const ids = lotsOfGroup(group);
    const mine = groupOwnedCount(city, player.id, group);
    const human = groupOwnedCount(city, "you", group);
    if (mine === ids.length - 1) score += 140;
    else if (mine >= 1) score += 55;
    if (human === ids.length - 1) score += 90;
    else if (human >= 1) score += 28;
    if (["pine", "navy", "brick", "sand", "amber", "iris"].includes(group)) score += 18;
    if (price <= 160) score += 12;
  }
  if (after < cashReserve(city, player.id)) score -= 45;
  return score;
}

function hardOfferDecision(city: EpochCity, player: EpochPlayer, offer: TradeOffer): OfferDecision {
  const space = spaceAt(offer.spaceId);
  const printed = space.price ?? 0;
  const group = space.group;
  const buyer = city.players.find((p) => p.id === offer.fromId);
  if (group && group !== "transit" && group !== "utility") {
    if (ownsGroup(city, player.id, group) && offer.price < printed * 3.2) return "decline";
    const mine = groupOwnedCount(city, player.id, group);
    if (mine >= 1 && offer.price < printed * 2.4) return "decline";
    if (buyer) {
      const theirs = groupOwnedCount(city, buyer.id, group);
      const ids = lotsOfGroup(group);
      if (theirs === ids.length - 1 && offer.price < printed * 3.5) return "decline";
    }
  }
  if (player.cash < cashReserve(city, player.id) / 2 && offer.price >= printed) return "accept";
  if (offer.price >= printed * 1.7) return "accept";
  return "decline";
}

export function botIntent(city: EpochCity, player: EpochPlayer, rng: Rng): EpochIntent {
  const hard = city.difficulty === "hard";
  const intent: EpochIntent = { kind: "roll", dice: rollDice(rng), claim: false, builds: [], offerResponses: {} };
  if (player.inJail && player.lien > 0) {
    if (player.cash >= player.lien) {
      intent.kind = "roll";
      intent.dice = rollDice(rng);
    } else {
      intent.kind = "idle";
      intent.dice = null;
    }
  }

  const claim = claimOf(city, player.id);
  if (claim) {
    const price = spaceAt(claim.spaceId).price ?? 0;
    if (hard) {
      const score = claimScore(city, player, claim.spaceId);
      const completes =
        spaceAt(claim.spaceId).group &&
        spaceAt(claim.spaceId).group !== "transit" &&
        spaceAt(claim.spaceId).group !== "utility" &&
        groupOwnedCount(city, player.id, spaceAt(claim.spaceId).group!) ===
          lotsOfGroup(spaceAt(claim.spaceId).group!).length - 1;
      intent.claim = completes ? player.cash - price >= 40 : score >= 15;
    } else {
      intent.claim = player.cash - price >= 140 && (price < 300 || rng() > 0.45);
    }
  }

  for (const offer of pendingOffersTo(city, player.id)) {
    const space = spaceAt(offer.spaceId);
    const price = space.price ?? 0;
    if (hard) {
      intent.offerResponses[offer.id] = hardOfferDecision(city, player, offer);
    } else {
      const group = space.group;
      const completes =
        group && group !== "transit" && group !== "utility"
          ? lotsOfGroup(group).every((id) => deedAt(city, id)?.ownerId === player.id)
          : false;
      if (completes && offer.price < price * 2) intent.offerResponses[offer.id] = "decline";
      else if (offer.price >= price) intent.offerResponses[offer.id] = "accept";
      else intent.offerResponses[offer.id] = "decline";
    }
  }

  const owned = deedsOf(city, player.id);
  const reserve = hard ? cashReserve(city, player.id) : 140;
  if (hard) {
    const ranked = owned
      .map((deed) => ({ deed, space: spaceAt(deed.spaceId) }))
      .filter(({ space, deed }) => {
        if (!space.group || space.group === "transit" || space.group === "utility") return false;
        if (!ownsGroup(city, player.id, space.group)) return false;
        return deed.houses < MAX_HOUSES;
      })
      .sort((a, b) => {
        const ha = a.deed.houses - b.deed.houses;
        if (ha !== 0) return ha;
        return (b.space.rent ?? 0) - (a.space.rent ?? 0);
      });
    let cash = player.cash;
    for (const { deed } of ranked) {
      const cost = houseCost(deed.spaceId);
      if (cash - cost < reserve) continue;
      intent.builds.push(deed.spaceId);
      cash -= cost;
      if (intent.builds.length >= 4) break;
    }
  } else {
    for (const deed of owned) {
      const space = spaceAt(deed.spaceId);
      if (!space.group || space.group === "transit" || space.group === "utility") continue;
      if (!ownsGroup(city, player.id, space.group)) continue;
      if (deed.houses >= MAX_HOUSES) continue;
      const cost = houseCost(deed.spaceId);
      if (player.cash - cost < 140) continue;
      if (rng() > 0.45) continue;
      intent.builds.push(deed.spaceId);
      if (intent.builds.length >= 2) break;
    }
  }
  return intent;
}

function considerBotOffer(city: EpochCity, player: EpochPlayer, rng: Rng): void {
  const space = spaceAt(player.position);
  if (!isPurchasable(space)) return;
  const deed = deedAt(city, space.id);
  if (!deed || deed.ownerId === player.id) return;
  if (city.offers.some((o) => o.fromId === player.id && o.spaceId === space.id)) return;
  const printed = space.price ?? 0;
  if (printed < 1) return;
  const hard = city.difficulty === "hard";
  const reserve = hard ? cashReserve(city, player.id) : 120;
  let ask = printed;
  if (hard) {
    const group = space.group;
    const ownerIsHuman = deed.ownerId === "you";
    let want = 0;
    if (group && group !== "transit" && group !== "utility") {
      const ids = lotsOfGroup(group);
      const mine = groupOwnedCount(city, player.id, group);
      const human = groupOwnedCount(city, "you", group);
      if (mine === ids.length - 1) {
        want = 3;
        ask = Math.round(printed * 2.1);
      } else if (ownerIsHuman && human === ids.length - 1) {
        want = 3;
        ask = Math.round(printed * 1.55);
      } else if (mine >= 1) {
        want = 2;
        ask = printed;
      } else if (["pine", "navy", "brick", "amber"].includes(group) && player.cash > printed + reserve + 200) {
        want = 1;
      }
    } else if (space.kind === "transit" || space.kind === "utility") {
      want = 1;
    }
    if (want < 1) return;
    if (player.cash < ask + reserve) return;
  } else {
    if (player.cash < printed + 150) return;
    if (rng() > 0.28) return;
    ask = printed;
  }
  city.offerSeq += 1;
  city.offers.push({
    id: `off-${city.offerSeq}`,
    fromId: player.id,
    toId: deed.ownerId,
    spaceId: space.id,
    price: ask,
    createdEpoch: city.epoch,
  });
  const owner = city.players.find((p) => p.id === deed.ownerId);
  log(
    city,
    `${player.name} offered $${ask} to ${owner?.name ?? "the holder"} for ${deed.tokenId}. They answer next epoch.`,
    "system",
  );
}

function makePlayer(id: string, name: string, isHuman: boolean, token: TokenId, cash = STARTING_CASH - JOIN_FEE): EpochPlayer {
  return {
    id,
    name,
    isHuman,
    token,
    cash,
    marks: 0,
    position: 0,
    inJail: false,
    lien: 0,
    rentCycle: 0,
    lienStreak: 0,
    pawnSkin: null,
    bondReady: false,
  };
}

export function createCity(opts: {
  humanName: string;
  botCount: 2 | 3;
  now?: number;
  rng?: Rng;
  difficulty?: BotDifficulty;
  joinMarks?: number;
  startingMarks?: number;
  theme?: string;
  skin?: string;
  unlockedSkins?: string[];
  unlockedThemes?: string[];
}): EpochCity {
  const rng = opts.rng ?? Math.random;
  const name = sanitizeName(opts.humanName);
  const difficulty: BotDifficulty = opts.difficulty === "hard" ? "hard" : "easy";
  const { fee: humanFee, spent: markSpend } = joinFeeFor(opts.joinMarks ?? 0);
  const players: EpochPlayer[] = [makePlayer("you", name, true, "ivory", STARTING_CASH - humanFee)];
  const startMarks = Number(opts.startingMarks);
  if (Number.isInteger(startMarks) && startMarks > 0) {
    players[0]!.marks = Math.min(1_000_000, startMarks);
  }
  const skin = typeof opts.skin === "string" && COSMETIC_SKINS.some((item) => item.id === opts.skin) ? opts.skin : null;
  if (skin) players[0]!.pawnSkin = skin;
  for (let i = 0; i < opts.botCount; i++) {
    const bot = BOTS[i]!;
    players.push(makePlayer(`bot-${i}`, bot.name, false, bot.token));
  }
  const fees = humanFee + JOIN_FEE * opts.botCount;
  const ops = Math.round(fees * OPS_SHARE);
  const community = fees - ops;
  const unlockedSkins = (opts.unlockedSkins ?? []).filter((id) => COSMETIC_SKINS.some((item) => item.id === id));
  const unlockedThemes = (opts.unlockedThemes ?? []).filter((id) => COSMETIC_THEMES.some((item) => item.id === id));
  const theme = typeof opts.theme === "string" && unlockedThemes.includes(opts.theme) ? opts.theme : "";
  const city: EpochCity = {
    cityId: `city-${Date.now().toString(36)}`,
    epoch: 1,
    phase: "open",
    openedAt: opts.now ?? Date.now(),
    players,
    deeds: [],
    claims: [],
    offers: [],
    intents: Object.fromEntries(players.map((p) => [p.id, emptyIntent()])),
    treasury: fees,
    opsPool: ops,
    communityPool: community,
    lastPayoutEpoch: 0,
    jackpot: 0,
    districtOpen: false,
    districtTier: 0,
    originSeats: players.length,
    difficulty,
    log: [],
    logSeq: 0,
    offerSeq: 0,
    dice: [1, 1],
    lastSettled: 0,
    boardTheme: theme,
    unlockedSkins,
    unlockedThemes,
    metrics: [],
    epochCashMinted: STARTING_CASH * players.length,
    epochCashBurned: fees,
    epochMarksMinted: 0,
    epochMarksBurned: markSpend,
  };
  log(
    city,
    `${players.length} pawns joined on ${difficulty} computers. Join $${humanFee} (you)${markSpend ? ` after ${markSpend} Marks` : ""} + $${JOIN_FEE} × ${opts.botCount} → ops $${ops} / community $${community}. Buy lots yourself — nothing auto-mints.`,
    "system",
  );
  fillBotIntents(city, rng);
  log(city, "Computers submitted instantly. The window is waiting on you — not on them.", "system");
  return city;
}

function takeTax(amount: number): { net: number; tax: number } {
  const tax = Math.round(amount * PROTOCOL_TAX);
  return { net: amount - tax, tax };
}

function mintDeed(city: EpochCity, spaceId: number, ownerId: string): void {
  city.deeds = city.deeds.filter((d) => d.spaceId !== spaceId);
  city.deeds.push({ spaceId, tokenId: deedTokenId(spaceId), ownerId, houses: 0 });
}

function applyBond(city: EpochCity, payer: EpochPlayer, missing: number): number {
  if (!payer.bondReady || missing <= 0) return missing;
  payer.bondReady = false;
  const covered = Math.min(missing, BAIL_CAP);
  log(city, `${payer.name}'s bail bond covered $${covered} of the shortfall.`, "good");
  return missing - covered;
}

function payRent(city: EpochCity, payer: EpochPlayer, spaceId: number, diceTotal: number): void {
  const deed = deedAt(city, spaceId);
  if (!deed || deed.ownerId === payer.id) return;
  const owner = city.players.find((p) => p.id === deed.ownerId);
  if (!owner) return;
  const due = epochRent(city, spaceId, diceTotal);
  const paid = Math.min(payer.cash, due);
  const { net, tax } = takeTax(paid);
  payer.cash -= paid;
  if (tax > 0) {
    const split = creditTreasury(city, tax);
    burnCash(city, tax);
    log(
      city,
      `${payer.name} paid $${paid} rent to ${owner.name} on ${spaceAt(spaceId).name} (tax $${tax} → ops $${split.ops} / community $${split.community}).`,
      "bad",
    );
  } else {
    log(city, `${payer.name} paid $${paid} rent to ${owner.name} on ${spaceAt(spaceId).name} (tax $${tax} → treasury).`, "bad");
  }
  owner.cash += net;
  owner.rentCycle += paid;
  if (paid < due) {
    let missing = due - paid;
    missing = applyBond(city, payer, missing);
    if (missing > 0) {
      payer.lien += missing;
      payer.inJail = true;
      payer.position = 10;
      log(city, `${payer.name} cannot cover the rest ($${missing}) and is held in jail. Lots still earn.`, "bad");
    } else {
      log(city, `${payer.name} covered the rest with a bail bond.`, "good");
    }
  }
}

function passGo(city: EpochCity, player: EpochPlayer): void {
  player.marks += MARKS_PER_GO;
  mintMarks(city, MARKS_PER_GO);
  log(city, `${player.name} passed GO and received ${MARKS_PER_GO} Marks for continuing.`, "good");
}


function applyBuilds(city: EpochCity, player: EpochPlayer, spaceIds: number[]): void {
  const seen = new Set<number>();
  for (const spaceId of spaceIds) {
    if (seen.has(spaceId)) continue;
    seen.add(spaceId);
    const deed = deedAt(city, spaceId);
    const space = spaceAt(spaceId);
    if (!deed || deed.ownerId !== player.id) continue;
    if (!space.group || space.group === "transit" || space.group === "utility") continue;
    if (!ownsGroup(city, player.id, space.group)) continue;
    if (deed.houses >= MAX_HOUSES) continue;
    const cost = houseCost(spaceId);
    if (player.cash < cost) continue;
    player.cash -= cost;
    burnCash(city, cost);
    deed.houses += 1;
    const label = deed.houses >= MAX_HOUSES ? "hotel" : `house ${deed.houses}`;
    log(city, `${player.name} built a ${label} on ${space.name} (${deed.tokenId}). Rent stays on this deed.`, "good");
  }
}

function setClaim(city: EpochCity, playerId: string, spaceId: number): void {
  city.claims = city.claims.filter((c) => c.playerId !== playerId && c.spaceId !== spaceId);
  city.claims.push({ playerId, spaceId, epoch: city.epoch });
}

function resolveLanding(city: EpochCity, player: EpochPlayer, diceTotal: number, rng: Rng): void {
  const space = spaceAt(player.position);
  switch (space.kind) {
    case "property":
    case "transit":
    case "utility": {
      const deed = deedAt(city, space.id);
      if (!deed) {
        setClaim(city, player.id, space.id);
        log(
          city,
          `${space.name} is unowned. ${player.name} may buy ${deedTokenId(space.id)} next epoch — nobody auto-buys.`,
          "system",
        );
        return;
      }
      if (deed.ownerId === player.id) {
        log(city, `${player.name} visited their own ${space.name}.`, "neutral");
        return;
      }
      const owner = city.players.find((p) => p.id === deed.ownerId);
      log(city, `${space.name} (${deed.tokenId}) is held by ${owner?.name ?? "a rival"}. Offer to buy — they answer next epoch.`, "neutral");
      payRent(city, player, space.id, diceTotal);
      return;
    }
    case "tax": {
      const tax = space.tax ?? 0;
      const paid = Math.min(player.cash, tax);
      player.cash -= paid;
      city.jackpot += paid;
      burnCash(city, paid);
      log(city, `${player.name} paid $${paid} ${space.name.toLowerCase()} into Civic Park.`, "bad");
      if (paid < tax) {
        let missing = tax - paid;
        missing = applyBond(city, player, missing);
        if (missing > 0) {
          player.lien += missing;
          player.inJail = true;
          player.position = 10;
        }
      }
      return;
    }
    case "park": {
      const pot = city.jackpot;
      city.jackpot = 0;
      player.cash += pot;
      if (pot) mintCash(city, pot);
      log(city, pot ? `${player.name} took the Civic Park pot: $${pot}.` : `${player.name} rests at Civic Park.`, pot ? "good" : "neutral");
      return;
    }
    case "gotojail":
      player.inJail = true;
      player.position = 10;
      log(city, `${player.name} was ordered to jail.`, "bad");
      return;
    case "fortune":
    case "chance": {
      const swing = rng() > 0.5 ? 80 : -40;
      const before = player.cash;
      player.cash = Math.max(0, player.cash + swing);
      if (swing > 0) mintCash(city, swing);
      else burnCash(city, before - player.cash);
      log(city, `${player.name} drew a ${space.kind} card (${swing > 0 ? "+" : ""}$${swing}).`, swing > 0 ? "good" : "bad");
      return;
    }
    default:
      return;
  }
}

function movePlayer(city: EpochCity, player: EpochPlayer, dice: [number, number], rng: Rng): void {
  const steps = dice[0] + dice[1];
  const size = loopSize(city);
  const order = circuitOrder(size);
  const fromIdx = walkIndexOf(player.position, size);
  const destIdx = (fromIdx + steps) % order.length;
  if (destIdx < fromIdx) passGo(city, player);
  const dest = order[destIdx] ?? 0;
  player.position = dest;
  city.dice = [dice[0], dice[1]];
  log(city, `${player.name} rolled ${dice[0]}+${dice[1]} and moved to ${spaceAt(dest).name}.`, "system");
  resolveLanding(city, player, steps, rng);
}

function resolveOffersFor(city: EpochCity, player: EpochPlayer): void {
  const intent = city.intents[player.id] ?? emptyIntent();
  const ripe = pendingOffersTo(city, player.id);
  for (const offer of ripe) {
    const decision: OfferDecision = intent.offerResponses[offer.id] ?? "decline";
    const buyer = city.players.find((p) => p.id === offer.fromId);
    const deed = deedAt(city, offer.spaceId);
    if (decision !== "accept" || !buyer || !deed || deed.ownerId !== player.id) {
      log(city, `${player.name} declined ${buyer?.name ?? "a bidder"}'s offer on ${spaceAt(offer.spaceId).name}.`, "neutral");
      continue;
    }
    if (buyer.cash < offer.price) {
      log(city, `${buyer.name} could not fund $${offer.price} for ${deed.tokenId}. Offer dies.`, "bad");
      continue;
    }
    buyer.cash -= offer.price;
    player.cash += offer.price;
    deed.ownerId = buyer.id;
    log(
      city,
      `${buyer.name} bought ${deed.tokenId} (${spaceAt(offer.spaceId).name} + ${deed.houses} improvement${deed.houses === 1 ? "" : "s"}) from ${player.name} for $${offer.price}.`,
      "good",
    );
  }
  const ripeIds = new Set(ripe.map((o) => o.id));
  city.offers = city.offers.filter((o) => !ripeIds.has(o.id));
}

function resolveClaimsFor(city: EpochCity, player: EpochPlayer): void {
  const intent = city.intents[player.id] ?? emptyIntent();
  const claim = claimOf(city, player.id);
  if (!claim) return;
  if (!intent.claim) {
    city.claims = city.claims.filter((c) => c.playerId !== player.id);
    log(city, `${player.name} passed on ${spaceAt(claim.spaceId).name}. The lot stays unowned.`, "neutral");
    return;
  }
  const space = spaceAt(claim.spaceId);
  const price = space.price ?? 0;
  if (deedAt(city, claim.spaceId)) {
    city.claims = city.claims.filter((c) => c.playerId !== player.id);
    return;
  }
  if (!isPurchasable(space) || player.cash < price) {
    city.claims = city.claims.filter((c) => c.playerId !== player.id);
    log(city, `${player.name} could not mint ${deedTokenId(claim.spaceId)}.`, "bad");
    return;
  }
  player.cash -= price;
  burnCash(city, price);
  mintDeed(city, claim.spaceId, player.id);
  city.claims = city.claims.filter((c) => c.playerId !== player.id && c.spaceId !== claim.spaceId);
  log(city, `${player.name} minted ${deedTokenId(claim.spaceId)} — ${space.name} for $${price}.`, "good");
}

function addOneCitizen(city: EpochCity): boolean {
  const existing = new Set(city.players.map((p) => p.name));
  const tokens: TokenId[] = ["rust", "steel", "pine", "rose", "clay", "gold", "dusk", "navy", "wine"];
  const first = ["Cy", "Ka", "No", "Re", "Vi", "Lo", "Ta", "Si", "Ma", "Jo"];
  const last = ["ra", "el", "an", "or", "is", "un", "ek", "ia", "on", "et"];
  for (let i = 0; i < MAX_SEAT_WAVES + 8; i++) {
    const bot = BOTS[i];
    const generated = sanitizeName(`${first[i % 10]!}${last[Math.floor(i / 10) % 10]!}${i >= 100 ? String(Math.floor(i / 100)) : ""}`);
    const name = bot?.name ?? generated;
    const token = bot?.token ?? tokens[i % tokens.length]!;
    const id = `bot-${i}`;
    if (existing.has(name) || city.players.some((p) => p.id === id)) continue;
    const player = makePlayer(id, name, false, token);
    city.players.push(player);
    city.intents[id] = emptyIntent();
    const split = creditTreasury(city, JOIN_FEE);
    burnCash(city, JOIN_FEE);
    mintCash(city, STARTING_CASH);
    log(city, `${name} joined the city — one new seat every ${TIER_EPOCH} epochs. $${JOIN_FEE} → ops $${split.ops} / community $${split.community}.`, "system");
    return true;
  }
  return false;
}

function openNextDistrict(city: EpochCity): void {
  const next = city.districtTier + 1;
  const exp = expansionAt(next);
  if (!exp) return;
  city.districtTier = next;
  city.districtOpen = true;
  const square = tableSquare(next);
  const names = [...exp.lots.map((l) => l.name), exp.utility.name].join(", ");
  log(
    city,
    `Epoch ${next * LAND_EPOCH} is complete. A new board is laid: ${square.name}. It holds every previous lot and house plus ${exp.label} — ${names} — on the same square. Not a side lane. Utilities stay outside colour rows.`,
    "system",
  );
}

function growCity(city: EpochCity): void {
  const elapsed = Math.min(MAX_EPOCH, Math.max(0, city.epoch - 1));
  const waves = Math.min(MAX_SEAT_WAVES, Math.floor(elapsed / TIER_EPOCH));
  const targetSeats = city.originSeats + waves;
  while (city.players.length < targetSeats) {
    if (!addOneCitizen(city)) break;
  }
  const tiers = Math.min(MAX_EXPANSIONS, Math.floor(elapsed / LAND_EPOCH));
  while (city.districtTier < tiers) {
    const before = city.districtTier;
    openNextDistrict(city);
    if (city.districtTier === before) break;
  }
}

export function humanReady(city: EpochCity): boolean {
  const intent = city.intents.you;
  return Boolean(intent && intent.kind !== "idle");
}

export function computersReady(city: EpochCity): boolean {
  return city.players.filter((p) => !p.isHuman).every((p) => city.intents[p.id] != null);
}

export function rentLadder(spaceId: number): { label: string; amount: number }[] {
  const space = spaceAt(spaceId);
  if (space.kind !== "property" || space.rent == null) return [];
  const base = space.rent;
  return [
    { label: "Unimproved", amount: base },
    { label: "Full row", amount: base * 2 },
    { label: "1 house", amount: base * 2 * HOUSE_MULT[1]! },
    { label: "2 houses", amount: base * 2 * HOUSE_MULT[2]! },
    { label: "3 houses", amount: base * 2 * HOUSE_MULT[3]! },
    { label: "4 houses", amount: base * 2 * HOUSE_MULT[4]! },
    { label: "Hotel", amount: base * 2 * HOUSE_MULT[5]! },
  ];
}

export function canBuildOn(city: EpochCity, playerId: string, spaceId: number): boolean {
  const player = city.players.find((p) => p.id === playerId);
  const deed = deedAt(city, spaceId);
  const space = spaceAt(spaceId);
  if (!player || !deed || deed.ownerId !== playerId) return false;
  if (!space.group || space.group === "transit" || space.group === "utility") return false;
  if (!ownsGroup(city, playerId, space.group)) return false;
  if (deed.houses >= MAX_HOUSES) return false;
  return player.cash >= houseCost(spaceId);
}

function applyAmnesty(city: EpochCity): { paid: number; recovered: number } {
  let paid = 0;
  let recovered = 0;
  for (const player of city.players) {
    if (player.lien <= 0) {
      player.lienStreak = 0;
      continue;
    }
    player.lienStreak += 1;
    if (player.lienStreak < AMNESTY_STREAK) continue;
    const wanted = Math.round(player.lien * AMNESTY_PCT);
    if (wanted <= 0) continue;
    const funded = Math.min(wanted, city.opsPool);
    if (funded <= 0) {
      log(city, `${player.name} is due amnesty but the ops pool is empty.`, "neutral");
      continue;
    }
    city.opsPool -= funded;
    syncTreasury(city);
    player.lien -= funded;
    paid += 1;
    log(
      city,
      `Lien amnesty: ${player.name} has been unpaid ${player.lienStreak} epochs. Ops covers $${funded} (${Math.round(AMNESTY_PCT * 100)}%). Lien now $${player.lien}.`,
      "good",
    );
    if (player.lien <= 0) {
      player.lien = 0;
      player.inJail = false;
      player.lienStreak = 0;
      recovered += 1;
    }
  }
  return { paid, recovered };
}

export function runCommunityPayout(city: EpochCity): boolean {
  if (city.communityPool < PAYOUT_MIN) {
    log(city, `Community payout skipped — pool $${city.communityPool} is under the $${PAYOUT_MIN} floor.`, "system");
    return false;
  }
  const ranked = [...city.players]
    .filter((p) => p.rentCycle > 0)
    .sort((a, b) => b.rentCycle - a.rentCycle || b.cash - a.cash || a.id.localeCompare(b.id))
    .slice(0, 3);
  if (ranked.length === 0) {
    log(city, "Community payout skipped — no rent was collected this cycle.", "system");
    return false;
  }
  const pot = Math.floor(city.communityPool * PAYOUT_SHARE);
  if (pot < 1) return false;
  const weights = PAYOUT_SPLIT.slice(0, ranked.length);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  let left = pot;
  const parts: string[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const share = i === ranked.length - 1 ? left : Math.floor((pot * weights[i]!) / weightSum);
    left -= share;
    if (share <= 0) continue;
    ranked[i]!.cash += share;
    city.communityPool -= share;
    mintCash(city, share);
    parts.push(`${ranked[i]!.name} $${share}`);
  }
  syncTreasury(city);
  city.lastPayoutEpoch = city.epoch;
  for (const player of city.players) player.rentCycle = 0;
  log(city, `Community payout (25% of pool): ${parts.join(", ")}. Community now $${city.communityPool}.`, "good");
  return true;
}

function recordMetrics(
  city: EpochCity,
  closedEpoch: number,
  extra: { amnestyPaid: number; lienRecovered: number },
): void {
  const worth = city.players.map((p) => netWorth(city, p.id));
  const lienSeats = city.players.filter((p) => p.lien > 0);
  const row: EpochMetric = {
    epoch: closedEpoch,
    cashMinted: city.epochCashMinted,
    cashBurned: city.epochCashBurned,
    marksMinted: city.epochMarksMinted,
    marksBurned: city.epochMarksBurned,
    opsPool: city.opsPool,
    communityPool: city.communityPool,
    gini: Math.round(wealthGini(worth) * 1000) / 1000,
    lienSeats: lienSeats.length,
    lienStreakMax: lienSeats.reduce((max, p) => Math.max(max, p.lienStreak), 0),
    amnestyPaid: extra.amnestyPaid,
    lienRecovered: extra.lienRecovered,
  };
  city.metrics = [...city.metrics.slice(-39), row];
  log(
    city,
    `Economy e${closedEpoch}: cash +$${row.cashMinted}/−$${row.cashBurned} · marks +${row.marksMinted}/−${row.marksBurned} · ops $${row.opsPool} · community $${row.communityPool} · gini ${row.gini.toFixed(3)} · liens ${row.lienSeats} (max streak ${row.lienStreakMax}${row.lienRecovered ? `, recovered ${row.lienRecovered}` : ""}${row.amnestyPaid ? `, amnesty ${row.amnestyPaid}` : ""}).`,
    "system",
  );
  city.epochCashMinted = 0;
  city.epochCashBurned = 0;
  city.epochMarksMinted = 0;
  city.epochMarksBurned = 0;
}

export function settleEpoch(city: EpochCity, rng: Rng = Math.random, now = Date.now()): EpochCity {
  const s = cloneCity(city);
  s.phase = "settling";
  log(s, `Epoch ${s.epoch} closing. Offers and claims first, then builds, then dice.`, "system");
  const closed = s.epoch;
  let lienRecovered = 0;

  for (const player of s.players) {
    resolveOffersFor(s, player);
  }
  for (const player of s.players) {
    resolveClaimsFor(s, player);
  }

  for (const player of s.players) {
    const intent = s.intents[player.id] ?? emptyIntent();
    if (player.inJail && player.lien > 0) {
      if (player.cash >= player.lien) {
        const paid = player.lien;
        const held = player.lienStreak;
        player.cash -= paid;
        burnCash(s, paid);
        log(
          s,
          `${player.name} cleared a $${paid} lien after ${held} unpaid epoch${held === 1 ? "" : "s"} and left jail.`,
          "good",
        );
        player.lien = 0;
        player.inJail = false;
        player.lienStreak = 0;
        lienRecovered += 1;
      } else {
        log(s, `${player.name} remains in jail with a $${player.lien} lien. Their deeds still collect.`, "neutral");
        applyBuilds(s, player, intent.builds);
        continue;
      }
    }
    applyBuilds(s, player, intent.builds);
    if (intent.kind === "roll" && intent.dice) {
      movePlayer(s, player, intent.dice, rng);
    } else {
      log(s, `${player.name} did not roll this epoch.`, "neutral");
    }
  }

  const amnesty = applyAmnesty(s);
  if (closed % PAYOUT_EVERY === 0) {
    runCommunityPayout(s);
  }
  recordMetrics(s, closed, {
    amnestyPaid: amnesty.paid,
    lienRecovered: lienRecovered + amnesty.recovered,
  });

  s.epoch += 1;
  growCity(s);
  s.phase = "open";
  s.openedAt = now;
  s.lastSettled = now;
  s.intents = Object.fromEntries(s.players.map((p) => [p.id, emptyIntent()]));
  fillBotIntents(s, rng);
  const seconds = DEMO_EPOCH_MS / 1000;
  log(
    s,
    `Epoch ${s.epoch} is open for ${seconds}s (stands in for 6 hours). ${s.players.length} seats. Computers are already ready.`,
    "system",
  );
  return s;
}


export function commitHuman(city: EpochCity, patch: Partial<EpochIntent>): EpochCity {
  const s = cloneCity(city);
  const cur = s.intents.you ?? emptyIntent();
  s.intents.you = {
    ...cur,
    ...patch,
    builds: patch.builds ?? cur.builds,
    offerResponses: patch.offerResponses ?? cur.offerResponses,
  };
  return s;
}

export function queueBuild(city: EpochCity, spaceId: number): EpochCity {
  const s = cloneCity(city);
  const you = s.players.find((p) => p.isHuman);
  const sid = Number(spaceId);
  if (!you || !Number.isInteger(sid) || sid < 0 || sid >= loopSize(s)) return s;
  const intent = s.intents.you ?? emptyIntent();
  if (intent.builds.includes(sid)) {
    intent.builds = intent.builds.filter((id) => id !== sid);
  } else {
    intent.builds = [...intent.builds, sid];
  }
  s.intents.you = intent;
  return s;
}

export function toggleClaim(city: EpochCity): EpochCity {
  const s = cloneCity(city);
  const intent = s.intents.you ?? emptyIntent();
  s.intents.you = { ...intent, claim: !intent.claim };
  return s;
}

export function respondOffer(city: EpochCity, offerId: string, decision: OfferDecision): EpochCity {
  const s = cloneCity(city);
  const intent = s.intents.you ?? emptyIntent();
  s.intents.you = { ...intent, offerResponses: { ...intent.offerResponses, [offerId]: decision } };
  return s;
}

export function createOffer(city: EpochCity, spaceId: number, price: number): EpochCity {
  const s = cloneCity(city);
  const you = s.players.find((p) => p.isHuman);
  const sid = Number(spaceId);
  if (!you || !Number.isInteger(sid) || sid < 0 || sid >= loopSize(s)) return s;
  const deed = deedAt(s, sid);
  if (!you || !deed || deed.ownerId === you.id) return s;
  const ask = Math.round(Number(price));
  if (!Number.isFinite(ask) || ask < 1 || ask > 1_000_000) {
    log(s, `${you.name} cannot offer that price.`, "bad");
    return s;
  }
  if (you.cash < ask) {
    log(s, `${you.name} cannot offer $${ask} — not enough cash.`, "bad");
    return s;
  }
  s.offers = s.offers.filter((o) => !(o.fromId === you.id && o.spaceId === sid));
  s.offerSeq += 1;
  const offer: TradeOffer = {
    id: `off-${s.offerSeq}`,
    fromId: you.id,
    toId: deed.ownerId,
    spaceId: sid,
    price: ask,
    createdEpoch: s.epoch,
  };
  s.offers.push(offer);
  const owner = s.players.find((p) => p.id === deed.ownerId);
  log(
    s,
    `${you.name} offered $${ask} to ${owner?.name ?? "the holder"} for ${deed.tokenId} (${spaceAt(sid).name}). They answer next epoch.`,
    "system",
  );
  return s;
}

export function sellDeed(city: EpochCity, spaceId: number): EpochCity {
  const s = cloneCity(city);
  const you = s.players.find((p) => p.isHuman);
  const sid = Number(spaceId);
  if (!you || !Number.isInteger(sid) || sid < 0) return s;
  const deed = deedAt(s, sid);
  if (!deed || deed.ownerId !== you.id) return s;
  const payout = salvageValue(deed);
  you.cash += payout;
  mintCash(s, payout);
  s.deeds = s.deeds.filter((d) => d.spaceId !== sid);
  s.offers = s.offers.filter((o) => o.spaceId !== sid);
  log(
    s,
    `${you.name} salvaged ${deed.tokenId} (${spaceAt(sid).name} + ${deed.houses} improvement${deed.houses === 1 ? "" : "s"}) for $${payout}. Improvements are part of the deed — they cannot be kept after the land is sold.`,
    "system",
  );
  return s;
}

export function remainingMs(city: EpochCity, now = Date.now()): number {
  return Math.max(0, city.openedAt + DEMO_EPOCH_MS - now);
}

export function spendBail(city: EpochCity): EpochCity {
  const s = cloneCity(city);
  const you = s.players.find((p) => p.isHuman);
  if (!you || s.phase !== "open") return s;
  if (you.marks < BAIL_MARKS) {
    log(s, `${you.name} needs ${BAIL_MARKS} Marks for a bail bond.`, "bad");
    return s;
  }
  if (you.lien <= 0 && you.bondReady) {
    log(s, `${you.name} already holds a prepaid bail bond.`, "neutral");
    return s;
  }
  you.marks -= BAIL_MARKS;
  burnMarks(s, BAIL_MARKS);
  if (you.lien > 0) {
    const cleared = Math.min(you.lien, BAIL_CAP);
    const held = you.lienStreak;
    you.lien -= cleared;
    log(
      s,
      `${you.name} spent ${BAIL_MARKS} Marks on a bail bond and cleared $${cleared} of lien after ${held} unpaid epoch${held === 1 ? "" : "s"}.`,
      "good",
    );
    if (you.lien <= 0) {
      you.lien = 0;
      you.inJail = false;
      you.lienStreak = 0;
    }
    return s;
  }
  you.bondReady = true;
  log(s, `${you.name} prepaid a bail bond (${BAIL_MARKS} Marks). It will cover up to $${BAIL_CAP} of the next shortfall.`, "good");
  return s;
}

export function unlockCosmetic(city: EpochCity, kind: "skin" | "theme", id: string): EpochCity {
  const s = cloneCity(city);
  const you = s.players.find((p) => p.isHuman);
  if (!you || s.phase !== "open") return s;
  if (kind !== "skin" && kind !== "theme") return s;
  if (typeof id !== "string") return s;
  const catalog = kind === "skin" ? COSMETIC_SKINS : COSMETIC_THEMES;
  const item = catalog.find((entry) => entry.id === id);
  if (!item) {
    log(s, `${you.name} cannot unlock that.`, "bad");
    return s;
  }
  const owned = kind === "skin" ? s.unlockedSkins : s.unlockedThemes;
  if (owned.includes(item.id)) {
    if (kind === "skin") you.pawnSkin = item.id;
    else s.boardTheme = item.id;
    log(s, `${you.name} equipped ${item.label}.`, "system");
    return s;
  }
  if (you.marks < item.cost) {
    log(s, `${you.name} needs ${item.cost} Marks for ${item.label}.`, "bad");
    return s;
  }
  you.marks -= item.cost;
  burnMarks(s, item.cost);
  if (kind === "skin") {
    s.unlockedSkins = [...s.unlockedSkins, item.id];
    you.pawnSkin = item.id;
  } else {
    s.unlockedThemes = [...s.unlockedThemes, item.id];
    s.boardTheme = item.id;
  }
  log(s, `${you.name} spent ${item.cost} Marks and unlocked ${item.label}. No rent or board effect.`, "good");
  return s;
}

export function jumpCity(city: EpochCity, epoch: number, now = Date.now(), rng: Rng = Math.random): EpochCity {
  const target = Number(epoch);
  if (!Number.isInteger(target) || target < 1 || target > MAX_EPOCH) return city;
  const s = cloneCity(city);
  s.epoch = target;
  growCity(s);
  const size = loopSize(s);
  const order = circuitOrder(size);
  const onLoop = new Set(order);
  for (const player of s.players) {
    if (!onLoop.has(player.position)) player.position = 0;
  }
  const square = tableSquare(s.districtTier);
  log(s, `${square.name} is set — ${square.spaces} spaces, epochs ${square.from}–${square.to}.`, "system");
  s.openedAt = now;
  s.phase = "open";
  s.intents = Object.fromEntries(s.players.map((p) => [p.id, emptyIntent()]));
  fillBotIntents(s, rng);
  return s;
}
