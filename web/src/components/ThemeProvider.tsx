import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ThemeChoice = "light" | "dark" | "system";
type Resolved = "light" | "dark";

interface ThemeCtx {
  choice: ThemeChoice;
  resolved: Resolved;
  setChoice: (c: ThemeChoice) => void;
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = "b20.theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as ThemeChoice | null;
    return saved ?? "system";
  });
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  // Keep in sync with the OS when following "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: Resolved = choice === "system" ? (systemDark ? "dark" : "light") : choice;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setChoice = (c: ThemeChoice) => {
    setChoiceState(c);
    localStorage.setItem(KEY, c);
  };

  const cycle = () => {
    const order: ThemeChoice[] = ["light", "dark", "system"];
    setChoice(order[(order.indexOf(choice) + 1) % order.length]);
  };

  const value = useMemo(() => ({ choice, resolved, setChoice, cycle }), [choice, resolved]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
