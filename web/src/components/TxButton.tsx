import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Abi } from "viem";
import { Button, cn } from "./ui";
import { IconCheck } from "./icons";
import { chainName, getTargetChainId, isSupportedChain, supportedChainNames, type SupportedChainId } from "../lib/wagmi";

export interface TxRequest {
  chainId?: SupportedChainId;
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  gas?: bigint;
}

const TxChainContext = createContext<SupportedChainId | undefined>(undefined);

export function TxChainProvider({ chainId, children }: { chainId: SupportedChainId; children: ReactNode }) {
  return <TxChainContext.Provider value={chainId}>{children}</TxChainContext.Provider>;
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
  chainId,
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
  chainId?: SupportedChainId;
}) {
  const walletChainId = useChainId();
  const contextChainId = useContext(TxChainContext);
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const [txChainId, setTxChainId] = useState<SupportedChainId | undefined>(undefined);
  const [localError, setLocalError] = useState("");
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash, chainId: txChainId });
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSuccess) return;
    setDone(true);
    setLocalError("");
    onSuccess?.();
    const t = setTimeout(() => {
      setDone(false);
      reset();
    }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const busy = isSwitching || isPending || mining;

  async function onClick() {
    const req = build();
    if (!req) return;
    if (confirmLabel && !window.confirm(confirmLabel)) return;
    const targetChainId = req.chainId ?? chainId ?? contextChainId ?? getTargetChainId(walletChainId);
    if (!isSupportedChain(targetChainId)) {
      setLocalError(`Unsupported network. Switch to ${supportedChainNames()} and try again.`);
      return;
    }
    setLocalError("");
    try {
      if (walletChainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }
      setTxChainId(targetChainId);
      writeContract({
        ...req,
        chainId: targetChainId,
        gas: req.gas ?? defaultGasLimit(req),
        ...(req.value !== undefined ? { value: req.value } : {}),
      } as unknown as Parameters<typeof writeContract>[0]);
    } catch (switchError) {
      const message = switchError instanceof Error ? switchError.message : "Network switch failed.";
      setLocalError(
        message.includes("User rejected")
          ? "Network switch rejected."
          : `Switch to ${chainName(targetChainId)} and try again.`
      );
    }
  }

  const friendlyError = localError || (error
    ? error.message.includes("User rejected")
      ? "Rejected in wallet"
      : error.message.split("\n")[0].slice(0, 120)
    : null);

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
          isSwitching ? "Switching network..." : isPending ? "Confirm..." : "Pending..."
        ) : (
          children
        )}
      </Button>
      {friendlyError && <p className="mt-1.5 text-xs text-negative">{friendlyError}</p>}
    </div>
  );
}

function defaultGasLimit(req: TxRequest) {
  if (req.functionName === "createB20") return 6_000_000n;
  if (req.functionName === "batchMint") {
    const recipients = Array.isArray(req.args?.[0]) ? (req.args[0] as unknown[]).length : 1;
    return BigInt(Math.min(6_000_000, 900_000 + recipients * 120_000));
  }
  if (req.functionName === "mint" || req.functionName === "mintWithMemo") return 650_000n;
  if (req.functionName === "burn" || req.functionName === "burnWithMemo") return 550_000n;
  if (req.functionName === "transfer" || req.functionName === "transferWithMemo") return 450_000n;
  if (req.functionName === "updateName" || req.functionName === "updateSymbol" || req.functionName === "updateSupplyCap") return 500_000n;
  if (req.functionName === "updateContractURI" || req.functionName === "updateExtraMetadata") return 650_000n;
  if (req.functionName === "grantRole" || req.functionName === "revokeRole") return 450_000n;
  if (req.functionName === "renounceRole" || req.functionName === "renounceLastAdmin") return 450_000n;
  if (req.functionName === "pause" || req.functionName === "unpause") return 450_000n;
  return 500_000n;
}
