# B20 · Base Token Creator & Manager

A no-code studio to **create** and **manage** gas-optimized ERC-20 tokens on the
**Base** chain. Connect a wallet, configure a token (basic or advanced), deploy it
in one transaction, then control everything live from an owner dashboard — taxes,
limits, minting, blacklists, ownership, airdrops and more. Fully BaseScan-verifiable.

```
BaseB20/
├─ contracts/     # Hardhat + Solidity (the B20Token contract)
└─ web/           # Vite + React + TypeScript + wagmi frontend
```

---

## Features

**Create (no code):**
- Name, symbol, supply, decimals, on-chain logo URL
- Buy / sell tax + burn-on-transfer (combined tax hard-capped at **25%** on-chain)
- Optional minting with a permanent hard cap
- Anti-whale limits: max transaction & max wallet
- The full supply is minted to you; you become the owner

**Manage (live dashboard):**
- Buy/sell/burn tax **sliders** (25% ceiling enforced in the contract)
- Change the tax collector wallet
- Mint tokens, or **disable minting forever**
- Enable trading (one-way launch gate) + emergency **pause**
- Register DEX pairs so buy/sell tax applies to trades
- **Blacklist** bots/scammers; strict **whitelist** mode
- Toggle & retune anti-whale limits
- **Batch airdrop** to many wallets in one transaction
- **Rescue** foreign tokens / ETH stuck in the contract
- 2-step **ownership transfer** or **renounce**

---

## Quick start

### 1. Contract

```bash
cd contracts
npm install
npm run build      # compiles + exports ABI/bytecode into web/src/contracts
```

`npm run build` writes `web/src/contracts/B20Token.json` (already generated). Re-run
it whenever you change the Solidity.

### 2. Web app

```bash
cd web
npm install
cp .env.example .env   # optional: add a WalletConnect project id
npm run dev            # http://localhost:5173
```

Build for production with `npm run build` (output in `web/dist`).

---

## Networks

| Network       | Chain ID | RPC                        | Explorer                       |
| ------------- | -------- | -------------------------- | ------------------------------ |
| Base mainnet  | `8453`   | https://mainnet.base.org   | https://basescan.org           |
| Base Sepolia  | `84532`  | https://sepolia.base.org   | https://sepolia.basescan.org   |

**Always rehearse on Base Sepolia first.** Get test ETH from a Base Sepolia faucet.

---

## Deploying & verifying

You deploy straight from the browser (the app signs a contract-creation tx with your
wallet). After a deploy, the success dialog shows the exact `arguments.js` and the
one-line command to verify the source on BaseScan:

```bash
cd contracts
export BASESCAN_API_KEY=your_key   # an Etherscan V2 key works for BaseScan
# save the arguments.js shown in the app, then:
npx hardhat verify --network base --constructor-args arguments.js <TOKEN_ADDRESS>
```

You can also deploy from the CLI with your own script if you prefer; the config in
`hardhat.config.js` already targets `base` and `baseSepolia`.

---

## A note on Base's *native* B20 standard

Base's Beryl upgrade introduces a **native** token standard also called B20, built as
chain-level **precompiles** for regulated stablecoin / RWA issuers. It has compliance
policies, freeze-and-seize and supply caps — but **no trading tax, max-wallet or
max-transaction** mechanics, and (as precompiles) nothing to verify on BaseScan.

This studio deploys a classic, audited-component Solidity ERC-20 instead, so you get
taxes, anti-whale limits and instant verification **today**. See the in-app **Docs**
page for the full comparison. When Base's native B20 factory is broadly live, a
native-token path can be added alongside this one.

---

## Security

- **Non-custodial.** The app never holds your keys, funds, or ownership.
- Contracts are immutable once deployed — test on Sepolia every time.
- The 25% tax ceiling is enforced in the contract; the owner cannot exceed it.
- Owner powers (blacklist, pause, tax) are real centralised controls. Renounce
  ownership to prove they can never be used.
- Not financial or legal advice. Launch responsibly and follow your local rules.

---

## Tech

- **Contract:** Solidity 0.8.26, OpenZeppelin v5 (ERC20, Burnable, Permit, Ownable2Step),
  custom errors, packed storage, optimizer on.
- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS, wagmi v2 + viem,
  TanStack Query, React Router. System-synced light/dark theme.
