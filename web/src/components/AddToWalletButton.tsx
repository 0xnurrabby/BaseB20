import { useState } from "react";
import { Button } from "./ui";
import { IconCheck, IconWallet } from "./icons";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
    };
  }
}

export function AddToWalletButton({
  token,
  size = "md",
  variant = "secondary",
}: {
  token: { address: `0x${string}`; symbol: string; decimals: number; logoURI?: string };
  size?: "sm" | "md";
  variant?: "secondary" | "outline";
}) {
  const [status, setStatus] = useState<"idle" | "adding" | "done" | "error">("idle");
  const supported = typeof window !== "undefined" && !!window.ethereum?.request;

  async function add() {
    if (!window.ethereum?.request) {
      setStatus("error");
      return;
    }
    setStatus("adding");
    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            image: token.logoURI || undefined,
          },
        },
      });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2200);
    }
  }

  return (
    <Button type="button" size={size} variant={status === "done" ? "success" : variant} onClick={add} loading={status === "adding"} disabled={!supported} className="gap-1.5">
      {status === "done" ? <IconCheck className="h-3.5 w-3.5" /> : <IconWallet className="h-3.5 w-3.5" />}
      {status === "done" ? "Added" : status === "error" ? "Wallet unavailable" : "Add to wallet"}
    </Button>
  );
}
