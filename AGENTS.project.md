# Sitizen

Product is Sitizen. Never call it Monopoly. Never call it Grand Circuit.

- Token: **SITZ** (SIP-010). Never pays rent. Never changes house cost or printed prices.
- Deeds: **SZ-XX** (SIP-009). Houses are a uint trait 0–5 on that NFT.
- Modes: Computer City (off-chain preview) · Live City (Stacks) · Table Circuit
- First table: Founders Square
- Join: 50 STX on testnet. Mainnet join is $50 of STX (TWAP + floor/ceiling).
- Civic tax (join, 5% rent skim, 2.5% listing) in STX, split 60% ops / 40% community at collection.
- New district every 8 seated humans. Computers fill chairs at T+0; they do not count.
- SITZ tax: 5% buy and 5% sell → 40% yield / 25% ops / 20% community / 15% burn.

## Secrets — never commit, never paste into chat

- Leather 24 words
- `settings/Testnet.toml` / `settings/Mainnet.toml`
- `.env*.local`
- Hiro API key, Vercel tokens, GitHub PATs

Deployer ≠ ops ≠ player. Three different principals.

## Traits

Testnet: omit SIP-009 / SIP-010 `impl-trait`.
Mainnet: uncomment official trait principals.

## Network

`NEXT_PUBLIC_STACKS_NETWORK=testnet | mainnet` (also accepted: `VITE_STACKS_NETWORK`).
Contract IDs in env, not scattered literals.

## Phases

Phase 1: skeleton only — no game contracts.
Phase 2: `contracts/stx-treasury.clar` (join 50 STX, 60/40, amnesty from ops, community payout).
Phase 3: `contracts/sz-deed.clar` SIP-009, houses 0-5, no impl-trait on testnet.
Phase 4: `contracts/circuit-token.clar` SITZ SIP-010. Civic tax = STX. Token tax = SITZ. Never mixed.
Phase 5: `contracts/sitizen-city.clar` — 50 STX join, 8 humans per district, epoch close ignores bots.
Phase 6: `/live` Leather/Xverse, join 50 STX post-conditions, env contract IDs. No seeds in git.
