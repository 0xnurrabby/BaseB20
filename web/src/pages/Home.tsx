import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import { IconGauge, IconRocket } from "../components/icons";

export function Home() {
  return (
    <div>
      <section className="relative grid min-h-[calc(100vh-5rem)] place-items-center overflow-hidden border-b border-border bg-surface/35">
        <div className="pointer-events-none absolute inset-0 grid-dots opacity-70" />
        <div className="home-flow pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="home-ledger pointer-events-none absolute inset-x-4 bottom-10 mx-auto hidden max-w-5xl grid-cols-3 gap-2.5 sm:grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-4xl">
            <h1 className="font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
              Launch a native B20 token on Base.
            </h1>
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
          </div>
        </div>
      </section>
    </div>
  );
}
