import { Link } from "react-router-dom";
import { Badge, Button, Card } from "../components/ui";
import {
  IconArrowRight,
  IconBook,
  IconCheck,
  IconCoins,
  IconGauge,
  IconLock,
  IconPause,
  IconRocket,
  IconSend,
  IconShield,
  IconSparkles,
  IconUsers,
} from "../components/icons";
import { B20_FACTORY_ADDRESS } from "../lib/contract";

const FEATURES = [
  { icon: IconRocket, title: "Native factory launch", desc: "Create an Asset variant through the Base B20 Factory precompile on Base mainnet." },
  { icon: IconCheck, title: "ERC-20 compatible", desc: "B20 is an ERC-20 superset, so balances, transfers, approvals and events work with ERC-20 tooling." },
  { icon: IconShield, title: "Role-based control", desc: "Use DEFAULT_ADMIN_ROLE, MINT_ROLE, PAUSE_ROLE, METADATA_ROLE and OPERATOR_ROLE cleanly." },
  { icon: IconCoins, title: "Supply cap", desc: "Minting respects the native B20 supply cap, with uint128 max used as the no-cap sentinel." },
  { icon: IconPause, title: "Granular pause", desc: "Pause transfers, minting or burning independently through native B20 pause controls." },
  { icon: IconSend, title: "Memo transfers", desc: "Attach bytes32 memos to transfers for invoices, orders and off-chain reconciliation." },
  { icon: IconUsers, title: "Batch mint", desc: "Asset tokens support batched issuance for clean distributions from the dashboard." },
  { icon: IconLock, title: "Admin-less option", desc: "When setup is complete, the final admin can be renounced with the native B20 path." },
];

const STEPS = [
  { n: "01", icon: IconCoins, t: "Configure", d: "Choose name, symbol, decimals, initial supply, cap, logo and bootstrap roles." },
  { n: "02", icon: IconRocket, t: "Create", d: "Sign one factory transaction on Base mainnet. The token is created by the B20 precompile." },
  { n: "03", icon: IconGauge, t: "Manage", d: "Use the dashboard for minting, roles, pause, metadata, memo transfers and BaseScan links." },
];

export function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-surface/40">
        <div className="pointer-events-none absolute inset-0 grid-dots opacity-70" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_390px] lg:items-center">
            <div>
              <Badge tone="accent" className="mb-6">
                <IconSparkles className="h-3.5 w-3.5" /> Base mainnet native B20
              </Badge>
              <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">
                Launch a native B20 token on Base.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted sm:text-lg">
                Create a Base-native Asset token with the official B20 Factory precompile. No custom Solidity token bytecode and no legacy custom-token flow.
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
                {["Chain 8453", "Factory 0xB20f...", "Asset decimals 6-18", "ERC-20 compatible"].map((item) => (
                  <span key={item} className="rounded-full border border-border bg-bg/80 px-3 py-1.5 text-xs font-medium text-muted">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/65 p-5 shadow-card dark:border-sky-400/20 dark:bg-sky-400/[0.07]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Launch preview</p>
                  <p className="mt-1 text-xs text-muted">Native B20 Asset on Base mainnet</p>
                </div>
                <Badge tone="positive"><IconCheck className="h-3 w-3" /> Ready</Badge>
              </div>
              <div className="space-y-3">
                <PreviewRow label="Factory" value={`${B20_FACTORY_ADDRESS.slice(0, 8)}...${B20_FACTORY_ADDRESS.slice(-4)}`} />
                <PreviewRow label="Variant" value="Asset" />
                <PreviewRow label="Initial admin" value="Connected wallet" />
                <PreviewRow label="Bootstrap" value="cap, roles, metadata, mint" />
              </div>
              <div className="mt-5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08] dark:text-emerald-100">
                Initial supply can be minted during the factory creation call, so users do not need a second setup transaction.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Built around the actual B20 standard</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
              The app now targets Base mainnet only and uses the official native B20 surfaces that Base documents.
            </p>
          </div>
          <Link to="/docs" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:opacity-70">
            Read docs <IconArrowRight className="h-4 w-4" />
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
          <Card className="border-emerald-200/80 bg-emerald-50/55 p-6 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]">
            <IconShield className="h-6 w-6 text-positive" />
            <h3 className="mt-4 text-lg font-semibold">Correct mainnet path</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The app is pinned to Base mainnet chain ID 8453 and links to basescan.org. Legacy custom deployment paths have been removed.
            </p>
          </Card>
          <Card className="border-violet-200/80 bg-violet-50/55 p-6 dark:border-violet-400/20 dark:bg-violet-400/[0.07]">
            <IconBook className="h-6 w-6 text-fg" />
            <h3 className="mt-4 text-lg font-semibold">Source-aware docs</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Documentation now describes B20 as Base's native ERC-20 superset precompile standard, with Factory, roles, policies, pause, permit, and Asset features explained correctly.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="truncate font-medium text-fg">{value}</span>
    </div>
  );
}
