import { Link } from "react-router-dom";
import { Badge, Button, Card } from "../components/ui";
import {
  IconArrowRight,
  IconBan,
  IconCoins,
  IconFlame,
  IconGauge,
  IconLifebuoy,
  IconLock,
  IconRocket,
  IconSend,
  IconShield,
  IconSparkles,
  IconTrendDown,
  IconTrendUp,
  IconUsers,
} from "../components/icons";

const FEATURES = [
  { icon: IconTrendUp, title: "Buy / sell tax", desc: "Separate buy and sell fees to a collector wallet. Hard-capped at 25% on-chain; impossible to rug." },
  { icon: IconFlame, title: "Burn on transfer", desc: "Deflationary by design. Burn a slice of every transfer automatically." },
  { icon: IconCoins, title: "Mint and hard cap", desc: "Optional minting with a permanent max-supply cap, plus a one-way disable switch." },
  { icon: IconUsers, title: "Anti-whale limits", desc: "Max wallet and max transaction caps stop snipers from buying the whole supply at once." },
  { icon: IconBan, title: "Blacklist and whitelist", desc: "Block bots and malicious wallets instantly, or run a strict allowlist launch." },
  { icon: IconLock, title: "Trading gate and pause", desc: "Launch trading on your signal, and pause instantly in an emergency." },
  { icon: IconSend, title: "Batch airdrop", desc: "Send tokens to hundreds of wallets in a single transaction." },
  { icon: IconLifebuoy, title: "Rescue stuck funds", desc: "Recover foreign tokens or ETH accidentally sent to your contract." },
];

export function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-dots opacity-70" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-positive/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge tone="accent" className="mx-auto mb-6">
            <IconSparkles className="h-3.5 w-3.5" /> Built for Base Sepolia
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Launch a token on Base Sepolia.
            <br />
            <span className="text-muted">Then actually run it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted sm:text-lg">
            Create a gas-optimized, BaseScan-verifiable ERC-20 in minutes. No code. Then manage
            taxes, limits, minting and more live from a full owner dashboard.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/create">
              <Button size="lg" className="gap-2">
                <IconRocket className="h-4.5 w-4.5" /> Create your token
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="gap-2">
                <IconGauge className="h-4.5 w-4.5" /> Open dashboard
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-faint">
            Non-custodial. You keep the keys and the ownership. Verify on BaseScan in one command.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything, built in</h2>
            <p className="mt-2 max-w-xl text-[15px] text-muted">
              The advanced features that normally take a Solidity dev and an audit, toggled on with a
              switch, safety rails included.
            </p>
          </div>
          <Link to="/docs" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:opacity-70">
            Read the docs <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="p-5 transition hover:border-ring">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-elevated">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Three steps to launch</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", icon: IconCoins, t: "Configure", d: "Pick a name, supply and logo. Flip on the advanced features you want: taxes, limits, mint, blacklist." },
              { n: "02", icon: IconRocket, t: "Deploy", d: "Sign one transaction. Your contract goes live on Base Sepolia and is instantly BaseScan-verifiable." },
              { n: "03", icon: IconGauge, t: "Manage", d: "Open the dashboard to tune taxes with sliders, airdrop, pause, renounce ownership and more." },
            ].map(({ n, icon: Icon, t, d }) => (
              <div key={n} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-sm text-faint">{n}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Card className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-elevated">
            <IconShield className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Sepolia now, mainnet B20 later</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              This studio is Base Sepolia-only while Base mainnet B20 is paused. You still get a
              battle-tested Solidity ERC-20 with taxes, limits and BaseScan verification for testing
              right now. We explain how that differs from Base native B20 in the docs.
            </p>
          </div>
          <Link to="/docs">
            <Button variant="outline" className="gap-2 whitespace-nowrap">
              Learn more <IconArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex items-center gap-4 border-positive/25 bg-positive/[0.04] p-5">
            <IconTrendUp className="h-6 w-6 text-positive" />
            <p className="text-sm text-muted">
              <strong className="text-fg">Buy tax</strong> routed to your collector wallet on every DEX buy.
            </p>
          </Card>
          <Card className="flex items-center gap-4 border-negative/25 bg-negative/[0.04] p-5">
            <IconTrendDown className="h-6 w-6 text-negative" />
            <p className="text-sm text-muted">
              <strong className="text-fg">Sell tax</strong> with a hard 25% ceiling, enforced in the contract.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
