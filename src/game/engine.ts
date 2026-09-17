import { CARDS, CHANCE_CARDS, FORTUNE_CARDS, GROUPS, isPurchasable, spaceAt } from "./board";
import {
  BOARD_SIZE,
  GO_SALARY,
  GO_UPKEEP,
  JAIL_FINE,
  JAIL_POS,
  MAX_ROUNDS,
  SET_RENT_MULT,
  STARTING_CASH,
  type ActionKind,
  type CardDeck,
  type GameState,
  type GroupId,
  type LogTone,
  type Player,
  type TokenId,
} from "./types";

export type Rng = () => number;

const BOTS: { name: string; token: TokenId }[] = [
  { name: "Ada", token: "rust" },
  { name: "Holt", token: "steel" },
  { name: "Vesper", token: "pine" },
];

export function sanitizeName(raw: string): string {
  const trimmed = raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 18);
  return trimmed || "You";
}

export function newGameId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = a;
  }
  return arr;
}

export function rollDice(rng: Rng = Math.random): [number, number] {
  return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    owners: state.owners.slice(),
    dice: [state.dice[0], state.dice[1]],
    lastRoll: [state.lastRoll[0], state.lastRoll[1]],
    fortunePile: state.fortunePile.slice(),
    chancePile: state.chancePile.slice(),
    log: state.log.slice(-100),
    card: state.card ? { ...state.card } : null,
  };
}

function log(state: GameState, text: string, tone: LogTone = "neutral"): void {
  state.logSeq += 1;
  state.log = [...state.log.slice(-80), { id: state.logSeq, text, tone }];
}

export function currentPlayer(state: GameState): Player {
  const player = state.players[state.current];
  if (!player) throw new Error("No current player");
  return player;
}

export function ownedCount(state: GameState, playerId: string): number {
  return state.owners.filter((id) => id === playerId).length;
}

export function ownsGroup(state: GameState, playerId: string, group: GroupId): boolean {
  return GROUPS[group].every((id) => state.owners[id] === playerId);
}

export function wouldCompleteSet(state: GameState, playerId: string, spaceId: number): boolean {
  const space = spaceAt(spaceId);
  if (!space.group || space.group === "transit" || space.group === "utility") return false;
  return GROUPS[space.group].every((id) => (id === spaceId ? true : state.owners[id] === playerId));
}

export function netWorth(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.bankrupt) return 0;
  let worth = player.money;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (state.owners[i] !== playerId) continue;
    worth += spaceAt(i).price ?? 0;
  }
  return worth;
}

export function calcRent(state: GameState, spaceId: number, diceTotal: number): number {
  const space = spaceAt(spaceId);
  const ownerId = state.owners[spaceId];
  if (!ownerId) return 0;
  if (space.kind === "transit") {
    const n = GROUPS.transit.filter((id) => state.owners[id] === ownerId).length;
    return 25 * 2 ** Math.max(0, n - 1);
  }
  if (space.kind === "utility") {
    const n = GROUPS.utility.filter((id) => state.owners[id] === ownerId).length;
    return (n >= 2 ? 10 : 4) * diceTotal;
  }
  const base = space.rent ?? 0;
  if (space.group && ownsGroup(state, ownerId, space.group)) return base * SET_RENT_MULT;
  return base;
}

export function createGame(opts: {
  humanName: string;
  botCount: 2 | 3;
  rng?: Rng;
  maxRounds?: number;
}): GameState {
  const rng = opts.rng ?? Math.random;
  const humanName = sanitizeName(opts.humanName);
  const players: Player[] = [
    {
      id: "you",
      name: humanName,
      isHuman: true,
      token: "ivory",
      money: STARTING_CASH,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailFree: 0,
      bankrupt: false,
    },
  ];
  for (let i = 0; i < opts.botCount; i++) {
    const bot = BOTS[i];
    if (!bot) break;
    players.push({
      id: `bot-${i}`,
      name: bot.name,
      isHuman: false,
      token: bot.token,
      money: STARTING_CASH,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailFree: 0,
      bankrupt: false,
    });
  }
  return {
    gameId: newGameId(),
    players,
    current: 0,
    owners: Array.from({ length: BOARD_SIZE }, () => null),
    phase: "awaiting_roll",
    action: "none",
    card: null,
    dice: [1, 1],
    lastRoll: [0, 0],
    doublesStreak: 0,
    jackpot: 0,
    round: 1,
    turnsPlayed: 0,
    log: [{ id: 1, text: `${humanName} takes the first turn.`, tone: "system" }],
    logSeq: 1,
    winnerId: null,
    winReason: null,
    maxRounds: opts.maxRounds ?? MAX_ROUNDS,
    fortunePile: shuffle(
      FORTUNE_CARDS.map((c) => c.id),
      rng,
    ),
    chancePile: shuffle(
      CHANCE_CARDS.map((c) => c.id),
      rng,
    ),
  };
}

function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

function richest(state: GameState, pool: Player[]): Player {
  let winner = pool[0]!;
  let best = netWorth(state, winner.id);
  for (const player of pool.slice(1)) {
    const worth = netWorth(state, player.id);
    if (worth > best) {
      winner = player;
      best = worth;
    }
  }
  return winner;
}

function finishIfOver(state: GameState): GameState {
  const alive = alivePlayers(state);
  const someoneBroke = state.players.some((p) => p.bankrupt);
  if (!someoneBroke && alive.length > 1) return state;

  const pool = alive.length > 0 ? alive : state.players;
  const winner = richest(state, pool);
  const human = state.players.find((p) => p.isHuman);
  state.phase = "game_over";
  state.action = "none";
  state.card = null;
  state.winnerId = winner.id;
  state.winReason = "bankrupt";
  if (human?.bankrupt && winner.id !== human.id) {
    log(state, `${human.name} went bankrupt. ${winner.name} wins on net worth ($${netWorth(state, winner.id)}).`, "bad");
  } else {
    log(
      state,
      `${winner.name} wins on net worth ($${netWorth(state, winner.id)}) after a bankruptcy.`,
      "good",
    );
  }
  return state;
}

function advanceToNext(state: GameState): GameState {
  const n = state.players.length;
  const prev = state.current;
  let next = prev;
  for (let i = 0; i < n; i++) {
    next = (next + 1) % n;
    if (!state.players[next]!.bankrupt) break;
  }
  state.turnsPlayed += 1;
  if (next <= prev) state.round += 1;
  state.current = next;
  state.card = null;
  state.action = "none";
  const over = finishIfOver(state);
  if (over.phase === "game_over") return over;
  const player = currentPlayer(state);
  if (player.inJail) {
    player.jailTurns += 1;
    state.phase = "awaiting_action";
    state.action = "jail";
    log(state, `${player.name} is in jail (turn ${player.jailTurns} of 3).`, "system");
  } else {
    state.phase = "awaiting_roll";
    state.action = "none";
  }
  return state;
}

export function endTurn(state: GameState): GameState {
  const s = state;
  s.card = null;
  s.action = "none";
  if (finishIfOver(s).phase === "game_over") return s;
  const player = currentPlayer(s);
  const doubles = s.dice[0] === s.dice[1] && s.lastRoll[0] > 0;
  if (!player.bankrupt && !player.inJail && doubles && s.doublesStreak > 0 && s.doublesStreak < 3) {
    log(s, `${player.name} rolled doubles and goes again.`, "system");
    s.phase = "awaiting_roll";
    return s;
  }
  return advanceToNext(s);
}

export function sendToJail(state: GameState, reason: string): GameState {
  const player = currentPlayer(state);
  player.position = JAIL_POS;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesStreak = 0;
  state.action = "none";
  state.card = null;
  log(state, reason, "bad");
  return advanceToNext(state);
}

function bankrupt(state: GameState, creditorId: string | "bank" | "jackpot"): GameState {
  const player = currentPlayer(state);
  log(state, `${player.name} is bankrupt.`, "bad");
  const leftover = Math.max(0, player.money);
  if (creditorId !== "bank" && creditorId !== "jackpot") {
    const creditor = state.players.find((p) => p.id === creditorId && !p.bankrupt);
    if (creditor) {
      creditor.money += leftover;
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (state.owners[i] === player.id) state.owners[i] = creditor.id;
      }
      log(state, `${creditor.name} takes ${player.name}'s deeds and $${leftover}.`, "system");
    } else {
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (state.owners[i] === player.id) state.owners[i] = null;
      }
      state.jackpot += leftover;
    }
  } else {
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state.owners[i] === player.id) state.owners[i] = null;
    }
    if (creditorId === "jackpot") state.jackpot += leftover;
  }
  player.money = 0;
  player.bankrupt = true;
  player.inJail = false;
  player.jailFree = 0;
  state.doublesStreak = 0;
  return advanceToNext(state);
}

function pay(
  state: GameState,
  amount: number,
  creditorId: string | "bank" | "jackpot",
  reason: string,
): GameState {
  if (amount <= 0) return endTurn(state);
  const player = currentPlayer(state);
  if (player.money >= amount) {
    player.money -= amount;
    if (creditorId === "jackpot") state.jackpot += amount;
    else if (creditorId !== "bank") {
      const creditor = state.players.find((p) => p.id === creditorId && !p.bankrupt);
      if (creditor) creditor.money += amount;
    }
    log(state, `${player.name} paid $${amount} ${reason}.`, "bad");
    return endTurn(state);
  }
  log(state, `${player.name} cannot pay $${amount} ${reason}.`, "bad");
  return bankrupt(state, creditorId);
}

function credit(state: GameState, amount: number, reason: string): GameState {
  const player = currentPlayer(state);
  player.money += amount;
  log(state, `${player.name} collected $${amount} ${reason}.`, "good");
  return endTurn(state);
}

function passGo(state: GameState): void {
  const player = currentPlayer(state);
  player.money += GO_SALARY;
  const bills = ownedCount(state, player.id) * GO_UPKEEP;
  const paid = Math.min(player.money, bills);
  player.money -= paid;
  if (paid > 0) {
    log(state, `${player.name} passed GO (+$${GO_SALARY}, −$${paid} deed upkeep).`, "system");
  } else {
    log(state, `${player.name} passed GO and collected $${GO_SALARY}.`, "good");
  }
}

export function stepForward(state: GameState): GameState {
  const s = cloneState(state);
  const player = currentPlayer(s);
  const next = (player.position + 1) % BOARD_SIZE;
  player.position = next;
  if (next === 0) passGo(s);
  return s;
}

function goTo(state: GameState, dest: number, collectGo: boolean, rng: Rng): GameState {
  const player = currentPlayer(state);
  if (collectGo && dest !== player.position && dest <= player.position) {
    passGo(state);
  }
  player.position = dest;
  player.inJail = false;
  return resolveLandingMut(state, rng);
}

function nearestId(from: number, ids: number[]): number {
  let best = ids[0]!;
  let bestDist = BOARD_SIZE;
  for (const id of ids) {
    const dist = (id - from + BOARD_SIZE) % BOARD_SIZE;
    if (dist > 0 && dist < bestDist) {
      best = id;
      bestDist = dist;
    }
  }
  return best;
}

function drawFrom(state: GameState, deck: CardDeck, rng: Rng): string {
  const pile = deck === "fortune" ? state.fortunePile : state.chancePile;
  if (pile.length === 0) {
    const ids = (deck === "fortune" ? FORTUNE_CARDS : CHANCE_CARDS).map((c) => c.id);
    const shuffled = shuffle(ids, rng);
    if (deck === "fortune") state.fortunePile = shuffled;
    else state.chancePile = shuffled;
  }
  const nextPile = deck === "fortune" ? state.fortunePile : state.chancePile;
  const id = nextPile.pop();
  if (!id) throw new Error("Empty card pile");
  return id;
}

function applyCardEffect(state: GameState, cardId: string, rng: Rng): GameState {
  const def = CARDS[cardId];
  if (!def) return endTurn(state);
  const player = currentPlayer(state);
  const effect = def.effect;
  switch (effect.type) {
    case "money": {
      if (effect.amount >= 0) return credit(state, effect.amount, "from the card");
      const dest: "jackpot" | "bank" = effect.amount <= -50 ? "jackpot" : "bank";
      return pay(state, -effect.amount, dest, "from the card");
    }
    case "goto":
      log(state, `${player.name}: ${def.text}`, "system");
      return goTo(state, effect.position, effect.collectGo, rng);
    case "jail":
      return sendToJail(state, `${player.name} was sent to jail.`);
    case "jailfree":
      player.jailFree += 1;
      log(state, `${player.name} kept a Get Out of Jail Free card.`, "good");
      return endTurn(state);
    case "back": {
      const dest = (player.position - effect.steps + BOARD_SIZE) % BOARD_SIZE;
      player.position = dest;
      log(state, `${player.name} moved back ${effect.steps} spaces.`, "system");
      return resolveLandingMut(state, rng);
    }
    case "nearest": {
      const ids = GROUPS[effect.kind];
      const dest = nearestId(player.position, ids);
      log(state, `${player.name} advances to ${spaceAt(dest).name}.`, "system");
      return goTo(state, dest, true, rng);
    }
    case "repairs": {
      const n = ownedCount(state, player.id);
      const bill = n * effect.perProperty;
      if (bill <= 0) {
        log(state, `${player.name} owns nothing to repair.`, "system");
        return endTurn(state);
      }
      return pay(state, bill, "jackpot", "for street repairs");
    }
    case "each": {
      const others = state.players.filter((p) => !p.bankrupt && p.id !== player.id);
      const total = effect.amount * others.length;
      if (player.money < total) {
        log(state, `${player.name} cannot pay the chairperson levy.`, "bad");
        return bankrupt(state, "bank");
      }
      player.money -= total;
      for (const other of others) other.money += effect.amount;
      log(state, `${player.name} paid $${effect.amount} to each rival.`, "bad");
      return endTurn(state);
    }
    default:
      return endTurn(state);
  }
}

function resolvePurchaseable(state: GameState): GameState {
  const player = currentPlayer(state);
  const space = spaceAt(player.position);
  const ownerId = state.owners[space.id] ?? null;
  if (!ownerId) {
    const price = space.price ?? 0;
    if (player.money >= price && price > 0) {
      state.phase = "awaiting_action";
      state.action = "buy";
      log(state, `${space.name} is for sale at $${price}.`, "system");
      return state;
    }
    log(state, `${player.name} cannot afford ${space.name}.`, "neutral");
    return endTurn(state);
  }
  if (ownerId === player.id) {
    log(state, `${player.name} stopped at their own ${space.name}.`, "neutral");
    return endTurn(state);
  }
  const owner = state.players.find((p) => p.id === ownerId);
  if (!owner || owner.bankrupt) {
    state.owners[space.id] = null;
    return resolvePurchaseable(state);
  }
  const diceTotal = state.dice[0] + state.dice[1];
  const rent = calcRent(state, space.id, diceTotal);
  return pay(state, rent, ownerId, `rent on ${space.name}`);
}

function resolveLandingMut(state: GameState, rng: Rng): GameState {
  if (state.phase === "game_over") return state;
  const player = currentPlayer(state);
  if (player.bankrupt) return advanceToNext(state);
  const space = spaceAt(player.position);
  switch (space.kind) {
    case "go":
      return endTurn(state);
    case "property":
    case "transit":
    case "utility":
      return resolvePurchaseable(state);
    case "tax": {
      const tax = space.tax ?? 0;
      log(state, `${player.name} landed on ${space.name}.`, "system");
      return pay(state, tax, "jackpot", `in ${space.name.toLowerCase()}`);
    }
    case "fortune":
    case "chance": {
      const deck: CardDeck = space.kind;
      const cardId = drawFrom(state, deck, rng);
      const def = CARDS[cardId]!;
      state.phase = "awaiting_action";
      state.action = "card";
      state.card = { deck, text: def.text, cardId };
      log(state, `${player.name} drew a ${deck === "fortune" ? "Fortune" : "Chance"} card.`, "system");
      return state;
    }
    case "jail":
      log(state, `${player.name} is just visiting jail.`, "neutral");
      return endTurn(state);
    case "park": {
      const pot = state.jackpot;
      if (pot <= 0) {
        log(state, `${player.name} rests at Civic Park. The pot is empty.`, "neutral");
        return endTurn(state);
      }
      state.jackpot = 0;
      player.money += pot;
      log(state, `${player.name} collected the Civic Park pot: $${pot}.`, "good");
      return endTurn(state);
    }
    case "gotojail":
      return sendToJail(state, `${player.name} was ordered to jail.`);
    default:
      return endTurn(state);
  }
}

export function resolveLanding(state: GameState, rng: Rng = Math.random): GameState {
  return resolveLandingMut(cloneState(state), rng);
}

export type RollResult =
  | { kind: "move"; state: GameState; steps: number }
  | { kind: "jail"; state: GameState };

export function applyRoll(state: GameState, dice: [number, number]): RollResult {
  const s = cloneState(state);
  const player = currentPlayer(s);
  s.dice = [dice[0], dice[1]];
  s.lastRoll = [dice[0], dice[1]];
  const doubles = dice[0] === dice[1];
  s.doublesStreak = doubles ? s.doublesStreak + 1 : 0;
  if (s.doublesStreak >= 3) {
    s.doublesStreak = 0;
    return {
      kind: "jail",
      state: sendToJail(s, `${player.name} rolled doubles three times and was sent to jail.`),
    };
  }
  return { kind: "move", state: s, steps: dice[0] + dice[1] };
}

export function buyProperty(state: GameState): GameState {
  const s = cloneState(state);
  if (s.action !== "buy" || s.phase !== "awaiting_action") return s;
  const player = currentPlayer(s);
  const space = spaceAt(player.position);
  const price = space.price ?? 0;
  if (!isPurchasable(space) || price <= 0 || player.money < price) {
    log(s, `${player.name} passed on ${space.name}.`, "neutral");
    return endTurn(s);
  }
  player.money -= price;
  s.owners[space.id] = player.id;
  log(s, `${player.name} bought ${space.name} for $${price}.`, "good");
  return endTurn(s);
}

export function declineBuy(state: GameState): GameState {
  const s = cloneState(state);
  if (s.action !== "buy") return s;
  const player = currentPlayer(s);
  const space = spaceAt(player.position);
  log(s, `${player.name} passed on ${space.name}.`, "neutral");
  return endTurn(s);
}

export function acknowledgeCard(state: GameState, rng: Rng = Math.random): GameState {
  const s = cloneState(state);
  if (s.action !== "card" || !s.card) return s;
  const cardId = s.card.cardId;
  s.card = null;
  s.action = "none";
  return applyCardEffect(s, cardId, rng);
}

export function jailPay(state: GameState): GameState {
  const s = cloneState(state);
  if (s.action !== "jail") return s;
  const player = currentPlayer(s);
  if (player.money < JAIL_FINE) {
    if (player.jailTurns >= 3) return bankrupt(s, "jackpot");
    log(s, `${player.name} cannot afford the $${JAIL_FINE} fine.`, "bad");
    return s;
  }
  player.money -= JAIL_FINE;
  s.jackpot += JAIL_FINE;
  player.inJail = false;
  player.jailTurns = 0;
  log(s, `${player.name} paid $${JAIL_FINE} and left jail.`, "system");
  s.phase = "awaiting_roll";
  s.action = "none";
  s.doublesStreak = 0;
  return s;
}

export function jailUseCard(state: GameState): GameState {
  const s = cloneState(state);
  if (s.action !== "jail") return s;
  const player = currentPlayer(s);
  if (player.jailFree < 1) return s;
  player.jailFree -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  log(s, `${player.name} used a Get Out of Jail Free card.`, "good");
  s.phase = "awaiting_roll";
  s.action = "none";
  s.doublesStreak = 0;
  return s;
}

export function jailRoll(state: GameState, dice: [number, number]): RollResult {
  const s = cloneState(state);
  if (s.action !== "jail") return { kind: "jail", state: s };
  const player = currentPlayer(s);
  s.dice = [dice[0], dice[1]];
  s.lastRoll = [dice[0], dice[1]];
  const doubles = dice[0] === dice[1];
  if (doubles) {
    player.inJail = false;
    player.jailTurns = 0;
    s.doublesStreak = 1;
    log(s, `${player.name} rolled doubles and left jail.`, "good");
    s.action = "none";
    s.phase = "awaiting_roll";
    return { kind: "move", state: s, steps: dice[0] + dice[1] };
  }
  if (player.jailTurns >= 3) {
    if (player.money < JAIL_FINE) {
      return { kind: "jail", state: bankrupt(s, "jackpot") };
    }
    player.money -= JAIL_FINE;
    s.jackpot += JAIL_FINE;
    player.inJail = false;
    player.jailTurns = 0;
    s.doublesStreak = 0;
    s.action = "none";
    log(s, `${player.name} paid $${JAIL_FINE} after three failed rolls.`, "system");
    return { kind: "move", state: s, steps: dice[0] + dice[1] };
  }
  log(s, `${player.name} failed to roll doubles and stays in jail.`, "neutral");
  s.doublesStreak = 0;
  return { kind: "jail", state: endTurn(s) };
}

export function moveAndResolve(state: GameState, steps: number, rng: Rng = Math.random): GameState {
  let s = state;
  for (let i = 0; i < steps; i++) s = stepForward(s);
  return resolveLanding(s, rng);
}

export function canAct(state: GameState, kind: ActionKind): boolean {
  return state.phase === "awaiting_action" && state.action === kind;
}
