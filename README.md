# B20 - Base Token Creator & Manager

A no-code studio to create and manage gas-optimized ERC-20 tokens on Base Sepolia.
Connect a wallet, configure a token, deploy it in one transaction, then control
settings live from an owner dashboard: taxes, limits, minting, blacklists,
ownership, airdrops and more. Fully BaseScan-verifiable.

```
BaseB20/
  contracts/  # Hardhat + Solidity (the B20Token contract)
  web/        # Vite + React + TypeScript + wagmi frontend
  api/        # Vercel serverless helpers
```

## Features

**Create (no code):**

- Name, symbol, supply, decimals, on-chain logo URL
- Buy / sell tax + burn-on-transfer (combined tax hard-capped at 25% on-chain)
- Optional minting with a permanent hard cap
- Anti-whale limits: max transaction and max wallet
- The full supply is minted to you; you become the owner

**Manage (live dashboard):**

- Buy/sell/burn tax sliders (25% ceiling enforced in the contract)
- Change the tax collector wallet
- Mint tokens, or disable minting forever
- Enable trading (one-way launch gate) + emergency pause
- Register DEX pairs so buy/sell tax applies to trades
- Blacklist bots/scammers; strict whitelist mode
- Toggle and retune anti-whale limits
- Batch airdrop to many wallets in one transaction
- Rescue foreign tokens / ETH stuck in the contract
- 2-step ownership transfer or renounce

## Quick Start

### 1. Contract

```bash
cd contracts
npm install
npm run build
```

`npm run build` compiles the contract and exports ABI/bytecode into
`web/src/contracts/B20Token.json`. Re-run it whenever you change Solidity.

### 2. Web App

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Build for production with `npm run build` (output in `web/dist`).

## Network

The website is currently enabled only for Base Sepolia while Base mainnet B20 is
paused.

| Network      | Chain ID | RPC                      | Explorer                     |
| ------------ | -------- | ------------------------ | ---------------------------- |
| Base Sepolia | `84532`  | https://sepolia.base.org | https://sepolia.basescan.org |

Get test ETH from a Base Sepolia faucet before deploying.

## Deploying & Verifying

You deploy straight from the browser. The app signs a contract-creation
transaction with your wallet. Open the deployed token in the dashboard and press
`Verify & publish`. The server submits the exact compiler input and constructor
arguments to BaseScan, then checks the result automatically.

Set `BASESCAN_API_KEY` in Vercel so the one-click dashboard verifier can call
the BaseScan / Etherscan V2 API. `BASE_SEPOLIA_RPC_URL` is optional; the app
defaults to the public Base Sepolia RPC.

`hardhat.config.js` is also scoped to Base Sepolia right now to prevent accidental
mainnet usage.

## ImgBB Uploads

Logo uploads go through the Vercel serverless route at `api/upload-logo.js`.
Keep `IMGBB_API_KEY` server-side in Vercel or your local environment. Do not add
an ImgBB key as a `VITE_` variable, because Vite exposes those to browser code.

## Admin Analytics

The `/admin` route reads analytics from Neon through serverless API routes.
Set `DATABASE_URL` and `ADMIN_ADDRESSES` in Vercel. `ADMIN_ADDRESSES` is a
comma-separated list of wallet addresses that are allowed to sign in.

## A Note On Base Native B20

Base's Beryl upgrade introduces a native token standard also called B20, built as
chain-level precompiles for regulated stablecoin / RWA issuers. Its mainnet
rollout is currently paused, and it is separate from this app's classic Solidity
ERC-20 flow.

This studio deploys an audited-component Solidity ERC-20 so you can test taxes,
anti-whale limits and verification on Base Sepolia now. A native-token path can
be added later when Base mainnet support is live again.

## Security

- Non-custodial. The app never holds your keys, funds, or ownership.
- Token creation includes automated preflight checks for supply math, decimals,
  address format, fee caps, mint risk, owner powers and verification readiness.
- Contracts are immutable once deployed. Test on Sepolia every time.
- The 25% tax ceiling is enforced in the contract; the owner cannot exceed it.
- The contract rejects zero supply, decimals above 18, and supply/cap/limit
  values that cannot be safely scaled on-chain.
- Owner powers (blacklist, pause, tax) are centralised controls. Renounce
  ownership when you want to prove they can never be used.
- The security profile is an audit-style first pass, not a formal audit or
  guarantee. Launch responsibly and follow your local rules.

## Tech

- Contract: Solidity 0.8.35, OpenZeppelin v5, custom errors, packed storage,
  optimizer on.
- Frontend: Vite, React 18, TypeScript, Tailwind CSS, wagmi v2 + viem,
  TanStack Query, React Router.
