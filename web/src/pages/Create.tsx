import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseEventLogs, parseUnits } from "viem";
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  B20_FACTORY_ABI,
  B20_FACTORY_ADDRESS,
  B20_VARIANT_ASSET,
  MAX_ASSET_DECIMALS,
  MAX_UINT128,
  MIN_ASSET_DECIMALS,
  buildB20InitCalls,
  encodeAssetCreateParams,
  randomSalt,
  type B20CreateConfig,
} from "../lib/contract";
import { DEFAULT_CHAIN_ID, chainName, explorerUrl, getTargetChainId, isSupportedChain } from "../lib/wagmi";
import { commafy } from "../lib/format";
import { saveToken } from "../lib/storage";
import { trackEvent } from "../lib/analytics";
import {
  Badge,
  Button,
  Callout,
  Card,
  CopyButton,
  Field,
  Input,
  Modal,
  SectionCard,
  Switch,
  cn,
} from "../components/ui";
import {
  IconAlert,
  IconCheck,
  IconCoins,
  IconExternal,
  IconGauge,
  IconRocket,
  IconSettings,
  IconShield,
  IconWallet,
} from "../components/icons";
import { WalletConnect } from "../components/WalletConnect";
import { LogoPicker } from "../components/LogoPicker";
import { TokenLogo } from "../components/TokenLogo";
import { AddToWalletButton } from "../components/AddToWalletButton";
import { buildTokenMetadataUri } from "../lib/metadata";
import { logoUrlError } from "../lib/image-url";

interface FormState {
  name: string;
  symbol: string;
  supply: string;
  decimals: string;
  capEnabled: boolean;
  supplyCap: string;
  contractURI: string;
  logoURI: string;
  grantMinter: boolean;
  grantBurner: boolean;
  grantPauser: boolean;
  grantMetadata: boolean;
  grantOperator: boolean;
}

const DEFAULTS: FormState = {
  name: "",
  symbol: "",
  supply: "1000000",
  decimals: "18",
  capEnabled: true,
  supplyCap: "1000000",
  contractURI: "",
  logoURI: "",
  grantMinter: true,
  grantBurner: true,
  grantPauser: true,
  grantMetadata: true,
  grantOperator: false,
};

interface PendingCreate {
  config: B20CreateConfig;
  salt: `0x${string}`;
}

const panel = {
  basics: {
    card: "border-sky-200/80 bg-sky-50/55 dark:border-sky-400/20 dark:bg-sky-400/[0.07]",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  },
  standard: {
    card: "border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]",
    icon: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
};

export function Create() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const targetChainId = getTargetChainId(chainId);
  const supported = isSupportedChain(chainId);
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { data: receipt, isLoading: isMining } = useWaitForTransactionReceipt({ hash, chainId: targetChainId });

  const [f, setF] = useState<FormState>(DEFAULTS);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<PendingCreate | null>(null);
  const [networkError, setNetworkError] = useState("");
  const [savedHash, setSavedHash] = useState("");

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setTouched((t) => (t[k as string] ? t : { ...t, [k as string]: true }));
  };
  const err = (key: string, message?: string) => (touched[key] ? message : undefined);

  const decimals = Number(f.decimals);
  const decimalsOk = Number.isInteger(decimals) && decimals >= MIN_ASSET_DECIMALS && decimals <= MAX_ASSET_DECIMALS;
  const supplyRaw = useMemo(() => parseTokenAmount(f.supply, decimalsOk ? decimals : 18), [f.supply, decimals, decimalsOk]);
  const capRaw = useMemo(
    () => (f.capEnabled ? parseTokenAmount(f.supplyCap, decimalsOk ? decimals : 18) : MAX_UINT128),
    [f.capEnabled, f.supplyCap, decimals, decimalsOk]
  );

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (!f.symbol.trim()) e.symbol = "Symbol is required";
    else if (f.symbol.trim().length > 11) e.symbol = "Keep the symbol at 11 characters or less";
    if (!decimalsOk) e.decimals = "B20 Asset decimals must be 6-18";
    if (supplyRaw === null || supplyRaw <= 0n) e.supply = "Enter an initial supply greater than 0";
    else if (supplyRaw > MAX_UINT128) e.supply = "Initial supply cannot exceed uint128 max";
    if (f.capEnabled) {
      if (capRaw === null || capRaw <= 0n) e.supplyCap = "Enter a supply cap";
      else if (supplyRaw !== null && capRaw < supplyRaw) e.supplyCap = "Supply cap must be at least initial supply";
      else if (capRaw > MAX_UINT128) e.supplyCap = "B20 supply cap cannot exceed uint128 max";
    }
    if (f.contractURI && !/^(https?|ipfs):\/\//.test(f.contractURI)) e.contractURI = "Use an https:// or ipfs:// URI";
    if (f.logoURI) {
      const logoError = logoUrlError(f.logoURI);
      if (logoError) e.logoURI = logoError;
    }
    return e;
  }, [f, decimalsOk, supplyRaw, capRaw]);

  const hasErrors = Object.keys(errors).length > 0;

  function buildConfig(): B20CreateConfig | null {
    if (!address || !decimalsOk || !supplyRaw || supplyRaw <= 0n || capRaw === null) return null;
    const name = f.name.trim();
    const symbol = f.symbol.trim().toUpperCase();
    const logoURI = f.logoURI.trim();
    return {
      name,
      symbol,
      decimals,
      admin: address,
      initialSupply: supplyRaw,
      supplyCap: capRaw,
      contractURI: f.contractURI.trim() || (logoURI ? buildTokenMetadataUri({ name, symbol, image: logoURI }) : ""),
      logoURI,
      grantMinter: f.grantMinter,
      grantBurner: f.grantBurner,
      grantPauser: f.grantPauser,
      grantMetadata: f.grantMetadata,
      grantOperator: f.grantOperator,
    };
  }

  async function onCreate() {
    if (hasErrors) {
      setTouched(Object.keys(DEFAULTS).reduce((a, k) => ({ ...a, [k]: true }), {}));
      return;
    }
    const config = buildConfig();
    if (!config || !address) return;
    setNetworkError("");
    try {
      if (chainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }
    } catch (switchError) {
      const message = switchError instanceof Error ? switchError.message : "Network switch failed.";
      setNetworkError(message.includes("User rejected") ? "Network switch rejected." : `Switch to ${chainName(targetChainId)} and try again.`);
      return;
    }

    const salt = randomSalt(`${address}:${config.symbol}`);
    const params = encodeAssetCreateParams(config);
    const initCalls = buildB20InitCalls(config);
    setPending({ config, salt });
    setSavedHash("");
    writeContract({
      chainId: targetChainId,
      address: B20_FACTORY_ADDRESS,
      abi: B20_FACTORY_ABI,
      functionName: "createB20",
      args: [B20_VARIANT_ASSET, salt, params, initCalls],
      value: 0n,
      gas: 6_000_000n,
    });
  }

  const createdAddress = useMemo(() => {
    if (!receipt) return undefined;
    const logs = parseEventLogs({ abi: B20_FACTORY_ABI, logs: receipt.logs, eventName: "B20Created" });
    return logs[0]?.args.token as `0x${string}` | undefined;
  }, [receipt]);

  useEffect(() => {
    if (!createdAddress || !pending || !address || savedHash === hash) return;
    saveToken({
      address: createdAddress,
      name: pending.config.name,
      symbol: pending.config.symbol,
      chainId: targetChainId,
      createdAt: Date.now(),
      deployer: address,
      txHash: hash,
      logoURI: pending.config.logoURI,
    });
    trackEvent({
      eventType: "token_created",
      wallet: address,
      tokenAddress: createdAddress,
      tokenName: pending.config.name,
      tokenSymbol: pending.config.symbol,
      chainId: targetChainId,
      txHash: hash,
      pagePath: "/create",
    });
    setSavedHash(hash ?? "");
  }, [createdAddress, pending, address, targetChainId, hash, savedHash]);

  function resetAll() {
    reset();
    setPending(null);
    setSavedHash("");
  }

  function applyStandardFixes() {
    const parsedSupply = decimalsOk ? parseTokenAmount(f.supply, decimals) : null;
    const nextSupply = parsedSupply && parsedSupply > 0n ? f.supply : DEFAULTS.supply;
    const nextCap =
      f.capEnabled && capRaw !== null && parsedSupply !== null && capRaw >= parsedSupply && capRaw > 0n
        ? f.supplyCap
        : nextSupply;

    setF((current) => ({
      ...current,
      name: current.name.trim() || "My B20 Token",
      symbol: (current.symbol.trim() || "B20").slice(0, 11).toUpperCase(),
      supply: nextSupply,
      decimals: "18",
      capEnabled: true,
      supplyCap: nextCap,
      grantMinter: false,
      grantBurner: true,
      grantPauser: false,
      grantMetadata: true,
      grantOperator: false,
    }));
    setTouched({});
  }

  function matchCapToSupply() {
    setF((current) => ({ ...current, capEnabled: true, supplyCap: current.supply.trim() || DEFAULTS.supply }));
    setTouched((current) => ({ ...current, supplyCap: true }));
  }

  function friendlyCreateError() {
    if (!error) return "";
    if (error.message.includes("User rejected")) return "Transaction rejected.";
    if (/estimate|simulation|node service|gas/i.test(error.message)) {
      return "Wallet simulation failed. Check that wallet network is Base, then retry. The form already checks decimals, cap and permissions before sending.";
    }
    return error.message.split("\n")[0].slice(0, 160);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <h1 className="sr-only">Create B20 token</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SectionCard
            icon={<IconCoins className="h-5 w-5" />}
            title="Token identity"
            desc="Name, ticker, supply and logo."
            className={panel.basics.card}
            iconClassName={panel.basics.icon}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={err("name", errors.name)} hint="e.g. Nurlab Token">
                <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nurlab Token" maxLength={80} />
              </Field>
              <Field label="Symbol" error={err("symbol", errors.symbol)} hint="Ticker, e.g. NURL">
                <Input
                  value={f.symbol}
                  onChange={(e) => set("symbol", e.target.value.toUpperCase())}
                  placeholder="NURL"
                  maxLength={11}
                  className="font-mono uppercase"
                />
              </Field>
              <Field label="Initial supply" error={err("supply", errors.supply)} hint={supplyRaw && supplyRaw > 0n ? `${commafy(f.supply)} tokens` : "Minted to your wallet"}>
                <Input inputMode="decimal" value={f.supply} onChange={(e) => set("supply", cleanDecimal(e.target.value))} placeholder="1000000" />
              </Field>
              <Field label="Decimals" error={err("decimals", errors.decimals)} hint="Allowed: 6 to 18">
                <Input inputMode="numeric" value={f.decimals} onChange={(e) => set("decimals", e.target.value.replace(/[^\d]/g, ""))} placeholder="18" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Logo" error={err("logoURI", errors.logoURI)} hint="Upload saves ImgBB Direct link automatically.">
                  <LogoPicker value={f.logoURI} onChange={(url) => set("logoURI", url)} symbol={f.symbol} />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<IconSettings className="h-5 w-5" />}
            title="Launch settings"
            desc="Cap and optional controls."
            className={panel.standard.card}
            iconClassName={panel.standard.icon}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-emerald-200/70 bg-surface/80 px-4 py-3 dark:border-emerald-400/20 dark:bg-surface/70">
                <div>
                  <p className="text-sm font-medium">Supply cap</p>
                  <p className="text-xs text-muted">Maximum supply after launch.</p>
                </div>
                <Switch checked={f.capEnabled} onChange={(v) => set("capEnabled", v)} label="Cap supply" />
              </div>
              {f.capEnabled && (
                <Field label="Supply cap" error={err("supplyCap", errors.supplyCap)} hint={capRaw && capRaw > 0n ? `${commafy(f.supplyCap)} tokens` : "Must be at least initial supply"}>
                  <Input inputMode="decimal" value={f.supplyCap} onChange={(e) => set("supplyCap", cleanDecimal(e.target.value))} placeholder="1000000" />
                </Field>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleToggle title="Minter role" desc="Mint more supply later." checked={f.grantMinter} onChange={(v) => set("grantMinter", v)} />
                <RoleToggle title="Burn role" desc="Use burn controls later." checked={f.grantBurner} onChange={(v) => set("grantBurner", v)} />
                <RoleToggle title="Pause controls" desc="Emergency pause controls." checked={f.grantPauser} onChange={(v) => set("grantPauser", v)} />
                <RoleToggle title="Metadata role" desc="Update name, symbol and logo." checked={f.grantMetadata} onChange={(v) => set("grantMetadata", v)} />
              </div>

              <Callout tone="neutral" icon={<IconShield className="h-4 w-4" />}>
                Your connected wallet becomes the first admin. You can remove admin powers later from the dashboard.
              </Callout>
            </div>
          </SectionCard>
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <PreviewCard f={f} supplyRaw={supplyRaw} capRaw={capRaw} />
          <B20ReportCard
            f={f}
            decimalsOk={decimalsOk}
            hasErrors={hasErrors}
            onFixAll={applyStandardFixes}
            onFixDecimals={() => set("decimals", "18")}
            onFixCap={matchCapToSupply}
            onMakeFixedSupply={() => set("grantMinter", false)}
            onEnableBurn={() => set("grantBurner", true)}
            onDisablePause={() => set("grantPauser", false)}
          />
          <div className="mt-4">
            {!isConnected ? (
              <Card className="border-violet-200/80 bg-violet-50/60 p-4 text-center dark:border-violet-400/20 dark:bg-violet-400/[0.07]">
                <p className="mb-3 text-sm text-muted">Connect your wallet to create a B20 token.</p>
                <div className="flex justify-center">
                  <WalletConnect />
                </div>
              </Card>
            ) : !supported ? (
              <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />} title="Wrong network">
                Switch to {chainName(DEFAULT_CHAIN_ID)} from the wallet menu.
              </Callout>
            ) : (
              <Button size="lg" fullWidth loading={isSwitching || isPending || isMining} onClick={onCreate} className="gap-2">
                <IconRocket className="h-5 w-5" />
                {isSwitching ? "Switching network..." : isPending ? "Confirm in wallet..." : isMining ? "Creating B20..." : "Create native B20"}
              </Button>
            )}
            {hasErrors && isConnected && supported && <p className="mt-2 text-center text-xs text-negative">Fix the highlighted fields to continue.</p>}
            {networkError && <p className="mt-2 text-center text-xs text-negative">{networkError}</p>}
            {error && <p className="mt-2 text-center text-xs text-negative">{friendlyCreateError()}</p>}
          </div>
        </div>
      </div>

      <SuccessModal open={!!createdAddress} onClose={resetAll} address={createdAddress} chainId={targetChainId} cfg={pending?.config ?? null} />
    </div>
  );
}

function RoleToggle({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/80 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function PreviewCard({ f, supplyRaw, capRaw }: { f: FormState; supplyRaw: bigint | null; capRaw: bigint | null }) {
  const symbol = f.symbol.trim().toUpperCase() || "B20";
  return (
    <Card className="overflow-hidden border-sky-200/80 bg-sky-50/55 dark:border-sky-400/20 dark:bg-sky-400/[0.07]">
      <div className="h-1 bg-gradient-to-r from-sky-300 via-emerald-200 to-violet-200 dark:from-sky-400/50 dark:via-emerald-400/30 dark:to-violet-400/30" />
      <div className="flex items-center gap-3 border-b border-sky-200/70 bg-surface/80 px-5 py-4 dark:border-sky-400/20 dark:bg-surface/70">
        <TokenLogo src={f.logoURI} symbol={symbol} size="md" tone="sky" />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl leading-none text-fg">{f.name.trim() || "Your B20 Token"}</p>
          <p className="font-mono text-xs text-muted">${symbol}</p>
        </div>
      </div>
      <div className="space-y-2.5 px-5 py-4 text-sm">
        <Row label="Variant" value="Asset" />
        <Row label="Decimals" value={f.decimals || "18"} />
        <Row label="Initial supply" value={supplyRaw && supplyRaw > 0n ? commafy(f.supply) : "-"} />
        <Row label="Supply cap" value={f.capEnabled && capRaw ? commafy(f.supplyCap) : "uint128 max"} />
        <Row label="Network" value="Base mainnet" />
      </div>
    </Card>
  );
}

function B20ReportCard({
  f,
  decimalsOk,
  hasErrors,
  onFixAll,
  onFixDecimals,
  onFixCap,
  onMakeFixedSupply,
  onEnableBurn,
  onDisablePause,
}: {
  f: FormState;
  decimalsOk: boolean;
  hasErrors: boolean;
  onFixAll: () => void;
  onFixDecimals: () => void;
  onFixCap: () => void;
  onMakeFixedSupply: () => void;
  onEnableBurn: () => void;
  onDisablePause: () => void;
}) {
  const checks = [
    hasErrors
      ? {
          tone: "negative" as const,
          label: "Input validation",
          text: "Creator fix: missing or invalid fields block launch. Auto-fix fills launch-ready defaults.",
          action: "Auto-fix",
          onAction: onFixAll,
        }
      : { tone: "positive" as const, label: "Input validation", text: "Form values pass local checks." },
    decimalsOk
      ? { tone: "positive" as const, label: "Asset decimals", text: "B20 Asset decimals are inside the required 6-18 range." }
      : {
          tone: "negative" as const,
          label: "Asset decimals",
          text: "Creator fix: native B20 Asset tokens only support decimals from 6 to 18.",
          action: "Use 18",
          onAction: onFixDecimals,
        },
    { tone: "positive" as const, label: "Base launch", text: "Uses the official native B20 launch flow on Base mainnet." },
    f.capEnabled
      ? { tone: "positive" as const, label: "Supply cap", text: "Cap is enabled. Keep it at planned max supply or higher than current total supply." }
      : {
          tone: "warn" as const,
          label: "Supply cap",
          text: "Buyer trust note: no cap means future supply can be much larger. A fixed cap is easier for buyers to trust.",
          action: "Match supply",
          onAction: onFixCap,
        },
    f.grantMinter
      ? {
          tone: "warn" as const,
          label: "Mint role",
          text: "Buyer trust note: this is useful for you as admin, because you can mint later. Buyers may see it as extra supply risk.",
          action: "Turn off mint",
          onAction: onMakeFixedSupply,
        }
      : { tone: "positive" as const, label: "Mint role", text: "Initial supply is created, then future minting is turned off." },
    f.grantBurner
      ? { tone: "positive" as const, label: "Burn role", text: "Burn panel will work for your connected wallet." }
      : {
          tone: "warn" as const,
          label: "Burn role",
          text: "Creator tool: enable this if you want the dashboard burn controls after launch.",
          action: "Enable",
          onAction: onEnableBurn,
        },
    f.grantPauser
      ? {
          tone: "warn" as const,
          label: "Pause controls",
          text: "Buyer trust note: emergency pause can protect users, but it is still admin control. Keep only if needed.",
          action: "Turn off pause",
          onAction: onDisablePause,
        }
      : { tone: "positive" as const, label: "Pause controls", text: "Pause controls are off." },
  ];
  const review = checks.filter((c) => c.tone === "warn").length;
  const fail = checks.filter((c) => c.tone === "negative").length;

  return (
    <Card className="mt-4 overflow-hidden border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-200/70 bg-surface/80 px-5 py-4 dark:border-emerald-400/20 dark:bg-surface/70">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
            <IconShield className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Launch checklist</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Red means creator form fix. Yellow means buyer trust choice, not broken code.</p>
          </div>
        </div>
        <Badge tone={fail ? "negative" : review ? "warn" : "positive"}>
          {fail ? "Fix required" : review ? `${review} buyer note${review > 1 ? "s" : ""}` : "Ready"}
        </Badge>
      </div>
      <div className="space-y-2 px-5 py-4">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-2 rounded-xl border border-border/70 bg-surface/75 px-3 py-2.5">
            <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", check.tone === "positive" ? "bg-positive/10 text-positive" : check.tone === "warn" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-negative/10 text-negative")}>
              {check.tone === "positive" ? <IconCheck className="h-3.5 w-3.5" /> : <IconAlert className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-fg">{check.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{check.text}</p>
            </div>
            {"action" in check && check.action && (
              <Button type="button" size="sm" variant={check.tone === "negative" ? "secondary" : "outline"} onClick={check.onAction} className="shrink-0">
                {check.action}
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-emerald-200/70 px-5 py-3 text-[11px] leading-relaxed text-faint dark:border-emerald-400/20">
        A yellow note does not mean your token creation is failing. It shows admin powers that buyers may care about.
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function SuccessModal({
  open,
  onClose,
  address,
  chainId,
  cfg,
}: {
  open: boolean;
  onClose: () => void;
  address?: string;
  chainId: number;
  cfg: B20CreateConfig | null;
}) {
  return (
    <Modal open={open} onClose={onClose} title="B20 token created" size="md">
      {address && cfg && (
        <div className="space-y-5">
          <div className="rounded-xl border border-positive/30 bg-positive/[0.06] px-4 py-4 text-center">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-positive/15 text-positive">
              <IconCheck className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">
              <strong className="text-fg">{cfg.name}</strong> (${cfg.symbol}) is live as a native B20 Asset on {chainName(chainId)}.
            </p>
          </div>

          <Field label="Token address">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-xs">{address}</code>
              <CopyButton value={address} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <a href={`${explorerUrl(chainId)}/token/${address}`} target="_blank" rel="noreferrer">
              <Button variant="outline" fullWidth className="gap-1.5">
                <IconExternal className="h-4 w-4" /> BaseScan
              </Button>
            </a>
            <Link to={`/dashboard/${address}`} onClick={onClose}>
              <Button fullWidth className="gap-1.5">
                <IconGauge className="h-4 w-4" /> Manage token
              </Button>
            </Link>
          </div>
          <AddToWalletButton
            token={{ address: address as `0x${string}`, symbol: cfg.symbol, decimals: cfg.decimals, logoURI: cfg.logoURI }}
            variant="outline"
          />

          <Callout tone="positive" icon={<IconWallet className="h-4 w-4" />}>
            Initial supply was created and sent to your connected wallet.
          </Callout>
        </div>
      )}
    </Modal>
  );
}

function cleanDecimal(value: string) {
  const clean = value.replace(/[^\d.]/g, "");
  const [head, ...tail] = clean.split(".");
  return tail.length ? `${head}.${tail.join("")}` : head;
}

function parseTokenAmount(value: string, decimals: number): bigint | null {
  if (!value.trim() || !Number.isInteger(decimals)) return null;
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
}
