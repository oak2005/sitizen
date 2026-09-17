"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AuthSlot } from "@/components/AuthSlot";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Button } from "@/components/ui/button";
import { CIRCUIT_SPACES, GROUP_LABEL, districtSpaces } from "@/game/board";
import { houseCost } from "@/game/epoch/engine";
import {
  BUILD_COST_RATIO,
  DEMO_EPOCH_MS,
  HOUSE_MULT,
  JOIN_FEE,
  JOIN_FEE_FLOOR,
  JOIN_DISCOUNT_MAX,
  LAND_EPOCH,
  MARKS_PER_GO,
  MAX_EPOCH,
  MAX_HOUSES,
  OPS_SHARE,
  PAYOUT_EVERY,
  PAYOUT_MIN,
  PAYOUT_SHARE,
  PROTOCOL_TAX,
  REAL_EPOCH_HOURS,
  SALVAGE,
  STARTING_CASH,
  TIER_EPOCH,
  BAIL_CAP,
  BAIL_MARKS,
  AMNESTY_PCT,
  AMNESTY_STREAK,
  TOKEN_TAX,
  TOKEN_YIELD_SHARE,
  TOKEN_OPS_SHARE,
  TOKEN_COMMUNITY_SHARE,
  TOKEN_BURN_SHARE,
  TOKEN_LISTING_FEE,
  TOKEN_YIELD_MIN,
  LIVE_JOIN_STX,
  LIVE_HUMANS_PER_DISTRICT,
} from "@/game/epoch/types";
import { GO_SALARY, GO_UPKEEP, JAIL_FINE, SET_RENT_MULT } from "@/game/types";

const toc = [
  ["abstract", "Abstract"],
  ["meaning", "Meaning"],
  ["problem", "The problem"],
  ["two-cities", "Two cities"],
  ["board", "The board"],
  ["actors", "Who sits"],
  ["computer-city", "Computer City (now)"],
  ["computers", "How computers work"],
  ["live-city", "Live City (upcoming)"],
  ["time", "Epochs and time"],
  ["intents", "Intents"],
  ["settle", "Settlement"],
  ["nft", "Land as an NFT"],
  ["houses", "Houses on the deed"],
  ["transfer", "Sale, salvage, market"],
  ["treasury", "Treasury, Marks, tax"],
  ["jail", "Jail and liens"],
  ["rent", "Rent math"],
  ["table", "Table Circuit"],
  ["numbers", "Economy sheet"],
  ["catalogue", "Lot catalogue"],
  ["roadmap", "What ships, what follows"],
  ["ledger", "Live City ledger"],
  ["nongoals", "Non-goals and risks"],
  ["glossary", "Glossary"],
] as const;

const DEMO_SECONDS = DEMO_EPOCH_MS / 1000;
const TAX_PCT = PROTOCOL_TAX * 100;
const BUILD_PCT = Math.round(BUILD_COST_RATIO * 100);
const SALVAGE_PCT = Math.round(SALVAGE * 100);
const HOUSE_CURVE = HOUSE_MULT.slice(1).join(" / ");

export function Litepaper() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link to="/" className="font-display text-base font-medium tracking-tight">
            Sitizen
          </Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <Link to="/live" className="text-xs text-fg-muted hover:text-fg">
              Live City
            </Link>
            <Link to="/" className="text-xs text-fg-muted hover:text-fg">
              Play
            </Link>
            <AuthSlot />
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <p className="text-[11px] tracking-[0.22em] text-fg-subtle uppercase">
          Litepaper v1.8 · September 2026 · ruleset of the running city
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">Sitizen</h1>
        <p className="mt-2 font-display text-xl text-fg-muted">
          A persistent property city. Land is the NFT. Houses ride on the deed. Computers never hold the clock.
        </p>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
          This paper is the full account of what Sitizen is, why it is built this way, how the playable Computer
          City works today, and how the upcoming Live City is meant to run — meaning, objects, timing, computers, rent,
          jail, and every number the city actually uses.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ModeCard
            kicker="Playable now"
            title="Computer City"
            body={`One human, two or three computer tycoons, a ${DEMO_SECONDS}s window that stands in for ${REAL_EPOCH_HOURS} hours. Ada, Holt, and Vesper commit the instant an epoch opens. The city never waits on them.`}
          />
          <ModeCard
            kicker="Upcoming"
            title="Live City"
            body={`The same objects and the same settlement on a ${REAL_EPOCH_HOURS}-hour clock, with many humans in one persistent city. Computers still seal at open. Land listings are one NFT. Missing a window is a rest, not a kick.`}
          />
        </div>

        <nav aria-label="Contents" className="mt-8 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Contents</p>
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {toc.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="text-fg-muted hover:text-fg">
                  <span className="mr-2 tabular-nums text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="abstract" title="1. Abstract">
          <p>
            Sitizen is a forty-space city. Pawns buy lots, raise rent, and keep moving. The product is not a
            sitting that throws you out when cash hits zero. It is a city that keeps its citizens — including the
            computers — on the same clock.
          </p>
          <p>
            Two deployments share one ruleset. <strong className="font-medium text-fg">Computer City</strong> is the
            in-app picture you can play today: computers act per epoch, instantly, so the window is only waiting on you.
            <strong className="font-medium text-fg"> Live City</strong> is the upcoming real game: a persistent instance
            with {REAL_EPOCH_HOURS}-hour epochs, many human seats, the same land NFTs, and the same computer policy so a
            machine citizen can never stall six hours of everyone else.
          </p>
          <p>
            Land is the NFT (<code className="text-fg">SZ-XX</code>). Houses are traits on that NFT, not a second token
            you can peel off. Selling the land sells the houses. Broke is a lien and a jail stay, not elimination. A
            join fee and a {TAX_PCT}% rent skim fund a civic treasury, tagged 60% ops (team, amnesty) and 40% community
            (paid back to top rent collectors every {PAYOUT_EVERY} epochs). Passing GO grants Marks, not a cash salary —
            spend them on a bail bond, a join discount, or cosmetics. What you pay in rent, tax, and join fees does not
            change.
          </p>
          <p>
            This paper does not describe a chain, a ticker, or a launch window. It describes the city. If a later
            ledger holds the deeds, it holds these objects — not a different game.
          </p>
        </Section>

        <Section id="meaning" title="2. Meaning — what this is for">
          <p>
            Sequential board games assume a table. One pawn rolls, everyone watches, the next pawn rolls. That is Table
            Circuit, and it is still here: a sitting with a winner. It is the wrong shape for a city that is supposed to
            stay open.
          </p>
          <p>
            A city is simultaneous. Rent is earned while you are elsewhere. Neighbours build on their own clock. A
            computer that “takes a turn” for six hours is not a citizen — it is a locked door. Sitizen’s meaning
            is that the city is the unit of time, not the player.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-fg">Scarcity sits on the map.</strong> Forty lots on the core loop.
              Eight colour rows. Four lines. Two utilities. After epoch 100 the city adds Lantern row and Beacon Grid
              past Crown Point — extra lots, not a rewrite of Ivory Lane. Utilities never sit between a colour row.
            </li>
            <li>
              <strong className="font-medium text-fg">Ownership is one object.</strong> The deed is the lot. Improvements
              live on it. A market can list it. A bank can salvage it. Nobody keeps a house after selling the dirt.
            </li>
            <li>
              <strong className="font-medium text-fg">Time is a window.</strong> Everyone submits an intent. Computers
              submit at open. Humans submit before close. The city settles once. Then it opens again.
            </li>
            <li>
              <strong className="font-medium text-fg">Absence is not death.</strong> Miss an epoch and you rest. Go broke
              and you sit in jail with a lien while your lots still collect. The city stays populated.
            </li>
          </ul>
          <p>
            Computer City exists so that loop is playable without waiting six hours and without asking a chain to exist
            first. Live City is that loop with the clock turned to its real length and the table opened to many humans.
          </p>
        </Section>

        <Section id="problem" title="3. The problem">
          <p>
            If computers take sequential turns on a {REAL_EPOCH_HOURS}-hour window, a four-seat city spends most of its
            life waiting on Ada. Humans cannot plan. Rent cannot clear. The city is a queue pretending to be a place.
          </p>
          <p>
            If computers were allowed to “think” until the window was about to close, they would snipe. They would see
            every human landing, then buy, build, or rest with perfect information. That is not a citizen. That is a
            last-mover exploit.
          </p>
          <p>So the design forbids both:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Computers never own the window. They cannot delay close. They cannot extend it.</li>
            <li>
              Computers seal their intent at epoch open — dice, buy flag, queued houses — before any human dice are
              known. They move later, in seat order, but they do not get to change their mind.
            </li>
          </ol>
          <p>
            Humans get the whole window because they are the ones who might be asleep, at work, or on another device.
            Computers do not need that courtesy. They are ready at T+0, every epoch, forever.
          </p>
        </Section>

        <Section id="two-cities" title="4. Two cities, one ruleset">
          <NowLater
            nowTitle="Computer City — this app"
            now={
              <>
                You start a fresh city. Ada, Holt, and Vesper spawn with you. Each pays ${JOIN_FEE} into a new treasury.
                The window is {DEMO_SECONDS} seconds so several epochs fit in a sitting. Settlement fires when you roll,
                when you rest, or when the timer hits zero. Leave the city and the instance is gone. Table saves do not
                apply here.
              </>
            }
            laterTitle="Live City — upcoming"
            later={
              <>
                A city is an ongoing instance. Computers already live there. Humans join between epochs (or at open),
                pay the join fee, and spawn on GO with ${STARTING_CASH - JOIN_FEE}. Deeds, treasury, liens, and Marks
                persist when you close the app. Miss a window and you rest. The loop is identical; the clock and the
                population are not.
              </>
            }
          />
          <p>
            Table Circuit is a third thing on purpose: a finite 1v-computers match with a cash GO salary, a first
            bankruptcy, and a net-worth ranking. It is the sitting. Epoch City (Computer and Live) is the place.
          </p>
        </Section>

        <Section id="board" title="5. The board">
          <p>
            One loop, forty spaces, clockwise from GO. Colour rows sit in pairs and triples. Names are original to this
            city — Ivory Lane, Harbor Row, Foundry Street, Crown Point — not a reskin of someone else’s map.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-fg">Corners.</strong> GO (0), Jail (10), Civic Park (20), Go to Jail
              (30).
            </li>
            <li>
              <strong className="font-medium text-fg">Colour rows.</strong> Ivory, Harbor, Market, Foundry, Arcade, Hill,
              Grove, Crown. Lantern row unlocks after epoch {LAND_EPOCH}.
            </li>
            <li>
              <strong className="font-medium text-fg">Transit.</strong> North, East, South, West Line. Rent $25 / $50 /
              $100 / $200 by how many you hold. No houses.
            </li>
            <li>
              <strong className="font-medium text-fg">Utilities.</strong> Power Plant and Water Works on the core loop.
              Beacon Grid unlocks after epoch 100, after Lantern Yard — never between colour lots. Rent is 4× the dice,
              10× if you hold two, 16× if you hold all three. No houses.
            </li>
            <li>
              <strong className="font-medium text-fg">Taxes.</strong> City Levy $200 and Luxury Tax $100 fill Civic Park,
              a separate pot from the treasury. Land on Park to take it.
            </li>
            <li>
              <strong className="font-medium text-fg">Cards.</strong> Fortune and Chance. Table Circuit draws from the
              full decks. Epoch City uses a simplified cash swing so simultaneous settlement does not need a locked
              shared deck (see §12).
            </li>
          </ul>
          <p>Every purchasable space has a printed price and a base rent. Completing a colour row doubles that base before houses apply. Full prices live in §21.</p>
        </Section>

        <Section id="actors" title="6. Who sits">
          <p>
            A Computer City sitting is one human and two or three computer tycoons. Tokens are ivory (you), rust (Ada),
            steel (Holt), pine (Vesper). Seat order is fixed at join: you, then Ada, then Holt, then Vesper. Settlement
            walks that order. It is not shuffled each epoch.
          </p>
          <p>
            Live City adds human seats to the same order. Join order is seat order. Computers fill empty chairs so a
            thin city still has rent, rivalry, and someone to land on. A computer seat is a full citizen: cash, deeds,
            Marks, liens, jail. It is not a dealer and it is not a house account.
          </p>
          <p>
            Starting bankroll is ${STARTING_CASH}. Epoch join takes ${JOIN_FEE} off the top into the treasury, so you
            begin on GO with ${STARTING_CASH - JOIN_FEE}. Table Circuit does not take a join fee; you keep the full ${STARTING_CASH} and collect a GO salary instead.
          </p>
        </Section>

        <Section id="computer-city" title="7. Computer City — how it plays now">
          <p>
            This is the in-app simulation of how the real game looks. There is no wallet, no gas, no listing book, and
            no public ledger. The objects are the same ones Live City will use.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>You name yourself, pick two or three computers, choose Easy or Hard, and enter. Join fees mint the treasury. Difficulty is Computer City only — not Live City protocol.</li>
            <li>
              Epoch 1 opens. Ada, Holt, and Vesper submit immediately (dice, claim flag, offer answers, house
              queues). Hard computers complete rows, block yours, keep a cash reserve, and will not sell a monopoly cheap. The banner says they are ready. The clock is waiting on you.
            </li>
            <li>
              You may queue a house on a completed colour row, salvage a deed back to the city, claim unowned land from
              last epoch, answer offers, then Roll or Rest. Landing never auto-mints — you decide next epoch.
            </li>
            <li>
              Commit closes the window early. The city settles every seat, then opens epoch 2 with computers already
              sealed again. If you let the {DEMO_SECONDS}s run out, that is a rest. Computers still resolve.
            </li>
            <li>
              There is no winner screen. You leave when you leave. Net worth is a standing, not a finish line. Broke
              sends you to jail with a lien; your lots keep collecting.
            </li>
          </ol>
          <p>
            Keyboard: space or R rolls the epoch. The board shows house pips on improved lots and the deed id when you
            inspect a space. Salvage confirms, because houses leave with the land.
          </p>
        </Section>

        <Section id="computers" title="8. How computers work">
          <p>
            Computers are not “AI taking a turn.” They are epoch agents. One function runs at open, writes an intent,
            and stops. Nothing they do can pause the window. If a computer is broke in jail, its intent is rest. The
            epoch still closes on human commit or on the timer.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">8.1 Policy (exact)</h3>
          <p>Each computer, at epoch open, does this and only this:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Default intent: <code className="text-fg">roll</code>, two dice in 1–6, <code className="text-fg">claim</code> only
              if they landed on unowned land last epoch and still have a $100 cash buffer, no houses queued.
            </li>
            <li>
              If in jail with a lien and cash less than the lien → <code className="text-fg">idle</code> (rest). No dice. Lots
              still collect. This is the only time a computer declines to roll.
            </li>
            <li>
              If in jail with cash ≥ lien → still <code className="text-fg">roll</code>. Settlement will clear the lien
              first, then move. They do not skip a turn they can pay for.
            </li>
            <li>
              Then, for each owned colour lot, in ownership order: skip transit and utilities; skip incomplete rows;
              skip hotels; skip if cash minus house cost would fall under $140 (a solvency buffer); skip 55% of the
              time (they do not max-build every epoch); otherwise queue that lot. Stop at two queued houses.
            </li>
          </ol>
          <p>
            They do not bargain. They do not salvage. They do not target a specific rival. They do not look at the
            human’s uncommitted intent. Dice are rolled into the intent at open, so they cannot choose a move after
            seeing where you landed.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">8.2 What they can still “see”</h3>
          <p>
            Because settlement is seat order and you sit first, a computer’s predetermined dice may land on a lot you
            minted earlier in the same epoch. That is rent, not sniping: they did not change the dice. They simply move
            after you. Live City keeps this. Changing it would require simultaneous movement (all teleport, then all
            landings), which breaks “who is standing on the lot when rent is due.” Seat order is the honest rule.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">8.3 What they must never do</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>Hold the epoch open.</li>
            <li>Resubmit after a human commits.</li>
            <li>Read another seat’s sealed dice before those dice are revealed at settlement.</li>
            <li>Be skipped in settlement because they are a computer. They pay tax. They take liens. They collect.</li>
          </ul>
          <Callout>
            If a design needs six hours “for the computers to think,” it is the wrong design. Computers think at T+0.
            The six hours are for humans.
          </Callout>
        </Section>

        <Section id="live-city" title="9. Live City — how the upcoming real one goes">
          <p>
            Live City is Computer City with the demo shortcuts removed. Same board. Same NFT model. Same computer
            policy. Different clock, population, and persistence.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.1 Opening a city</h3>
          <p>
            A city instance is created once. Computers are seated at genesis so the map is never empty. Humans join
            when an epoch is open or in the gap after settlement. Join pays {LIVE_JOIN_STX} STX on testnet ($50 of STX
            on mainnet) to that city’s treasury — not
            to a player, not back to you on exit. You spawn on GO with in-game cash after that fee, 0 Marks, no deeds.
            You do not inherit Ada’s lots. You do not reset the epoch counter.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.2 The {REAL_EPOCH_HOURS}-hour window</h3>
          <p>
            Each epoch is open for {REAL_EPOCH_HOURS} hours. Computers seal at second zero. Humans may submit, replace
            their own intent, queue or unqueue houses, and salvage (or list) until close. Replacing your intent is
            allowed until the window seals; you cannot replace anyone else’s. Close happens at the timer, or earlier if
            every human seat has a non-idle intent. Computer seats do not count toward that wait — they are already in.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.3 Sealed intents</h3>
          <p>
            Live City should hide dice and buy flags until settlement. Computer City already avoids showing computer
            dice on the board before close. The live rule is stronger: treat intents as sealed so humans cannot snipe
            each other the way we refused to let computers snipe humans. At close, intents open, then §12 runs.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.4 Missing the window</h3>
          <p>
            No commit → rest. You stay on your space. You do not pass GO. You do not pay rent. You also do not collect
            new land. Your existing lots still collect from whoever does land. This is how a city survives time zones
            and sleep. Kick-for-AFK would empty the map.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.5 Persistence</h3>
          <p>
            Your seat, cash, Marks, lien, jail flag, position, and deed titles survive disconnect. Table Circuit already
            saves a sitting to a signed-in account; Live City should save the city the same way, scoped to the instance
            plus your user, not a guest blob on one device. Guests can still play Computer City without an account.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.6 Market</h3>
          <p>
            A listing is one NFT: <code className="text-fg">SZ-24</code> with however many houses are on it. The buyer
            receives the lot and the rent curve. The seller receives cash (minus any later listing fee to treasury).
            There is no “keep the hotel, sell the dirt” ticket. Salvage remains the city’s 70% buyback if nobody bids.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.7 Milestone districts</h3>
          <p>
            Computer City — the in-app preview — may keep adding one computer every {TIER_EPOCH} epochs and laying a
            new board every {LAND_EPOCH} epochs through epoch {MAX_EPOCH}. Epoch 100 opens Lantern Square: one square
            that holds every Founders lot and house plus Lantern row and Beacon Grid on the same table. Epoch 200 opens
            Iris Square, which holds everything already on Lantern Square plus Iris row and Signal Works — still one
            square, never a side lane of extra tables. Easy and Hard computers exist only in that preview.{" "}
            <strong className="font-medium text-fg">None of this 5000-epoch ceiling, the extra tables, or
            difficulty is Live City / testnet / mainnet protocol.</strong> Live City does not open land on an epoch
            counter. A new colour row plus its utility is laid when seated <em>humans</em> hit {LIVE_HUMANS_PER_DISTRICT},{" "}
            {LIVE_HUMANS_PER_DISTRICT * 2}, {LIVE_HUMANS_PER_DISTRICT * 3}… Computers fill empty chairs so the map is
            never dead; they do not count toward the unlock. Utilities stay outside colour rows. One square, never a
            side lane.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">9.8 Ledger host (testnet)</h3>
          <p>
            Computer City still does not need a chain. Live City testnet hosts the same objects on Stacks: cash and
            civic tax in STX, each deed as a SIP-009 NFT, houses as a trait written by a transaction, and a Circuit
            token that never pays rent. Join is {LIVE_JOIN_STX} STX on testnet ($50 of STX on mainnet). The board, the{" "}
            {TAX_PCT}% skim, Marks, liens, and computers stay as written. Full split, yield, and sinks are §23.
          </p>
        </Section>

        <Section id="time" title="10. Epochs and time">
          <p>
            An epoch has two phases: <code className="text-fg">open</code> (intents accepted) and{" "}
            <code className="text-fg">settling</code> (intents frozen, city resolving). Players never act during
            settling. In Computer City settling is instant. In Live City it should also be short — a clear, then the
            next open.
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="bg-bg-subtle text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Clock</th>
                  <th className="px-3 py-2 font-medium">Computer City</th>
                  <th className="px-3 py-2 font-medium">Live City</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                <Row a="Open duration" b={`${DEMO_SECONDS} seconds`} c={`${REAL_EPOCH_HOURS} hours`} />
                <Row a="Computers submit" b="At open, instantly" c="At open, instantly" />
                <Row a="Human may wait" b="Yes, until the short timer" c="Yes, until the long timer" />
                <Row a="Early close" b="On the human’s roll or rest" c="When every human seat has committed, or at timer" />
                <Row a="Timeout" b="Treated as rest" c="Treated as rest" />
                <Row a="Stands in for" b={`${REAL_EPOCH_HOURS} hours`} c="Is the real clock" />
              </tbody>
            </table>
          </div>
          <p>
            The demo timer is a teaching clock. Rules do not change when the number becomes hours. If a future client
            offers a “fast city” and a “live city,” they should share this paper and differ only in duration and who is
            allowed to sit.
          </p>
        </Section>

        <Section id="intents" title="11. Intents">
          <p>One intent per seat per epoch. Fields:</p>
          <dl className="space-y-3">
            <Gloss
              t="kind"
              d="roll · pass (committed rest) · idle (no commit yet). Timeout promotes idle to pass. Computers use idle only when jailed without cash."
            />
            <Gloss
              t="dice"
              d="A pair of 1–6, or null. Required for roll. Rolled by computers at open. Rolled by you when you press Roll. Not rerolled at settlement."
            />
            <Gloss
              t="claim"
              d="If you landed on unowned land last epoch, mint it this epoch, or pass and leave it unowned. Nothing auto-buys."
            />
            <Gloss
              t="offerResponses"
              d="Accept or decline each ripe offer (created last epoch). The owner answers next epoch. Houses travel with the deed."
            />
            <Gloss
              t="builds"
              d="A list of space ids to improve, resolved before the move, one house each, skipping unaffordable or illegal ids. Queueing the same id twice in one epoch still builds once."
            />
          </dl>
          <p>
            You may toggle builds while the window is open. You may salvage a deed while the window is open; that is not
            an intent, it is an immediate city action (the lot is unowned before settlement). Live listings should be
            immediate too, or they race settlement — do not leave a listed deed moving under two owners in one epoch.
          </p>
        </Section>

        <Section id="settle" title="12. Settlement — the exact order">
          <p>When the window closes, the city clones state and walks seats from first to last.</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong className="font-medium text-fg">Offers.</strong> Ripe offers (created last epoch) are answered.
              Accept transfers the whole deed plus houses. Decline leaves it with the holder.
            </li>
            <li>
              <strong className="font-medium text-fg">Claims.</strong> If you landed on unowned land last epoch and
              flagged claim, mint SZ-XX now. Otherwise the lot stays unowned. Nothing auto-mints on landing.
            </li>
            <li>
              <strong className="font-medium text-fg">Lien.</strong> If in jail with a lien and cash ≥ lien, pay it in
              full, clear jail, continue. If cash is less than the lien, apply builds only, skip the move, go to the next seat.
              Existing lots still collect when other seats land on them later in this same epoch.
            </li>
            <li>
              <strong className="font-medium text-fg">Builds.</strong> For each unique queued id: must own it, must own
              the whole colour row, must be a property (not transit/utility), houses below {MAX_HOUSES}, cash at least house
              cost. Cash is spent. <code className="text-fg">houses</code> increments by one. Hotel is houses ={" "}
              {MAX_HOUSES}.
            </li>
            <li>
              <strong className="font-medium text-fg">Move.</strong> If kind is roll and dice exist: steps = d1 + d2.
              Destination = (position + steps) mod loop size. Loop size is 40 on Founders Square. Computer City adds
              four spaces each 100 epochs, laid onto the same square (Lantern on the Crown side, then Iris, Frost, Plum,
              cycling the four edges). Colour rows stay contiguous; utilities sit after their row, never between colour
              lots. The walk is one loop — not a jump to a second table. If the walk wraps past GO, grant {MARKS_PER_GO} Marks (no cash). Then resolve the landing.
            </li>
            <li>
              <strong className="font-medium text-fg">Landing.</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Unowned property / transit / utility → open a claim for next epoch. No auto-mint.</li>
                <li>Own lot → visit, no rent.</li>
                <li>Rival lot → pay rent (see §18). You may offer to buy; they answer next epoch. Shortfall → lien + jail (space 10). Tax skim on the amount actually paid.</li>
                <li>City Levy / Luxury Tax → pay into Civic Park. Shortfall → lien + jail.</li>
                <li>Civic Park → take the whole jackpot (may be $0).</li>
                <li>Go to Jail → jail, space 10, no lien, no GO Marks.</li>
                <li>
                  Fortune / Chance in Epoch City → +$80 or −$40 (fair coin), cash floored at $0, no lien from the card.
                  Table Circuit uses the named decks instead.
                </li>
                <li>GO, Jail (visiting), and empty corners → nothing extra.</li>
              </ul>
            </li>
          </ol>
          <p>
            After every seat: epoch number increments. Every {TIER_EPOCH} epochs one new computer may join. Every{" "}
            {LAND_EPOCH} epochs Live City opens Lantern row and Beacon Grid. Computer City may keep laying a new square
            that holds every previous lot through epoch {MAX_EPOCH} — preview flavour only, not chain protocol. Phase returns to open, intents reset to idle, computers fill again,
            timer starts. Deeds, cash, Marks, liens, positions, treasury, and Civic Park carry forward.
          </p>
          <Callout>
            Go-to-Jail without a lien is a one-epoch hold. Next epoch you may roll out from Jail like a visitor — no
            doubles required. A lien is the thing that actually traps you. Table Circuit is stricter ($
            {JAIL_FINE} fine, card, or doubles) because it is a sitting, not a city.
          </Callout>
        </Section>

        <Section id="nft" title="13. Land as an NFT">
          <p>
            A purchasable space is not “owned” as a flag. It is minted as a deed:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <code className="text-fg">tokenId</code> — <code className="text-fg">SZ-XX</code> with XX the space index,
              two digits. Ivory Lane is SZ-01. North Line is SZ-05. Crown Point is SZ-39. The id never changes.
            </li>
            <li>
              <code className="text-fg">spaceId</code> — which lot on the forty-space loop.
            </li>
            <li>
              <code className="text-fg">ownerId</code> — the seat that holds it.
            </li>
            <li>
              <code className="text-fg">houses</code> — 0–{MAX_HOUSES}. This is the improvement trait.
            </li>
          </ul>
          <p>
            Unowned land has not been minted. First purchase mints. Salvage (or a later burn-on-buyback) returns the
            space to unowned; a later pawn mints the same id again. There is one living deed per lot at a time. You
            cannot fractionalize SZ-24 in this ruleset. You cannot move a house from SZ-24 onto SZ-23.
          </p>
          <p>
            In Computer City the deed is a city record. In Live City it is the NFT you would hold, list, and transfer.
            The fields do not change. Metadata for a listing is “SZ-24 · Grand Arcade · 3 houses · Arcade row complete /
            incomplete.” Rent is computed from those fields, never stored as a separate payable token.
          </p>
        </Section>

        <Section id="houses" title="14. Houses on the deed — the better model">
          <p>
            Houses raise rent. They cost cash. They are scarce per lot (max {MAX_HOUSES}, the last is a hotel). It is
            tempting to mint each house as its own NFT. That model is rejected.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">14.1 Why not detachable house tokens</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>Sell the land, keep the houses: the hotel floats on a lot you no longer own. Rent has two landlords.</li>
            <li>Every market listing becomes an atomic bundle. Miss one house id and the city forks.</li>
            <li>A house token needs a rule for “where it sits.” That rule is the land NFT. So the extra token is a shadow of the deed.</li>
            <li>Liens, salvage, and milestone math all have to chase two inventories instead of one.</li>
          </ul>
          <p>
            The better model: <strong className="font-medium text-fg">houses are traits on the land NFT</strong>.
            Building spends cash and increments <code className="text-fg">houses</code>. After attach they are not a
            separate tradable. Conceptually they are still NFTs — scarce, valuable, visible — but they are expressed as
            metadata, not as wanderable tokens.
          </p>
          <h3 className="font-display text-lg font-medium text-fg">14.2 Build rules</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>Only colour property. Never transit. Never utilities.</li>
            <li>You must own every lot in that colour row.</li>
            <li>One house per queued id per epoch (you may queue two different lots).</li>
            <li>
              Cost = max($40, round(price × {BUILD_COST_RATIO})). Ivory Lane costs $40 to improve (the floor). Crown
              Point costs ${houseCost(39)}.
            </li>
            <li>Even a jailed pawn may build if they still have cash and a complete row — builds run before the skip-move.</li>
          </ul>
          <h3 className="font-display text-lg font-medium text-fg">14.3 Rent curve</h3>
          <p>
            Property rent = base × {SET_RENT_MULT} (if the row is complete) × house multiplier. Multipliers for 0 / 1 /
            2 / 3 / 4 / hotel: {HOUSE_MULT.join(" / ")}. You cannot build without the row, so in practice houses always
            sit on the doubled base.
          </p>
          <p>
            Ivory Lane (base $16, full Ivory row): unimproved $32; 1 house $96; 2 $192; 3 $320; 4 $512; hotel $800. The
            hotel is still SZ-01. Crown Point (base $200, full Crown row): unimproved $400; hotel $10,000. That is why
            liens exist. A city that eliminated on a Crown hotel would empty itself.
          </p>
        </Section>

        <Section id="transfer" title="15. Sale, salvage, and the market">
          <p>
            Transfer always moves the whole deed. Houses travel. Live City’s marketplace is a book of those deeds.
            Computer City lets you offer a holder a price; they answer next epoch. Salvage remains the city’s buyback.
          </p>
          <p>
            Salvage pays {SALVAGE_PCT}% of (printed land price + houses × current house cost), rounded. The deed is
            removed. The space is unowned. Improvements are gone. Example: Ivory Lane with one house → ($60 + $40) ×{" "}
            {SALVAGE} = $70. Crown Point hotel → (${400 + MAX_HOUSES * houseCost(39)}) × {SALVAGE}, paid in cash, lot
            vacant.
          </p>
          <NowLater
            nowTitle="Computer City"
            now="Salvage is immediate, confirmed, and one-way. Computers never salvage. There is no bid from Ada for your lot. Use it to raise cash for a lien or a house — knowing you give the row away."
            laterTitle="Live City"
            later="List SZ-XX to other humans (and, if desired, to computer seats that are allowed to bid). The listing is the deed plus houses. A protocol listing fee, if any, goes to treasury — it is not in this build. Salvage stays as the floor so a lot can always return to the city at 70%."
          />
        </Section>

        <Section id="treasury" title="16. Treasury, Marks, tax, Civic Park">
          <p>Four pots, four jobs. Do not mix them. What players pay is unchanged; only where the civic skim sits has been split.</p>
          <dl className="space-y-3">
            <Gloss
              t="Cash"
              d={`Your spendable bankroll. Starts at $${STARTING_CASH - JOIN_FEE} in Epoch City (or more if you spend Marks on a join discount). Buys land, houses, liens.`}
            />
            <Gloss
              t="Treasury"
              d={`Civic pool. Genesis: join fees × seats. Then ${TAX_PCT}% of every rent payment that actually clears (rounded). At the moment of collection it is tagged ${Math.round(OPS_SHARE * 100)}% Ops (held by the team) and ${Math.round((1 - OPS_SHARE) * 100)}% Community (paid back to seats). The two sub-pools always sum to treasury.`}
            />
            <Gloss
              t="Ops pool"
              d="60% of every join fee and rent skim. Pays lien amnesty. It is not a dividend and it is not Ada’s pocket."
            />
            <Gloss
              t="Community pool"
              d={`40% of every join fee and rent skim. Every ${PAYOUT_EVERY} epochs, snapshot the top 3 seats by rent collected since the last payout. Pay up to ${Math.round(PAYOUT_SHARE * 100)}% of the current community balance, split 50 / 30 / 20. If the pool is under $${PAYOUT_MIN}, skip that cycle rather than drain it.`}
            />
            <Gloss
              t="Civic Park jackpot"
              d="Filled by City Levy and Luxury Tax only. Taken entire by whoever lands on Civic Park. Independent of treasury. If you cannot pay a levy, you still fill Park with what you have, then take a lien for the rest."
            />
            <Gloss
              t="Marks"
              d={`${MARKS_PER_GO} on every GO wrap in Epoch City. Earn rate is unchanged. Spend: a bail bond (${BAIL_MARKS} Marks clears up to $${BAIL_CAP} of a lien, or prepays the next shortfall), a join discount on a new city (1 Mark = $1 off, max $${JOIN_DISCOUNT_MAX}, floor $${JOIN_FEE_FLOOR}), and pawn/board cosmetics with no rent effect. Marks never alter printed rent, house cost, or computer policy.`}
            />
          </dl>
          <p>
            Rent skim is civic, not a fine on the landlord. If $100 rent is due and $100 is paid, treasury takes{" "}
            {Math.round(100 * PROTOCOL_TAX)}, then splits that skim 60/40 into ops and community; the owner receives the rest. If only $10 can be paid, the skim is on $10,
            and the $90 shortfall becomes the payer’s lien. The owner is not billed for the missing piece.
          </p>
          <p>
            Each closed epoch writes four tuning metrics: cash minted vs burned, both pool balances, wealth Gini across seats, and unpaid-lien occupancy (how many seats, max streak). Computer City logs them in the feed so the economy can be tuned before any real-money version.
          </p>
          <p>
            Table Circuit has no join fee, no Marks, and no rent skim. GO pays ${GO_SALARY} minus ${GO_UPKEEP} upkeep
            per deed, because a sitting needs cash moving or it never ends.
          </p>
        </Section>

        <Section id="jail" title="17. Jail, liens, persistence">
          <p>
            Epoch City does not eliminate. That is the civic rule. A Crown hotel should hurt. It should not delete you
            from the map and hand your row to nobody.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-fg">Rent or tax shortfall.</strong> Pay what you have. Missing amount
              is added to lien. You are moved to Jail (10). Your deeds stay yours. Later seats this epoch still pay you
              rent (minus skim) if they land on you.
            </li>
            <li>
              <strong className="font-medium text-fg">Go to Jail space.</strong> Jail, no lien. Next epoch you can roll
              out from 10 without doubles.
            </li>
            <li>
              <strong className="font-medium text-fg">Clearing.</strong> At the start of your settlement step, if cash ≥
              lien, the lien is paid in full and you leave jail, then you build and (if you committed roll) you move.
              Partial payments are not taken automatically — you need the whole lien. Salvage before commit is how you
              raise it. Marks buy a bail bond ({BAIL_MARKS} Marks, up to ${BAIL_CAP}) as a second payment option; jail
              entry conditions do not change.
            </li>
            <li>
              <strong className="font-medium text-fg">Amnesty.</strong> If a seat’s lien stays unpaid for {AMNESTY_STREAK} or more consecutive epochs, ops pays {Math.round(AMNESTY_PCT * 100)}% of the remaining lien (or whatever ops can fund). The seat is not deleted. Jail and the lien mechanic stay. Community funds are never used for this.
            </li>
            <li>
              <strong className="font-medium text-fg">Computers.</strong> Same rule. A broke Ada rests. She does not
              freeze your {DEMO_SECONDS}s, and she will not freeze anyone’s {REAL_EPOCH_HOURS} hours.
            </li>
          </ul>
          <p>
            Table Circuit is the opposite on purpose. First bankruptcy ends the sitting. Leftover cash goes to the
            creditor. Remaining pawns ranked by net worth (cash + printed deed prices). Someone wins. That is a match,
            not a city.
          </p>
        </Section>

        <Section id="rent" title="18. Rent math">
          <p>Let B be printed base rent, S = {SET_RENT_MULT} if the owner holds the whole colour row else 1, H the house multiplier.</p>
          <p>
            Property: <code className="text-fg">B × S × H</code>. Transit: 25 × 2^(lines−1). Utility: 4 × dice for one
            plant, then +6× per extra plant on the current square (10× for two, 16× for three, and so on). Dice total is
            the mover’s steps this epoch.
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="bg-bg-subtle text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Houses</th>
                  <th className="px-3 py-2 font-medium">H</th>
                  <th className="px-3 py-2 font-medium">Ivory Lane (set)</th>
                  <th className="px-3 py-2 font-medium">Crown Point (set)</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                {[
                  ["0 unimproved", 1, 32, 400],
                  ["1 house", 3, 96, 1200],
                  ["2 houses", 6, 192, 2400],
                  ["3 houses", 10, 320, 4000],
                  ["4 houses", 16, 512, 6400],
                  ["Hotel", 25, 800, 10000],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-border">
                    <td className="px-3 py-2 text-fg">{row[0]}</td>
                    <td className="px-3 py-2 tabular-nums">×{row[1]}</td>
                    <td className="px-3 py-2 tabular-nums">${row[2]}</td>
                    <td className="px-3 py-2 tabular-nums">${row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Net worth (Epoch) = cash + sum of printed land prices + sum of (houses × house cost). It is a standing, not
            a payout. Table Circuit’s net worth ignores houses because Table 1.0.1 does not build.
          </p>
        </Section>

        <Section id="table" title="19. Table Circuit — the sitting that remains">
          <p>
            Table Circuit is still the full 1v-computers match. Sequential turns. You, then Ada, then Holt, then Vesper.
            Each pawn starts with ${STARTING_CASH}. Passing GO pays ${GO_SALARY}, then charges ${GO_UPKEEP} upkeep per
            deed so cash cannot inflate forever. Colour rows double rent. Transit and utilities match Epoch. Fortune and
            Chance use the named decks (advance to GO, Crown Point, jail, street repairs, and the rest).
          </p>
          <p>
            Jail is the classic hold: pay ${JAIL_FINE}, use a get-out card, or roll doubles. Three doubles in a row
            send you to jail without collecting GO. The match does not end on a round cap. It ends at the first
            bankruptcy. Highest remaining net worth wins.
          </p>
          <p>
            Signed-in players get a cloud save of the active sitting and a short history of finished ones, scoped to
            the account, not the device. Guests may play; they just cannot resume elsewhere. Email and password, Google,
            and X are the sign-in methods. This paper does not change that.
          </p>
        </Section>

        <Section id="numbers" title="20. Economy sheet">
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="bg-bg-subtle text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Table Circuit</th>
                  <th className="px-3 py-2 font-medium">Epoch City (both deployments)</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                <Row a="Opening cash" b={`$${STARTING_CASH}`} c={`$${STARTING_CASH - JOIN_FEE} after join`} />
                <Row a="Join" b="None" c={`$${JOIN_FEE} → 60% ops / 40% community (Marks may cut your fee)`} />
                <Row a="GO" b={`$${GO_SALARY} − $${GO_UPKEEP}/deed`} c={`${MARKS_PER_GO} Marks, no cash`} />
                <Row a="Set rent" b={`${SET_RENT_MULT}× base`} c={`${SET_RENT_MULT}× base, then house curve`} />
                <Row a="Houses" b="Not in 1.0.1" c={`Traits 0–${MAX_HOUSES} · ×${HOUSE_CURVE} · cost ${BUILD_PCT}% (min $40)`} />
                <Row a="Rent tax" b="None" c={`${TAX_PCT}% of rent paid → 60% ops / 40% community`} />
                <Row a="Broke" b="Bankrupt, sitting ends" c="Lien + jail; lots still earn; amnesty after 5 unpaid epochs" />
                <Row a="Jail without lien" b={`Fine $${JAIL_FINE} / card / doubles`} c="Roll out next epoch from 10" />
                <Row a="Time" b="Sequential turns" c={`${REAL_EPOCH_HOURS}h live / ${DEMO_SECONDS}s in Computer City`} />
                <Row a="Computers" b="Think on their turn" c="Seal at epoch open; never delay close" />
                <Row a="Salvage / market" b="—" c={`${SALVAGE_PCT}% buyback now; P2P listings in Live City`} />
                <Row a="Cards" b="Named Fortune / Chance decks" c="+$80 or −$40 swing (Live City may restore the decks)" />
                <Row a="Growth" b="—" c={`+1 seat / ${TIER_EPOCH} epochs; Lantern + Beacon after ${LAND_EPOCH} (Live). Computer City may preview through ${MAX_EPOCH}.`} />
                <Row a="Community payout" b="—" c={`Every ${PAYOUT_EVERY} epochs, 25% of community to top 3 rent collectors (50/30/20), skipped under $${PAYOUT_MIN}`} />
                <Row a="Marks spend" b="—" c={`Bail ${BAIL_MARKS} Mk / $${BAIL_CAP}; join discount; cosmetics`} />
                <Row a="SITZ" b="—" c={`Live testnet only. ${Math.round(TOKEN_TAX * 100)}% buy and sell. Never rent.`} />
                <Row a="Deed yield" b="—" c={`${Math.round(TOKEN_YIELD_SHARE * 100)}% of token tax drips to minted NFTs each epoch, weighted by houses`} />
                <Row a="NFT listing fee" b="—" c={`${Math.round(TOKEN_LISTING_FEE * 1000) / 10}% of sale cash → 60% ops / 40% community`} />
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="catalogue" title="21. Lot catalogue">
          <p>
            Printed prices and base rents. House cost uses the {BUILD_PCT}% rule with a $40 floor. Token id is SZ-XX
            for every purchasable row. Corners, cards, and taxes do not mint. SZ-40–SZ-43 (Lantern row and Beacon Grid)
            stay locked until epoch {LAND_EPOCH}. Computer City may preview further designed squares through epoch {MAX_EPOCH};
            those extra lots are not Live City protocol.
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="bg-bg-subtle text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Id</th>
                  <th className="px-3 py-2 font-medium">Space</th>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Base rent</th>
                  <th className="px-3 py-2 font-medium">House</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                {[...CIRCUIT_SPACES, ...districtSpaces(1)].map((space) => {
                  const purchasable = space.kind === "property" || space.kind === "transit" || space.kind === "utility";
                  const row = space.group ? GROUP_LABEL[space.group] : space.kind;
                  const canHouse = space.kind === "property";
                  return (
                    <tr key={space.id} className="border-t border-border">
                      <td className="px-3 py-2 tabular-nums text-fg">{purchasable ? `SZ-${String(space.id).padStart(2, "0")}` : space.id}</td>
                      <td className="px-3 py-2 text-fg">{space.name}</td>
                      <td className="px-3 py-2">{row}</td>
                      <td className="px-3 py-2 tabular-nums">{space.price != null ? `$${space.price}` : space.tax != null ? `tax $${space.tax}` : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{space.rent != null ? `$${space.rent}` : space.kind === "utility" ? "dice" : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{canHouse ? `$${houseCost(space.id)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="roadmap" title="22. What ships today, what follows">
          <h3 className="font-display text-lg font-medium text-fg">In this build</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>Table Circuit 1.0.1 — sequential, bankruptcy ending, net-worth ranking, signed-in saves.</li>
            <li>
              Computer City — {DEMO_SECONDS}s epochs, computers seal at open, land NFTs, houses as traits, salvage
              bundle, join fee, Marks, {TAX_PCT}% rent skim, jail+lien, no elimination.
            </li>
            <li>This litepaper, in the app, next to the board.</li>
          </ul>
          <h3 className="font-display text-lg font-medium text-fg">Live City (upcoming, intended)</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>{REAL_EPOCH_HOURS}-hour windows on a persistent instance.</li>
            <li>Many human seats. Computers still fill at T+0 and never delay close.</li>
            <li>Sealed intents until settlement. Claims instead of auto-buy. Offers reviewed next epoch.</li>
            <li>Marketplace listings of one deed NFT (land + houses).</li>
            <li>Account-scoped persistence for the city, the way Table already saves a sitting.</li>
            <li>Marks as season standing. The epoch-10 seat and epoch-100 district already exist in Computer City.</li>
            <li>Named Fortune / Chance decks under a committed draw, if the simplified swing is retired.</li>
            <li>
              Testnet ledger on Stacks: STX cash, SIP-009 deeds, house upgrades as trait transactions, SITZ
              with buy/sell tax. Token does not pay rent. See §23.
            </li>
          </ul>
          <p>
            None of those items change the loop you can play today. If Live City ever disagrees with this paper, the
            paper should move — not the meaning in §2.
          </p>
        </Section>

        <Section id="ledger" title="23. Live City ledger — testnet economy">
          <p>
            This section is how Computer City becomes a real city without rewriting the board. Cash still buys land,
            pays rent, and builds houses. Marks still do not pay rent. SITZ is a backing layer: people
            who trade it fund people who play, and every minted deed earns a drip of that token. If those two jobs get
            mixed, a dump freezes the table.
          </p>

          <h3 className="font-display text-lg font-medium text-fg">23.1 Patient chain</h3>
          <p>
            Live City epochs are {REAL_EPOCH_HOURS} hours. That is a patient clock. The intended host is Stacks, a
            Bitcoin layer: SIP-009 deeds, SIP-010 SITZ, STX as cash and as civic tax. Block time does not need
            to be a casino. House builds, claims, and listings are a few transactions per seat per epoch, not a
            per-second book. Testnet first. Computer City stays off-chain and playable without a wallet.
          </p>

          <h3 className="font-display text-lg font-medium text-fg">23.2 Three layers, never mixed</h3>
          <dl className="space-y-3">
            <Gloss
              t="Cash (STX)"
              d={`Printed board units settle in STX. Join ${LIVE_JOIN_STX} STX on testnet ($50 of STX on mainnet). Land, houses, rent, liens, salvage, Civic Park. Civic tax (join, ${TAX_PCT}% rent skim, ${Math.round(TOKEN_LISTING_FEE * 1000) / 10}% listing) is STX, split 60% ops / 40% community.`}
            />
            <Gloss
              t="Marks"
              d={`${MARKS_PER_GO} per GO wrap. Bail, join discount, cosmetics. Standing, not money. Not on the DEX.`}
            />
            <Gloss
              t="SITZ"
              d={`Backing and yield. ${Math.round(TOKEN_TAX * 100)}% buy and ${Math.round(TOKEN_TAX * 100)}% sell. Deed holders earn it. It never pays rent, never changes house cost, never changes printed prices, and never sits in the computer policy.`}
            />
          </dl>

          <h3 className="font-display text-lg font-medium text-fg">23.3 Deeds and houses on-chain</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-fg">Mint.</strong> Unowned lot stays unowned until the lander claims
              next epoch and pays the printed cash price. That transaction mints SIP-009 <code className="text-fg">SZ-XX</code>{" "}
              to their seat. Nothing auto-mints.
            </li>
            <li>
              <strong className="font-medium text-fg">Upgrade.</strong> A house is not a second NFT. It is a trait on
              the deed. Building calls one transaction: cash house cost (unchanged, {BUILD_PCT}% of printed, min $40),
              full colour row required, <code className="text-fg">houses</code> increments 1…{MAX_HOUSES}. Hotel is
              houses = {MAX_HOUSES}. Gas is extra; there is no extra Circuit fee to build, so house costs stay as
              written.
            </li>
            <li>
              <strong className="font-medium text-fg">Transfer.</strong> Sale, listing, or accept-offer moves the one
              NFT. Houses travel. Yield weight travels. There is no “keep the hotel, sell the dirt.”
            </li>
            <li>
              <strong className="font-medium text-fg">Listing fee.</strong> {Math.round(TOKEN_LISTING_FEE * 1000) / 10}% of
              the cash sale goes to treasury (60% ops / 40% community). Salvage stays the {SALVAGE_PCT}% city buyback.
            </li>
          </ul>

          <h3 className="font-display text-lg font-medium text-fg">23.4 Token tax — buy and sell</h3>
          <p>
            Every Circuit transfer, including the canonical swap, takes {Math.round(TOKEN_TAX * 100)}%. Same rate both
            ways so there is no “cheap to buy, expensive to leave” trap. Of that tax:
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="bg-bg-subtle text-[10px] tracking-[0.14em] text-fg-subtle uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Share of the {Math.round(TOKEN_TAX * 100)}%</th>
                  <th className="px-3 py-2 font-medium">Goes to</th>
                  <th className="px-3 py-2 font-medium">Job</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                <Row a={`${Math.round(TOKEN_YIELD_SHARE * 100)}%`} b="Deed yield vault" c="Drips to minted NFTs each epoch" />
                <Row a={`${Math.round(TOKEN_OPS_SHARE * 100)}%`} b="Ops" c="Team. Not Ada’s pocket. Not amnesty (amnesty is cash)." />
                <Row a={`${Math.round(TOKEN_COMMUNITY_SHARE * 100)}%`} b="Community" c={`Same ${PAYOUT_EVERY}-epoch top-3 rent snapshot, paid in token`} />
                <Row a={`${Math.round(TOKEN_BURN_SHARE * 100)}%`} b="Burn" c="Permanent sink so volume has a cost" />
              </tbody>
            </table>
          </div>
          <p>
            Holding Circuit alone does not earn. Staking the token for more token is refused. Yield is for minted
            deeds — traders who want the drip have to play or buy land. That is how the city stays a game.
          </p>

          <h3 className="font-display text-lg font-medium text-fg">23.5 How every NFT keeps earning</h3>
          <p>
            At epoch close the yield vault pays what it collected this window, if the vault is at least {TOKEN_YIELD_MIN}{" "}
            units. Under that, skip — same idea as the ${PAYOUT_MIN} community floor. Unowned lots do not earn. A deed
            starts earning the epoch after it mints.
          </p>
          <p>Weight is the house curve already on the board, so building is double-useful (rent + drip) without changing rent math:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Colour lot: ×{HOUSE_MULT.join(" / ")} for houses 0–{MAX_HOUSES}.</li>
            <li>Transit or utility: ×2 (they cannot take houses).</li>
          </ul>
          <p>
            Share = vault × (your weight / city weight). Paid in Circuit to the current owner at close. If you sell
            mid-epoch, the buyer receives that close. No retroactive drip.
          </p>

          <h3 className="font-display text-lg font-medium text-fg">23.6 Who gets paid, and why they stay</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-fg">Players.</strong> Skill still prints cash rent. Holding a deed
              also drips Circuit even on quiet epochs when nobody lands. Improving a row raises both curves. Top rent
              collectors still take the {PAYOUT_EVERY}-epoch community cut, now in cash and in token.
            </li>
            <li>
              <strong className="font-medium text-fg">Team.</strong> Ops still takes 60% of join and rent skim (cash)
              plus {Math.round(TOKEN_OPS_SHARE * 100)}% of token tax. Amnesty still comes from cash ops, never from the
              yield vault.
            </li>
            <li>
              <strong className="font-medium text-fg">Everyone earning.</strong> The only honest source is volume plus
              play: buy/sell tax, listings, join, rent skim. There is no emission mint “to keep APY green.” If volume
              dies, drip dies. That is the point. A city that prints token to hide a dead table is not a city.
            </li>
          </ul>

          <h3 className="font-display text-lg font-medium text-fg">23.7 Supply and testnet</h3>
          <p>
            Circuit is a fixed supply. Testnet mints a test allocation into the swap, ops, and a small play faucet —
            not a public airdrop hunt. Mainnet numbers (cap, vest, liquidity) are not this paper and not this build.
            Testnet epochs may run faster than {REAL_EPOCH_HOURS} hours so the loops can be felt; the live clock stays{" "}
            {REAL_EPOCH_HOURS} hours.
          </p>
          <p>
            Testnet first. Civic tax is STX. Join is {LIVE_JOIN_STX} STX on testnet and $50 of STX on mainnet. A new
            colour row plus utility opens every {LIVE_HUMANS_PER_DISTRICT} seated humans — not every {LAND_EPOCH} epochs.
            Computers still seal at T+0, still pay tax, still hold deeds, still collect drip. They are not the house
            account. Difficulty remains Computer City flavour only.
          </p>

          <Callout>
            Cash pays the board. Circuit pays the people who hold the board. Marks are standing. Mix those three and
            the city becomes a ticker with dice.
          </Callout>
        </Section>

        <Section id="nongoals" title="24. Non-goals and risks">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-fg">No sequential six-hour computer turns.</strong> That was the
              original trap. It will not come back.
            </li>
            <li>
              <strong className="font-medium text-fg">No detachable house tokens after attach.</strong> Scarcity of
              improvements is real; a second inventory is not.
            </li>
            <li>
              <strong className="font-medium text-fg">No elimination in Epoch City.</strong> A hotel is allowed to
              bankrupt a sitting at the Table. It is not allowed to delete a citizen from the city.
            </li>
            <li>
              <strong className="font-medium text-fg">No rent-paying coin.</strong> Cash is cash. Marks are marks.
              Treasury is civic. Circuit is backing and deed yield. Circuit does not pay rent, does not change house
              cost, and does not rewrite printed prices. Mixing them would let a ticker own the board.
            </li>
            <li>
              <strong className="font-medium text-fg">No token-only staking.</strong> Holding Circuit does not earn
              Circuit. Yield is for minted deeds. An emissions APY to “keep everyone earning” is refused.
            </li>
            <li>
              <strong className="font-medium text-fg">No claim that a chain is required to play Computer City.</strong>{" "}
              Computer City is the game. The Stacks testnet is a host for Live City.
            </li>
            <li>
              <strong className="font-medium text-fg">Known tension: seat order.</strong> First seat moves first, so
              later seats can land on land minted the same epoch. We accept that over last-mover dice. Live City must
              publish seat order at join.
            </li>
            <li>
              <strong className="font-medium text-fg">Known tension: claim delay.</strong> Landing never auto-mints.
              You decide next epoch. That is slower than a sitting, and it is the Live City rule Computer City is
              rehearsing.
            </li>
            <li>
              <strong className="font-medium text-fg">Known tension: card swing.</strong> Epoch’s +80/−40 is a
              settlement convenience. It is weaker flavour than Table’s decks. Live City may restore the decks with a
              committed seed.
            </li>
          </ul>
        </Section>

        <Section id="glossary" title="25. Glossary">
          <dl className="space-y-3">
            <Gloss t="Computer City" d="The playable in-app Epoch City. Short window. Fresh instance. Computers included." />
            <Gloss t="Live City" d={`The upcoming persistent Epoch City. ${REAL_EPOCH_HOURS}-hour window. Many humans. Same objects. Testnet host: Stacks.`} />
            <Gloss t="Table Circuit" d="Sequential 1v-computers sitting. Ends on first bankruptcy. Not the city." />
            <Gloss t="Epoch" d="One simultaneous window. Open, then settle, then open again." />
            <Gloss t="Intent" d="A seat’s sealed action for the epoch: roll, rest, dice, claim, offer answers, queued houses." />
            <Gloss t="Deed / land NFT" d="SZ-XX. One per lot. Houses are fields on it. SIP-009 on Live City testnet." />
            <Gloss t="House / hotel" d={`Attached upgrade. Hotel is houses = ${MAX_HOUSES}. Travels with the deed. Written by a transaction on testnet.`} />
            <Gloss t="Marks" d={`${MARKS_PER_GO} per GO wrap. Spend on bail, join discount, or cosmetics. Never rent.`} />
            <Gloss t="Treasury" d={`Civic pool from join fees and the ${TAX_PCT}% rent skim, split 60% ops / 40% community.`} />
            <Gloss t="Ops pool" d="Team share of treasury. Funds lien amnesty. Also takes a cut of Circuit tax." />
            <Gloss t="Community pool" d={`Player share of treasury. 25% payout to top rent collectors every ${PAYOUT_EVERY} epochs.`} />
            <Gloss t="SITZ" d={`${Math.round(TOKEN_TAX * 100)}% buy and sell. Deed yield, ops, community, burn. Never pays rent.`} />
            <Gloss t="Deed yield" d={`Epoch drip of Circuit to minted NFTs, weighted by the house curve. Skip if the vault is under ${TOKEN_YIELD_MIN}.`} />
            <Gloss t="Civic Park" d="Separate jackpot from levies. Taken on landing." />
            <Gloss t="Lien" d="Unpaid remainder. Holds you in jail. Does not strip lots. Amnesty after five unpaid epochs." />
            <Gloss t="Salvage" d={`${SALVAGE_PCT}% buyback of land + house cost. Lot returns to unowned.`} />
            <Gloss t="Seat order" d="Join order. Settlement order. Computers do not jump the queue and do not hold it." />
            <Gloss t="Ada, Holt, Vesper" d="The computer tycoons. Rust, steel, pine. Citizens of the epoch." />
          </dl>
        </Section>

        <div className="mt-12 flex flex-col items-start gap-3 border-t border-border pt-8">
          <p className="font-display text-2xl font-medium tracking-tight">The city is the clock</p>
          <p className="max-w-md text-sm text-fg-muted">
            Computer City is on the start screen — computers are ready before you are. Table Circuit is still there if
            you want a sitting with a winner. Live City is this paper with the timer turned to {REAL_EPOCH_HOURS} hours
            and, on testnet, the same objects hosted on Stacks.
          </p>
          <Button asChild>
            <Link to="/">Play Sitizen</Link>
          </Button>
        </div>
      </article>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mt-12 space-y-4 text-base leading-relaxed text-fg-muted">
      <h2 className="font-display text-2xl font-medium tracking-tight text-fg">{title}</h2>
      {children}
    </section>
  );
}

function ModeCard({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4">
      <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{kicker}</p>
      <p className="mt-1 font-display text-lg text-fg">{title}</p>
      <p className="mt-2 text-sm text-fg-muted">{body}</p>
    </div>
  );
}

function NowLater({
  nowTitle,
  now,
  laterTitle,
  later,
}: {
  nowTitle: string;
  now: ReactNode;
  laterTitle: string;
  later: ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4 text-sm">
        <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{nowTitle}</p>
        <div className="mt-2 space-y-2 text-fg-muted">{now}</div>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-bg-elevated p-4 text-sm">
        <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{laterTitle}</p>
        <div className="mt-2 space-y-2 text-fg-muted">{later}</div>
      </div>
    </div>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] border border-border bg-bg-subtle px-4 py-3 text-sm text-fg">{children}</p>
  );
}

function Row({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-fg">{a}</td>
      <td className="px-3 py-2">{b}</td>
      <td className="px-3 py-2">{c}</td>
    </tr>
  );
}

function Gloss({ t, d }: { t: string; d: string }) {
  return (
    <div>
      <dt className="font-medium text-fg">{t}</dt>
      <dd className="text-sm">{d}</dd>
    </div>
  );
}
