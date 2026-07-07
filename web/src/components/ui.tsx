import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { IconCheck, IconCopy, IconLoader, IconX } from "./icons";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- Button -------------------------------- */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90 active:opacity-100 border border-transparent",
  secondary: "bg-elevated text-fg hover:bg-border/60 border border-border",
  outline: "bg-transparent text-fg hover:bg-border/40 border border-border",
  ghost: "bg-transparent text-muted hover:text-fg hover:bg-border/40 border border-transparent",
  danger: "bg-negative/10 text-negative hover:bg-negative/20 border border-negative/30",
  success: "bg-positive/10 text-positive hover:bg-positive/20 border border-positive/30",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading && <IconLoader className="h-4 w-4" />}
      {children}
    </button>
  );
});

/* ---------------------------------- Card --------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

export function SectionCard({
  icon,
  title,
  desc,
  action,
  children,
  danger,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
  children?: ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className={cn(danger && "border-negative/30")}>
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          {icon && (
            <span
              className={cn(
                "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                danger ? "border-negative/30 bg-negative/10 text-negative" : "border-border bg-elevated text-fg"
              )}
            >
              {icon}
            </span>
          )}
          <div>
            <h3 className="text-[15px] font-semibold leading-tight">{title}</h3>
            {desc && <p className="mt-1 text-[13px] leading-relaxed text-muted">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      {children && <div className="px-5 py-4">{children}</div>}
    </Card>
  );
}

/* --------------------------------- Inputs -------------------------------- */

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-fg">
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  suffix,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-fg">{label}</span>
          {suffix}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-negative">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg placeholder:text-faint " +
  "transition focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputCls, className)} {...rest} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(inputCls, "min-h-[90px] resize-y font-mono text-xs", className)} {...rest} />;
  }
);

/* --------------------------------- Switch -------------------------------- */

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        checked ? "bg-accent" : "bg-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/* --------------------------------- Slider -------------------------------- */

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled,
  tone = "neutral",
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  tone?: "neutral" | "positive" | "negative";
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const fill =
    tone === "positive" ? "rgb(var(--positive))" : tone === "negative" ? "rgb(var(--negative))" : "rgb(var(--accent))";
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: `linear-gradient(to right, ${fill} ${pct}%, rgb(var(--border)) ${pct}%)`,
      }}
    />
  );
}

/* --------------------------------- Badge --------------------------------- */

type BadgeTone = "neutral" | "positive" | "negative" | "accent" | "warn";
const BADGE: Record<BadgeTone, string> = {
  neutral: "bg-elevated text-muted border-border",
  positive: "bg-positive/10 text-positive border-positive/25",
  negative: "bg-negative/10 text-negative border-negative/25",
  accent: "bg-accent/10 text-fg border-border",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- Callout -------------------------------- */

export function Callout({
  tone = "neutral",
  icon,
  title,
  children,
}: {
  tone?: "neutral" | "warn" | "negative" | "positive";
  icon?: ReactNode;
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    neutral: "border-border bg-elevated text-muted",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    negative: "border-negative/30 bg-negative/10 text-negative",
    positive: "border-positive/30 bg-positive/10 text-positive",
  };
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed", tones[tone])}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>
        {title && <p className="font-semibold text-fg">{title}</p>}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}

/* --------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          "relative w-full rounded-t-2xl sm:rounded-2xl border border-border bg-surface shadow-card animate-scale-in",
          width
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-[15px] font-semibold">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-border/50 hover:text-fg">
              <IconX className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------- CopyButton ------------------------------ */

export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* ignore */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1 text-xs text-muted transition hover:text-fg",
        className
      )}
    >
      {copied ? <IconCheck className="h-3.5 w-3.5 text-positive" /> : <IconCopy className="h-3.5 w-3.5" />}
      {label ?? (copied ? "Copied" : "Copy")}
    </button>
  );
}

/* ---------------------------------- Stat --------------------------------- */

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-elevated/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-fg">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <IconLoader className={cn("h-4 w-4 text-muted", className)} />;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}
