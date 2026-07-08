import { Link } from "react-router-dom";
import { Badge, Button, Card } from "../components/ui";
import {
  IconArrowRight,
  IconBook,
  IconCheck,
  IconCoins,
  IconFlame,
  IconGauge,
  IconLock,
  IconPause,
  IconRocket,
  IconSend,
  IconShield,
  IconSparkles,
  IconUsers,
} from "../components/icons";

const FEATURES = [
  { icon: IconRocket, title: "Launch", desc: "Create a native B20 token on Base in one clean flow." },
  { icon: IconCoins, title: "Mint", desc: "Send supply to one wallet or many wallets from the dashboard." },
  { icon: IconFlame, title: "Burn", desc: "Permanently remove tokens from your own balance when needed." },
  { icon: IconShield, title: "Cap supply", desc: "Keep supply fixed, or leave controlled minting open." },
  { icon: IconPause, title: "Pause", desc: "Pause transfers, minting or burning during emergencies." },
  { icon: IconSend, title: "Transfer", desc: "Send normal transfers or add a short memo." },
  { icon: IconUsers, title: "Roles", desc: "Give trusted wallets only the exact powers they need." },
  { icon: IconLock, title: "Finalize", desc: "Remove admin powers when the token should be locked." },
];

const STEPS = [
  { n: "01", icon: IconCoins, t: "Design", d: "Name, symbol, supply and logo." },
  { n: "02", icon: IconRocket, t: "Launch", d: "Connect wallet and confirm once on Base." },
  { n: "03", icon: IconGauge, t: "Manage", d: "Mint, burn, pause, roles, metadata and sharing." },
];

export function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-surface/40">
        <div className="pointer-events-none absolute inset-0 grid-dots opacity-70" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <Badge tone="accent" className="mb-6">
                <IconSparkles className="h-3.5 w-3.5" /> Base mainnet native B20
              </Badge>
              <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">
                Launch a native B20 token on Base.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted sm:text-lg">
                Create your token, upload a logo, set supply, then manage mint, burn, roles and sharing from one clean dashboard.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/create">
                  <Button size="lg" className="gap-2">
                    <IconRocket className="h-4.5 w-4.5" /> Create B20 token
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" variant="outline" className="gap-2">
                    <IconGauge className="h-4.5 w-4.5" /> Open dashboard
                  </Button>
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Base mainnet", "Logo upload", "Mint and burn", "ERC-20 compatible"].map((item) => (
                  <span key={item} className="rounded-full border border-border bg-bg/80 px-3 py-1.5 text-xs font-medium text-muted">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <HeroMotionCard />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Everything a token owner needs</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              Simple controls on top, detailed docs only when users want the deeper explanation.
            </p>
          </div>
          <Link to="/docs" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:opacity-70">
            Read docs <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="group p-5 transition duration-300 hover:-translate-y-1 hover:border-ring hover:shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-elevated transition duration-300 group-hover:scale-110 group-hover:border-emerald-300">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface/45">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Three steps to launch</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ n, icon: Icon, t, d }) => (
              <div key={n}>
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

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-emerald-200/80 bg-emerald-50/55 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-card dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]">
            <IconShield className="h-6 w-6 text-positive" />
            <h3 className="mt-4 text-lg font-semibold">Base mainnet ready</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The app stays on Base mainnet and opens the correct BaseScan token page after launch.
            </p>
          </Card>
          <Card className="border-violet-200/80 bg-violet-50/55 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-card dark:border-violet-400/20 dark:bg-violet-400/[0.07]">
            <IconBook className="h-6 w-6 text-fg" />
            <h3 className="mt-4 text-lg font-semibold">Plain-language docs</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Docs explain what each control does, when to use it and what to avoid before sharing a token publicly.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function HeroMotionCard() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-card dark:border-sky-400/20 dark:from-sky-400/[0.08] dark:via-surface dark:to-emerald-400/[0.08]">
      <div className="absolute inset-0 grid-dots opacity-60" />
      <div className="home-orbit home-orbit-one" />
      <div className="home-orbit home-orbit-two" />
      <div className="home-token-core">
        <span>B20</span>
      </div>
      <div className="home-floating-card left-5 top-8">
        <IconRocket className="h-4 w-4 text-sky-600" />
        <span>Launch</span>
      </div>
      <div className="home-floating-card right-5 top-24 animation-delay-700">
        <IconCoins className="h-4 w-4 text-emerald-600" />
        <span>Mint</span>
      </div>
      <div className="home-floating-card bottom-24 left-6 animation-delay-1000">
        <IconFlame className="h-4 w-4 text-rose-600" />
        <span>Burn</span>
      </div>
      <div className="home-floating-card bottom-8 right-6 animation-delay-300">
        <IconShield className="h-4 w-4 text-violet-600" />
        <span>Secure</span>
      </div>
      <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Base-ready token</span>
          <Badge tone="positive"><IconCheck className="h-3 w-3" /> Live</Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/70">
          <div className="home-progress h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-violet-400" />
        </div>
      </div>
    </div>
  );
}
