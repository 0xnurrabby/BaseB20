import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount, useSignMessage } from "wagmi";
import { adminMessage } from "../lib/analytics";
import { explorerUrl } from "../lib/wagmi";
import { shortAddress } from "../lib/format";
import { Badge, Button, Callout, Card, Spinner, cn } from "../components/ui";
import { WalletConnect } from "../components/WalletConnect";
import {
  IconAlert,
  IconArrowRight,
  IconCoins,
  IconExternal,
  IconGauge,
  IconShield,
  IconTrendUp,
  IconUsers,
} from "../components/icons";

interface Summary {
  totals: {
    pageViews: number;
    visitors: number;
    tokensCreated: number;
    walletsSeen: number;
    events24h: number;
  };
  daily: Array<{ day: string; pageViews: number; tokensCreated: number }>;
  recentTokens: Array<{
    token_address: string | null;
    token_name: string | null;
    token_symbol: string | null;
    wallet: string | null;
    tx_hash: string | null;
    chain_id: number | null;
    created_at: string;
  }>;
  topPages: Array<{ pagePath: string; views: number }>;
  activeWallets: Array<{ wallet: string; tokensCreated: number; lastSeen: string }>;
}

type LoadState = "idle" | "loading" | "ready" | "denied" | "error";

export function Admin() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending } = useSignMessage();
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<LoadState>("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSignature("");
    setMessage("");
    setSummary(null);
    setState("idle");
    setError("");
  }, [address]);

  async function loadStats(sig: string, signedMessage = message) {
    if (!address) return;
    setState("loading");
    setError("");
    const res = await fetch("/api/admin-stats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, signature: sig, message: signedMessage }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) {
      setState("denied");
      setError(json.error ?? "This wallet is not allowed.");
      return;
    }
    if (!res.ok) {
      setState("error");
      setError(json.error ?? "Admin stats are not available.");
      return;
    }
    setSummary(json as Summary);
    setState("ready");
  }

  async function authorize() {
    if (!address) return;
    const nextMessage = adminMessage(address);
    const sig = await signMessageAsync({ message: nextMessage });
    setMessage(nextMessage);
    setSignature(sig);
    await loadStats(sig, nextMessage);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="accent"><IconShield className="h-3 w-3" /> Admin</Badge>
            {address && <span className="font-mono text-xs text-faint">{shortAddress(address, 6)}</span>}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin panel</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Site activity, token launches and wallet usage from the live app.
          </p>
        </div>
        <div className="flex gap-2">
          {signature && (
            <Button variant="outline" onClick={() => loadStats(signature)} disabled={state === "loading"}>
              Refresh
            </Button>
          )}
          <Link to="/dashboard">
            <Button variant="outline" className="gap-1.5">
              Dashboard <IconArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {!isConnected ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-elevated">
            <IconShield className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Connect admin wallet</h2>
            <p className="mt-1 text-sm text-muted">Only server-approved wallets can load this page.</p>
          </div>
          <WalletConnect />
        </Card>
      ) : state === "idle" ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-elevated">
            <IconShield className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Authorize admin access</h2>
            <p className="mt-1 text-sm text-muted">Sign once with your wallet to unlock server-side stats.</p>
          </div>
          <Button onClick={authorize} loading={isPending}>
            Sign and open admin
          </Button>
        </Card>
      ) : state === "loading" ? (
        <Card className="grid place-items-center px-6 py-16">
          <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Loading admin data...</div>
        </Card>
      ) : state === "denied" || state === "error" ? (
        <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />} title={state === "denied" ? "Access denied" : "Could not load admin"}>
          {error}
        </Callout>
      ) : summary ? (
        <AdminDashboard summary={summary} />
      ) : null}
    </div>
  );
}

function AdminDashboard({ summary }: { summary: Summary }) {
  const stats = [
    { label: "Visitors", value: summary.totals.visitors, icon: IconUsers, tone: "positive" },
    { label: "Page views", value: summary.totals.pageViews, icon: IconGauge, tone: "neutral" },
    { label: "Tokens created", value: summary.totals.tokensCreated, icon: IconCoins, tone: "accent" },
    { label: "Wallets seen", value: summary.totals.walletsSeen, icon: IconShield, tone: "neutral" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-elevated">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <Badge tone={tone}>{label}</Badge>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.9fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">14-day activity</h2>
              <p className="mt-1 text-xs text-muted">{summary.totals.events24h.toLocaleString()} events in the last 24h</p>
            </div>
            <Badge tone="positive"><IconTrendUp className="h-3 w-3" /> Live</Badge>
          </div>
          <ActivityChart data={summary.daily} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Top pages</h2>
          <div className="space-y-3">
            {summary.topPages.length === 0 ? (
              <p className="text-sm text-muted">No page views yet.</p>
            ) : (
              summary.topPages.map((p) => <ProgressRow key={p.pagePath} label={p.pagePath} value={p.views} max={summary.topPages[0]?.views ?? 1} />)
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Recent token creates</h2>
          </div>
          <div className="divide-y divide-border">
            {summary.recentTokens.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No token create events yet.</p>
            ) : (
              summary.recentTokens.map((t, i) => <TokenRow key={`${t.token_address}-${i}`} token={t} />)
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Active wallets</h2>
          </div>
          <div className="divide-y divide-border">
            {summary.activeWallets.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No wallet activity yet.</p>
            ) : (
              summary.activeWallets.map((w) => (
                <div key={w.wallet} className="flex items-center justify-between px-5 py-3">
                  <span className="font-mono text-xs">{shortAddress(w.wallet, 6)}</span>
                  <Badge tone="neutral">{w.tokensCreated} tokens</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: Summary["daily"] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.pageViews, d.tokensCreated)));
  const points = useMemo(() => {
    if (data.length === 0) return "";
    return data
      .map((d, i) => {
        const x = data.length === 1 ? 0 : (i / (data.length - 1)) * 100;
        const y = 100 - (d.pageViews / max) * 86 - 7;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, max]);

  return (
    <div className="h-64">
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="adminLine" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--positive))" stopOpacity="0.34" />
            <stop offset="100%" stopColor="rgb(var(--positive))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`M0,100 L${points.split(" ").join(" L")} L100,100 Z`} fill="url(#adminLine)" />
        <polyline points={points} fill="none" stroke="rgb(var(--positive))" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const x = data.length === 1 ? 0 : (i / (data.length - 1)) * 100;
          const h = Math.max(1, (d.tokensCreated / max) * 62);
          return <rect key={d.day} x={Math.max(0, x - 1.2)} y={100 - h} width="2.4" height={h} rx="1" fill="rgb(var(--accent) / 0.58)" />;
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
        <span>{data[0]?.day ?? ""}</span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-positive" /> Views</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Tokens</span>
        </span>
        <span>{data[data.length - 1]?.day ?? ""}</span>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(4, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-muted">{label}</span>
        <span className="font-mono text-faint">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TokenRow({ token }: { token: Summary["recentTokens"][number] }) {
  const addr = token.token_address ?? "";
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {token.token_name || "Token"} <span className="text-muted">${token.token_symbol || "B20"}</span>
        </p>
        <p className="mt-0.5 truncate font-mono text-xs text-faint">{addr ? shortAddress(addr, 6) : "Unknown address"}</p>
      </div>
      {addr && (
        <a
          href={`${explorerUrl(token.chain_id ?? 84532)}/address/${addr}`}
          target="_blank"
          rel="noreferrer"
          className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-border/50 hover:text-fg")}
        >
          <IconExternal className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
