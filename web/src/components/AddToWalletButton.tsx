import { useState } from "react";
import { Button } from "./ui";
import { IconCheck, IconWallet } from "./icons";

export function AddToWalletButton({
  token,
  size = "md",
  variant = "secondary",
}: {
  token: { address: `0x${string}`; symbol: string; decimals: number; logoURI?: string };
  size?: "sm" | "md";
  variant?: "secondary" | "outline";
}) {
  const [status, setStatus] = useState<"idle" | "copying" | "done" | "error">("idle");

  async function copyForWallet() {
    setStatus("copying");
    try {
      const lines = [
        `Address: ${token.address}`,
        `Symbol: ${token.symbol}`,
        `Decimals: ${token.decimals}`,
        token.logoURI ? `Logo: ${token.logoURI}` : "",
      ].filter(Boolean);
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2200);
    }
  }

  return (
    <Button type="button" size={size} variant={status === "done" ? "success" : variant} onClick={copyForWallet} loading={status === "copying"} className="gap-1.5">
      {status === "done" ? <IconCheck className="h-3.5 w-3.5" /> : <IconWallet className="h-3.5 w-3.5" />}
      {status === "done" ? "Copied" : status === "error" ? "Copy failed" : "Copy import info"}
    </Button>
  );
}
