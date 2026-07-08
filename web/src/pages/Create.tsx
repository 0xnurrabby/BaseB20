import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount, useChainId, useDeployContract, useWaitForTransactionReceipt } from "wagmi";
import { B20_ABI, B20_BYTECODE, buildVerifyArgs, serializeTokenConfig, verifyCommand, verifyReadyCommand, type TokenConfigInput } from "../lib/contract";
import { chainName, explorerUrl, isSupportedChain } from "../lib/wagmi";
import { commafy, isAddressLike } from "../lib/format";
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
  Slider,
  Switch,
  cn,
} from "../components/ui";
import {
  IconAlert,
  IconCheck,
  IconCoins,
  IconExternal,
  IconFlame,
  IconGauge,
  IconRocket,
  IconSettings,
  IconSparkles,
  IconTrendDown,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from "../components/icons";
import { WalletConnect } from "../components/WalletConnect";
import { LogoPicker } from "../components/LogoPicker";

interface FormState {
  name: string;
  symbol: string;
  supply: string;
  decimals: string;
  logoURI: string;
  // advanced
  taxEnabled: boolean;
  buyTax: number; // percent
  sellTax: number;
  burnTax: number;
  taxWallet: string;
  mintable: boolean;
  capped: boolean;
  maxSupply: string;
  limitsEnabled: boolean;
  maxTx: string; // percent of supply
  maxWallet: string; // percent of supply
}

const DEFAULTS: FormState = {
  name: "",
  symbol: "",
  supply: "1000000000",
  decimals: "18",
  logoURI: "",
  taxEnabled: false,
  buyTax: 0,
  sellTax: 0,
  burnTax: 0,
  taxWallet: "",
  mintable: false,
  capped: false,
  maxSupply: "",
  limitsEnabled: false,
  maxTx: "2",
  maxWallet: "2",
};

const createPanel = {
  basics: {
    card: "border-sky-200/80 bg-sky-50/55 dark:border-sky-400/20 dark:bg-sky-400/[0.07]",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  },
  tax: {
    card: "border-amber-200/80 bg-amber-50/55 dark:border-amber-400/20 dark:bg-amber-400/[0.07]",
    icon: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
  },
  mint: {
    card: "border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07]",
    icon: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  limits: {
    card: "border-violet-200/80 bg-violet-50/55 dark:border-violet-400/20 dark:bg-violet-400/[0.07]",
    icon: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
  },
};

export function Create() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [tab, setTab] = useState<"normal" | "advanced">("normal");
  const [f, setF] = useState<FormState>(DEFAULTS);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setTouched((t) => (t[k as string] ? t : { ...t, [k as string]: true }));
  };
  const err = (key: string, message?: string) => (touched[key] ? message : undefined);

  const { deployContract, data: hash, isPending, error, reset } = useDeployContract();
  const { data: receipt, isLoading: isMining } = useWaitForTransactionReceipt({ hash });
  const [deployedCfg, setDeployedCfg] = useState<TokenConfigInput | null>(null);

  const supported = isSupportedChain(chainId);

  // ---- validation ------------------------------------------------------
  const supplyNum = Number(f.supply.replace(/,/g, ""));
  const decimalsNum = Number(f.decimals);
  const maxSupplyNum = Number(f.maxSupply.replace(/,/g, ""));

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (!f.symbol.trim()) e.symbol = "Symbol is required";
    else if (f.symbol.trim().length > 11) e.symbol = "Keep the symbol at 11 characters or less";
    if (!Number.isFinite(supplyNum) || supplyNum <= 0) e.supply = "Enter a supply greater than 0";
    else if (!Number.isInteger(supplyNum)) e.supply = "Supply must be a whole number";
    if (!Number.isInteger(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) e.decimals = "0-18";
    if (f.capped) {
      if (!Number.isFinite(maxSupplyNum) || maxSupplyNum <= 0) e.maxSupply = "Enter a max supply";
      else if (maxSupplyNum < supplyNum) e.maxSupply = "Max supply must be at least initial supply";
    }
    if (f.taxEnabled) {
      if (f.buyTax + f.burnTax > 25) e.buyTax = "Buy + burn tax must be at most 25%";
      if (f.sellTax + f.burnTax > 25) e.sellTax = "Sell + burn tax must be at most 25%";
      if (f.taxWallet && !isAddressLike(f.taxWallet)) e.taxWallet = "Not a valid address";
    }
    if (f.logoURI && !/^(https?|ipfs):\/\//.test(f.logoURI)) e.logoURI = "Use an https:// or ipfs:// URL";
    return e;
  }, [f, supplyNum, decimalsNum, maxSupplyNum]);

  const hasErrors = Object.keys(errors).length > 0;

  // ---- build config ----------------------------------------------------
  function buildConfig(): TokenConfigInput | null {
    if (!address) return null;
    const supply = BigInt(Math.trunc(supplyNum));
    const cap = f.capped ? BigInt(Math.trunc(maxSupplyNum)) : 0n;
    const maxTxTokens =
      f.limitsEnabled && Number(f.maxTx) > 0
        ? BigInt(Math.max(1, Math.floor((supplyNum * Number(f.maxTx)) / 100)))
        : 0n;
    const maxWalletTokens =
      f.limitsEnabled && Number(f.maxWallet) > 0
        ? BigInt(Math.max(1, Math.floor((supplyNum * Number(f.maxWallet)) / 100)))
        : 0n;
    return {
      name_: f.name.trim(),
      symbol_: f.symbol.trim().toUpperCase(),
      decimals_: decimalsNum,
      initialSupply: supply,
      cap,
      owner_: address,
      taxWallet_: (f.taxEnabled && isAddressLike(f.taxWallet) ? f.taxWallet : address) as `0x${string}`,
      buyTaxBps_: f.taxEnabled ? Math.round(f.buyTax * 100) : 0,
      sellTaxBps_: f.taxEnabled ? Math.round(f.sellTax * 100) : 0,
      burnTaxBps_: f.taxEnabled ? Math.round(f.burnTax * 100) : 0,
      mintable: f.mintable,
      maxTxTokens,
      maxWalletTokens,
      logoURI_: f.logoURI.trim(),
    };
  }

  function onDeploy() {
    if (hasErrors) {
      // Reveal every validation message so the user can see what to fix.
      setTouched(Object.keys(DEFAULTS).reduce((a, k) => ({ ...a, [k]: true }), {}));
      return;
    }
    const cfg = buildConfig();
    if (!cfg) return;
    setDeployedCfg(cfg);
    deployContract({ abi: B20_ABI, bytecode: B20_BYTECODE, args: [cfg as unknown as Record<string, unknown>] });
  }

  // Persist to registry once mined.
  const deployedAddress = receipt?.contractAddress ?? undefined;
  const [trackedDeploy, setTrackedDeploy] = useState("");
  useEffect(() => {
    if (deployedAddress && deployedCfg && address) {
      saveToken({
        address: deployedAddress,
        name: deployedCfg.name_,
        symbol: deployedCfg.symbol_,
        chainId,
        createdAt: Date.now(),
        deployer: address,
        txHash: hash,
        verifyConfig: serializeTokenConfig(deployedCfg),
      });
      if (trackedDeploy !== deployedAddress) {
        setTrackedDeploy(deployedAddress);
        trackEvent({
          eventType: "token_created",
          wallet: address,
          tokenAddress: deployedAddress,
          tokenName: deployedCfg.name_,
          tokenSymbol: deployedCfg.symbol_,
          chainId,
          txHash: hash,
          pagePath: "/create",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployedAddress, trackedDeploy]);

  function resetAll() {
    reset();
    setDeployedCfg(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-surface px-5 py-8 shadow-card sm:px-8">
        <div className="absolute inset-0 grid-dots opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-transparent to-violet-50 dark:from-sky-400/[0.08] dark:to-violet-400/[0.08]" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200">
            <IconSparkles className="h-3.5 w-3.5" />
            Token builder
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[0.98] text-fg sm:text-6xl">
            Create a token that feels ready to launch.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Configure the essentials, choose optional launch controls, deploy one transaction, and
            manage everything on <strong className="text-fg">{chainName(chainId)}</strong>.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Logo upload", "Fee controls", "Mint cap", "Anti-whale limits"].map((item) => (
              <span key={item} className="rounded-full border border-border bg-bg/80 px-3 py-1.5 text-xs font-medium text-muted">
                {item}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ------------------------------- FORM ------------------------------- */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="inline-flex rounded-2xl border border-border bg-surface p-1 shadow-card">
            {(["normal", "advanced"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  tab === t
                    ? t === "normal"
                      ? "bg-sky-50 text-sky-800 shadow-soft dark:bg-sky-400/10 dark:text-sky-200"
                      : "bg-violet-50 text-violet-800 shadow-soft dark:bg-violet-400/10 dark:text-violet-200"
                    : "text-muted hover:text-fg"
                )}
              >
                {t === "normal" ? <IconCoins className="h-4 w-4" /> : <IconSettings className="h-4 w-4" />}
                {t === "normal" ? "Basics" : "Advanced"}
              </button>
            ))}
          </div>

          {tab === "normal" ? (
            <SectionCard
              icon={<IconCoins className="h-5 w-5" />}
              title="Token basics"
              desc="The essentials every token needs."
              className={createPanel.basics.card}
              iconClassName={createPanel.basics.icon}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" error={err("name", errors.name)} hint="e.g. Base Doge">
                  <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Base Doge" maxLength={40} />
                </Field>
                <Field label="Symbol" error={err("symbol", errors.symbol)} hint="Ticker, e.g. BDOGE">
                  <Input
                    value={f.symbol}
                    onChange={(e) => set("symbol", e.target.value.toUpperCase())}
                    placeholder="BDOGE"
                    maxLength={11}
                    className="font-mono uppercase"
                  />
                </Field>
                <Field label="Total supply" error={err("supply", errors.supply)} hint={supplyNum > 0 ? `${commafy(supplyNum)} tokens` : "Whole tokens"}>
                  <Input
                    inputMode="numeric"
                    value={f.supply}
                    onChange={(e) => set("supply", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="1000000000"
                  />
                </Field>
                <Field label="Decimals" error={err("decimals", errors.decimals)} hint="Standard is 18">
                  <Input
                    inputMode="numeric"
                    value={f.decimals}
                    onChange={(e) => set("decimals", e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="18"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Logo" error={err("logoURI", errors.logoURI)}>
                    <LogoPicker value={f.logoURI} onChange={(url) => set("logoURI", url)} symbol={f.symbol} />
                  </Field>
                </div>
              </div>
              <div className="mt-4">
                <Callout tone="neutral" icon={<IconWallet className="h-4 w-4" />}>
                  The entire initial supply is minted to <strong className="text-fg">your connected wallet</strong>, which
                  also becomes the token owner.
                </Callout>
              </div>
            </SectionCard>
          ) : (
            <div className="space-y-5">
              {/* Taxes */}
              <SectionCard
                icon={<IconTrendUp className="h-5 w-5" />}
                title="Buy / sell tax"
                desc="Take a fee on DEX trades, routed to a collector wallet. Total is hard-capped at 25%."
                action={<Switch checked={f.taxEnabled} onChange={(v) => set("taxEnabled", v)} label="Enable tax" />}
                className={createPanel.tax.card}
                iconClassName={createPanel.tax.icon}
              >
                {f.taxEnabled && (
                  <div className="space-y-5">
                    <TaxSlider label="Buy tax" tone="positive" icon={<IconTrendUp className="h-4 w-4 text-positive" />} value={f.buyTax} onChange={(v) => set("buyTax", v)} error={errors.buyTax} />
                    <TaxSlider label="Sell tax" tone="negative" icon={<IconTrendDown className="h-4 w-4 text-negative" />} value={f.sellTax} onChange={(v) => set("sellTax", v)} error={errors.sellTax} />
                    {/* tax errors always show - they reflect an active misconfiguration, not a pristine field */}
                    <TaxSlider label="Burn on transfer" tone="neutral" icon={<IconFlame className="h-4 w-4" />} value={f.burnTax} onChange={(v) => set("burnTax", v)} hint="Burned on every non-exempt transfer (deflationary)." />
                    <Field label="Tax collector wallet" error={err("taxWallet", errors.taxWallet)} hint="Where buy/sell tax is sent. Defaults to your wallet.">
                      <Input value={f.taxWallet} onChange={(e) => set("taxWallet", e.target.value)} placeholder={address ?? "0x..."} className="font-mono text-xs" />
                    </Field>
                    <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
                      Buy/sell tax only applies once you register your DEX pair in the dashboard after adding liquidity.
                      Until then it behaves like a plain token.
                    </Callout>
                  </div>
                )}
                {!f.taxEnabled && <p className="text-sm text-faint">No trading tax. A clean, standard ERC-20 transfer.</p>}
              </SectionCard>

              {/* Mint */}
              <SectionCard
                icon={<IconCoins className="h-5 w-5" />}
                title="Minting & supply cap"
                desc="Allow creating more tokens later, with an optional permanent hard cap."
                action={<Switch checked={f.mintable} onChange={(v) => set("mintable", v)} label="Enable minting" />}
                className={createPanel.mint.card}
                iconClassName={createPanel.mint.icon}
              >
                {f.mintable ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200/70 bg-surface/80 px-4 py-3 dark:border-emerald-400/20 dark:bg-surface/70">
                      <div>
                        <p className="text-sm font-medium">Hard cap</p>
                        <p className="text-xs text-muted">Cap total supply so minting can never exceed it.</p>
                      </div>
                      <Switch checked={f.capped} onChange={(v) => set("capped", v)} label="Cap supply" />
                    </div>
                    {f.capped && (
                      <Field label="Max supply" error={err("maxSupply", errors.maxSupply)} hint={maxSupplyNum > 0 ? `${commafy(maxSupplyNum)} tokens` : "Whole tokens, at least initial supply"}>
                        <Input
                          inputMode="numeric"
                          value={f.maxSupply}
                          onChange={(e) => set("maxSupply", e.target.value.replace(/[^\d]/g, ""))}
                          placeholder="2000000000"
                        />
                      </Field>
                    )}
                    <Callout tone="neutral" icon={<IconFlame className="h-4 w-4" />}>
                      You can permanently disable minting anytime from the dashboard. This is a strong trust signal for holders.
                    </Callout>
                  </div>
                ) : (
                  <p className="text-sm text-faint">Fixed supply. No new tokens can ever be minted. (Recommended for memecoins.)</p>
                )}
              </SectionCard>

              {/* Limits */}
              <SectionCard
                icon={<IconUsers className="h-5 w-5" />}
                title="Anti-whale limits"
                desc="Cap how much a single wallet can hold or move, so snipers have less room to dump."
                action={<Switch checked={f.limitsEnabled} onChange={(v) => set("limitsEnabled", v)} label="Enable limits" />}
                className={createPanel.limits.card}
                iconClassName={createPanel.limits.icon}
              >
                {f.limitsEnabled ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Max transaction" hint={`${f.maxTx}% of supply${supplyNum > 0 ? ` | ${commafy(Math.floor((supplyNum * Number(f.maxTx)) / 100))}` : ""}`}>
                      <Slider value={Number(f.maxTx)} min={0.1} max={10} step={0.1} onChange={(v) => set("maxTx", String(v))} />
                    </Field>
                    <Field label="Max wallet" hint={`${f.maxWallet}% of supply${supplyNum > 0 ? ` | ${commafy(Math.floor((supplyNum * Number(f.maxWallet)) / 100))}` : ""}`}>
                      <Slider value={Number(f.maxWallet)} min={0.1} max={10} step={0.1} onChange={(v) => set("maxWallet", String(v))} />
                    </Field>
                  </div>
                ) : (
                  <p className="text-sm text-faint">No holding or transfer limits.</p>
                )}
              </SectionCard>

              <Callout tone="neutral" icon={<IconGauge className="h-4 w-4" />}>
                <strong className="text-fg">Blacklist, whitelist, trading pause, ownership renounce, airdrop</strong> and
                more are managed live after deployment from the <Link to="/dashboard" className="underline">dashboard</Link>.
              </Callout>
            </div>
          )}
        </div>

        {/* ----------------------------- PREVIEW ----------------------------- */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <PreviewCard f={f} supplyNum={supplyNum} />
          <div className="mt-4">
            {!isConnected ? (
              <Card className="border-violet-200/80 bg-violet-50/60 p-4 text-center dark:border-violet-400/20 dark:bg-violet-400/[0.07]">
                <p className="mb-3 text-sm text-muted">Connect your wallet to deploy.</p>
                <div className="flex justify-center">
                  <WalletConnect />
                </div>
              </Card>
            ) : !supported ? (
              <Callout tone="negative" icon={<IconAlert className="h-4 w-4" />} title="Wrong network">
                Switch to Base Sepolia from the wallet menu.
              </Callout>
            ) : (
              <Button size="lg" fullWidth loading={isPending || isMining} onClick={onDeploy} className="gap-2">
                <IconRocket className="h-5 w-5" />
                {isPending ? "Confirm in wallet..." : isMining ? "Deploying..." : "Deploy token"}
              </Button>
            )}
            {hasErrors && isConnected && supported && (
              <p className="mt-2 text-center text-xs text-negative">Fix the highlighted fields to deploy.</p>
            )}
            {error && (
              <p className="mt-2 text-center text-xs text-negative">
                {error.message.includes("User rejected") ? "Transaction rejected." : "Deploy failed. Check console for details."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Success modal */}
      <SuccessModal
        open={!!deployedAddress}
        onClose={resetAll}
        address={deployedAddress}
        chainId={chainId}
        cfg={deployedCfg}
      />
    </div>
  );
}

/* ------------------------------- Subviews -------------------------------- */

function TaxSlider({
  label,
  value,
  onChange,
  tone,
  icon,
  error,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tone: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
          {icon} {label}
        </span>
        <Badge tone={tone === "neutral" ? "neutral" : tone}>{value.toFixed(1)}%</Badge>
      </div>
      <Slider value={value} min={0} max={25} step={0.5} onChange={onChange} tone={tone} />
      {error ? <p className="mt-1.5 text-xs text-negative">{error}</p> : hint ? <p className="mt-1.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

function PreviewCard({ f, supplyNum }: { f: FormState; supplyNum: number }) {
  const symbol = f.symbol.trim().toUpperCase() || "TKN";
  const flags: Array<{ label: string; on: boolean }> = [
    { label: "Taxed", on: f.taxEnabled && (f.buyTax > 0 || f.sellTax > 0) },
    { label: "Deflationary", on: f.taxEnabled && f.burnTax > 0 },
    { label: "Mintable", on: f.mintable },
    { label: "Capped", on: f.mintable && f.capped },
    { label: "Anti-whale", on: f.limitsEnabled },
  ].filter((x) => x.on);

  return (
    <Card className="overflow-hidden border-sky-200/80 bg-sky-50/55 dark:border-sky-400/20 dark:bg-sky-400/[0.07]">
      <div className="h-1 bg-gradient-to-r from-sky-300 via-violet-200 to-emerald-200 dark:from-sky-400/50 dark:via-violet-400/30 dark:to-emerald-400/30" />
      <div className="flex items-center gap-3 border-b border-sky-200/70 bg-surface/80 px-5 py-4 dark:border-sky-400/20 dark:bg-surface/70">
        {f.logoURI ? (
          <img src={f.logoURI} alt="" className="h-11 w-11 rounded-full border border-border object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-full border border-sky-200 bg-sky-100 font-mono text-sm font-semibold text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200">
            {symbol.slice(0, 3)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-2xl leading-none text-fg">{f.name.trim() || "Your Token"}</p>
          <p className="font-mono text-xs text-muted">${symbol}</p>
        </div>
      </div>
      <div className="space-y-2.5 px-5 py-4 text-sm">
        <Row label="Supply" value={supplyNum > 0 ? commafy(supplyNum) : "-"} />
        <Row label="Decimals" value={f.decimals || "18"} />
        {f.taxEnabled && <Row label="Buy / Sell tax" value={`${f.buyTax}% / ${f.sellTax}%`} />}
        {f.taxEnabled && f.burnTax > 0 && <Row label="Burn / transfer" value={`${f.burnTax}%`} />}
        {f.mintable && <Row label="Max supply" value={f.capped && f.maxSupply ? commafy(f.maxSupply) : "Uncapped"} />}
        {f.limitsEnabled && <Row label="Max wallet" value={`${f.maxWallet}%`} />}
      </div>
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-sky-200/70 bg-surface/60 px-5 py-3 dark:border-sky-400/20 dark:bg-surface/50">
          {flags.map((x) => (
            <Badge key={x.label} tone="accent">
              <IconCheck className="h-3 w-3" /> {x.label}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
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
  cfg: TokenConfigInput | null;
}) {
  const net = "baseSepolia";
  const verifyUrl = address ? `${explorerUrl(chainId)}/verifyContract?a=${address}` : "";
  const argsFile = cfg ? buildVerifyArgs(cfg) : "";
  const hardhatCommand = address ? verifyCommand(address, net) : "";
  const readyCommand = address && cfg ? verifyReadyCommand(cfg, address, net) : "";

  return (
    <Modal open={open} onClose={onClose} title="Token deployed" size="md">
      {address && cfg && (
        <div className="space-y-5">
          <div className="rounded-xl border border-positive/30 bg-positive/[0.06] px-4 py-4 text-center">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-positive/15 text-positive">
              <IconCheck className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">
              <strong className="text-fg">{cfg.name_}</strong> (${cfg.symbol_}) is live on {chainName(chainId)}.
            </p>
          </div>

          <Field label="Contract address">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-xs">{address}</code>
              <CopyButton value={address} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <a href={`${explorerUrl(chainId)}/address/${address}`} target="_blank" rel="noreferrer">
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

          <div className="rounded-xl border border-border bg-elevated/50 px-4 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Verify on BaseScan</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Open the dashboard and press <strong className="text-fg">Verify & publish</strong>. No terminal command needed.
                </p>
              </div>
              <Badge tone="positive" className="w-fit">
                Base Sepolia
              </Badge>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link to={`/dashboard/${address}`} onClick={onClose}>
                <Button fullWidth className="gap-1.5">
                  <IconCheck className="h-4 w-4" /> Verify & publish
                </Button>
              </Link>
              <a href={verifyUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" fullWidth className="gap-1.5">
                  <IconExternal className="h-4 w-4" /> Open verify page
                </Button>
              </a>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              The dashboard uses the server-side BaseScan key, keeps it private, and checks the result automatically.
            </p>

            <details className="mt-3 border-t border-border pt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted">Manual fallback</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <CopyButton
                  value={readyCommand}
                  label="Copy ready command"
                  className="h-9 justify-center rounded-xl bg-surface"
                />
                <CopyButton value={argsFile} label="Copy arguments.js" className="h-9 justify-center rounded-xl bg-surface" />
                <CopyButton value={hardhatCommand} label="Copy Hardhat command" className="h-9 justify-center rounded-xl bg-surface" />
              </div>
            </details>
          </div>

          <p className="text-center text-[11px] text-faint">
            Saved to your local token list. Find it anytime on the dashboard.
          </p>
        </div>
      )}
    </Modal>
  );
}
