import { useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { useChainId } from "wagmi";
import { WalletConnect } from "./WalletConnect";
import { useTheme } from "./ThemeProvider";
import { isSupportedChain, supportedChainNames } from "../lib/wagmi";
import { cn } from "./ui";
import {
  IconBook,
  IconGauge,
  IconMonitor,
  IconMoon,
  IconPlus,
  IconSun,
  IconX,
} from "./icons";

export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-fg">
        <svg viewBox="0 0 64 64" className="h-5 w-5" fill="currentColor">
          <path d="M20 18h13c6.6 0 11 3.4 11 8.6 0 3.2-1.7 5.6-4.6 6.8 3.6 1 5.8 3.7 5.8 7.4 0 5.6-4.6 9.2-11.8 9.2H20V18Zm12.3 12.6c2.7 0 4.3-1.3 4.3-3.5s-1.6-3.4-4.3-3.4h-5.1v6.9h5.1Zm.6 12.8c2.9 0 4.6-1.4 4.6-3.8 0-2.3-1.7-3.7-4.6-3.7h-5.7v7.5h5.7Z" />
        </svg>
      </span>
      {withText && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-semibold tracking-tight">B20</span>
          <span className="hidden text-xs text-faint sm:inline">Base Token Studio</span>
        </span>
      )}
    </Link>
  );
}

const NAV = [
  { to: "/create", label: "Create", icon: IconPlus },
  { to: "/dashboard", label: "Dashboard", icon: IconGauge },
  { to: "/docs", label: "Docs", icon: IconBook },
];

function ThemeToggle() {
  const { choice, cycle } = useTheme();
  const Icon = choice === "light" ? IconSun : choice === "dark" ? IconMoon : IconMonitor;
  const label = choice === "system" ? "System theme" : choice === "dark" ? "Dark theme" : "Light theme";
  return (
    <button
      onClick={cycle}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:text-fg"
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive ? "bg-elevated text-fg" : "text-muted hover:text-fg"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletConnect />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <IconX className="h-5 w-5" /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="border-t border-border bg-bg px-4 py-2 md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive ? "bg-elevated text-fg" : "text-muted"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function NetworkBanner() {
  const chainId = useChainId();
  if (isSupportedChain(chainId)) return null;
  return (
    <div className="border-b border-negative/30 bg-negative/10 px-4 py-2 text-center text-xs text-negative">
      You're connected to an unsupported network. Switch to <strong>{supportedChainNames()}</strong> to continue.
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="flex items-center gap-5 text-xs text-faint">
          <Link to="/docs" className="hover:text-fg">Docs</Link>
          <a href="https://sepolia.basescan.org" target="_blank" rel="noreferrer" className="hover:text-fg">BaseScan</a>
          <a href="https://base.org" target="_blank" rel="noreferrer" className="hover:text-fg">base.org</a>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <NetworkBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
