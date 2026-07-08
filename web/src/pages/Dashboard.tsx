import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAccount, useChainId, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { formatUnits, isAddress, parseUnits, zeroAddress } from "viem";
import { B20_ABI } from "../lib/contract";
import { chainName, explorerUrl, isSupportedChain } from "../lib/wagmi";
import { getSavedTokens, removeToken, saveToken, type SavedToken } from "../lib/storage";
import { bpsToPct, formatAmount, isAddressLike, shortAddress } from "../lib/format";
import {
  Badge,
  Button,
  Callout,
  Card,
  CopyButton,
  Field,
  Input,
  SectionCard,
  Slider,
  Switch,
  Textarea,
  cn,
} from "../components/ui";
import { TxButton } from "../components/TxButton";
import { WalletConnect } from "../components/WalletConnect";
import {
  IconAlert,
  IconArrowRight,
  IconBan,
  IconCheck,
  IconCoins,
  IconExternal,
  IconFlame,
  IconGauge,
  IconLifebuoy,
  IconLink,
  IconLock,
  IconPause,
  IconPlay,
  IconPlus,
  IconSend,
  IconShield,
  IconTrash,
  IconTrendDown,
  IconTrendUp,
  IconUsers,
} from "../components/icons";

/* Parsed on-chain snapshot passed to every panel. */
interface TokenView {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  owner: `0x${string}`;
  pendingOwner: `0x${string}`;
  maxSupply: bigint;
  taxWallet: `0x${string}`;
  buyTaxBps: number;
  sellTaxBps: number;
  burnTaxBps: number;
  mintingEnabled: boolean;
  tradingActive: boolean;
  tradingPaused: boolean;
  limitsEnabled: boolean;
  whitelistMode: boolean;
  maxTxAmount: bigint;
  maxWalletAmount: bigint;
  logoURI: string;
  balance: bigint;
}

interface Ctx {
  token: TokenView;
  isOwner: boolean;
  refetch: () => void;
}

const dashboardTone = {
  picker: {
    card: "border-sky-200/80 bg-sky-50/60 dark:border-sky-400/20 dark:bg-sky-400/[0.07]",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  },
  verify: {
    card: "border-indigo-200/80 bg-indigo-50/60 dark:border-indigo-400/20 dark:bg-indigo-400/[0.07]",
    icon: "border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-200",
  },
  tax: {
    card: "border-amber-200/80 bg-amber-50/55 dark:border-amber-400/20 dark:bg-amber-400/[0.07]",
    icon: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
  },
  trading: {
    card: "border-sky-200/80 bg-sky-50/55 dark:border-sky-400/20 dark:bg-sky-400/[0.07]",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  },
  supply: {
    card: "border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]",
    icon: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  limits: {
    card: "border-violet-200/80 bg-violet-50/55 dark:border-violet-400/20 dark:bg-violet-400/[0.07]",
    icon: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
  },
  pairs: {
    card: "border-cyan-200/80 bg-cyan-50/55 dark:border-cyan-400/20 dark:bg-cyan-400/[0.07]",
    icon: "border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200",
  },
  access: {
    card: "border-rose-200/80 bg-rose-50/55 dark:border-rose-400/20 dark:bg-rose-400/[0.07]",
    icon: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
  },
  airdrop: {
    card: "border-lime-200/80 bg-lime-50/55 dark:border-lime-400/20 dark:bg-lime-400/[0.07]",
    icon: "border-lime-200 bg-lime-100 text-lime-700 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200",
  },
  rescue: {
    card: "border-slate-200/90 bg-slate-50/70 dark:border-slate-400/20 dark:bg-slate-400/[0.07]",
    icon: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-200",
  },
};

export function Dashboard() {
  const { address: routeAddress } = useParams();
  const navigate = useNavigate();
  const chainId = useChainId();
  const { address: connected, isConnected } = useAccount();

  const [manual, setManual] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const selected = routeAddress && isAddressLike(routeAddress) ? (routeAddress as `0x${string}`) : undefined;

  const saved = useMemo(() => getSavedTokens(chainId), [chainId, selected, refreshKey]);
  const savedToken = useMemo(
    () => (selected ? saved.find((t) => t.address.toLowerCase() === selected.toLowerCase()) : undefined),
    [saved, selected]
  );

  // ---- reads (single multicall) ---------------------------------------
  const READ_FNS = [
    "name",
    "symbol",
    "decimals",
    "totalSupply",
    "owner",
    "pendingOwner",
    "maxSupply",
    "taxWallet",
    "buyTaxBps",
    "sellTaxBps",
    "burnTaxBps",
    "mintingEnabled",
    "tradingActive",
    "tradingPaused",
    "limitsEnabled",
    "whitelistMode",
    "maxTxAmount",
    "maxWalletAmount",
    "logoURI",
  ];
  const contractsBase = selected
    ? READ_FNS.map((fn) => ({ address: selected, abi: B20_ABI, functionName: fn }))
    : [];

  const { data, refetch, isLoading, isError } = useReadContracts({
    allowFailure: true,
    contracts: [
      ...contractsBase,
      { address: selected ?? zeroAddress, abi: B20_ABI, functionName: "balanceOf", args: [connected ?? zeroAddress] },
    ],
    query: { enabled: !!selected, refetchInterval: 15_000 },
  });

  const token: TokenView | null = useMemo(() => {
    if (!selected || !data || data.length < 20) return null;
    const r = (i: number) => data[i]?.result;
    if (data[0]?.status !== "success") return null; // not a readable token
    return {
      address: selected,
      name: String(r(0) ?? ""),
      symbol: String(r(1) ?? ""),
      decimals: Number(r(2) ?? 18),
      totalSupply: (r(3) as bigint) ?? 0n,
      owner: (r(4) as `0x${string}`) ?? zeroAddress,
      pendingOwner: (r(5) as `0x${string}`) ?? zeroAddress,
      maxSupply: (r(6) as bigint) ?? 0n,
      taxWallet: (r(7) as `0x${string}`) ?? zeroAddress,
      buyTaxBps: Number(r(8) ?? 0),
      sellTaxBps: Number(r(9) ?? 0),
      burnTaxBps: Number(r(10) ?? 0),
      mintingEnabled: Boolean(r(11)),
      tradingActive: Boolean(r(12)),
      tradingPaused: Boolean(r(13)),
      limitsEnabled: Boolean(r(14)),
      whitelistMode: Boolean(r(15)),
      maxTxAmount: (r(16) as bigint) ?? 0n,
      maxWalletAmount: (r(17) as bigint) ?? 0n,
      logoURI: String(r(18) ?? ""),
      balance: (r(19) as bigint) ?? 0n,
    };
  }, [data, selected]);

  // Keep local registry fresh with the real name/symbol.
  useEffect(() => {
    if (token && connected) {
      saveToken({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        chainId,
        createdAt: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token?.address, token?.name]);

  const isOwner =
    !!connected && !!token && connected.toLowerCase() === token.owner.toLowerCase();
  const isPendingOwner =
    !!connected && !!token && connected.toLowerCase() === token.pendingOwner.toLowerCase();

  function openToken(addr: string) {
    if (isAddressLike(addr)) navigate(`/dashboard/${addr}`);
  }

  // ---------------------------- picker view ----------------------------
  if (!selected) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface px-5 py-8 shadow-card sm:px-8">
          <div className="absolute inset-0 grid-dots opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-sky-50 dark:from-emerald-400/[0.08] dark:to-sky-400/[0.08]" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
              <IconGauge className="h-3.5 w-3.5" />
              Owner dashboard
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.98] text-fg sm:text-6xl">Manage your token controls.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              Pick a saved token, or paste any B20 token address on <strong className="text-fg">{chainName(chainId)}</strong>.
            </p>
          </div>
        </header>

        <Card className="mb-6 border-sky-200/80 bg-sky-50/60 p-5 shadow-card dark:border-sky-400/20 dark:bg-sky-400/[0.07]">
          <Field label="Token contract address" hint="Manage any token deployed with this studio.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value.trim())}
                placeholder="0x..."
                className="font-mono text-sm"
                onKeyDown={(e) => e.key === "Enter" && openToken(manual)}
              />
              <Button disabled={!isAddressLike(manual)} onClick={() => openToken(manual)} className="gap-1.5 whitespace-nowrap">
                Open <IconArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </Card>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Your tokens on {chainName(chainId)}</h2>
          <Link to="/create" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:opacity-70">
            <IconPlus className="h-4 w-4" /> New token
          </Link>
        </div>

        {saved.length === 0 ? (
          <Card className="grid place-items-center border-violet-200/80 bg-violet-50/60 px-6 py-14 text-center dark:border-violet-400/20 dark:bg-violet-400/[0.07]">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200">
              <IconCoins className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted">No tokens yet on this network.</p>
            <Link to="/create" className="mt-4">
              <Button className="gap-1.5">
                <IconPlus className="h-4 w-4" /> Create your first token
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {saved.map((t) => (
              <SavedRow key={t.address} t={t} onOpen={() => openToken(t.address)} onRemove={() => { removeToken(t.address, chainId); setRefreshKey((k) => k + 1); }} chainId={chainId} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --------------------------- loading / error --------------------------
  if (!isSupportedChain(chainId)) {
    return (
      <Centered>
        <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />} title="Wrong network">
          Switch to Base Sepolia to manage this token.
        </Callout>
      </Centered>
    );
  }

  if (isLoading || (!token && !isError)) {
    return (
      <Centered>
        <div className="animate-pulse text-sm text-muted">Loading token...</div>
      </Centered>
    );
  }

  if (!token || isError) {
    return (
      <Centered>
        <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />} title="Couldn't read this token">
          <p>
            <code className="font-mono text-xs">{selected}</code> doesn't look like a readable token on {chainName(chainId)}.
            Double-check the address and network.
          </p>
          <Link to="/dashboard" className="mt-2 inline-block underline">Back to token list</Link>
        </Callout>
      </Centered>
    );
  }

  const ctx: Ctx = { token, isOwner, refetch };
  const renounced = token.owner === zeroAddress;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        All tokens
      </Link>

      {/* Identity header */}
      <Card className="mb-5 overflow-hidden border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]">
        <div className="h-1 bg-gradient-to-r from-emerald-300 via-sky-200 to-violet-200 dark:from-emerald-400/50 dark:via-sky-400/30 dark:to-violet-400/30" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {token.logoURI ? (
              <img src={token.logoURI} alt="" className="h-14 w-14 rounded-full border border-border object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full border border-emerald-200 bg-emerald-100 font-mono text-lg font-semibold text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
                {token.symbol.slice(0, 3)}
              </span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-4xl leading-none text-fg">{token.name}</h1>
                <span className="font-mono text-sm text-muted">${token.symbol}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="font-mono text-xs text-faint">{shortAddress(token.address, 6)}</code>
                <CopyButton value={token.address} label="" />
                <a href={`${explorerUrl(chainId)}/token/${token.address}`} target="_blank" rel="noreferrer" className="text-faint hover:text-fg">
                  <IconExternal className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {renounced ? (
              <Badge tone="positive"><IconShield className="h-3 w-3" /> Renounced</Badge>
            ) : isOwner ? (
              <Badge tone="accent"><IconShield className="h-3 w-3" /> You're the owner</Badge>
            ) : (
              <Badge tone="neutral">Read-only</Badge>
            )}
            {token.tradingActive ? (
              token.tradingPaused ? <Badge tone="negative"><IconPause className="h-3 w-3" /> Paused</Badge> : <Badge tone="positive"><IconPlay className="h-3 w-3" /> Live</Badge>
            ) : (
              <Badge tone="warn">Not launched</Badge>
            )}
            {token.mintingEnabled ? <Badge tone="neutral">Mintable</Badge> : <Badge tone="neutral">Fixed supply</Badge>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-emerald-200/70 bg-emerald-200/70 dark:border-emerald-400/20 dark:bg-emerald-400/20 sm:grid-cols-4">
          <MiniStat tone="mint" label="Total supply" value={formatAmount(token.totalSupply, token.decimals)} />
          <MiniStat tone="sky" label="Your balance" value={formatAmount(token.balance, token.decimals)} />
          <MiniStat tone="violet" label="Max supply" value={token.maxSupply === 0n ? "Uncapped" : formatAmount(token.maxSupply, token.decimals)} />
          <MiniStat tone="amber" label="Buy / Sell tax" value={`${bpsToPct(token.buyTaxBps)}% / ${bpsToPct(token.sellTaxBps)}%`} />
        </div>
      </Card>

      {isConnected && !isOwner && !renounced && (
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />} title="You're not the owner">
          You can view everything, but only the owner wallet ({shortAddress(token.owner)}) can make changes.
        </Callout>
      )}
      {!isConnected && (
        <Card className="mb-5 flex flex-col items-center gap-3 border-sky-200/80 bg-sky-50/60 p-5 text-center dark:border-sky-400/20 dark:bg-sky-400/[0.07] sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-muted">Connect the owner wallet to unlock controls.</p>
          <WalletConnect />
        </Card>
      )}

      <VerifyPanel token={token} chainId={chainId} savedToken={savedToken} onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* Panels */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TaxPanel {...ctx} />
        <TradingPanel {...ctx} />
        <SupplyPanel {...ctx} />
        <LimitsPanel {...ctx} />
        <PairsPanel {...ctx} />
        <AccessPanel {...ctx} />
        <AirdropPanel {...ctx} />
        <OwnershipPanel {...ctx} isPendingOwner={isPendingOwner} />
        <RescuePanel {...ctx} />
      </div>
    </div>
  );
}

/* ------------------------------ small bits ------------------------------- */

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">{children}</div>;
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone: "mint" | "sky" | "violet" | "amber" }) {
  const toneClass = {
    mint: "bg-emerald-50/95 dark:bg-emerald-400/[0.08]",
    sky: "bg-sky-50/95 dark:bg-sky-400/[0.08]",
    violet: "bg-violet-50/95 dark:bg-violet-400/[0.08]",
    amber: "bg-amber-50/95 dark:bg-amber-400/[0.08]",
  }[tone];
  return (
    <div className={cn("px-4 py-3", toneClass)}>
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-semibold">{value}</p>
    </div>
  );
}

function SavedRow({ t, onOpen, onRemove, chainId }: { t: SavedToken; onOpen: () => void; onRemove: () => void; chainId: number }) {
  return (
    <Card className="flex items-center justify-between border-sky-200/70 bg-sky-50/45 p-4 transition hover:border-sky-300 dark:border-sky-400/20 dark:bg-sky-400/[0.06]">
      <button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-200 bg-sky-100 font-mono text-xs font-semibold text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200">
          {t.symbol.slice(0, 3)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{t.name} <span className="text-muted">${t.symbol}</span></p>
          <p className="truncate font-mono text-xs text-faint">{shortAddress(t.address, 6)}</p>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <a href={`${explorerUrl(chainId)}/token/${t.address}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-border/50 hover:text-fg">
          <IconExternal className="h-4 w-4" />
        </a>
        <button onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-negative/10 hover:text-negative" title="Remove from list">
          <IconTrash className="h-4 w-4" />
        </button>
        <button onClick={onOpen} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-fg">
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

/* ================================ PANELS ================================= */

type VerifyStatus = "checking" | "ready" | "pending" | "verified" | "failed" | "not_configured";

interface VerifyResponse {
  status: VerifyStatus;
  message?: string;
  error?: string;
  guid?: string;
  explorerUrl?: string;
}

function VerifyPanel({
  token,
  chainId,
  savedToken,
  onSaved,
}: {
  token: TokenView;
  chainId: number;
  savedToken?: SavedToken;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<VerifyStatus>(savedToken?.verifiedAt ? "verified" : "checking");
  const [message, setMessage] = useState(savedToken?.verifiedAt ? "Verified and published on BaseScan." : "Checking BaseScan...");
  const [guid, setGuid] = useState(savedToken?.verifyGuid ?? "");
  const [busy, setBusy] = useState(false);
  const explorer = `${explorerUrl(chainId)}/address/${token.address}#code`;
  const pendingTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const nextStatus = savedToken?.verifiedAt ? "verified" : savedToken?.verifyGuid ? "pending" : "checking";
    setStatus(nextStatus);
    setMessage(
      savedToken?.verifiedAt
        ? "Verified and published on BaseScan."
        : savedToken?.verifyGuid
          ? "BaseScan is processing the request."
          : "Checking BaseScan..."
    );
    setGuid(savedToken?.verifyGuid ?? "");
  }, [savedToken?.verifiedAt, savedToken?.verifyGuid, token.address]);

  useEffect(() => {
    if (savedToken?.verifiedAt) return;
    let cancelled = false;
    verifyRequest({
      action: savedToken?.verifyGuid && !savedToken?.verifiedAt ? "status" : "lookup",
      address: token.address,
      chainId,
      guid: savedToken?.verifyGuid,
    }).then((res) => {
      if (cancelled) return;
      applyVerifyResult(res, token, chainId, savedToken, setStatus, setMessage, setGuid, onSaved);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token.address, chainId, savedToken?.verifyGuid, savedToken?.verifiedAt]);

  useEffect(() => {
    window.clearTimeout(pendingTimer.current);
    if (status !== "pending" || !guid) return;
    pendingTimer.current = window.setTimeout(async () => {
      const res = await verifyRequest({ action: "status", address: token.address, chainId, guid });
      applyVerifyResult(res, token, chainId, savedToken, setStatus, setMessage, setGuid, onSaved);
    }, 6500);
    return () => window.clearTimeout(pendingTimer.current);
  }, [status, guid, token, chainId, savedToken, onSaved]);

  async function startVerify() {
    setBusy(true);
    setStatus("pending");
    setMessage("Submitting to BaseScan...");
    const res = await verifyRequest({
      action: "submit",
      address: token.address,
      chainId,
      txHash: savedToken?.txHash,
      config: savedToken?.verifyConfig,
    });
    applyVerifyResult(res, token, chainId, savedToken, setStatus, setMessage, setGuid, onSaved);
    setBusy(false);
  }

  const verified = status === "verified";
  const pending = status === "checking" || status === "pending" || busy;
  const failed = status === "failed" || status === "not_configured";

  return (
    <SectionCard
      icon={verified ? <IconCheck className="h-5 w-5" /> : <IconShield className="h-5 w-5" />}
      title="BaseScan verify & publish"
      desc={verified ? "Source code is public and matched." : "Publish source code with one click."}
      className={dashboardTone.verify.card}
      iconClassName={verified ? "border-positive/25 bg-positive/10 text-positive" : dashboardTone.verify.icon}
      action={
        <Badge tone={verified ? "positive" : status === "pending" ? "warn" : failed ? "negative" : "neutral"}>
          {verified ? "Published" : status === "pending" ? "Processing" : failed ? "Needs setup" : "Ready"}
        </Badge>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className={cn("text-sm font-medium", failed ? "text-negative" : verified ? "text-positive" : "text-fg")}>
            {message}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {verified
              ? "Anyone can inspect the matched contract source on BaseScan."
              : status === "not_configured"
                ? "Server API key is missing. Add BASESCAN_API_KEY in Vercel to enable this button."
                : "No terminal command or manual constructor arguments needed."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
          <Button
            onClick={startVerify}
            loading={pending}
            disabled={verified || pending || status === "not_configured"}
            fullWidth
            className="whitespace-nowrap"
            variant={failed ? "secondary" : "primary"}
          >
            {verified ? <><IconCheck className="h-4 w-4" /> Published</> : "Verify & publish"}
          </Button>
          <a href={explorer} target="_blank" rel="noreferrer">
            <Button variant="outline" fullWidth className="gap-1.5 whitespace-nowrap">
              <IconExternal className="h-4 w-4" /> BaseScan code
            </Button>
          </a>
        </div>
      </div>
    </SectionCard>
  );
}

async function verifyRequest(payload: Record<string, unknown>): Promise<VerifyResponse> {
  try {
    const res = await fetch("/api/verify-contract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as VerifyResponse;
    return {
      status: json.status || (res.ok ? "ready" : "failed"),
      message: json.message,
      error: json.error,
      guid: json.guid,
      explorerUrl: json.explorerUrl,
    };
  } catch {
    return { status: "failed", error: "Could not reach verification service." };
  }
}

function applyVerifyResult(
  res: VerifyResponse,
  token: TokenView,
  chainId: number,
  savedToken: SavedToken | undefined,
  setStatus: (status: VerifyStatus) => void,
  setMessage: (message: string) => void,
  setGuid: (guid: string) => void,
  onSaved: () => void
) {
  const nextStatus = res.status || "failed";
  setStatus(nextStatus);
  setMessage(res.message || res.error || fallbackVerifyMessage(nextStatus));
  if (res.guid) setGuid(res.guid);

  if (nextStatus === "pending" && res.guid) {
    saveToken({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      chainId,
      createdAt: savedToken?.createdAt ?? Date.now(),
      deployer: savedToken?.deployer,
      txHash: savedToken?.txHash,
      verifyConfig: savedToken?.verifyConfig,
      verifyGuid: res.guid,
    });
    onSaved();
  }

  if (nextStatus === "verified") {
    saveToken({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      chainId,
      createdAt: savedToken?.createdAt ?? Date.now(),
      deployer: savedToken?.deployer,
      txHash: savedToken?.txHash,
      verifyConfig: savedToken?.verifyConfig,
      verifyGuid: res.guid ?? savedToken?.verifyGuid,
      verifiedAt: Date.now(),
    });
    onSaved();
  }
}

function fallbackVerifyMessage(status: VerifyStatus) {
  if (status === "verified") return "Verified and published on BaseScan.";
  if (status === "pending") return "BaseScan is processing the request.";
  if (status === "not_configured") return "Verification is not configured yet.";
  if (status === "ready") return "Ready to publish on BaseScan.";
  return "Verification failed. Try again.";
}

function TaxPanel({ token, isOwner, refetch }: Ctx) {
  const [buy, setBuy] = useState(bpsToPct(token.buyTaxBps));
  const [sell, setSell] = useState(bpsToPct(token.sellTaxBps));
  const [burn, setBurn] = useState(bpsToPct(token.burnTaxBps));
  const [wallet, setWallet] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveStep, setSaveStep] = useState("");
  const lastToken = useRef(token.address);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const buyBps = Math.round(buy * 100);
  const sellBps = Math.round(sell * 100);
  const burnBps = Math.round(burn * 100);
  const dirty = buyBps !== token.buyTaxBps || sellBps !== token.sellTaxBps || burnBps !== token.burnTaxBps;

  useEffect(() => {
    const nextBuy = bpsToPct(token.buyTaxBps);
    const nextSell = bpsToPct(token.sellTaxBps);
    const nextBurn = bpsToPct(token.burnTaxBps);
    if (lastToken.current !== token.address) {
      lastToken.current = token.address;
      setBuy(nextBuy);
      setSell(nextSell);
      setBurn(nextBurn);
      return;
    }
    if (!dirty) {
      setBuy(nextBuy);
      setSell(nextSell);
      setBurn(nextBurn);
    }
  }, [token.address, token.buyTaxBps, token.sellTaxBps, token.burnTaxBps, dirty]);

  const buyOk = buy + burn <= 25;
  const sellOk = sell + burn <= 25;
  const feeChanges = [
    { label: "Buy tax", fn: "setBuyTax", value: buyBps, current: token.buyTaxBps },
    { label: "Sell tax", fn: "setSellTax", value: sellBps, current: token.sellTaxBps },
    { label: "Burn tax", fn: "setBurnTax", value: burnBps, current: token.burnTaxBps },
  ]
    .filter((x) => x.value !== x.current)
    .sort((a, b) => Number(a.value > a.current) - Number(b.value > b.current));

  async function saveFees() {
    if (!isOwner || !buyOk || !sellOk || feeChanges.length === 0 || !publicClient) return;
    setSaving(true);
    setDone(false);
    setSaveError("");
    try {
      for (const change of feeChanges) {
        setSaveStep(change.label);
        const hash = await writeContractAsync({
          address: token.address,
          abi: B20_ABI,
          functionName: change.fn,
          args: [change.value],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setDone(true);
      setSaveStep("");
      refetch();
      window.setTimeout(() => setDone(false), 1600);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save fees.";
      setSaveError(message.includes("User rejected") ? "Rejected in wallet." : message.split("\n")[0].slice(0, 140));
    } finally {
      setSaving(false);
    }
  }

  const row = (
    label: string,
    tone: "positive" | "negative" | "neutral",
    icon: React.ReactNode,
    value: number,
    onChange: (v: number) => void,
    current: number,
    ok: boolean
  ) => (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">{icon} {label}</span>
        <Badge tone={tone === "neutral" ? "neutral" : tone}>{value.toFixed(1)}%</Badge>
      </div>
      <Slider value={value} min={0} max={25} step={0.5} onChange={onChange} tone={tone} disabled={!isOwner} />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-faint">On-chain: {bpsToPct(current)}%</span>
        {Math.round(value * 100) !== current && <Badge tone="warn">Unsaved</Badge>}
      </div>
      {!ok && <p className="mt-1 text-xs text-negative">Combined with burn tax must be at most 25%.</p>}
    </div>
  );

  return (
    <SectionCard
      icon={<IconTrendUp className="h-5 w-5" />}
      title="Buy / sell tax"
      desc="Adjust trading fees live. Capped at 25% on-chain."
      className={dashboardTone.tax.card}
      iconClassName={dashboardTone.tax.icon}
    >
      <div className="space-y-5">
        {row("Buy tax", "positive", <IconTrendUp className="h-4 w-4 text-positive" />, buy, setBuy, token.buyTaxBps, buyOk)}
        {row("Sell tax", "negative", <IconTrendDown className="h-4 w-4 text-negative" />, sell, setSell, token.sellTaxBps, sellOk)}
        {row("Burn on transfer", "neutral", <IconFlame className="h-4 w-4" />, burn, setBurn, token.burnTaxBps, buyOk && sellOk)}

        <div className="rounded-xl border border-amber-200/70 bg-surface/80 px-4 py-3 dark:border-amber-400/20 dark:bg-surface/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{dirty ? `${feeChanges.length} fee change${feeChanges.length === 1 ? "" : "s"} ready` : "Fees match on-chain"}</p>
              <p className="mt-0.5 text-xs text-muted">
                {feeChanges.length > 1 ? "Your wallet will ask once for each changed fee." : "Saved values stay visible after refresh."}
              </p>
            </div>
            <Button
              variant={done ? "success" : "primary"}
              loading={saving}
              disabled={!isOwner || !dirty || !buyOk || !sellOk || saving}
              onClick={saveFees}
              className="whitespace-nowrap"
            >
              {done ? <><IconCheck className="h-4 w-4" /> Saved</> : saving ? `Saving ${saveStep}...` : "Save fee changes"}
            </Button>
          </div>
          {saveError && <p className="mt-2 text-xs text-negative">{saveError}</p>}
        </div>

        <div className="border-t border-border pt-4">
          <Field label="Tax collector wallet" hint={`Currently ${shortAddress(token.taxWallet, 6)}`}>
            <div className="flex gap-2">
              <Input value={wallet} onChange={(e) => setWallet(e.target.value.trim())} placeholder={token.taxWallet} className="font-mono text-xs" disabled={!isOwner} />
              <TxButton
                size="md"
                variant="secondary"
                disabled={!isOwner || !isAddress(wallet)}
                build={() => ({ address: token.address, abi: B20_ABI, functionName: "setTaxWallet", args: [wallet as `0x${string}`] })}
                onSuccess={() => { setWallet(""); refetch(); }}
              >
                Set
              </TxButton>
            </div>
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}

function TradingPanel({ token, isOwner, refetch }: Ctx) {
  return (
    <SectionCard
      icon={<IconLock className="h-5 w-5" />}
      title="Trading"
      desc="Open the market on your signal, or pause instantly."
      className={dashboardTone.trading.card}
      iconClassName={dashboardTone.trading.icon}
    >
      <div className="space-y-4">
        {!token.tradingActive ? (
          <div>
            <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
              Trading is <strong>not live</strong>. Only owner/excluded wallets can move tokens (so you can add liquidity first).
            </Callout>
            <div className="mt-3">
              <TxButton
                fullWidth
                disabled={!isOwner}
                build={() => ({ address: token.address, abi: B20_ABI, functionName: "enableTrading", args: [] })}
                onSuccess={refetch}
                confirmLabel="Enable trading for everyone? This is permanent and cannot be undone."
              >
                <IconPlay className="h-4 w-4" /> Enable trading (permanent)
              </TxButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-sky-200/70 bg-surface/80 px-4 py-3 dark:border-sky-400/20 dark:bg-surface/70">
            <div>
              <p className="text-sm font-medium">{token.tradingPaused ? "Trading paused" : "Trading live"}</p>
              <p className="text-xs text-muted">Emergency switch for pausing all non-exempt transfers.</p>
            </div>
            <TxButton
              size="sm"
              variant={token.tradingPaused ? "success" : "danger"}
              disabled={!isOwner}
              build={() => ({ address: token.address, abi: B20_ABI, functionName: "setTradingPaused", args: [!token.tradingPaused] })}
              onSuccess={refetch}
            >
              {token.tradingPaused ? <><IconPlay className="h-4 w-4" /> Resume</> : <><IconPause className="h-4 w-4" /> Pause</>}
            </TxButton>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function SupplyPanel({ token, isOwner, refetch }: Ctx) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const canMint = isOwner && token.mintingEnabled;
  let mintArgs: readonly unknown[] | null = null;
  try {
    if (isAddress(to) && amount && Number(amount) > 0) {
      mintArgs = [to as `0x${string}`, parseUnits(amount, token.decimals)];
    }
  } catch { mintArgs = null; }

  return (
    <SectionCard
      icon={<IconCoins className="h-5 w-5" />}
      title="Supply & minting"
      desc={token.mintingEnabled ? "Mint new tokens or lock minting forever." : "Minting is permanently disabled."}
      className={dashboardTone.supply.card}
      iconClassName={dashboardTone.supply.icon}
    >
      {token.mintingEnabled ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <Field label="Recipient">
              <Input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="0x..." className="font-mono text-xs" disabled={!canMint} />
            </Field>
            <Field label="Amount">
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="1000" disabled={!canMint} />
            </Field>
          </div>
          {token.maxSupply !== 0n && (
            <p className="text-xs text-faint">
              Cap: {formatAmount(token.maxSupply, token.decimals)} | Room to mint: {formatAmount(token.maxSupply - token.totalSupply, token.decimals)}
            </p>
          )}
          <TxButton fullWidth disabled={!canMint || !mintArgs} build={() => mintArgs ? { address: token.address, abi: B20_ABI, functionName: "mint", args: mintArgs } : null} onSuccess={() => { setAmount(""); refetch(); }}>
            <IconPlus className="h-4 w-4" /> Mint tokens
          </TxButton>
          <div className="border-t border-border pt-4">
            <TxButton
              fullWidth
              variant="danger"
              disabled={!isOwner}
              build={() => ({ address: token.address, abi: B20_ABI, functionName: "renounceMint", args: [] })}
              onSuccess={refetch}
              confirmLabel="Permanently disable minting? Total supply becomes fixed forever."
            >
              <IconLock className="h-4 w-4" /> Disable minting forever
            </TxButton>
          </div>
        </div>
      ) : (
        <Callout tone="positive" icon={<IconLock className="h-4 w-4" />}>
          Supply is <strong>fixed</strong> at {formatAmount(token.totalSupply, token.decimals)} {token.symbol}. No more tokens can ever be minted.
        </Callout>
      )}
    </SectionCard>
  );
}

function LimitsPanel({ token, isOwner, refetch }: Ctx) {
  const dec = token.decimals;
  const [maxTx, setMaxTx] = useState(token.maxTxAmount === 0n ? "" : formatUnits(token.maxTxAmount, dec));
  const [maxWallet, setMaxWallet] = useState(token.maxWalletAmount === 0n ? "" : formatUnits(token.maxWalletAmount, dec));

  useEffect(() => {
    setMaxTx(token.maxTxAmount === 0n ? "" : formatUnits(token.maxTxAmount, dec));
    setMaxWallet(token.maxWalletAmount === 0n ? "" : formatUnits(token.maxWalletAmount, dec));
  }, [token.maxTxAmount, token.maxWalletAmount, dec]);

  let args: readonly unknown[] | null = null;
  try {
    args = [maxTx ? parseUnits(maxTx, dec) : 0n, maxWallet ? parseUnits(maxWallet, dec) : 0n];
  } catch { args = null; }

  return (
    <SectionCard
      icon={<IconUsers className="h-5 w-5" />}
      title="Anti-whale limits"
      desc="Cap per-transaction and per-wallet amounts."
      className={dashboardTone.limits.card}
      iconClassName={dashboardTone.limits.icon}
      action={
        <TxButton
          size="sm"
          variant={token.limitsEnabled ? "danger" : "secondary"}
          disabled={!isOwner}
          build={() => ({ address: token.address, abi: B20_ABI, functionName: "setLimitsEnabled", args: [!token.limitsEnabled] })}
          onSuccess={refetch}
        >
          {token.limitsEnabled ? "Turn off" : "Turn on"}
        </TxButton>
      }
    >
      <div className="space-y-4">
        <Badge tone={token.limitsEnabled ? "positive" : "neutral"}>{token.limitsEnabled ? "Limits enforced" : "Limits off"}</Badge>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Max transaction (${token.symbol})`} hint="Blank / 0 = unlimited">
            <Input inputMode="decimal" value={maxTx} onChange={(e) => setMaxTx(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Unlimited" disabled={!isOwner} />
          </Field>
          <Field label={`Max wallet (${token.symbol})`} hint="Blank / 0 = unlimited">
            <Input inputMode="decimal" value={maxWallet} onChange={(e) => setMaxWallet(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Unlimited" disabled={!isOwner} />
          </Field>
        </div>
        <TxButton fullWidth variant="secondary" disabled={!isOwner || !args} build={() => (args ? { address: token.address, abi: B20_ABI, functionName: "setLimits", args } : null)} onSuccess={refetch}>
          Save limits
        </TxButton>
      </div>
    </SectionCard>
  );
}

function PairsPanel({ token, isOwner, refetch }: Ctx) {
  const [pair, setPair] = useState("");
  const valid = isAddress(pair);
  return (
    <SectionCard
      icon={<IconLink className="h-5 w-5" />}
      title="DEX pairs"
      desc="Register your liquidity pair so buy/sell tax applies to trades."
      className={dashboardTone.pairs.card}
      iconClassName={dashboardTone.pairs.icon}
    >
      <Callout tone="neutral" icon={<IconAlert className="h-4 w-4" />}>
        After adding liquidity on a DEX (e.g. Aerodrome/Uniswap), paste the <strong>pair/pool address</strong> and mark it as a pair.
      </Callout>
      <Field label="Pair address">
        <Input value={pair} onChange={(e) => setPair(e.target.value.trim())} placeholder="0x..." className="font-mono text-xs" disabled={!isOwner} />
      </Field>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <TxButton variant="secondary" disabled={!isOwner || !valid} build={() => ({ address: token.address, abi: B20_ABI, functionName: "setAMMPair", args: [pair as `0x${string}`, true] })} onSuccess={() => { setPair(""); refetch(); }}>
          Mark as pair
        </TxButton>
        <TxButton variant="outline" disabled={!isOwner || !valid} build={() => ({ address: token.address, abi: B20_ABI, functionName: "setAMMPair", args: [pair as `0x${string}`, false] })} onSuccess={() => { setPair(""); refetch(); }}>
          Unmark
        </TxButton>
      </div>
    </SectionCard>
  );
}

function AccessPanel({ token, isOwner, refetch }: Ctx) {
  const [addr, setAddr] = useState("");
  const valid = isAddress(addr);
  return (
    <SectionCard
      icon={<IconBan className="h-5 w-5" />}
      title="Blacklist & whitelist"
      desc="Block bad actors, or run a strict allowlist."
      className={dashboardTone.access.card}
      iconClassName={dashboardTone.access.icon}
    >
      <div className="space-y-4">
        <Field label="Account address">
          <Input value={addr} onChange={(e) => setAddr(e.target.value.trim())} placeholder="0x..." className="font-mono text-xs" disabled={!isOwner} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <TxButton variant="danger" disabled={!isOwner || !valid} build={() => ({ address: token.address, abi: B20_ABI, functionName: "setBlacklist", args: [addr as `0x${string}`, true] })} onSuccess={refetch}>
            <IconBan className="h-4 w-4" /> Blacklist
          </TxButton>
          <TxButton variant="outline" disabled={!isOwner || !valid} build={() => ({ address: token.address, abi: B20_ABI, functionName: "setBlacklist", args: [addr as `0x${string}`, false] })} onSuccess={refetch}>
            Un-blacklist
          </TxButton>
        </div>

        <div className="border-t border-rose-200/70 pt-4 dark:border-rose-400/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Whitelist-only mode</p>
              <p className="text-xs text-muted">When on, only whitelisted wallets can transfer.</p>
            </div>
            <Switch checked={token.whitelistMode} disabled={!isOwner} onChange={() => {}} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TxButton size="sm" variant={token.whitelistMode ? "danger" : "secondary"} disabled={!isOwner} build={() => ({ address: token.address, abi: B20_ABI, functionName: "setWhitelistMode", args: [!token.whitelistMode] })} onSuccess={refetch}>
              {token.whitelistMode ? "Disable mode" : "Enable mode"}
            </TxButton>
            <TxButton size="sm" variant="outline" disabled={!isOwner || !valid} build={() => ({ address: token.address, abi: B20_ABI, functionName: "setWhitelist", args: [addr as `0x${string}`, true] })} onSuccess={refetch}>
              Whitelist address
            </TxButton>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function AirdropPanel({ token, refetch }: Ctx) {
  const { address: connected } = useAccount();
  const [raw, setRaw] = useState("");

  const parsed = useMemo(() => {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const recipients: `0x${string}`[] = [];
    const amounts: bigint[] = [];
    let error = "";
    for (const line of lines) {
      const [a, amt] = line.split(/[,\s]+/);
      if (!isAddress(a)) { error = `Invalid address: ${a}`; break; }
      try {
        const v = parseUnits(amt ?? "0", token.decimals);
        if (v <= 0n) { error = `Invalid amount on line: ${line}`; break; }
        recipients.push(a);
        amounts.push(v);
      } catch { error = `Invalid amount on line: ${line}`; break; }
    }
    const total = amounts.reduce((s, x) => s + x, 0n);
    return { recipients, amounts, error, total };
  }, [raw, token.decimals]);

  const balance = token.balance;
  const enough = connected ? parsed.total <= balance : false;
  const ready = !!connected && parsed.recipients.length > 0 && !parsed.error && enough;

  return (
    <SectionCard
      icon={<IconSend className="h-5 w-5" />}
      title="Batch airdrop"
      desc="Send tokens to many wallets in one transaction (from your wallet)."
      className={dashboardTone.airdrop.card}
      iconClassName={dashboardTone.airdrop.icon}
    >
      <div className="space-y-3">
        <Field label="Recipients" hint="One per line: address, amount">
          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"0xabc..., 1000\n0xdef..., 2500"} />
        </Field>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{parsed.recipients.length} recipients | {formatAmount(parsed.total, token.decimals)} {token.symbol}</span>
          {connected && !enough && parsed.recipients.length > 0 && <span className="text-negative">Exceeds your balance</span>}
        </div>
        {parsed.error && <p className="text-xs text-negative">{parsed.error}</p>}
        <TxButton fullWidth disabled={!ready} build={() => ({ address: token.address, abi: B20_ABI, functionName: "airdrop", args: [parsed.recipients, parsed.amounts] })} onSuccess={() => { setRaw(""); refetch(); }}>
          <IconSend className="h-4 w-4" /> Send airdrop
        </TxButton>
      </div>
    </SectionCard>
  );
}

function OwnershipPanel({ token, isOwner, refetch, isPendingOwner }: Ctx & { isPendingOwner: boolean }) {
  const [newOwner, setNewOwner] = useState("");
  const valid = isAddress(newOwner);
  const renounced = token.owner === zeroAddress;

  return (
    <SectionCard
      danger
      icon={<IconShield className="h-5 w-5" />}
      title="Ownership"
      desc="Transfer control (2-step) or renounce it entirely."
      className="border-rose-200/90 bg-rose-50/65 dark:border-rose-400/20 dark:bg-rose-400/[0.08]"
      iconClassName={dashboardTone.access.icon}
    >
      {renounced ? (
        <Callout tone="positive" icon={<IconShield className="h-4 w-4" />}>
          Ownership is <strong>renounced</strong>. No one can change this token's settings. It is fully decentralized.
        </Callout>
      ) : (
        <div className="space-y-4">
          {token.pendingOwner !== zeroAddress && (
            <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
              Pending transfer to <code className="font-mono text-xs">{shortAddress(token.pendingOwner, 6)}</code>. They must accept it.
              {isPendingOwner && (
                <div className="mt-2">
                  <TxButton size="sm" build={() => ({ address: token.address, abi: B20_ABI, functionName: "acceptOwnership", args: [] })} onSuccess={refetch}>
                    Accept ownership
                  </TxButton>
                </div>
              )}
            </Callout>
          )}
          <Field label="Transfer ownership to" hint="New owner must accept in a second transaction.">
            <div className="flex gap-2">
              <Input value={newOwner} onChange={(e) => setNewOwner(e.target.value.trim())} placeholder="0x..." className="font-mono text-xs" disabled={!isOwner} />
              <TxButton variant="secondary" disabled={!isOwner || !valid} build={() => ({ address: token.address, abi: B20_ABI, functionName: "transferOwnership", args: [newOwner as `0x${string}`] })} onSuccess={() => { setNewOwner(""); refetch(); }}>
                Transfer
              </TxButton>
            </div>
          </Field>
          <div className="border-t border-rose-200/70 pt-4 dark:border-rose-400/20">
            <TxButton
              fullWidth
              variant="danger"
              disabled={!isOwner}
              build={() => ({ address: token.address, abi: B20_ABI, functionName: "renounceOwnership", args: [] })}
              onSuccess={refetch}
              confirmLabel="Renounce ownership? You will PERMANENTLY lose all admin control of this token."
            >
              <IconShield className="h-4 w-4" /> Renounce ownership
            </TxButton>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function RescuePanel({ token, isOwner, refetch }: Ctx) {
  const [tokenAddr, setTokenAddr] = useState("");
  const [amount, setAmount] = useState("");
  let args: readonly unknown[] | null = null;
  try {
    if (isAddress(tokenAddr) && amount && Number(amount) > 0) {
      // Foreign token rescue assumes 18 decimals for the input convenience.
      args = [tokenAddr as `0x${string}`, parseUnits(amount, 18)];
    }
  } catch { args = null; }

  return (
    <SectionCard
      icon={<IconLifebuoy className="h-5 w-5" />}
      title="Rescue stuck funds"
      desc="Recover tokens or ETH accidentally sent to the contract."
      className={dashboardTone.rescue.card}
      iconClassName={dashboardTone.rescue.icon}
    >
      <div className="space-y-3">
        <Field label="Foreign token address">
          <Input value={tokenAddr} onChange={(e) => setTokenAddr(e.target.value.trim())} placeholder="0x... (not this token)" className="font-mono text-xs" disabled={!isOwner} />
        </Field>
        <Field label="Amount (18 decimals)" hint="Enter the human amount to pull back to the owner.">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="1000" disabled={!isOwner} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <TxButton variant="secondary" disabled={!isOwner || !args} build={() => (args ? { address: token.address, abi: B20_ABI, functionName: "rescueTokens", args } : null)} onSuccess={() => { setAmount(""); setTokenAddr(""); refetch(); }}>
            Rescue token
          </TxButton>
          <TxButton variant="outline" disabled={!isOwner} build={() => ({ address: token.address, abi: B20_ABI, functionName: "rescueETH", args: [] })} onSuccess={refetch}>
            Rescue ETH
          </TxButton>
        </div>
      </div>
    </SectionCard>
  );
}
