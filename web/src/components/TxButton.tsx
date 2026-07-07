import { useEffect, useState, type ReactNode } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";
import { Button, cn } from "./ui";
import { IconCheck } from "./icons";

export interface TxRequest {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

/**
 * A self-contained write button: builds the request lazily on click, tracks the
 * wallet confirmation + mining lifecycle, flashes a check on success and calls
 * onSuccess (used to refetch reads). Each instance is independent.
 */
export function TxButton({
  build,
  children,
  onSuccess,
  variant = "primary",
  size = "md",
  fullWidth,
  disabled,
  className,
  confirmLabel,
}: {
  build: () => TxRequest | null;
  children: ReactNode;
  onSuccess?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  confirmLabel?: string;
}) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSuccess) return;
    setDone(true);
    onSuccess?.();
    const t = setTimeout(() => {
      setDone(false);
      reset();
    }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const busy = isPending || mining;

  function onClick() {
    const req = build();
    if (!req) return;
    if (confirmLabel && !window.confirm(confirmLabel)) return;
    writeContract(req as Parameters<typeof writeContract>[0]);
  }

  const friendlyError = error
    ? error.message.includes("User rejected")
      ? "Rejected in wallet"
      : error.message.split("\n")[0].slice(0, 120)
    : null;

  return (
    <div className={cn(fullWidth && "w-full")}>
      <Button
        variant={done ? "success" : variant}
        size={size}
        fullWidth={fullWidth}
        loading={busy}
        disabled={disabled || busy}
        onClick={onClick}
        className={className}
      >
        {done ? (
          <>
            <IconCheck className="h-4 w-4" /> Done
          </>
        ) : busy ? (
          isPending ? "Confirm…" : "Pending…"
        ) : (
          children
        )}
      </Button>
      {friendlyError && <p className="mt-1.5 text-xs text-negative">{friendlyError}</p>}
    </div>
  );
}
