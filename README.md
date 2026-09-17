# Sitizen

A persistent property city. You sit. The city keeps.

| Layer | Name |
| --- | --- |
| Product | Sitizen |
| Token | **SITZ** — SIP-010. Never pays rent. |
| Points | **Marks** — 15 per GO. Bail, join discount, cosmetics. Not on the DEX. |
| Cash / civic tax | **STX** — join, rent skim, listing fee |
| Deeds | **SZ-01**, SZ-02, … SIP-009. Houses 0–5 on the NFT. |
| First table | Founders Square |

## Computer City vs Live City

**Computer City** (`/`) is the off-chain preview. One human, Ada / Holt / Vesper. Easy/Hard and 5000-epoch tables stay here. Join in this preview is in-game cash, not 50 STX. No wallet.

**Live City** (`/live`) is Stacks. Testnet now, same contracts on mainnet later. Join is **50 STX** on testnet. Connect Leather or Xverse. Civic tax is STX. A new colour row + utility opens every **8 seated humans**.

**Table Circuit** is the classic sitting with a winner.

## SITZ vs Marks vs STX

Do not mix these three.

| | Pays rent? | On a DEX? | What it is |
|---|---|---|---|
| **STX** | Yes (cash) | Yes | Join, land, houses, rent, liens, 5% skim, listing. **Civic tax.** |
| **Marks** | No | No | Standing. 15 per GO wrap |
| **SITZ** | No | Yes | Backing token. 5% buy/sell tax. Deed drip only. **Token tax.** |

Civic tax (STX) and token tax (SITZ) are two layers. They never mix. SITZ never pays rent and never changes house cost.

## Testnet vs mainnet

Set `NEXT_PUBLIC_STACKS_NETWORK=testnet` or `mainnet` (Vercel env, or `.env.local`). Default is testnet.

| | Testnet | Mainnet |
|---|---|---|
| Join | 50 STX | $50 of STX (TWAP + floor/ceiling, posted) |
| SIP `impl-trait` | omit | uncomment official principals |
| Faucet mint on SITZ | deployer-gated | off |
| Contracts | `NEXT_PUBLIC_CITY_CONTRACT` etc. | different IDs, different ops principal |

Copy `settings/Testnet.toml.example` → `settings/Testnet.toml` on your machine only. Never commit it.

## Deploy Live City (testnet)

Do this on **your** computer. Never paste Leather 24 words, Hiro keys, or Vercel tokens into Grok or git.

1. Copy `settings/Testnet.toml.example` to `settings/Testnet.toml`. Paste the **deployer** 24 words there only. Use a different Leather account for ops and a third for play.
2. From the repo root:

```
clarinet deployments generate --testnet
clarinet deployments apply --testnet
```

3. Copy the four contract IDs (`sitizen-city`, `sz-deed`, `circuit-token`, `stx-treasury`) into the **Vercel dashboard** env (Production + Preview):

```
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_CITY_CONTRACT=ST....sitizen-city
NEXT_PUBLIC_DEED_CONTRACT=ST....sz-deed
NEXT_PUBLIC_TOKEN_CONTRACT=ST....circuit-token
NEXT_PUBLIC_TREASURY_CONTRACT=ST....stx-treasury
NEXT_PUBLIC_OPS_ADDRESS=ST....
```

After deploy, the deployer must call `set-city-contract` on treasury, deed, and token, pointing at `sitizen-city`, and `set-deed-contract` on treasury pointing at `sz-deed`.

4. Push the `sitizen` repo to GitHub (**no** `Testnet.toml`, **no** `.env.local`). In Vercel: Import Git Repository → that repo.

Then open `/live`, connect Leather (Testnet), join 50 STX, confirm the tx on the explorer, and human-count reads 1.

Faucet: [https://explorer.hiro.so/sandbox/faucet?chain=testnet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Sitizen preview (Computer City + `/live`) |
| `npm run check` | `clarinet check` |
| `npm run test:contracts` | Clarinet tests (empty until Phase 2) |
| `npm test` | Workspace tests |

Frontend is this Vite / TanStack app (required for the in-browser preview). It already reads `NEXT_PUBLIC_STACKS_NETWORK` so a later Vercel deploy is a config flip, not a rewrite. Do not add a second Next.js app beside it.

Phase 1 has **no Clarity contracts**. `npm run check` must pass on the empty project.

Phase 2: `contracts/stx-treasury.clar` — join 50 STX, 60% ops / 40% community. `npm run test:contracts`.
Phase 3: `contracts/sz-deed.clar` — SIP-009 SZ-XX, houses 0-5 on the deed. No `impl-trait` on testnet.
Phase 4: `contracts/circuit-token.clar` — SITZ. 5% tax → 40% vault / 25% ops SITZ / 20% community SITZ / 15% burn. `drip` by HOUSE_MULT. Faucet is deployer-only and dies on mainnet.
Phase 5: `contracts/sitizen-city.clar` — Founders Square 40 spaces. Districts at 8/16/24 humans. Epoch: humans commit or timer; bots cannot block close. Rent skim 5% STX.
Phase 6: `/live` Leather/Xverse. Join 50 STX with post-conditions. Board from contract reads.
