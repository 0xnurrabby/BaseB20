import { Link } from "react-router-dom";
import { Badge, Button, Card, cn } from "../components/ui";
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

type Tone = "sky" | "mint" | "amber" | "rose" | "violet" | "cyan" | "lime" | "stone";

const toneStyles: Record<Tone, { card: string; icon: string; line: string }> = {
  sky: {
    card: "border-sky-200/80 bg-sky-50/75 dark:border-sky-400/20 dark:bg-sky-400/[0.08]",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
    line: "bg-sky-300 dark:bg-sky-400/60",
  },
  mint: {
    card: "border-emerald-200/80 bg-emerald-50/75 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]",
    icon: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
    line: "bg-emerald-300 dark:bg-emerald-400/60",
  },
  amber: {
    card: "border-amber-200/80 bg-amber-50/75 dark:border-amber-400/20 dark:bg-amber-400/[0.08]",
    icon: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
    line: "bg-amber-300 dark:bg-amber-400/60",
  },
  rose: {
    card: "border-rose-200/80 bg-rose-50/75 dark:border-rose-400/20 dark:bg-rose-400/[0.08]",
    icon: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
    line: "bg-rose-300 dark:bg-rose-400/60",
  },
  violet: {
    card: "border-violet-200/80 bg-violet-50/75 dark:border-violet-400/20 dark:bg-violet-400/[0.08]",
    icon: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
    line: "bg-violet-300 dark:bg-violet-400/60",
  },
  cyan: {
    card: "border-cyan-200/80 bg-cyan-50/75 dark:border-cyan-400/20 dark:bg-cyan-400/[0.08]",
    icon: "border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200",
    line: "bg-cyan-300 dark:bg-cyan-400/60",
  },
  lime: {
    card: "border-lime-200/80 bg-lime-50/75 dark:border-lime-400/20 dark:bg-lime-400/[0.08]",
    icon: "border-lime-200 bg-lime-100 text-lime-700 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200",
    line: "bg-lime-300 dark:bg-lime-400/60",
  },
  stone: {
    card: "border-border bg-surface",
    icon: "border-border bg-elevated text-fg",
    line: "bg-ring/50",
  },
};

const FEATURES = [
  { tone: "sky" as Tone, icon: IconTrendUp, title: "Buy / sell tax", desc: "Separate buy and sell fees to a collector wallet. Hard-capped at 25% on-chain; impossible to rug." },
  { tone: "rose" as Tone, icon: IconFlame, title: "Burn on transfer", desc: "Deflationary by design. Burn a slice of every transfer automatically." },
  { tone: "amber" as Tone, icon: IconCoins, title: "Mint and hard cap", desc: "Optional minting with a permanent max-supply cap, plus a one-way disable switch." },
  { tone: "mint" as Tone, icon: IconUsers, title: "Anti-whale limits", desc: "Max wallet and max transaction caps stop snipers from buying the whole supply at once." },
  { tone: "violet" as Tone, icon: IconBan, title: "Blacklist and whitelist", desc: "Block bots and malicious wallets instantly, or run a strict allowlist launch." },
  { tone: "cyan" as Tone, icon: IconLock, title: "Trading gate and pause", desc: "Launch trading on your signal, then pause instantly in an emergency." },
  { tone: "lime" as Tone, icon: IconSend, title: "Batch airdrop", desc: "Send tokens to hundreds of wallets in a single transaction." },
  { tone: "stone" as Tone, icon: IconLifebuoy, title: "Rescue stuck funds", desc: "Recover foreign tokens or ETH accidentally sent to your contract." },
];

const STEPS = [
  { n: "01", tone: "sky" as Tone, icon: IconCoins, t: "Configure", d: "Pick a name, supply and logo. Add taxes, limits or minting only if your launch needs them." },
  { n: "02", tone: "violet" as Tone, icon: IconRocket, t: "Deploy", d: "Sign one wallet transaction. Your contract goes live on Base Sepolia and is ready for BaseScan verification." },
  { n: "03", tone: "mint" as Tone, icon: IconGauge, t: "Manage", d: "Tune fees, open trading, airdrop holders, pause emergencies, transfer ownership and more." },
];

export function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="absolute inset-0 grid-dots opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-transparent to-emerald-50 dark:from-sky-400/[0.08] dark:to-emerald-400/[0.08]" />
        <div className="relative grid gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-14">
          <div className="max-w-3xl">
            <Badge tone="accent" className="mb-5 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200">
              <IconSparkles className="h-3.5 w-3.5" /> Built for Base Sepolia
            </Badge>
            <h1 className="font-display text-5xl leading-[0.98] text-fg sm:text-6xl lg:text-7xl">
              Launch a token. Then actually run it.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Create a gas-optimized, BaseScan-verifiable ERC-20 in minutes. No code. Manage taxes,
              limits, minting and launch controls from one owner dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/create">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  <IconRocket className="h-4.5 w-4.5" /> Create your token
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="w-full gap-2 bg-surface/70 sm:w-auto">
                  <IconGauge className="h-4.5 w-4.5" /> Open dashboard
                </Button>
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {["Non-custodial", "25% tax ceiling", "BaseScan ready", "Owner dashboard"].map((item) => (
                <span key={item} className="rounded-full border border-border bg-bg/80 px-3 py-1.5 text-xs font-medium text-muted">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid content-end gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["Network", "Base Sepolia only", "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-400/10 dark:text-sky-200 dark:border-sky-400/25"],
              ["Safety rail", "25% max trade fee", "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:border-emerald-400/25"],
              ["Verification", "Copy-ready BaseScan flow", "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-400/25"],
            ].map(([label, value, classes]) => (
              <div key={label} className={cn("rounded-2xl border bg-surface/80 p-5 shadow-soft", classes)}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</p>
                <p className="mt-2 text-lg font-semibold text-fg">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-faint">Token toolkit</p>
            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Everything built in</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted">
              Advanced token controls with cleaner defaults, clear owner actions and safety rails.
            </p>
          </div>
          <Link to="/docs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg hover:opacity-70">
            Read the docs <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ tone, icon: Icon, title, desc }) => {
            const styles = toneStyles[tone];
            return (
              <Card key={title} className={cn("group overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-soft", styles.card)}>
                <div className={cn("mb-5 h-1 w-12 rounded-full", styles.line)} />
                <span className={cn("grid h-11 w-11 place-items-center rounded-xl border", styles.icon)}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-faint">Workflow</p>
            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Three steps to launch</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">
            Keep the first deployment on Base Sepolia, verify it, then practice dashboard operations before any serious launch.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ n, tone, icon: Icon, t, d }) => {
            const styles = toneStyles[tone];
            return (
              <div key={n} className={cn("rounded-2xl border p-5", styles.card)}>
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("grid h-11 w-11 place-items-center rounded-xl border", styles.icon)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-sm text-faint">{n}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <Card className="overflow-hidden border-violet-200/80 bg-violet-50/60 shadow-card dark:border-violet-400/20 dark:bg-violet-400/[0.08]">
          <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200">
              <IconShield className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-display text-3xl leading-tight text-fg">Sepolia now, mainnet B20 later</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                This studio is Base Sepolia-only while Base mainnet B20 is paused. You can still test a
                Solidity ERC-20 with taxes, limits and BaseScan verification right now.
              </p>
            </div>
            <Link to="/docs">
              <Button variant="outline" className="gap-2 whitespace-nowrap bg-surface/70">
                Learn more <IconArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 pb-8 sm:grid-cols-2">
        <Card className="flex items-center gap-4 border-emerald-200/80 bg-emerald-50/70 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
            <IconTrendUp className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-muted">
            <strong className="text-fg">Buy tax</strong> routes to your collector wallet on every registered DEX buy.
          </p>
        </Card>
        <Card className="flex items-center gap-4 border-rose-200/80 bg-rose-50/70 p-5 dark:border-rose-400/20 dark:bg-rose-400/[0.08]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200">
            <IconTrendDown className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-muted">
            <strong className="text-fg">Sell tax</strong> stays under a hard 25% ceiling enforced in the contract.
          </p>
        </Card>
      </section>
    </div>
  );
}
