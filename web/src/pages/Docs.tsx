import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge, Callout, Card, cn } from "../components/ui";
import { IconAlert, IconArrowRight, IconInfo, IconShield } from "../components/icons";

interface Section {
  id: string;
  title: string;
  body: ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "What B20 is",
    body: (
      <>
        <P>
          <b>B20</b> is a no-code studio for launching and running ERC-20 tokens on the{" "}
          <b>Base</b> chain. You configure a token in the browser, deploy it with a single wallet
          transaction, and then manage every setting live from the dashboard — taxes, limits,
          minting, blacklists, ownership and more.
        </P>
        <P>
          The contract is a gas-optimized Solidity ERC-20 built on audited OpenZeppelin components.
          It's fully <b>BaseScan-verifiable</b>, so anyone can read and trust the source.
        </P>
        <Callout tone="neutral" icon={<IconShield className="h-4 w-4" />} title="B20 studio vs. Base's native B20 standard">
          Base is shipping a <i>native</i> token standard also called <b>B20</b> (part of the Beryl
          upgrade). That one is implemented as chain-level <b>precompiles</b> aimed at regulated
          stablecoin / real-world-asset issuers — it has compliance policies, freeze-and-seize and
          supply caps, but <b>no trading tax, max-wallet or max-transaction</b> features, and its
          mainnet rollout is staged. This studio instead deploys a classic Solidity ERC-20 so you get
          taxes, anti-whale limits and instant BaseScan verification today. Same spirit, different
          engine — pick this when you want a tradeable community token.
        </Callout>
      </>
    ),
  },
  {
    id: "getting-started",
    title: "Getting started",
    body: (
      <>
        <Ol>
          <li><b>Connect a wallet</b> (MetaMask, Rabby, Coinbase Wallet…) from the top-right button.</li>
          <li><b>Pick a network.</b> Always rehearse on <b>Base Sepolia</b> (testnet) first — it's free.</li>
          <li>Grab test ETH from a Base Sepolia faucet, then deploy for real on <b>Base</b> when you're happy.</li>
        </Ol>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          Deploying is irreversible and costs real ETH on mainnet. Test on Sepolia until the token
          behaves exactly how you want.
        </Callout>
      </>
    ),
  },
  {
    id: "create",
    title: "Creating a token",
    body: (
      <>
        <P>The <Link to="/create" className="underline">Create</Link> page has two tabs:</P>
        <P><b>Basics</b> — name, symbol, total supply, decimals (18 is standard) and an optional logo URL. The full supply is minted to your wallet, which becomes the owner.</P>
        <P><b>Advanced</b> — flip on only what you need:</P>
        <Ul>
          <li><b>Buy / sell tax</b> and burn-on-transfer</li>
          <li><b>Minting</b> with an optional permanent hard cap</li>
          <li><b>Anti-whale limits</b> (max transaction & max wallet)</li>
        </Ul>
        <P>Everything else (blacklist, pause, airdrop, renounce…) is switched on later from the dashboard, so you're never locked into a decision at launch.</P>
      </>
    ),
  },
  {
    id: "tax",
    title: "Buy / sell tax & burn",
    body: (
      <>
        <P>
          A tax is a small fee skimmed from trades. <b>Buy tax</b> applies when someone buys from your
          DEX pair; <b>sell tax</b> when they sell into it. Collected fees go to your{" "}
          <b>tax collector wallet</b>. <b>Burn on transfer</b> instead destroys a slice of every
          transfer, making the token deflationary.
        </P>
        <Callout tone="positive" icon={<IconShield className="h-4 w-4" />} title="Anti-rug guarantee">
          The combined tax on any single trade can never exceed <b>25%</b> — that ceiling is enforced
          inside the contract, so not even the owner can set a malicious 99% honeypot tax.
        </Callout>
        <P>Adjust all three live with the sliders on the dashboard. Changes take effect on the next trade.</P>
      </>
    ),
  },
  {
    id: "pairs",
    title: "DEX pairs (how buy/sell is detected)",
    body: (
      <>
        <P>
          The contract can't magically know a transfer is a "buy" or "sell" — it recognises trades by
          the <b>liquidity pair address</b>. The flow is:
        </P>
        <Ol>
          <li>Deploy your token.</li>
          <li>Add liquidity on a Base DEX (e.g. <b>Aerodrome</b> or <b>Uniswap</b>) — this creates a pair/pool address.</li>
          <li>On the dashboard's <b>DEX pairs</b> panel, paste that pair address and mark it as a pair.</li>
        </Ol>
        <P>From then on, transfers <i>from</i> the pair are taxed as buys and transfers <i>to</i> the pair as sells. Before you register a pair, the token behaves like a plain, untaxed ERC-20.</P>
      </>
    ),
  },
  {
    id: "minting",
    title: "Minting & supply cap",
    body: (
      <>
        <P>
          If you enabled minting, the <b>Supply</b> panel lets you create new tokens to any address.
          If you set a <b>hard cap</b>, total supply can never exceed it — the contract rejects mints
          past the cap.
        </P>
        <P>
          The <b>Disable minting forever</b> button permanently locks supply. It's irreversible and a
          strong trust signal: holders know the supply can never be inflated again.
        </P>
        <P>Anyone can also <b>burn</b> their own tokens to reduce supply (standard ERC20Burnable).</P>
      </>
    ),
  },
  {
    id: "limits",
    title: "Anti-whale limits",
    body: (
      <>
        <P>
          <b>Max transaction</b> caps how many tokens can move in one transfer. <b>Max wallet</b> caps
          how many a single address can hold. Together they stop a sniper from buying a huge chunk at
          launch and dumping.
        </P>
        <P>
          Your owner and tax wallets are excluded automatically. Pools you mark as pairs are exempt
          from the max-wallet check (so liquidity can exceed it). Turn limits off entirely once the
          token is established — a common post-launch step.
        </P>
      </>
    ),
  },
  {
    id: "trading",
    title: "Trading gate & pause",
    body: (
      <>
        <P>
          A freshly deployed token starts with trading <b>closed</b> — only the owner and excluded
          wallets can move tokens. This lets you add liquidity and configure everything before the
          public can trade. Hit <b>Enable trading</b> to go live (one-way, permanent).
        </P>
        <P>
          The <b>Pause</b> switch is a temporary emergency brake: it halts all non-exempt transfers so
          you can react to an exploit or bot attack, then resume when it's safe.
        </P>
      </>
    ),
  },
  {
    id: "access",
    title: "Blacklist & whitelist",
    body: (
      <>
        <P>
          <b>Blacklist</b> an address to instantly block it from sending or receiving — useful for
          known bots or malicious actors. Un-blacklist just as easily.
        </P>
        <P>
          <b>Whitelist-only mode</b> flips the model: while it's on, <i>only</i> whitelisted wallets
          can transfer. Handy for a private/allowlisted launch phase, then switch it off to open up.
        </P>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          These are powerful, centralised controls. Use them transparently — communities watch how
          owners wield blacklists. Renouncing ownership disables them entirely.
        </Callout>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Ownership: transfer & renounce",
    body: (
      <>
        <P>
          Ownership uses a safe <b>2-step transfer</b>: you nominate a new owner, and they must
          <b> accept</b> in a second transaction. This prevents fat-fingering control to a wrong or
          dead address.
        </P>
        <P>
          <b>Renounce ownership</b> sets the owner to the zero address, permanently. All admin
          controls (tax, mint, blacklist, pause…) become frozen forever — the ultimate
          decentralisation signal. There is no undo.
        </P>
      </>
    ),
  },
  {
    id: "airdrop",
    title: "Batch airdrop",
    body: (
      <>
        <P>
          Send tokens to many wallets in a single transaction from the <b>Airdrop</b> panel. Paste one
          recipient per line as <code className="rounded bg-elevated px-1">address, amount</code>. The
          panel totals it up and checks it against your balance before you sign.
        </P>
        <P>Because it's one transaction for the whole list, it's far cheaper than sending individually.</P>
      </>
    ),
  },
  {
    id: "rescue",
    title: "Rescue stuck funds",
    body: (
      <>
        <P>
          People inevitably send random tokens or ETH straight to a contract by mistake. The
          <b> Rescue</b> panel lets the owner pull any <i>foreign</i> ERC-20 or ETH back out to the
          owner wallet. Your own token can't be rescued this way (by design), so you can never drain
          holders.
        </P>
      </>
    ),
  },
  {
    id: "verify",
    title: "Verify on BaseScan",
    body: (
      <>
        <P>
          After deploying, the success dialog gives you the exact <code className="rounded bg-elevated px-1">arguments.js</code> and
          a one-line command to verify the source on BaseScan. From the <code className="rounded bg-elevated px-1">contracts/</code> folder:
        </P>
        <Pre>{`# 1. set your key (Etherscan V2 key works for BaseScan)
export BASESCAN_API_KEY=your_key

# 2. save the arguments.js shown after deploy, then:
npx hardhat verify --network base \\
  --constructor-args arguments.js <TOKEN_ADDRESS>`}</Pre>
        <P>Once verified, holders see a green checkmark and can read every line of your token's code.</P>
      </>
    ),
  },
  {
    id: "security",
    title: "Security & disclaimer",
    body: (
      <>
        <Ul>
          <li>B20 is <b>non-custodial</b> — it never holds your keys, funds or ownership.</li>
          <li>Contracts are immutable once deployed. Rehearse on <b>Base Sepolia</b> first, every time.</li>
          <li>Owner powers (tax, blacklist, pause) are real. Renounce when you want to prove you can't abuse them.</li>
          <li>This tool and its docs are provided as-is and are not financial or legal advice. Launch responsibly and comply with your local regulations.</li>
        </Ul>
      </>
    ),
  },
];

export function Docs() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <Badge tone="accent" className="mb-3"><IconInfo className="h-3.5 w-3.5" /> Documentation</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">How B20 works</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          A guide to every feature — what it does, when to use it, and the safety rails built into each one.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        {/* Sidebar nav */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-0.5">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "block rounded-lg px-3 py-1.5 text-[13px] transition",
                  active === s.id ? "bg-elevated font-medium text-fg" : "text-muted hover:text-fg"
                )}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="mb-4 text-xl font-semibold tracking-tight">{s.title}</h2>
              <div className="space-y-3 text-[15px] leading-relaxed text-muted">{s.body}</div>
            </section>
          ))}

          <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-fg">Ready to launch?</h3>
              <p className="mt-1 text-sm text-muted">Rehearse on Base Sepolia, then go live on Base.</p>
            </div>
            <Link to="/create" className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90">
              Create a token <IconArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* prose helpers */
function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}
function Ul({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">{children}</ul>;
}
function Ol({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-1.5 pl-5 marker:text-faint">{children}</ol>;
}
function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-auto rounded-xl border border-border bg-surface p-4 font-mono text-[12px] leading-relaxed text-fg">
      {children}
    </pre>
  );
}
