import { useEffect, useState } from "react";
import { cn } from "./ui";
import { ipfsCidPath, ipfsGatewayUrl, nextIpfsGatewayUrl } from "../lib/image-url";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  sm: "h-10 w-10 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

export function TokenLogo({
  src,
  symbol,
  size = "md",
  tone = "emerald",
  className,
}: {
  src?: string;
  symbol?: string;
  size?: Size;
  tone?: "emerald" | "sky" | "violet";
  className?: string;
}) {
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const clean = src?.trim();
  const isIpfs = !!clean && !!ipfsCidPath(clean);
  const imageSrc = clean ? (isIpfs ? ipfsGatewayUrl(clean, gatewayIndex) : clean) : "";

  useEffect(() => {
    setGatewayIndex(0);
    setFailed(false);
  }, [clean]);

  if (imageSrc && !failed) {
    return (
      <img
        src={imageSrc}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        className={cn("shrink-0 rounded-full border border-border object-cover", sizeClass[size], className)}
        onError={() => {
          if (isIpfs && clean && nextIpfsGatewayUrl(clean, gatewayIndex)) {
            setGatewayIndex((i) => i + 1);
            return;
          }
          setFailed(true);
        }}
      />
    );
  }

  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
    sky: "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
    violet: "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
  }[tone];

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border font-mono font-semibold",
        toneClass,
        sizeClass[size],
        className
      )}
    >
      {(symbol?.trim() || "B20").slice(0, 3).toUpperCase()}
    </span>
  );
}
