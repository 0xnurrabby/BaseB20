import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAccount, useChainId, useReadContracts, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatUnits, isAddress, parseUnits, zeroAddress } from "viem";
import {
  B20_ABI,
  B20_FACTORY_ABI,
  B20_FACTORY_ADDRESS,
  B20_ROLES,
  MAX_UINT128,
  PAUSABLE_FEATURES,
  ROLE_OPTIONS,
  isNoCap,
} from "../lib/contract";
import { DEFAULT_CHAIN_ID, chainName, explorerUrl, getTargetChainId, isSupportedChain, type SupportedChainId } from "../lib/wagmi";
import { getSavedTokens, removeToken, saveToken, type SavedToken } from "../lib/storage";
import { formatAmount, isAddressLike, shortAddress } from "../lib/format";
import { Badge, Button, Callout, Card, CopyButton, Field, Input, SectionCard, Textarea, cn } from "../components/ui";
import { TxButton, TxChainProvider } from "../components/TxButton";
import { WalletConnect } from "../components/WalletConnect";
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconCoins,
  IconExternal,
  IconFlame,
  IconGauge,
  IconInfo,
  IconLock,
  IconPause,
  IconPlay,
  IconPlus,
  IconSend,
  IconShield,
  IconSparkles,
  IconTrash,
  IconUsers,
} from "../components/icons";
import { TokenLogo } from "../components/TokenLogo";
import { AddToWalletButton } from "../components/AddToWalletButton";
import { LogoPicker } from "../components/LogoPicker";
import { logoUrlError, extractCid, pinataGatewayUrl } from "../lib/image-url";
import { uploadTokenMetadata } from "../lib/ipfs";

type RoleKey = keyof typeof B20_ROLES;

interface TokenView {
  address: `0x${string}`;
  factoryInitialized: boolean;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  supplyCap: bigint;
  contractURI: string;
  logoURI: string;
  balance: bigint;
  roles: Record<RoleKey, boolean>;
  paused: Record<"transfer" | "mint" | "burn", boolean>;
}

interface Ctx {
  token: TokenView;
  chainId: SupportedChainId;
  connected?: `0x${string}`;
  refetch: () => void;
}

const tones = {
  picker: {
    card: "border-sky-200/80 bg-sky-50/60 dark:border-sky-400/20 dark:bg-sky-400/[0.07]",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  },
  mint: {
    card: "border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]",
    icon: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  cap: {
    card: "border-sky-200/80 bg-sky-50/55 dark:border-sky-400/20 dark:bg-sky-400/[0.07]",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  },
  pause: {
    card: "border-amber-200/80 bg-amber-50/55 dark:border-amber-400/20 dark:bg-amber-400/[0.07]",
    icon: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
  },
  meta: {
    card: "border-violet-200/80 bg-violet-50/55 dark:border-violet-400/20 dark:bg-violet-400/[0.07]",
    icon: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
  },
  roles: {
    card: "border-rose-200/80 bg-rose-50/55 dark:border-rose-400/20 dark:bg-rose-400/[0.07]",
    icon: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
  },
  ops: {
    card: "border-cyan-200/80 bg-cyan-50/55 dark:border-cyan-400/20 dark:bg-cyan-400/[0.07]",
    icon: "border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200",
  },
};

const ROLE_HELP: Record<RoleKey, string> = {
  DEFAULT_ADMIN_ROLE: "Full admin permission. Can give or remove permissions and change supply cap.",
  MINT_ROLE: "Can create more tokens later. Useful for admin, but buyers may see it as supply risk.",
  BURN_ROLE: "Can burn tokens from its own wallet and add burn memos.",
  BURN_BLOCKED_ROLE: "Advanced permission for policy-blocked burn flows.",
  PAUSE_ROLE: "Can pause transfers, minting or burning during emergencies.",
  UNPAUSE_ROLE: "Can turn paused features back on.",
  METADATA_ROLE: "Can update name, symbol, metadata JSON and logo image.",
  OPERATOR_ROLE: "Advanced permission. Most tokens should leave this unused.",
};

const VISIBLE_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (role) => role.key !== "BURN_BLOCKED_ROLE" && role.key !== "OPERATOR_ROLE"
);

export function Dashboard() {
  const { address: routeAddress } = useParams();
  const navigate = useNavigate();
  const chainId = useChainId();
  const { address: connected, isConnected } = useAccount();
  const supported = isSupportedChain(chainId);
  const targetChainId = getTargetChainId(chainId);
  const [manual, setManual] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const selected = routeAddress && isAddressLike(routeAddress) ? (routeAddress as `0x${string}`) : undefined;

  const saved = useMemo(() => getSavedTokens(targetChainId), [targetChainId, refreshKey]);
  const savedToken = useMemo(
    () => (selected ? saved.find((t) => t.address.toLowerCase() === selected.toLowerCase()) : undefined),
    [saved, selected]
  );

  const roleEntries = Object.entries(B20_ROLES) as Array<[RoleKey, `0x${string}`]>;
  const readContracts = useMemo(() => {
    if (!selected) return [];
    const account = connected ?? zeroAddress;
    return [
      { chainId: targetChainId, address: B20_FACTORY_ADDRESS, abi: B20_FACTORY_ABI, functionName: "isB20Initialized", args: [selected] },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "name" },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "symbol" },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "decimals" },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "totalSupply" },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "supplyCap" },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "contractURI" },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "extraMetadata", args: ["logoURI"] },
      { chainId: targetChainId, address: selected, abi: B20_ABI, functionName: "balanceOf", args: [account] },
      ...roleEntries.map(([, role]) => ({
        chainId: targetChainId,
        address: selected,
        abi: B20_ABI,
        functionName: "hasRole",
        args: [role, account],
      })),
      ...PAUSABLE_FEATURES.map((feature) => ({
        chainId: targetChainId,
        address: selected,
        abi: B20_ABI,
        functionName: "isPaused",
        args: [feature.value],
      })),
    ];
  }, [selected, connected, targetChainId]);

  const { data, refetch, isLoading, isError } = useReadContracts({
    allowFailure: true,
    contracts: readContracts,
    query: { enabled: !!selected && supported, refetchInterval: 15_000 },
  });

  const token = useMemo<TokenView | null>(() => {
    if (!selected || !data || data.length < 9 + roleEntries.length + PAUSABLE_FEATURES.length) return null;
    const result = (i: number) => data[i]?.result;
    if (data[1]?.status !== "success") return null;
    const roles = {} as Record<RoleKey, boolean>;
    roleEntries.forEach(([key], i) => {
      roles[key] = Boolean(result(9 + i));
    });
    const pauseBase = 9 + roleEntries.length;
    return {
      address: selected,
      factoryInitialized: Boolean(result(0)),
      name: String(result(1) ?? ""),
      symbol: String(result(2) ?? ""),
      decimals: Number(result(3) ?? 18),
      totalSupply: (result(4) as bigint) ?? 0n,
      supplyCap: (result(5) as bigint) ?? MAX_UINT128,
      contractURI: String(result(6) ?? ""),
      logoURI: String(result(7) ?? ""),
      balance: (result(8) as bigint) ?? 0n,
      roles,
      paused: {
        transfer: Boolean(result(pauseBase)),
        mint: Boolean(result(pauseBase + 1)),
        burn: Boolean(result(pauseBase + 2)),
      },
    };
  }, [data, selected]);

  useEffect(() => {
    if (!token) return;
    saveToken({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      chainId: targetChainId,
      createdAt: savedToken?.createdAt ?? Date.now(),
      deployer: savedToken?.deployer,
      txHash: savedToken?.txHash,
      logoURI: token.logoURI || savedToken?.logoURI,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token?.address, token?.name, token?.symbol, token?.logoURI, targetChainId]);

  const [contractImage, setContractImage] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const baseLogo = token?.logoURI || savedToken?.logoURI || "";
      if (baseLogo || !token?.contractURI) {
        if (!cancelled) setContractImage("");
        return;
      }
      const cid = extractCid(token.contractURI);
      if (!cid) return;
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
        if (!res.ok) return;
        const json = (await res.json()) as { image?: string; logoURI?: string };
        const image = (json.image || json.logoURI || "").trim();
        if (!cancelled) setContractImage(image);
      } catch {
        if (!cancelled) setContractImage("");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token?.logoURI, token?.contractURI, savedToken?.logoURI]);

  function openToken(addr: string) {
    if (isAddressLike(addr)) navigate(`/dashboard/${addr}`);
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface px-5 py-8 shadow-card sm:px-8">
          <div className="absolute inset-0 grid-dots opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-sky-50 dark:from-emerald-400/[0.08] dark:to-sky-400/[0.08]" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
              <IconGauge className="h-3.5 w-3.5" />
              Native B20 dashboard
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.98] text-fg sm:text-6xl">Manage Base B20 tokens.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              Pick a saved token, or paste any native B20 token address on <strong className="text-fg">{chainName(targetChainId)}</strong>.
            </p>
          </div>
        </header>

        <Card className="mb-6 border-sky-200/80 bg-sky-50/60 p-5 shadow-card dark:border-sky-400/20 dark:bg-sky-400/[0.07]">
          <Field label="B20 token address" hint="Paste a Base mainnet B20 token address.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value.trim())}
                placeholder="0xB200..."
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
          <h2 className="text-sm font-semibold text-muted">Your tokens on {chainName(targetChainId)}</h2>
          <Link to="/create" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:opacity-70">
            <IconPlus className="h-4 w-4" /> New B20 token
          </Link>
        </div>

        {saved.length === 0 ? (
          <Card className="grid place-items-center border-violet-200/80 bg-violet-50/60 px-6 py-14 text-center dark:border-violet-400/20 dark:bg-violet-400/[0.07]">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200">
              <IconCoins className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted">No saved B20 tokens yet on Base mainnet.</p>
            <Link to="/create" className="mt-4">
              <Button className="gap-1.5">
                <IconPlus className="h-4 w-4" /> Create your first token
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {saved.map((t) => (
              <SavedRow
                key={`${t.chainId}-${t.address}`}
                t={t}
                chainId={targetChainId}
                onOpen={() => openToken(t.address)}
                onRemove={() => {
                  removeToken(t.address, targetChainId);
                  setRefreshKey((k) => k + 1);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!supported) {
    return (
      <Centered>
        <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />} title="Wrong network">
          Switch to {chainName(DEFAULT_CHAIN_ID)}. This app is pinned to Base mainnet for native B20.
        </Callout>
      </Centered>
    );
  }

  if (isLoading || (!token && !isError)) {
    return (
      <Centered>
        <div className="animate-pulse text-sm text-muted">Loading B20 token...</div>
      </Centered>
    );
  }

  if (!token || isError || !token.factoryInitialized) {
    return (
      <Centered>
        <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />} title="Not a readable native B20 token">
          <p>
            <code className="font-mono text-xs">{selected}</code> was not confirmed as a native B20 token on {chainName(targetChainId)}.
          </p>
          <Link to="/dashboard" className="mt-2 inline-block underline">Back to token list</Link>
        </Callout>
      </Centered>
    );
  }

  const visibleToken = {
    ...token,
    logoURI: token.logoURI || savedToken?.logoURI || contractImage || "",
  };
  const dashboardLink = typeof window !== "undefined" ? `${window.location.origin}/dashboard/${visibleToken.address}` : "";
  const ctx: Ctx = { token: visibleToken, chainId: targetChainId, connected, refetch };
  const roleBadges = VISIBLE_ROLE_OPTIONS.filter((r) => visibleToken.roles[r.key as RoleKey]).map((r) => r.label);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        All tokens
      </Link>

      <Card className="mb-5 overflow-hidden border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]">
        <div className="h-1 bg-gradient-to-r from-emerald-300 via-sky-200 to-violet-200 dark:from-emerald-400/50 dark:via-sky-400/30 dark:to-violet-400/30" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <TokenLogo src={visibleToken.logoURI} symbol={visibleToken.symbol} size="lg" tone="emerald" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h1 className="font-display text-4xl leading-none text-fg">{visibleToken.name}</h1>
                <span className="font-mono text-sm text-muted">${visibleToken.symbol}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="font-mono text-xs text-faint">{shortAddress(visibleToken.address, 6)}</code>
                <CopyButton value={visibleToken.address} label="" />
                <a href={`${explorerUrl(targetChainId)}/token/${visibleToken.address}`} target="_blank" rel="noreferrer" className="text-faint hover:text-fg" aria-label="Open token on BaseScan">
                  <IconExternal className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <AddToWalletButton token={visibleToken} size="sm" />
                {dashboardLink && <CopyButton value={dashboardLink} label="Copy dashboard link" />}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="positive"><IconCheck className="h-3 w-3" /> Native B20</Badge>
            {roleBadges.length > 0 ? roleBadges.slice(0, 4).map((role) => <Badge key={role} tone="accent">{role}</Badge>) : <Badge tone="neutral">Read-only wallet</Badge>}
            {visibleToken.paused.transfer || visibleToken.paused.mint || visibleToken.paused.burn ? (
              <Badge tone="warn"><IconPause className="h-3 w-3" /> Paused feature</Badge>
            ) : (
              <Badge tone="positive"><IconPlay className="h-3 w-3" /> Active</Badge>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-emerald-200/70 bg-emerald-200/70 dark:border-emerald-400/20 dark:bg-emerald-400/20 sm:grid-cols-4">
          <MiniStat tone="mint" label="Total supply" value={formatAmount(visibleToken.totalSupply, visibleToken.decimals)} />
          <MiniStat tone="sky" label="Your balance" value={formatAmount(visibleToken.balance, visibleToken.decimals)} />
          <MiniStat tone="violet" label="Supply cap" value={capLabel(visibleToken)} />
          <MiniStat tone="amber" label="Decimals" value={visibleToken.decimals} />
        </div>
      </Card>

      {!isConnected && (
        <Card className="mb-5 flex flex-col items-center gap-3 border-sky-200/80 bg-sky-50/60 p-5 text-center dark:border-sky-400/20 dark:bg-sky-400/[0.07] sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-muted">Connect a wallet to see your permissions and use B20 controls.</p>
          <WalletConnect />
        </Card>
      )}

      <Callout tone="positive" icon={<IconInfo className="h-4 w-4" />} title="Native B20 on Base mainnet">
        Use the BaseScan Publish panel below after launch. It opens verification and token logo submission links with the token address ready.
      </Callout>

      <TxChainProvider chainId={targetChainId}>
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <MintPanel {...ctx} />
          <BurnPanel {...ctx} />
          <SupplyCapPanel {...ctx} />
          <PausePanel {...ctx} />
          <MetadataPanel {...ctx} />
          <RolesPanel {...ctx} />
          <TransferPanel {...ctx} />
          <BaseScanPanel token={visibleToken} />
        </div>
      </TxChainProvider>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">{children}</div>;
}

function SavedRow({ t, onOpen, onRemove, chainId }: { t: SavedToken; onOpen: () => void; onRemove: () => void; chainId: number }) {
  return (
    <Card className="flex flex-col gap-3 border-sky-200/70 bg-sky-50/45 p-4 transition hover:border-sky-300 dark:border-sky-400/20 dark:bg-sky-400/[0.06] sm:flex-row sm:items-center sm:justify-between">
      <button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
        <TokenLogo src={t.logoURI} symbol={t.symbol} size="sm" tone="sky" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{t.name} <span className="text-muted">${t.symbol}</span></p>
          <p className="truncate font-mono text-xs text-faint">{shortAddress(t.address, 6)}</p>
        </div>
      </button>
      <div className="flex items-center gap-2 sm:shrink-0">
        <Button size="sm" onClick={onOpen} className="gap-1.5">
          Open <IconArrowRight className="h-3.5 w-3.5" />
        </Button>
        <a href={`${explorerUrl(chainId)}/token/${t.address}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-border/50 hover:text-fg" aria-label="Open token on BaseScan">
          <IconExternal className="h-4 w-4" />
        </a>
        <button onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-negative/10 hover:text-negative" aria-label="Remove saved token">
          <IconTrash className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
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

function MintPanel({ token, refetch }: Ctx) {
  const canMint = token.roles.MINT_ROLE;
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [batch, setBatch] = useState("");
  const singleAmount = parseTokenAmount(amount, token.decimals);
  const singleReady = canMint && isAddress(to) && singleAmount !== null && singleAmount > 0n && withinCap(token, singleAmount);
  const parsedBatch = useMemo(() => parseBatch(batch, token.decimals), [batch, token.decimals]);
  const batchReady = canMint && parsedBatch.recipients.length > 0 && !parsedBatch.error && withinCap(token, parsedBatch.total);

  return (
    <SectionCard
      icon={<IconCoins className="h-5 w-5" />}
      title="Mint"
      desc="Mint requires MINT_ROLE and respects the B20 supply cap."
      className={tones.mint.card}
      iconClassName={tones.mint.icon}
    >
      <div className="space-y-4">
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Mint creates new tokens for a wallet. Use it only if your token intentionally supports future supply growth.
        </Callout>
        {!canMint && <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>Connected wallet does not hold MINT_ROLE.</Callout>}
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <Field label="Recipient">
            <Input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="0x..." className="font-mono text-xs" disabled={!canMint} />
          </Field>
          <Field label="Amount">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanDecimal(e.target.value))} placeholder="1000" disabled={!canMint} />
          </Field>
        </div>
        {!withinCap(token, singleAmount ?? 0n) && <p className="text-xs text-negative">This mint would exceed the current supply cap.</p>}
        <TxButton fullWidth disabled={!singleReady} build={() => singleAmount ? { address: token.address, abi: B20_ABI, functionName: "mint", args: [to as `0x${string}`, singleAmount] } : null} onSuccess={() => { setAmount(""); refetch(); }}>
          <IconPlus className="h-4 w-4" /> Mint tokens
        </TxButton>

        <div className="border-t border-border pt-4">
          <Field label="Batch mint" hint="One recipient per line: address, amount">
            <Textarea value={batch} onChange={(e) => setBatch(e.target.value)} placeholder={"0xabc..., 100\n0xdef..., 250"} disabled={!canMint} />
          </Field>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{parsedBatch.recipients.length} recipients</span>
            <span>{formatAmount(parsedBatch.total, token.decimals)} {token.symbol}</span>
          </div>
          {parsedBatch.error && <p className="mt-1 text-xs text-negative">{parsedBatch.error}</p>}
          {!withinCap(token, parsedBatch.total) && <p className="mt-1 text-xs text-negative">Batch total exceeds the supply cap.</p>}
          <TxButton className="mt-3" fullWidth variant="secondary" disabled={!batchReady} build={() => ({ address: token.address, abi: B20_ABI, functionName: "batchMint", args: [parsedBatch.recipients, parsedBatch.amounts] })} onSuccess={() => { setBatch(""); refetch(); }}>
            <IconUsers className="h-4 w-4" /> Batch mint
          </TxButton>
        </div>
      </div>
    </SectionCard>
  );
}

function BurnPanel({ token, connected, refetch }: Ctx) {
  const canBurn = token.roles.BURN_ROLE;
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const parsedAmount = parseTokenAmount(amount, token.decimals);
  const memoHex = memoToBytes32(memo);
  const burnPaused = token.paused.burn;
  const baseReady = !!connected && canBurn && !burnPaused && parsedAmount !== null && parsedAmount > 0n && parsedAmount <= token.balance;
  const memoReady = baseReady && !!memo.trim() && !!memoHex;

  function reset() {
    setAmount("");
    setMemo("");
    refetch();
  }

  return (
    <SectionCard
      icon={<IconFlame className="h-5 w-5" />}
      title="Burn"
      desc="Burn permanently removes tokens from your wallet and lowers total supply."
      className="border-rose-200/80 bg-rose-50/55 dark:border-rose-400/20 dark:bg-rose-400/[0.07]"
      iconClassName="border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200"
    >
      <div className="space-y-4">
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          Burning cannot be undone. Use normal burn for simple supply reduction, or burn with memo when you need an order ID or reason recorded.
        </Callout>
        {!canBurn && <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>Connected wallet does not hold BURN_ROLE.</Callout>}
        {burnPaused && <Callout tone="negative" icon={<IconPause className="h-4 w-4" />}>Burning is currently paused for this token.</Callout>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Your balance" value={`${formatAmount(token.balance, token.decimals)} ${token.symbol}`} />
          <Metric label="Total supply" value={`${formatAmount(token.totalSupply, token.decimals)} ${token.symbol}`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Amount (${token.symbol})`}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanDecimal(e.target.value))} placeholder="100" disabled={!connected || !canBurn || burnPaused} />
          </Field>
          <Field label="Memo" hint="Optional, up to 32 bytes.">
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="burn-001" disabled={!connected || !canBurn || burnPaused} />
          </Field>
        </div>
        {parsedAmount !== null && parsedAmount > token.balance && <p className="text-xs text-negative">Amount exceeds your connected wallet balance.</p>}
        {memo && !memoHex && <p className="text-xs text-negative">Memo is too long for bytes32.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <TxButton
            fullWidth
            variant="danger"
            disabled={!baseReady}
            build={() => parsedAmount ? { address: token.address, abi: B20_ABI, functionName: "burn", args: [parsedAmount] } : null}
            onSuccess={reset}
            confirmLabel="Burn these tokens permanently?"
          >
            <IconFlame className="h-4 w-4" /> Burn
          </TxButton>
          <TxButton
            fullWidth
            variant="outline"
            disabled={!memoReady}
            build={() => parsedAmount && memoHex ? { address: token.address, abi: B20_ABI, functionName: "burnWithMemo", args: [parsedAmount, memoHex] } : null}
            onSuccess={reset}
            confirmLabel="Burn these tokens permanently with memo?"
          >
            <IconFlame className="h-4 w-4" /> Burn with memo
          </TxButton>
        </div>
      </div>
    </SectionCard>
  );
}

function SupplyCapPanel({ token, refetch }: Ctx) {
  const isAdmin = token.roles.DEFAULT_ADMIN_ROLE;
  const [cap, setCap] = useState(isNoCap(token.supplyCap) ? "" : formatUnits(token.supplyCap, token.decimals));
  useEffect(() => setCap(isNoCap(token.supplyCap) ? "" : formatUnits(token.supplyCap, token.decimals)), [token.address, token.supplyCap, token.decimals]);
  const parsed = cap.trim() ? parseTokenAmount(cap, token.decimals) : MAX_UINT128;
  const valid = parsed !== null && parsed >= token.totalSupply && parsed <= MAX_UINT128;

  return (
    <SectionCard
      icon={<IconShield className="h-5 w-5" />}
      title="Supply cap"
      desc="B20 caps cannot go below totalSupply or above uint128.max."
      className={tones.cap.card}
      iconClassName={tones.cap.icon}
    >
      <div className="space-y-4">
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          For a fixed-supply token, set cap equal to current total supply and remove Mint permission from Admin permissions.
        </Callout>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Current cap" value={capLabel(token)} />
          <Metric label="Room to mint" value={isNoCap(token.supplyCap) ? "No practical cap" : formatAmount(token.supplyCap - token.totalSupply, token.decimals)} />
        </div>
        <Field label={`New cap (${token.symbol})`} hint="Leave blank to use the no-cap sentinel.">
          <Input inputMode="decimal" value={cap} onChange={(e) => setCap(cleanDecimal(e.target.value))} placeholder="No cap" disabled={!isAdmin} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={!isAdmin} onClick={() => setCap(formatUnits(token.totalSupply, token.decimals))}>
            Fixed at current supply
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!isAdmin} onClick={() => setCap("")}>
            Use no cap
          </Button>
        </div>
        {parsed !== null && parsed < token.totalSupply && <p className="text-xs text-negative">New cap must be at least current total supply.</p>}
        <TxButton fullWidth disabled={!isAdmin || !valid} build={() => parsed === null ? null : { address: token.address, abi: B20_ABI, functionName: "updateSupplyCap", args: [parsed] }} onSuccess={refetch}>
          Update supply cap
        </TxButton>
      </div>
    </SectionCard>
  );
}

function PausePanel({ token, refetch }: Ctx) {
  const [selected, setSelected] = useState<number[]>([]);
  const canPause = token.roles.PAUSE_ROLE;
  const canUnpause = token.roles.UNPAUSE_ROLE;
  const pausedMap = [token.paused.transfer, token.paused.mint, token.paused.burn];
  const hasSelected = selected.length > 0;

  function toggle(feature: number) {
    setSelected((prev) => (prev.includes(feature) ? prev.filter((x) => x !== feature) : [...prev, feature]));
  }

  return (
    <SectionCard
      icon={<IconPause className="h-5 w-5" />}
      title="Granular pause"
      desc="Pause transfers, minting, and burning independently."
      className={tones.pause.card}
      iconClassName={tones.pause.icon}
    >
      <div className="space-y-4">
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Pause is an emergency control. Pick one or more features, then pause or unpause only those features.
        </Callout>
        <div className="grid gap-2 sm:grid-cols-3">
          {PAUSABLE_FEATURES.map((feature) => (
            <button
              key={feature.value}
              type="button"
              onClick={() => toggle(feature.value)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                selected.includes(feature.value) ? "border-amber-400 bg-amber-100/80 dark:bg-amber-400/15" : "border-border bg-surface/80 hover:border-amber-300"
              )}
            >
              <span className="block text-sm font-medium">{feature.label}</span>
              <span className={cn("mt-1 inline-flex text-xs", pausedMap[feature.value] ? "text-negative" : "text-positive")}>
                {pausedMap[feature.value] ? "Paused" : "Active"}
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TxButton variant="danger" disabled={!canPause || !hasSelected} build={() => ({ address: token.address, abi: B20_ABI, functionName: "pause", args: [selected] })} onSuccess={() => { setSelected([]); refetch(); }}>
            <IconPause className="h-4 w-4" /> Pause
          </TxButton>
          <TxButton variant="success" disabled={!canUnpause || !hasSelected} build={() => ({ address: token.address, abi: B20_ABI, functionName: "unpause", args: [selected] })} onSuccess={() => { setSelected([]); refetch(); }}>
            <IconPlay className="h-4 w-4" /> Unpause
          </TxButton>
        </div>
      </div>
    </SectionCard>
  );
}

function MetadataPanel({ token, chainId, refetch }: Ctx) {
  const canMetadata = token.roles.METADATA_ROLE;
  const [name, setName] = useState(token.name);
  const [symbol, setSymbol] = useState(token.symbol);
  const [contractURI, setContractURI] = useState(token.contractURI);
  const [logoURI, setLogoURI] = useState(token.logoURI);
  const [logoDirty, setLogoDirty] = useState(false);
  const [resolvedFromContract, setResolvedFromContract] = useState("");

  useEffect(() => {
    setName(token.name);
    setSymbol(token.symbol);
    setContractURI(token.contractURI);
    setLogoURI(token.logoURI);
    setLogoDirty(false);
    setResolvedFromContract("");
  }, [token.address]);

  useEffect(() => {
    setName(token.name);
    setSymbol(token.symbol);
    setContractURI(token.contractURI);
    if (!logoDirty) setLogoURI(token.logoURI);
  }, [token.name, token.symbol, token.contractURI, token.logoURI, logoDirty]);

  // o1-style tokens often leave logoURI empty and only set contractURI metadata.image
  useEffect(() => {
    let cancelled = false;
    async function loadFromContractUri() {
      if (token.logoURI || !token.contractURI) {
        setResolvedFromContract("");
        return;
      }
      const cid = extractCid(token.contractURI);
      if (!cid) return;
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
        if (!res.ok) return;
        const json = (await res.json()) as { image?: string; logoURI?: string };
        const image = (json.image || json.logoURI || "").trim();
        if (!cancelled && image) setResolvedFromContract(image);
      } catch {
        // ignore
      }
    }
    loadFromContractUri();
    return () => {
      cancelled = true;
    };
  }, [token.logoURI, token.contractURI]);

  function setLogo(next: string) {
    setLogoDirty(true);
    setLogoURI(next);
    if (next.trim()) {
      saveToken({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        chainId,
        createdAt: Date.now(),
        logoURI: next.trim(),
      });
    }
  }

  const logoError = logoUrlError(logoURI);
  const previewLogo = logoURI || resolvedFromContract || token.logoURI;

  return (
    <SectionCard
      icon={<IconSparkles className="h-5 w-5" />}
      title="Metadata"
      desc="Update the token name, symbol, metadata JSON and logo image."
      className={tones.meta.card}
      iconClassName={tones.meta.icon}
    >
      <div className="space-y-4">
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Save pins logo + metadata JSON to IPFS (same pattern BaseScan and Base app use).
        </Callout>
        {!canMetadata && <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>Connected wallet does not hold METADATA_ROLE.</Callout>}
        <div className="flex items-center gap-3 rounded-xl border border-violet-200/70 bg-surface/75 px-4 py-3 dark:border-violet-400/20">
          <TokenLogo src={previewLogo} symbol={symbol || token.symbol} size="lg" tone="violet" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Logo preview</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              BaseScan reads contractURI metadata JSON image field (ipfs://), not a random HTTPS link.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canMetadata} />
              <TxButton variant="secondary" disabled={!canMetadata || !name.trim() || name === token.name} build={() => ({ address: token.address, abi: B20_ABI, functionName: "updateName", args: [name.trim()] })} onSuccess={refetch}>Save</TxButton>
            </div>
          </Field>
          <Field label="Symbol">
            <div className="flex gap-2">
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} disabled={!canMetadata} />
              <TxButton variant="secondary" disabled={!canMetadata || !symbol.trim() || symbol === token.symbol} build={() => ({ address: token.address, abi: B20_ABI, functionName: "updateSymbol", args: [symbol.trim()] })} onSuccess={refetch}>Save</TxButton>
            </div>
          </Field>
        </div>
        <Field label="Metadata JSON (contractURI)" hint="Must be ipfs://... for BaseScan and Base app logos.">
          <div className="flex gap-2">
            <Input value={contractURI} onChange={(e) => setContractURI(e.target.value.trim())} placeholder="ipfs://..." disabled={!canMetadata} />
            <TxButton variant="secondary" disabled={!canMetadata || contractURI === token.contractURI} build={() => ({ address: token.address, abi: B20_ABI, functionName: "updateContractURI", args: [contractURI.trim()] })} onSuccess={refetch}>Save</TxButton>
          </div>
          {contractURI.startsWith("ipfs://") && extractCid(contractURI) && (
            <a
              href={pinataGatewayUrl(contractURI)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
            >
              Preview JSON <IconExternal className="h-3.5 w-3.5" />
            </a>
          )}
        </Field>
        <Field
          label="Logo image"
          error={logoError}
          hint="Choose image, then Save. Pins image + JSON to IPFS and writes both on-chain."
        >
          <LogoPicker value={logoURI} onChange={setLogo} symbol={symbol || token.symbol} disabled={!canMetadata} />
          <div className="mt-3 flex gap-2">
            <Input value={logoURI} onChange={(e) => setLogo(e.target.value.trim())} placeholder="ipfs://..." disabled={!canMetadata} />
            <MetadataSyncButton
              token={token}
              chainId={chainId}
              name={name || token.name}
              symbol={symbol || token.symbol}
              logoURI={logoURI}
              disabled={!canMetadata || !!logoError || !logoURI.trim()}
              onSuccess={(result) => {
                setLogoDirty(false);
                setLogoURI(result.logoURI);
                setContractURI(result.contractURI);
                saveToken({
                  address: token.address,
                  name: token.name,
                  symbol: token.symbol,
                  chainId,
                  createdAt: Date.now(),
                  logoURI: result.logoURI,
                });
                refetch();
              }}
            />
          </div>
        </Field>
      </div>
    </SectionCard>
  );
}

function MetadataSyncButton({
  token,
  chainId,
  name,
  symbol,
  logoURI,
  disabled,
  onSuccess,
}: {
  token: TokenView;
  chainId: SupportedChainId;
  name: string;
  symbol: string;
  logoURI: string;
  disabled?: boolean;
  onSuccess: (result: { logoURI: string; contractURI: string }) => void;
}) {
  const walletChainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const [queue, setQueue] = useState<Array<"logo" | "json">>([]);
  const [active, setActive] = useState<"logo" | "json" | "pin" | "done" | null>(null);
  const [handledHash, setHandledHash] = useState<`0x${string}` | undefined>();
  const [localError, setLocalError] = useState("");
  const [pending, setPending] = useState<{ logoURI: string; contractURI: string } | null>(null);
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash, chainId });

  function runAction(action: "logo" | "json", values: { logoURI: string; contractURI: string }) {
    setActive(action);
    const req = action === "logo"
      ? { functionName: "updateExtraMetadata", args: ["logoURI", values.logoURI] as const }
      : { functionName: "updateContractURI", args: [values.contractURI] as const };
    writeContract({
      chainId,
      address: token.address,
      abi: B20_ABI,
      functionName: req.functionName,
      args: req.args,
      gas: 650_000n,
    } as unknown as Parameters<typeof writeContract>[0]);
  }

  useEffect(() => {
    if (!isSuccess || !hash || hash === handledHash || !active || !pending) return;
    if (active === "pin") return;
    setHandledHash(hash);
    const remaining = queue.slice(1);
    if (remaining.length > 0) {
      setQueue(remaining);
      runAction(remaining[0], pending);
      return;
    }
    setQueue([]);
    setActive("done");
    setLocalError("");
    onSuccess(pending);
    const t = setTimeout(() => {
      setActive(null);
      setPending(null);
      reset();
    }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, hash]);

  useEffect(() => {
    if (!error) return;
    setQueue([]);
    setActive(null);
    setPending(null);
  }, [error]);

  async function onClick() {
    setLocalError("");
    reset();
    setHandledHash(undefined);
    setActive("pin");
    try {
      if (walletChainId !== chainId) {
        await switchChainAsync({ chainId });
      }
      // Pin like o1: image ipfs:// + metadata JSON with image field, contractURI = ipfs://metadata
      const uploaded = await uploadTokenMetadata({
        name,
        symbol,
        imageUrl: logoURI.trim(),
      });
      const values = {
        logoURI: uploaded.logoURI || logoURI.trim(),
        contractURI: uploaded.contractURI,
      };
      setPending(values);
      const actions: Array<"logo" | "json"> = [];
      if (values.logoURI && values.logoURI !== token.logoURI) actions.push("logo");
      if (values.contractURI && values.contractURI !== token.contractURI) actions.push("json");
      if (actions.length === 0) {
        setActive("done");
        onSuccess(values);
        setTimeout(() => {
          setActive(null);
          setPending(null);
        }, 1200);
        return;
      }
      setQueue(actions);
      runAction(actions[0], values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Metadata pin failed.";
      setLocalError(message.includes("User rejected") ? "Network switch rejected." : message.slice(0, 140));
      setQueue([]);
      setActive(null);
      setPending(null);
    }
  }

  const busy = isSwitching || isPending || mining || (active !== null && active !== "done");
  const friendlyError = localError || (error
    ? error.message.includes("User rejected")
      ? "Rejected in wallet"
      : error.message.split("\n")[0].slice(0, 120)
    : "");
  const label = active === "done"
    ? "Done"
    : active === "pin"
      ? "Pinning IPFS..."
      : active === "logo"
        ? "Saving logo..."
        : active === "json"
          ? "Saving JSON..."
          : "Save logo + JSON";

  return (
    <div className="shrink-0">
      <Button type="button" variant={active === "done" ? "success" : "secondary"} loading={busy} disabled={disabled || busy} onClick={onClick} className="whitespace-nowrap">
        {active === "done" && <IconCheck className="h-4 w-4" />}
        {label}
      </Button>
      {friendlyError && <p className="mt-1.5 max-w-[180px] text-xs text-negative">{friendlyError}</p>}
    </div>
  );
}

function RolesPanel({ token, connected, refetch }: Ctx) {
  const isAdmin = token.roles.DEFAULT_ADMIN_ROLE;
  const [account, setAccount] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>("MINT_ROLE");
  const role = B20_ROLES[roleKey];
  const validAccount = isAddress(account);
  const selectedRoleLabel = VISIBLE_ROLE_OPTIONS.find((option) => option.key === roleKey)?.label ?? "Permission";

  return (
    <SectionCard
      icon={<IconLock className="h-5 w-5" />}
      title="Admin permissions"
      desc="Give wallets only the powers they need."
      className={tones.roles.card}
      iconClassName={tones.roles.icon}
    >
      <div className="space-y-4">
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Permissions control what each wallet can do. Give powers only to trusted wallets. Lock final admin only when the token should never be managed again.
        </Callout>
        {!isAdmin && <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>Your connected wallet is not an admin, so it cannot change permissions.</Callout>}
        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <Field label="Wallet address">
            <Input value={account} onChange={(e) => setAccount(e.target.value.trim())} placeholder="0x..." className="font-mono text-xs" disabled={!isAdmin} />
          </Field>
          <Field label="Permission">
            <select
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value as RoleKey)}
              disabled={!isAdmin}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg transition focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
            >
              {VISIBLE_ROLE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="rounded-xl border border-rose-200/70 bg-surface/70 px-4 py-3 text-xs leading-relaxed text-muted dark:border-rose-400/20">
          <strong className="text-fg">{selectedRoleLabel}</strong>: {ROLE_HELP[roleKey]}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TxButton disabled={!isAdmin || !validAccount} build={() => ({ address: token.address, abi: B20_ABI, functionName: "grantRole", args: [role, account as `0x${string}`] })} onSuccess={refetch}>
            Give permission
          </TxButton>
          <TxButton variant="outline" disabled={!isAdmin || !validAccount} build={() => ({ address: token.address, abi: B20_ABI, functionName: "revokeRole", args: [role, account as `0x${string}`] })} onSuccess={refetch}>
            Remove permission
          </TxButton>
        </div>
        <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 p-4 dark:border-rose-400/20 dark:bg-rose-400/[0.07]">
          <p className="text-sm font-medium">Remove powers from my wallet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Use this only for your connected wallet. For another wallet, paste its address above and use Remove permission.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <TxButton
              variant="outline"
              disabled={!connected || !token.roles[roleKey]}
              build={() => connected ? { address: token.address, abi: B20_ABI, functionName: "renounceRole", args: [role, connected] } : null}
              onSuccess={refetch}
              confirmLabel={`Remove ${selectedRoleLabel} permission from your connected wallet?`}
            >
              Remove from me
            </TxButton>
            <TxButton
              variant="danger"
              disabled={!isAdmin}
              build={() => ({ address: token.address, abi: B20_ABI, functionName: "renounceLastAdmin", args: [] })}
              onSuccess={refetch}
              confirmLabel="Lock final admin forever? This cannot be undone."
            >
              Lock admin forever
            </TxButton>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Final admin lock only works when your wallet is the last admin. After that, admin powers cannot be restored.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function TransferPanel({ token, connected, refetch }: Ctx) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const parsedAmount = parseTokenAmount(amount, token.decimals);
  const memoHex = memoToBytes32(memo);
  const normalReady = !!connected && isAddress(to) && parsedAmount !== null && parsedAmount > 0n && parsedAmount <= token.balance;
  const memoReady = normalReady && !!memo.trim() && !!memoHex;

  return (
    <SectionCard
      icon={<IconSend className="h-5 w-5" />}
      title="Transfer with memo"
      desc="B20 adds memo-enabled transfers for off-chain reconciliation."
      className={tones.ops.card}
      iconClassName={tones.ops.icon}
    >
      <div className="space-y-3">
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Use Send normal for regular transfers. Use memo only when you need an invoice ID, order ID or off-chain note stored as bytes32.
        </Callout>
        <Field label="Recipient">
          <Input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="0x..." className="font-mono text-xs" disabled={!connected} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Amount (${token.symbol})`}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanDecimal(e.target.value))} placeholder="100" disabled={!connected} />
          </Field>
          <Field label="Memo" hint="Text up to 32 bytes, or a full bytes32 hex value.">
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="invoice-1001" disabled={!connected} />
          </Field>
        </div>
        {parsedAmount !== null && parsedAmount > token.balance && <p className="text-xs text-negative">Amount exceeds your connected wallet balance.</p>}
        {memo && !memoHex && <p className="text-xs text-negative">Memo is too long for bytes32.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <TxButton fullWidth disabled={!normalReady} build={() => parsedAmount ? { address: token.address, abi: B20_ABI, functionName: "transfer", args: [to as `0x${string}`, parsedAmount] } : null} onSuccess={() => { setAmount(""); setMemo(""); refetch(); }}>
            <IconSend className="h-4 w-4" /> Send normal
          </TxButton>
          <TxButton fullWidth variant="secondary" disabled={!memoReady} build={() => parsedAmount && memoHex ? { address: token.address, abi: B20_ABI, functionName: "transferWithMemo", args: [to as `0x${string}`, parsedAmount, memoHex] } : null} onSuccess={() => { setAmount(""); setMemo(""); refetch(); }}>
            <IconSend className="h-4 w-4" /> Send with memo
          </TxButton>
        </div>
      </div>
    </SectionCard>
  );
}

function BaseScanPanel({ token }: { token: TokenView }) {
  // Prefer on-chain contractURI (ipfs metadata JSON) - same source BaseScan uses.
  const metadataURI = token.contractURI || token.logoURI;
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishResult, setPublishResult] = useState<{
    ok: boolean;
    steps: Array<{ key: string; status: "done" | "pending" | "blocked"; title: string; detail: string }>;
  } | null>(null);

  async function autoPublish() {
    setPublishing(true);
    setPublishError("");
    setPublishResult(null);
    try {
      const res = await fetch("/api/basescan-publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logoURI,
          metadataURI,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `BaseScan publish failed (${res.status}).`);
      setPublishResult(json);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "BaseScan publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <SectionCard
      icon={<IconExternal className="h-5 w-5" />}
      title="Verify & Publish"
      desc="Runs BaseScan API verification from this website."
      className={tones.picker.card}
      iconClassName={tones.picker.icon}
    >
      <div className="space-y-3">
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Press once. The website will run the BaseScan API-supported verification flow and show the result here.
        </Callout>
        <Button fullWidth loading={publishing} disabled={publishing} onClick={autoPublish} className="gap-2">
          <IconSparkles className="h-4 w-4" /> Verify & Publish
        </Button>
        {publishError && <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />}>{publishError}</Callout>}
        {publishResult && (
          <div className="space-y-2 rounded-xl border border-sky-200/70 bg-surface/75 p-3 dark:border-sky-400/20">
            {publishResult.steps.map((step) => (
              <div key={step.key} className="flex gap-3 rounded-lg border border-border bg-bg/70 p-3">
                <span className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                  step.status === "done" && "border-positive/30 bg-positive/10 text-positive",
                  step.status === "pending" && "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
                  step.status === "blocked" && "border-negative/30 bg-negative/10 text-negative"
                )}>
                  {step.status === "done" ? <IconCheck className="h-3.5 w-3.5" /> : <IconInfo className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface/80 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}

function parseTokenAmount(value: string, decimals: number): bigint | null {
  const clean = value.replace(/,/g, "").trim();
  if (!clean) return null;
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  try {
    return parseUnits(clean, decimals);
  } catch {
    return null;
  }
}

function parseBatch(raw: string, decimals: number) {
  const recipients: `0x${string}`[] = [];
  const amounts: bigint[] = [];
  let error = "";
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [addr, amount] = line.split(/[,\s]+/);
    if (!isAddress(addr)) {
      error = `Invalid address: ${addr || line}`;
      break;
    }
    const parsed = parseTokenAmount(amount ?? "", decimals);
    if (!parsed || parsed <= 0n) {
      error = `Invalid amount on line: ${line}`;
      break;
    }
    recipients.push(addr);
    amounts.push(parsed);
  }
  return { recipients, amounts, error, total: amounts.reduce((sum, x) => sum + x, 0n) };
}

function cleanDecimal(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [head, ...tail] = cleaned.split(".");
  return tail.length ? `${head}.${tail.join("")}` : head;
}

function withinCap(token: TokenView, added: bigint) {
  return isNoCap(token.supplyCap) || token.totalSupply + added <= token.supplyCap;
}

function capLabel(token: TokenView) {
  return isNoCap(token.supplyCap) ? "No cap" : formatAmount(token.supplyCap, token.decimals);
}

function memoToBytes32(value: string): `0x${string}` | null {
  const clean = value.trim();
  if (!clean) return `0x${"0".repeat(64)}`;
  if (/^0x[a-fA-F0-9]{64}$/.test(clean)) return clean as `0x${string}`;
  const bytes = new TextEncoder().encode(clean);
  if (bytes.length > 32) return null;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex.padEnd(64, "0")}`;
}
