import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Callout, cn } from "../components/ui";
import {
  IconAlert,
  IconArrowRight,
  IconBook,
  IconCheck,
  IconCoins,
  IconFlame,
  IconGauge,
  IconInfo,
  IconLink,
  IconLifebuoy,
  IconLock,
  IconRocket,
  IconSend,
  IconShield,
  IconSparkles,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from "../components/icons";

type Tone = "sky" | "mint" | "amber" | "rose" | "violet" | "cyan" | "lime";

interface Section {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  tone: Tone;
  icon: ReactNode;
  body: ReactNode;
}

const toneStyles: Record<Tone, { card: string; badge: string; icon: string; glow: string; rule: string }> = {
  sky: {
    card: "border-sky-200/80 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-400/[0.08]",
    badge: "border-sky-200 bg-sky-100/80 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
    glow: "bg-sky-200/60 dark:bg-sky-500/15",
    rule: "from-sky-300 via-cyan-200 to-transparent dark:from-sky-500/50 dark:via-cyan-400/30",
  },
  mint: {
    card: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]",
    badge: "border-emerald-200 bg-emerald-100/80 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
    icon: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
    glow: "bg-emerald-200/60 dark:bg-emerald-500/15",
    rule: "from-emerald-300 via-teal-200 to-transparent dark:from-emerald-500/50 dark:via-teal-400/30",
  },
  amber: {
    card: "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-400/[0.08]",
    badge: "border-amber-200 bg-amber-100/80 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
    icon: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
    glow: "bg-amber-200/60 dark:bg-amber-500/15",
    rule: "from-amber-300 via-orange-200 to-transparent dark:from-amber-500/50 dark:via-orange-400/30",
  },
  rose: {
    card: "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/20 dark:bg-rose-400/[0.08]",
    badge: "border-rose-200 bg-rose-100/80 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
    icon: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
    glow: "bg-rose-200/60 dark:bg-rose-500/15",
    rule: "from-rose-300 via-pink-200 to-transparent dark:from-rose-500/50 dark:via-pink-400/30",
  },
  violet: {
    card: "border-violet-200/80 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-400/[0.08]",
    badge: "border-violet-200 bg-violet-100/80 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
    icon: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
    glow: "bg-violet-200/60 dark:bg-violet-500/15",
    rule: "from-violet-300 via-fuchsia-200 to-transparent dark:from-violet-500/50 dark:via-fuchsia-400/30",
  },
  cyan: {
    card: "border-cyan-200/80 bg-cyan-50/70 dark:border-cyan-400/20 dark:bg-cyan-400/[0.08]",
    badge: "border-cyan-200 bg-cyan-100/80 text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200",
    icon: "border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200",
    glow: "bg-cyan-200/60 dark:bg-cyan-500/15",
    rule: "from-cyan-300 via-sky-200 to-transparent dark:from-cyan-500/50 dark:via-sky-400/30",
  },
  lime: {
    card: "border-lime-200/80 bg-lime-50/70 dark:border-lime-400/20 dark:bg-lime-400/[0.08]",
    badge: "border-lime-200 bg-lime-100/80 text-lime-800 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200",
    icon: "border-lime-200 bg-lime-100 text-lime-700 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200",
    glow: "bg-lime-200/60 dark:bg-lime-500/15",
    rule: "from-lime-300 via-emerald-200 to-transparent dark:from-lime-500/50 dark:via-emerald-400/30",
  },
};

const quickLinks = [
  {
    title: "Create",
    copy: "Configure token basics, upload a logo, and deploy on Base Sepolia.",
    icon: <IconRocket className="h-5 w-5" />,
    to: "/create",
    tone: "sky" as Tone,
  },
  {
    title: "Manage",
    copy: "Tune fees, limits, trading controls, airdrops and ownership.",
    icon: <IconGauge className="h-5 w-5" />,
    to: "/dashboard",
    tone: "mint" as Tone,
  },
  {
    title: "Verify",
    copy: "Copy the ready command and publish source on BaseScan faster.",
    icon: <IconCheck className="h-5 w-5" />,
    to: "#verify",
    tone: "amber" as Tone,
  },
  {
    title: "Safety",
    copy: "Understand owner powers before launch and renounce when ready.",
    icon: <IconShield className="h-5 w-5" />,
    to: "#security",
    tone: "rose" as Tone,
  },
];

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "What B20 Is",
    eyebrow: "Studio Overview",
    summary: "A no-code launch and operations suite for ERC-20 tokens on Base Sepolia.",
    tone: "sky",
    icon: <IconBook className="h-5 w-5" />,
    body: (
      <>
        <P>
          <b>B20</b> helps you create, test and manage ERC-20 tokens without writing Solidity. You
          choose the launch settings in the browser, deploy with one wallet transaction, then run
          the token from the owner dashboard.
        </P>
        <P>
          The contract uses audited OpenZeppelin components, gas-conscious storage, and a verification
          flow designed for BaseScan. It is built for community-token experiments on <b>Base Sepolia</b>
          while Base mainnet B20 remains paused.
        </P>
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />} title="Solidity B20 studio and Base native B20">
          Base is also working on a native token standard called B20 for regulated stablecoin and
          real-world-asset issuers. This app is separate from that standard. It deploys classic
          Solidity ERC-20 contracts with taxes, anti-whale limits, launch controls and BaseScan verification.
        </Callout>
      </>
    ),
  },
  {
    id: "getting-started",
    title: "Getting Started",
    eyebrow: "First Run",
    summary: "Connect a wallet, switch to Base Sepolia, and use test ETH before deploying.",
    tone: "mint",
    icon: <IconWallet className="h-5 w-5" />,
    body: (
      <>
        <Ol>
          <li><b>Connect a wallet</b> from the top-right wallet button.</li>
          <li><b>Use Base Sepolia.</b> It is the only enabled network right now.</li>
          <li><b>Fund with test ETH</b> from a Base Sepolia faucet before deploying.</li>
          <li><b>Deploy small test tokens first</b> so you can rehearse the full launch flow.</li>
        </Ol>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          Do not send mainnet funds to this app while mainnet support is disabled.
        </Callout>
      </>
    ),
  },
  {
    id: "create",
    title: "Create A Token",
    eyebrow: "Launch Setup",
    summary: "Set supply, token identity, logo, taxes, minting and launch limits in one flow.",
    tone: "violet",
    icon: <IconSparkles className="h-5 w-5" />,
    body: (
      <>
        <P>
          The <Link to="/create" className="font-medium text-fg underline decoration-border underline-offset-4">Create</Link>{" "}
          page separates required fields from advanced launch controls, so you can keep a simple token
          simple or add stricter launch mechanics when needed.
        </P>
        <FeatureGrid
          items={[
            ["Basics", "Name, symbol, total supply, decimals and an optional uploaded logo."],
            ["Ownership", "The full initial supply is minted to your connected wallet."],
            ["Advanced", "Buy tax, sell tax, burn, mint caps, max transaction and max wallet."],
            ["Later controls", "Blacklist, whitelist, pause, airdrops and ownership changes stay in the dashboard."],
          ]}
        />
      </>
    ),
  },
  {
    id: "tax",
    title: "Buy, Sell And Burn Fees",
    eyebrow: "Fee Model",
    summary: "Use fees carefully, keep them transparent, and rely on the 25% on-chain ceiling.",
    tone: "amber",
    icon: <IconFlame className="h-5 w-5" />,
    body: (
      <>
        <P>
          <b>Buy tax</b> applies when tokens move from a registered DEX pair. <b>Sell tax</b> applies
          when tokens move into that pair. Collected fees go to the tax collector wallet. <b>Burn</b>{" "}
          destroys a slice of transfers and reduces total supply.
        </P>
        <Callout tone="positive" icon={<IconShield className="h-4 w-4" />} title="Hard fee ceiling">
          The contract rejects any trade configuration above 25% total tax. The owner cannot set a
          malicious 99% honeypot fee.
        </Callout>
        <P>
          On the dashboard, changed fee sliders are saved through one clear save action. After the
          transaction receipts confirm, the app refetches the current on-chain values.
        </P>
      </>
    ),
  },
  {
    id: "pairs",
    title: "DEX Pairs",
    eyebrow: "Trade Detection",
    summary: "Register pool addresses so the contract can distinguish buys, sells and normal transfers.",
    tone: "cyan",
    icon: <IconLink className="h-5 w-5" />,
    body: (
      <>
        <P>
          ERC-20 transfers do not include the word buy or sell. The contract detects trades by checking
          whether the sender or receiver is a registered liquidity pair.
        </P>
        <Ol>
          <li>Deploy your token.</li>
          <li>Add liquidity on a Base DEX such as Aerodrome or Uniswap.</li>
          <li>Copy the created pool or pair address.</li>
          <li>Paste it into the dashboard DEX pairs panel and mark it as active.</li>
        </Ol>
        <P>
          Before a pair is registered, the token behaves like a plain untaxed ERC-20.
        </P>
      </>
    ),
  },
  {
    id: "minting",
    title: "Minting And Supply Cap",
    eyebrow: "Supply Control",
    summary: "Mint only if enabled, respect the hard cap, and disable minting forever when ready.",
    tone: "lime",
    icon: <IconCoins className="h-5 w-5" />,
    body: (
      <>
        <P>
          If minting is enabled, the dashboard can mint new tokens to any address. When a hard cap is
          set, total supply can never move above that cap.
        </P>
        <P>
          <b>Disable minting forever</b> permanently locks future supply. It is irreversible, but it is
          also a strong trust signal for holders.
        </P>
        <P>
          Token holders can still burn their own balance through standard ERC20Burnable behavior.
        </P>
      </>
    ),
  },
  {
    id: "limits",
    title: "Anti-Whale Limits",
    eyebrow: "Launch Protection",
    summary: "Use max transaction and max wallet to make early distribution harder to abuse.",
    tone: "rose",
    icon: <IconTrendUp className="h-5 w-5" />,
    body: (
      <>
        <P>
          <b>Max transaction</b> caps how much can move in a single transfer. <b>Max wallet</b> caps
          how much one address can hold. Together they reduce early launch concentration.
        </P>
        <P>
          Owner and tax wallets are excluded automatically. Registered pools are exempt from the max
          wallet check, so liquidity can be larger than holder limits.
        </P>
      </>
    ),
  },
  {
    id: "trading",
    title: "Trading Gate And Pause",
    eyebrow: "Launch State",
    summary: "Keep trading closed while preparing liquidity, then open it permanently when ready.",
    tone: "sky",
    icon: <IconLock className="h-5 w-5" />,
    body: (
      <>
        <P>
          New tokens start with trading closed. This gives the owner time to add liquidity, register
          pairs, and double-check configuration before public transfers begin.
        </P>
        <P>
          <b>Enable trading</b> opens the token permanently. <b>Pause</b> is a temporary emergency
          brake for non-exempt transfers.
        </P>
      </>
    ),
  },
  {
    id: "access",
    title: "Blacklist And Whitelist",
    eyebrow: "Access Controls",
    summary: "Block malicious wallets or run a temporary allowlisted launch phase.",
    tone: "violet",
    icon: <IconUsers className="h-5 w-5" />,
    body: (
      <>
        <P>
          <b>Blacklist</b> prevents a wallet from sending or receiving tokens. <b>Whitelist-only mode</b>{" "}
          limits transfers to approved wallets while the mode is active.
        </P>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          These are centralized owner powers. Use them transparently and renounce ownership when you
          want to prove they can no longer be used.
        </Callout>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Ownership",
    eyebrow: "Control Transfer",
    summary: "Transfer ownership in two steps, or renounce when the token is ready to be immutable.",
    tone: "mint",
    icon: <IconShield className="h-5 w-5" />,
    body: (
      <>
        <P>
          Ownership transfer is a two-step process. The current owner nominates a new owner, and the
          new owner must accept control from their own wallet.
        </P>
        <P>
          <b>Renounce ownership</b> sets the owner to the zero address forever. Tax, minting, blacklist,
          pause and other owner actions become frozen.
        </P>
      </>
    ),
  },
  {
    id: "airdrop",
    title: "Batch Airdrop",
    eyebrow: "Distribution",
    summary: "Send tokens to many wallets in one transaction after the dashboard validates the list.",
    tone: "cyan",
    icon: <IconSend className="h-5 w-5" />,
    body: (
      <>
        <P>
          Paste one recipient per line as <Code>address, amount</Code>. The panel totals the list,
          checks it against your balance, and sends the whole batch in one transaction.
        </P>
        <P>
          This is usually cheaper and easier to audit than sending many individual transfers.
        </P>
      </>
    ),
  },
  {
    id: "rescue",
    title: "Rescue Stuck Funds",
    eyebrow: "Recovery",
    summary: "Recover ETH or foreign ERC-20 tokens that were sent to the contract by mistake.",
    tone: "lime",
    icon: <IconLifebuoy className="h-5 w-5" />,
    body: (
      <>
        <P>
          The dashboard can rescue ETH or unrelated ERC-20 tokens that people accidentally send
          directly to the token contract.
        </P>
        <P>
          Your own token cannot be rescued through this panel by design, so the owner cannot drain
          holder balances with the recovery function.
        </P>
      </>
    ),
  },
  {
    id: "verify",
    title: "Verify On BaseScan",
    eyebrow: "Source Publishing",
    summary: "Use the generated command to publish contract source and constructor arguments.",
    tone: "amber",
    icon: <IconCheck className="h-5 w-5" />,
    body: (
      <>
        <P>
          After deployment, the success dialog includes a <b>Copy ready command</b> action. Run it from
          the <Code>contracts/</Code> folder. It writes <Code>arguments.js</Code> and starts Hardhat verification.
        </P>
        <Pre>{`cd contracts
export BASESCAN_API_KEY=your_key

# Paste the copied command from the app.
npx hardhat verify --network baseSepolia \\
  --constructor-args arguments.js <TOKEN_ADDRESS>`}</Pre>
        <P>
          Once verified, BaseScan shows the source code and constructor arguments publicly.
        </P>
      </>
    ),
  },
  {
    id: "security",
    title: "Security Notes",
    eyebrow: "Launch Discipline",
    summary: "The app is non-custodial, but owner powers are real and should be communicated clearly.",
    tone: "rose",
    icon: <IconAlert className="h-5 w-5" />,
    body: (
      <>
        <Ul>
          <li>B20 never holds your private keys, wallet funds or token ownership.</li>
          <li>Contracts are immutable after deployment, so rehearse on Base Sepolia every time.</li>
          <li>Owner powers such as tax, blacklist, pause and minting are visible on-chain.</li>
          <li>This tool and documentation are not financial or legal advice.</li>
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
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-28% 0px -62% 0px", threshold: 0 }
    );

    SECTIONS.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-8 shadow-card sm:px-8 lg:px-10">
        <div className="absolute inset-0 grid-dots opacity-60" />
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-200/60 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute -bottom-24 left-12 h-60 w-60 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-500/10" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200">
            <IconSparkles className="h-3.5 w-3.5" />
            B20 Documentation
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[0.98] text-fg sm:text-6xl lg:text-7xl">
            Launch with clarity. Manage with confidence.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            A professional guide to creating, verifying and operating ERC-20 tokens on Base Sepolia
            with B20.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Base Sepolia only", "25% tax ceiling", "BaseScan ready", "Non-custodial"].map((item) => (
              <span key={item} className="rounded-full border border-border bg-bg/80 px-3 py-1.5 text-xs font-medium text-muted">
                {item}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((item) => (
          <QuickLink key={item.title} {...item} />
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-2xl border border-border bg-surface p-3 shadow-card">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
              Chapters
            </p>
            <div className="space-y-1">
              {SECTIONS.map((section) => {
                const tone = toneStyles[section.tone];
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition",
                      active === section.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/70 hover:text-fg"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full transition",
                        active === section.id ? tone.glow : "bg-border group-hover:bg-ring"
                      )}
                    />
                    <span className="truncate">{section.title}</span>
                  </a>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-6">
          {SECTIONS.map((section) => (
            <DocSection key={section.id} section={section} />
          ))}

          <section className="rounded-2xl border border-border bg-fg p-6 text-bg shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-display text-3xl leading-tight">Ready to test your launch?</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-bg/75">
                Create on Base Sepolia, verify the contract, then tune the dashboard before any real launch plan.
              </p>
            </div>
            <Link
              to="/create"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-bg px-5 py-3 text-sm font-semibold text-fg transition hover:opacity-90 sm:mt-0"
            >
              Create a token <IconArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}

function QuickLink({
  title,
  copy,
  icon,
  to,
  tone,
}: {
  title: string;
  copy: string;
  icon: ReactNode;
  to: string;
  tone: Tone;
}) {
  const styles = toneStyles[tone];
  const className = cn(
    "group relative overflow-hidden rounded-2xl border p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft",
    styles.card
  );
  const content = (
    <>
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl border", styles.icon)}>{icon}</span>
      <h2 className="mt-4 text-base font-semibold text-fg">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{copy}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-fg">
        Open <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </>
  );

  if (to.startsWith("#")) {
    return <a href={to} className={className}>{content}</a>;
  }

  return <Link to={to} className={className}>{content}</Link>;
}

function DocSection({ section }: { section: Section }) {
  const styles = toneStyles[section.tone];

  return (
    <section
      id={section.id}
      className={cn("scroll-mt-24 overflow-hidden rounded-2xl border bg-surface shadow-card", styles.card)}
    >
      <div className={cn("h-1 w-full bg-gradient-to-r", styles.rule)} />
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", styles.icon)}>
            {section.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", styles.badge)}>
              {section.eyebrow}
            </span>
            <h2 className="mt-3 font-display text-3xl leading-tight text-fg sm:text-4xl">{section.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-[15px]">{section.summary}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4 text-[15px] leading-7 text-muted">{section.body}</div>
      </div>
    </section>
  );
}

function FeatureGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([title, copy]) => (
        <div key={title} className="rounded-xl border border-border bg-bg/70 p-4">
          <p className="font-semibold text-fg">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{copy}</p>
        </div>
      ))}
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-faint">{children}</ul>;
}

function Ol({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 marker:text-faint">{children}</ol>;
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-lg border border-border bg-bg px-1.5 py-0.5 font-mono text-[12px] text-fg">{children}</code>;
}

function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-auto rounded-xl border border-border bg-bg p-4 font-mono text-[12px] leading-relaxed text-fg">
      {children}
    </pre>
  );
}
