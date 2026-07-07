import { useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, isUploadConfigured, uploadImage } from "../lib/upload";
import { Button, CopyButton, Input, cn } from "./ui";
import { IconCheck, IconExternal, IconLoader, IconX } from "./icons";

/**
 * Click-to-upload token logo. The user clicks the avatar, picks an image from
 * their device gallery, and it's uploaded to imgbb automatically — the returned
 * URL is written back via onChange and later stored on-chain as logoURI.
 * A manual URL field remains as a fallback / for advanced users.
 */
export function LogoPicker({
  value,
  onChange,
  symbol,
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  symbol: string;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const configured = isUploadConfigured();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setStatus("uploading");
    try {
      const res = await uploadImage(file);
      onChange(res.url);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1600);
    } catch (e) {
      setStatus("idle");
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  function openPicker() {
    if (status === "uploading") return;
    inputRef.current?.click();
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {/* Clickable avatar */}
        <button
          type="button"
          onClick={openPicker}
          disabled={status === "uploading"}
          title={configured ? "Click to choose a logo" : "Upload not configured — paste a URL below"}
          className={cn(
            "group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-elevated transition",
            "hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            status === "uploading" && "cursor-wait opacity-70"
          )}
        >
          {value ? (
            <>
              <img
                src={value}
                alt="Token logo"
                className="h-full w-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
              />
              <span className="absolute inset-0 hidden place-items-center bg-black/50 text-[11px] font-medium text-white group-hover:grid">
                Change
              </span>
            </>
          ) : status === "uploading" ? (
            <IconLoader className="h-6 w-6 text-muted" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-faint">
              <CameraIcon />
              <span className="text-[10px] font-medium">{symbol ? symbol.slice(0, 4) : "Logo"}</span>
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={openPicker} loading={status === "uploading"}>
              {status === "uploading" ? "Uploading…" : value ? "Change image" : "Choose image"}
            </Button>
            {value && status !== "uploading" && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setUploadError(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-elevated px-2.5 py-1 text-xs text-muted transition hover:text-negative"
              >
                <IconX className="h-3.5 w-3.5" /> Remove
              </button>
            )}
            {status === "done" && (
              <span className="inline-flex items-center gap-1 text-xs text-positive">
                <IconCheck className="h-3.5 w-3.5" /> Uploaded
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-faint">
            {configured
              ? "PNG, JPG, GIF, WEBP or SVG · up to 5 MB. Hosted automatically."
              : "Upload isn't configured — paste an image URL below."}
          </p>
          {value && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <code className="truncate rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted">{value}</code>
              <CopyButton value={value} label="" />
              <a href={value} target="_blank" rel="noreferrer" className="text-faint hover:text-fg">
                <IconExternal className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />

      {(uploadError || error) && <p className="mt-2 text-xs text-negative">{uploadError ?? error}</p>}

      {/* Manual URL fallback */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="text-xs font-medium text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          {showUrl ? "Hide URL field" : "Or paste an image URL"}
        </button>
        {showUrl && (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…/logo.png or ipfs://…"
            className="mt-2 font-mono text-xs"
          />
        )}
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h2l1.2-1.6A1 1 0 0 1 9 4h6a1 1 0 0 1 .8.4L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}
