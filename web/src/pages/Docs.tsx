import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Callout, cn } from "../components/ui";
import {
  IconAlert,
  IconBook,
  IconCheck,
  IconExternal,
  IconGauge,
  IconInfo,
  IconLock,
  IconRocket,
  IconShield,
  IconSparkles,
  IconUsers,
  IconWallet,
} from "../components/icons";
import { ACTIVATION_REGISTRY_ADDRESS, B20_FACTORY_ADDRESS, MAX_UINT128, POLICY_REGISTRY_ADDRESS } from "../lib/contract";

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

const toneStyles: Record<Tone, { card: string; badge: string; icon: string; rule: string }> = {
  sky: {
    card: "border-sky-200/80 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-400/[0.08]",
    badge: "border-sky-200 bg-sky-100/80 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
    icon: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
    rule: "from-sky-300 via-cyan-200 to-transparent dark:from-sky-500/50 dark:via-cyan-400/30",
  },
  mint: {
    card: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08]",
    badge: "border-emerald-200 bg-emerald-100/80 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
    icon: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
    rule: "from-emerald-300 via-teal-200 to-transparent dark:from-emerald-500/50 dark:via-teal-400/30",
  },
  amber: {
    card: "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-400/[0.08]",
    badge: "border-amber-200 bg-amber-100/80 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
    icon: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
    rule: "from-amber-300 via-orange-200 to-transparent dark:from-amber-500/50 dark:via-orange-400/30",
  },
  rose: {
    card: "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/20 dark:bg-rose-400/[0.08]",
    badge: "border-rose-200 bg-rose-100/80 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
    icon: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
    rule: "from-rose-300 via-pink-200 to-transparent dark:from-rose-500/50 dark:via-pink-400/30",
  },
  violet: {
    card: "border-violet-200/80 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-400/[0.08]",
    badge: "border-violet-200 bg-violet-100/80 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
    icon: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
    rule: "from-violet-300 via-fuchsia-200 to-transparent dark:from-violet-500/50 dark:via-fuchsia-400/30",
  },
  cyan: {
    card: "border-cyan-200/80 bg-cyan-50/70 dark:border-cyan-400/20 dark:bg-cyan-400/[0.08]",
    badge: "border-cyan-200 bg-cyan-100/80 text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200",
    icon: "border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200",
    rule: "from-cyan-300 via-sky-200 to-transparent dark:from-cyan-500/50 dark:via-sky-400/30",
  },
  lime: {
    card: "border-lime-200/80 bg-lime-50/70 dark:border-lime-400/20 dark:bg-lime-400/[0.08]",
    badge: "border-lime-200 bg-lime-100/80 text-lime-800 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200",
    icon: "border-lime-200 bg-lime-100 text-lime-700 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200",
    rule: "from-lime-300 via-emerald-200 to-transparent dark:from-lime-500/50 dark:via-emerald-400/30",
  },
};

const quickLinks = [
  { title: "Create", copy: "Launch a native B20 Asset token on Base mainnet.", icon: <IconRocket className="h-5 w-5" />, to: "/create", tone: "sky" as Tone },
  { title: "Manage", copy: "Mint, burn, update logo and manage permissions.", icon: <IconGauge className="h-5 w-5" />, to: "/dashboard", tone: "mint" as Tone },
  { title: "Base docs", copy: "Official launch guide and standard reference.", icon: <IconExternal className="h-5 w-5" />, to: "https://docs.base.org/get-started/launch-b20-token", tone: "amber" as Tone },
  { title: "Safety", copy: "Understand admin powers before locking them.", icon: <IconShield className="h-5 w-5" />, to: "#security", tone: "rose" as Tone },
];

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "What B20 Is",
    eyebrow: "Native Standard",
    summary: "B20 is Base's native token standard and an ERC-20 superset implemented as chain precompiles.",
    tone: "sky",
    icon: <IconBook className="h-5 w-5" />,
    body: (
      <>
        <P>
          <b>B20</b> is Base's native token standard. It is an ERC-20 superset, so standard ERC-20 calls such as
          <Code>transfer</Code>, <Code>transferFrom</Code>, <Code>approve</Code>, <Code>balanceOf</Code> and
          <Code>allowance</Code> remain compatible with existing ERC-20 tooling.
        </P>
        <P>
          The important difference is implementation. B20 tokens run as Rust precompiles on Base instead of normal EVM
          smart contracts deployed by users. That is why this app calls the singleton B20 Factory instead of deploying
          custom Solidity bytecode.
        </P>
        <Callout tone="positive" icon={<IconCheck className="h-4 w-4" />} title="Current app behavior">
          This studio creates B20 Asset variant tokens on Base mainnet chain ID 8453. Legacy custom-token flows are no
          longer part of the launch path.
        </Callout>
      </>
    ),
  },
  {
    id: "network",
    title: "Network And Addresses",
    eyebrow: "Mainnet",
    summary: "The production path is Base mainnet with the official B20 precompile addresses.",
    tone: "mint",
    icon: <IconWallet className="h-5 w-5" />,
    body: (
      <>
        <InfoGrid
          rows={[
            ["Network", "Base mainnet"],
            ["Chain ID", "8453"],
            ["RPC", "https://mainnet.base.org"],
            ["Explorer", "https://basescan.org"],
            ["B20 Factory", B20_FACTORY_ADDRESS],
            ["Activation Registry", ACTIVATION_REGISTRY_ADDRESS],
            ["Policy Registry", POLICY_REGISTRY_ADDRESS],
          ]}
        />
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          B20 creation reverts if the requested variant is not activated in the Activation Registry. The app targets
          mainnet B20 now that the mainnet path is enabled.
        </Callout>
      </>
    ),
  },
  {
    id: "create",
    title: "Create Flow",
    eyebrow: "Factory Call",
    summary: "The app calls createB20 with Asset params and bootstrap initCalls.",
    tone: "violet",
    icon: <IconSparkles className="h-5 w-5" />,
    body: (
      <>
        <P>
          The factory method is <Code>createB20(uint8 variant, bytes32 salt, bytes params, bytes[] initCalls)</Code>.
          This app uses variant <Code>ASSET = 0</Code> and params version <Code>1</Code>.
        </P>
        <InfoGrid
          rows={[
            ["Asset params", "version, name, symbol, initialAdmin, decimals"],
            ["Decimals", "Asset decimals are immutable and must be 6 to 18"],
            ["Salt", "Randomized per launch for deterministic B20 address derivation"],
            ["Initial admin", "Connected wallet receives DEFAULT_ADMIN_ROLE"],
            ["Supply cap", `Maximum allowed cap is ${MAX_UINT128.toString()}`],
            ["Initial supply", "Created during launch after cap and permissions are configured"],
          ]}
        />
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Factory initCalls run during token creation. They can configure cap, permissions, metadata and the first mint
          atomically, while B20 invariants such as supply cap still apply.
        </Callout>
      </>
    ),
  },
  {
    id: "roles",
    title: "Admin Permissions",
    eyebrow: "Access",
    summary: "B20 permissions decide what each wallet can do.",
    tone: "rose",
    icon: <IconLock className="h-5 w-5" />,
    body: (
      <>
        <InfoGrid
          rows={[
            ["Admin", "Can give or remove permissions and update supply cap"],
            ["Mint", "Can create more tokens later"],
            ["Burn", "Can burn tokens from its own wallet"],
            ["Pause", "Can pause transfers, minting or burning during emergencies"],
            ["Unpause", "Can turn paused features back on"],
            ["Metadata", "Can update name, symbol, metadata JSON and logo image"],
          ]}
        />
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          B20 also has advanced permissions such as BURN_BLOCKED_ROLE and OPERATOR_ROLE. The dashboard hides them from the
          normal permission picker because most public tokens do not need those controls.
        </Callout>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />} title="Final admin lock">
          Lock final admin only when the token should never be managed again. After that, admin powers cannot be restored.
        </Callout>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard Controls",
    eyebrow: "Operate",
    summary: "Manage native B20 behavior without legacy custom-token controls.",
    tone: "cyan",
    icon: <IconGauge className="h-5 w-5" />,
    body: (
      <>
        <Ol>
          <li><b>Mint and batch mint.</b> Requires Mint permission and cannot exceed the configured supply cap.</li>
          <li><b>Supply cap.</b> Requires Admin permission. It can move up or down, but not below totalSupply.</li>
          <li><b>Burn.</b> Requires Burn permission, removes tokens from the connected wallet, and lowers totalSupply permanently.</li>
          <li><b>Pause features.</b> Transfers, minting and burning are independently pausable.</li>
          <li><b>Metadata.</b> Update name, symbol, metadata JSON link and logo image link.</li>
          <li><b>Admin permissions.</b> Give permissions, remove permissions and lock final admin from the dashboard.</li>
          <li><b>Memo transfer.</b> Send normal token transfers with an optional bytes32 memo.</li>
          <li><b>Copy import info.</b> Copy address, symbol, decimals and logo URL for custom token import.</li>
          <li><b>BaseScan publish.</b> Open verify, token logo request and copy-ready publish info from the dashboard.</li>
        </Ol>
        <Callout tone="positive" icon={<IconCheck className="h-4 w-4" />}>
          The dashboard no longer includes trade fees, DEX-pair registration, custom denylist controls, or
          Solidity source verification. Those were from the old custom contract path and are not native B20 features.
        </Callout>
      </>
    ),
  },
  {
    id: "metadata",
    title: "Logo And Metadata",
    eyebrow: "Where Values Come From",
    summary: "Metadata JSON and logo image links are usually created by the app after image upload.",
    tone: "violet",
    icon: <IconSparkles className="h-5 w-5" />,
    body: (
      <>
        <InfoGrid
          rows={[
            ["Logo image", "Direct image link created after upload, usually an i.ibb.co ImgBB URL"],
            ["Metadata JSON", "JSON link for wallets and explorers. The app now saves logo and JSON together"],
            ["Manual metadata", "Only needed if you already host your own JSON on IPFS or HTTPS"],
            ["Custom key/value", "Advanced B20 extraMetadata. Hidden from the normal dashboard because most tokens do not need it"],
            ["Wallet import", "Use Copy import info, then paste the token address in your wallet custom-token screen"],
          ]}
        />
        <Callout tone="positive" icon={<IconCheck className="h-4 w-4" />}>
          For normal launches: upload logo, then use Save logo + JSON. It stores the logo link and updates the wallet metadata link.
        </Callout>
        <Callout tone="positive" icon={<IconCheck className="h-4 w-4" />}>
          Uploaded ImgBB logos are served through the app metadata image endpoint so wallets receive normal image headers.
        </Callout>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          Do not paste ImgBB Viewer links like ibb.co/abc. Wallets need Direct links like i.ibb.co/folder/image.png.
        </Callout>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          Some wallets, including Rabby, may reject direct automatic import until their indexer recognizes a new native
          B20 token. This app copies the import details instead of opening a wallet popup that can fail.
        </Callout>
      </>
    ),
  },
  {
    id: "policy",
    title: "Policy Registry",
    eyebrow: "Compliance Surface",
    summary: "B20 supports policy-gated transfers and mint receivers through the Policy Registry.",
    tone: "amber",
    icon: <IconUsers className="h-5 w-5" />,
    body: (
      <>
        <P>
          The Policy Registry manages allowlist and blocklist policies. B20 tokens reference policies by numeric ID for
          transfer sender, transfer receiver, transfer executor and mint receiver scopes.
        </P>
        <P>
          New tokens default to the built-in always-allow policy unless a policy is intentionally configured. This app
          currently creates open Asset tokens by default and exposes permission, pause, supply and metadata controls first.
        </P>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          Policy IDs should be validated before assignment. Binding to the wrong ID can make a policy stricter or more
          open than intended.
        </Callout>
      </>
    ),
  },
  {
    id: "publish",
    title: "BaseScan Publish",
    eyebrow: "Verify & Logo",
    summary: "Use the dashboard publish panel to open BaseScan verification and token logo submission.",
    tone: "lime",
    icon: <IconExternal className="h-5 w-5" />,
    body: (
      <>
        <P>
          BaseScan can still show Verify and Publish on the Contract tab. Use Auto publish in the dashboard first.
          The app runs BaseScan API checks, attempts the supported verification path and copies the publish pack.
        </P>
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          Recommended order: save logo + JSON in Metadata, then press Auto publish. If BaseScan requires logged-in
          ownership review for the logo, the app shows that exact blocker.
        </Callout>
        <Callout tone="warn" icon={<IconAlert className="h-4 w-4" />}>
          BaseScan header logo is not automatic from on-chain metadata. BaseScan requires a Token Info / Logo request,
          and approval can take time after submission.
        </Callout>
      </>
    ),
  },
  {
    id: "security",
    title: "Trust Checklist",
    eyebrow: "Before Launch",
    summary: "Use B20 permissions carefully and keep admin powers transparent.",
    tone: "rose",
    icon: <IconShield className="h-5 w-5" />,
    body: (
      <>
        <Ol>
          <li>Use a wallet you control as the first admin.</li>
          <li>Keep Mint permission only while future minting is required.</li>
          <li>Keep supply cap at or above planned maximum supply.</li>
          <li>Keep Pause permission only for wallets that should handle emergencies.</li>
          <li>Set Metadata JSON and logo image before sharing the token publicly.</li>
          <li>Use the dashboard BaseScan and Copy import info actions after launch so users can open the correct token.</li>
          <li>Lock final admin only when no future admin updates are needed.</li>
        </Ol>
        <Callout tone="neutral" icon={<IconInfo className="h-4 w-4" />}>
          This app helps enforce B20 input constraints and uses the native standard. It is not a legal, financial or
          formal audit guarantee.
        </Callout>
      </>
    ),
  },
];

export function Docs() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const onScroll = () => {
      let current = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top < 180) current = section.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-border bg-surface/50">
        <div className="pointer-events-none absolute inset-0 grid-dots opacity-70" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200">
              <IconSparkles className="h-3.5 w-3.5" />
              Base mainnet B20 documentation
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">
              Native B20, explained clearly.
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted sm:text-lg">
              A practical guide for creating and managing Base-native B20 Asset tokens with the official Factory precompile.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item) => {
              const tone = toneStyles[item.tone];
              const external = item.to.startsWith("http");
              const content = (
                <div className={cn("group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card", tone.card)}>
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl border", tone.icon)}>{item.icon}</span>
                  <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.copy}</p>
                </div>
              );
              return external ? <a key={item.title} href={item.to} target="_blank" rel="noreferrer">{content}</a> : <Link key={item.title} to={item.to}>{content}</Link>;
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm transition",
                  active === section.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/70 hover:text-fg"
                )}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-5">
          {SECTIONS.map((section) => <DocSection key={section.id} section={section} />)}
          <section className="rounded-2xl border border-border bg-surface px-5 py-5">
            <h2 className="text-sm font-semibold">Official references</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <a href="https://docs.base.org/get-started/launch-b20-token" target="_blank" rel="noreferrer" className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm hover:border-ring">
                Launch a B20 Token <IconExternal className="ml-1 inline h-3.5 w-3.5" />
              </a>
              <a href="https://docs.base.org/base-chain/specs/upgrades/beryl/b20" target="_blank" rel="noreferrer" className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm hover:border-ring">
                B20 Native Token Standard <IconExternal className="ml-1 inline h-3.5 w-3.5" />
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function DocSection({ section }: { section: Section }) {
  const tone = toneStyles[section.tone];
  return (
    <section id={section.id} className={cn("scroll-mt-24 rounded-2xl border p-5 shadow-card sm:p-6", tone.card)}>
      <div className="mb-5 flex items-start gap-4">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", tone.icon)}>{section.icon}</span>
        <div>
          <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", tone.badge)}>
            {section.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">{section.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{section.summary}</p>
        </div>
      </div>
      <div className={cn("mb-5 h-px bg-gradient-to-r", tone.rule)} />
      <div className="space-y-4 text-sm leading-7 text-muted">{section.body}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-7 text-muted">{children}</p>;
}

function Ol({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-muted">{children}</ol>;
}

function Code({ children }: { children: ReactNode }) {
  return <code className="mx-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 font-mono text-[12px] text-fg">{children}</code>;
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/75">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[190px_1fr]">
          <div className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</div>
          <div className="break-all font-mono text-xs text-fg sm:text-sm">{value}</div>
        </div>
      ))}
    </div>
  );
}
