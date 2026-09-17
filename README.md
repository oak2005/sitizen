# Sitizen

A persistent property city on **Stacks testnet**. You sit. The city keeps.

Sign in = connect **Leather** or **Xverse**. No email. No password.

| Layer | Name |
| --- | --- |
| Product | Sitizen |
| Token | **SITZ** — SIP-010. Never pays rent. |
| Cash / civic tax | **STX** — join 50 STX, rent skim, listing fee |
| Deeds | **SZ-01**, SZ-02, … SIP-009. Houses 0–5 on the NFT. |
| Table | Founders Square |

Repo: [https://github.com/oak2005/sitizen](https://github.com/oak2005/sitizen)

**How to deploy (newbie walkthrough):** [DEPLOY.md](./DEPLOY.md)

## Testnet only

This app is locked to Stacks **testnet**. Join is 50 STX. Civic tax is STX. SITZ never pays rent.

Copy `settings/Testnet.toml.example` → `settings/Testnet.toml` on your machine only. Never commit it. Never paste 24 words into chat or GitHub.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Sitizen Live City on http://localhost:8080 |
| `npm run check` | `clarinet check` |
| `npm run test:contracts` | Clarinet tests |

## Contracts

- `stx-treasury` — join 50 STX, 60% ops / 40% community
- `sz-deed` — SIP-009 SZ-XX, houses 0–5
- `circuit-token` — SITZ, 5% tax
- `sitizen-city` — epochs, districts at 8 humans, claim, rent skim
