import { useState } from "react";
import { Button } from "./ui";
import { IconCheck, IconWallet } from "./icons";
import { displayLogoUrl, extractCid, pinataGatewayUrl } from "../lib/image-url";

function walletImageUrl(logoURI?: string) {
  const text = logoURI?.trim() || "";
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (extractCid(text)) return pinataGatewayUrl(text) || displayLogoUrl(text);
  return displayLogoUrl(text);
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

  async function addToWallet() {
    setStatus("adding");
    const ethereum = (window as unknown as { ethereum?: { request?: (args: { method: string; params: unknown }) => Promise<unknown> } }).ethereum;
    const image = walletImageUrl(token.logoURI);

    try {
      if (ethereum?.request) {
        const wasAdded = await ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: token.address,
              symbol: token.symbol.slice(0, 11),
              decimals: token.decimals,
              ...(image ? { image } : {}),
            },
          },
        });
        if (wasAdded) {
          setStatus("done");
          setTimeout(() => setStatus("idle"), 1800);
          return;
        }
      }

      // Fallback: copy import details with HTTPS logo for manual add.
      const lines = [
        `Address: ${token.address}`,
        `Symbol: ${token.symbol}`,
        `Decimals: ${token.decimals}`,
        image ? `Logo: ${image}` : "",
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
    <Button
      type="button"
      size={size}
      variant={status === "done" ? "success" : variant}
      onClick={addToWallet}
      loading={status === "adding"}
      className="gap-1.5"
    >
      {status === "done" ? <IconCheck className="h-3.5 w-3.5" /> : <IconWallet className="h-3.5 w-3.5" />}
      {status === "done" ? "Added" : status === "error" ? "Failed" : "Add to wallet"}
    </Button>
  );
}
