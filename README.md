# B20 - Base Native Token Studio

A no-code studio to create and manage native B20 Asset tokens on Base mainnet.
The app calls the official Base B20 Factory precompile instead of deploying a
custom Solidity token contract.

```
BaseB20/
  web/  # Vite + React + TypeScript + wagmi frontend
  api/  # Vercel serverless helpers for uploads, analytics and admin stats
```

## What B20 Means Here

B20 is Base's native token standard. It is an ERC-20 superset implemented as
chain precompiles, so standard ERC-20 calls and events remain compatible while
B20 adds permissions, supply caps, granular pause, policy hooks, memos, permit and
Asset-specific features.

This app currently creates the B20 Asset variant on Base mainnet:

- Network: Base mainnet
- Chain ID: `8453`
- RPC: `https://mainnet.base.org`
- Explorer: `https://basescan.org`
- B20 Factory: `0xB20f000000000000000000000000000000000000`
- Activation Registry: `0x8453000000000000000000000000000000000001`
- Policy Registry: `0x8453000000000000000000000000000000000002`

Official references:

- https://docs.base.org/get-started/launch-b20-token
- https://docs.base.org/base-chain/specs/upgrades/beryl/b20

## Features

**Create**

- B20 Asset token creation through `createB20`
- Name, symbol, initial supply and immutable Asset decimals
- Asset decimals validation from 6 to 18
- Supply cap with uint128 max as the no-cap sentinel
- Logo image upload saves a direct `i.ibb.co` image link, stores it as Asset `extraMetadata("logoURI")`, and generates wallet-friendly JSON that proxies the image with proper headers
- Generated metadata JSON link for the token `contractURI`
- Bootstrap permission setup for mint, burn, pause and metadata controls
- Initial supply minted during the factory creation transaction

**Dashboard**

- Factory-created token detection
- Supply, balance, cap, decimals and permission overview
- Single mint and batch mint through native B20 methods
- Supply cap update
- Granular pause for transfer, mint and burn features
- Metadata updates for name, symbol, metadata JSON and logo image
- Give and remove permission controls
- Final admin lock path for a permanent admin-less token
- Transfer with bytes32 memo
- Copy import info plus BaseScan token and factory links

## Quick Start

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Build for production:

```bash
cd web
npm run build
```

The Vercel project serves the Vite build from `web/dist` and the serverless
routes from `api/`.

## Environment

Frontend:

- `VITE_WALLETCONNECT_PROJECT_ID`, optional WalletConnect project ID

Server:

- `IMGBB_API_KEY`, server-side logo upload key
- `DATABASE_URL`, Neon connection string for analytics and admin stats
- `ADMIN_ADDRESSES`, comma-separated wallet addresses allowed into `/admin`
- `ANALYTICS_SALT`, optional salt for anonymous visitor hashing

Do not use `VITE_` for secrets. Vite exposes `VITE_` variables to browser code.

## BaseScan

The dashboard includes a BaseScan Publish panel for each token. It opens the
public token page, Verify and Publish page, cross-chain verify view, Verify
Address page, Token Info / Logo form, and provides a copy-ready publish pack
with the token address, logo URL and metadata JSON. BaseScan header logos are
not automatic from on-chain metadata, so creators should submit the Token Info /
Logo request after saving logo + JSON on-chain.

## Security Notes

- Non-custodial. The app never holds private keys, funds or role ownership.
- Creation validates Asset decimals, supply math, cap bounds and metadata URI
  shape before sending the factory call.
- Minting always respects the native B20 supply cap.
- Permission grants are visible on-chain. Treat DEFAULT_ADMIN_ROLE, MINT_ROLE,
  BURN_ROLE, PAUSE_ROLE, UNPAUSE_ROLE and METADATA_ROLE as real admin power.
- Final admin lock is permanent. Use it only when no future admin changes are
  needed.
- The app follows the documented B20 surfaces, but it is not a legal, financial
  or formal audit guarantee.

## Tech

- Frontend: Vite, React 18, TypeScript, Tailwind CSS, wagmi, viem, TanStack
  Query and React Router.
- Serverless: Vercel API routes for analytics, admin stats and ImgBB uploads.
