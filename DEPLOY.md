# Sitizen — put Live City on Stacks testnet

Repo: https://github.com/oak2005/sitizen

You already finished **Step 1 (Leather)** and **Step 2 (faucet)**. This file is only **Step 3** and **Step 4**, written for someone who has not used Git or Clarinet before.

**Never paste 24 words into Grok, Discord, email, or GitHub.** If you already did, that wallet is burned. Make a new Deployer.

---

## What these two steps do (plain English)

Sitizen’s *website* is just a window.

The *city* (join, deeds, rent) lives in **smart contracts** on Stacks testnet.

| Step | You do this | Result |
| --- | --- | --- |
| 3 | Put the **Deployer** 24 words in a file that Git is told to ignore | Clarinet can sign the deploy. GitHub never sees the words. |
| 4 | Run two commands, then click four “set contract” buttons | The four contracts exist on testnet and know about each other. |

You need a computer (Windows or Mac), not only a phone.

---

## Step 3 — secret file on *your* computer

### 3.1 Download the code (pick one way)

**Way A — GitHub website (easiest)**

1. Open [https://github.com/oak2005/sitizen](https://github.com/oak2005/sitizen)
2. Green **Code** button → **Download ZIP**
3. Unzip. You get a folder named `sitizen-main`. Rename it `sitizen` if you want.
4. Remember where it lives, e.g. `Documents/sitizen`

**Way B — GitHub Desktop**

1. Install [GitHub Desktop](https://desktop.github.com)
2. File → Clone repository → URL `https://github.com/oak2005/sitizen.git`
3. Choose a folder, Clone

You do **not** need to “commit” anything for Step 3–4.

### 3.2 Find the example file

Inside the `sitizen` folder open `settings`.

You should see:

- `Devnet.toml` — fake practice keys. **Do not use these on testnet.**
- `Testnet.toml.example` — the template you will copy

### 3.3 Make the real file

1. **Copy** `Testnet.toml.example`
2. **Paste** it in the same `settings` folder
3. **Rename** the copy to exactly `Testnet.toml`  
   (not `Testnet.toml.txt`, not `Testnet.toml.example`)

Windows hides extensions. If you are not sure:

1. In File Explorer: View → Show → File name extensions
2. The name must be `Testnet.toml` with nothing after

### 3.4 Paste only the Deployer 24 words

1. Open `settings/Testnet.toml` with Notepad (Windows) or TextEdit (Mac, Format → Make Plain Text)
2. Find this line:

```
mnemonic = "<PASTE 24 WORDS LOCALLY — NEVER COMMIT Testnet.toml>"
```

3. In Leather: switch to the **Deployer** account → backup / secret key / 24 words (the same words you wrote on paper in Step 1)
4. Replace the placeholder so it looks like this (example shape only — use *your* words):

```
mnemonic = "word1 word2 word3 ... word24"
```

Rules:

- One space between words
- All 24 words, lowercase
- Keep the quotes `"`
- Do not add a comma
- **Ops** and **Player** words do **not** go in this file

5. Save. Close the file.

### 3.5 Prove Git will not upload it

This repo already lists `settings/Testnet.toml` in `.gitignore`. That means GitHub Desktop / `git add` skip it.

Still check:

- Never drag `Testnet.toml` into a GitHub “Add file” upload
- Never email the file
- Never screenshot the words

If GitHub Desktop shows `settings/Testnet.toml` as a changed file you are about to commit, **stop**. Something is wrong. Ask before continuing.

---

## Step 4 — deploy the four contracts, then wire them

You will install **Clarinet** (Stacks’ tool that talks to testnet), then run two commands from the `sitizen` folder.

### 4.1 Install Clarinet

**Mac**

1. Install Homebrew if you do not have it: [https://brew.sh](https://brew.sh)
2. Terminal:

```bash
brew install clarinet
clarinet --version
```

You want version 3 or newer.

**Windows**

1. Open [Clarinet releases](https://github.com/stacks-network/clarinet/releases)
2. Download the Windows file (`clarinet-windows-x64.msi` or the `.zip`)
3. Install / unzip
4. Open **PowerShell** and run `clarinet --version`

If PowerShell says “not recognized”, the install folder is not on PATH. Re-open PowerShell after install, or drag `clarinet.exe` into the window, space, then `--version`.

### 4.2 Open a terminal *inside* the sitizen folder

**Mac:** right-click the `sitizen` folder → New Terminal at Folder  
**Windows:** File Explorer → click into `sitizen` → in the address bar type `powershell` → Enter

You should see the folder path in the prompt. Then:

```bash
ls contracts
```

You must see `sitizen-city.clar`, `sz-deed.clar`, `circuit-token.clar`, `stx-treasury.clar`. If not, you are in the wrong folder.

### 4.3 Generate the deployment plan

```bash
clarinet deployments generate --testnet
```

What this does: writes a plan of “create these four contracts on testnet.” It does **not** spend STX yet.

If it asks about `settings/Testnet.toml` / accounts, that is expected. It is reading the Deployer words you pasted.

**If it errors “mnemonic” / “no accounts”:** Step 3 file name or quotes are wrong. Go back.

**If it errors “network”:** you are not in the project folder.

### 4.4 Apply (this is the real deploy)

Deployer needs a little testnet STX for fees (Step 2 faucet on the **Deployer** address). Then:

```bash
clarinet deployments apply --testnet
```

Confirm if it asks. Leather is not needed here — Clarinet signs with the words in `Testnet.toml`.

Wait. Success looks like four contracts created, each with an ID:

```
STXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.stx-treasury
STXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.sz-deed
STXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.circuit-token
STXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.sitizen-city
```

The `ST…` part is your **Deployer address**. The part after the dot is the contract name.

Copy all four lines into a note on your computer.

You can also find them later: [https://explorer.hiro.so/?chain=testnet](https://explorer.hiro.so/?chain=testnet) → paste the Deployer `ST…` address → **Contracts**.

### 4.5 Wire them (four clicks — easy to skip, city will not work if you skip)

Right now treasury, deed, and token do not know who “the city” is. You tell them once. **Wrong ID cannot be undone.** Check the paste twice.

Use **Leather = Deployer** (the same account that deployed). Network = **Testnet**.

Open [Hiro explorer sandbox — contract call](https://explorer.hiro.so/sandbox/contract-call?chain=testnet)

For each row below:

1. Contract address = the `ST…` **before** the dot  
2. Contract name = the part **after** the dot  
3. Function = the name in the table  
4. Argument = the full `ST….sitizen-city` or `ST….sz-deed` as a **principal**
5. Connect Leather (Deployer) → Call contract → Confirm

| # | Open this contract | Function | Argument (principal) |
| --- | --- | --- | --- |
| 1 | `stx-treasury` | `set-city-contract` | `ST….sitizen-city` |
| 2 | `sz-deed` | `set-city-contract` | `ST….sitizen-city` |
| 3 | `circuit-token` | `set-city-contract` | `ST….sitizen-city` |
| 4 | `stx-treasury` | `set-deed-contract` | `ST….sz-deed` |

If it says `ERR-CITY-SET` (u103 / u203 / u303): that one is already set. Do not keep trying.

If it says not owner: Leather is on Player or Ops. Switch to Deployer.

### 4.6 What you take to Vercel (Step 5)

Paste these into Vercel **Environment Variables** (Production and Preview). They are public on-chain. They are **not** secrets. Still never paste 24 words there.

```
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_CITY_CONTRACT=ST....sitizen-city
NEXT_PUBLIC_DEED_CONTRACT=ST....sz-deed
NEXT_PUBLIC_TOKEN_CONTRACT=ST....circuit-token
NEXT_PUBLIC_TREASURY_CONTRACT=ST....stx-treasury
NEXT_PUBLIC_OPS_ADDRESS=ST....   ← your Ops account address, no .contract
```

Then deploy the GitHub repo on Vercel. Open the site, **Connect wallet** (Player, Testnet), **Join · 50 STX**.

---

## If something fails

| You see | Meaning | Fix |
| --- | --- | --- |
| `Testnet.toml` not found | File name or folder | Must be `sitizen/settings/Testnet.toml` |
| insufficient funds | Deployer has no testnet STX | Faucet the **Deployer** address |
| Join greyed out | Vercel missing contract IDs, or not connected | Env + redeploy; Leather Testnet + Player |
| “not a testnet address” | Leather is on Mainnet | Leather network menu → Testnet |
| human-count stays — | Site cannot read contracts | IDs typo, or wiring (4.5) skipped |

---

## Security (do this, always)

- Deployer ≠ Ops ≠ Player
- `settings/Testnet.toml` never goes to GitHub
- This website never asks for 24 words. If a popup does, it is not Sitizen — close it
- Join uses a **post-condition**: Leather must show you sending **exactly 50 STX**. If it shows more, reject
- Testnet STX is fake. Mainnet is real money — this app is locked to testnet
