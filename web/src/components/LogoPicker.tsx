import { useEffect, useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from "../lib/upload";
import { Button, cn } from "./ui";
import { IconCheck, IconLoader, IconX } from "./icons";

/**
 * Token logo picker. The user selects an image, previews it, then saves it to
 * ImgBB. The uploaded URL is written back through onChange and later stored
 * on-chain as logoURI.
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setStatus("idle");

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Use PNG, JPG, GIF, WEBP or SVG.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image is too large. Keep it under 5 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function openPicker() {
    if (status === "uploading") return;
    inputRef.current?.click();
  }

  async function saveImage() {
    if (!selectedFile) return;
    setUploadError(null);
    setStatus("uploading");
    try {
      const res = await uploadImage(selectedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      onChange(res.url);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1600);
    } catch (e) {
      setStatus("idle");
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploadError(null);
    setStatus("idle");
    if (!selectedFile) onChange("");
  }

  const preview = previewUrl || value;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div
          aria-label="Token logo preview"
          className={cn(
            "relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-elevated",
            status === "uploading" && "cursor-wait opacity-70"
          )}
        >
          {preview ? (
            status === "uploading" ? (
              <IconLoader className="h-6 w-6 text-muted" />
            ) : (
              <img
                src={preview}
                alt="Token logo"
                className="h-full w-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
              />
            )
          ) : status === "uploading" ? (
            <IconLoader className="h-6 w-6 text-muted" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-faint">
              <CameraIcon />
              <span className="text-[10px] font-medium">{symbol ? symbol.slice(0, 4) : "Logo"}</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={openPicker} loading={status === "uploading"}>
              {selectedFile || value ? "Change image" : "Choose image"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveImage}
              loading={status === "uploading"}
              disabled={!selectedFile || status === "uploading"}
            >
              Save
            </Button>
            {(selectedFile || value) && status !== "uploading" && (
              <button
                type="button"
                onClick={clearImage}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-elevated px-2.5 py-1 text-xs text-muted transition hover:text-negative"
              >
                <IconX className="h-3.5 w-3.5" /> {selectedFile ? "Cancel" : "Remove"}
              </button>
            )}
            {status === "done" && (
              <span className="inline-flex items-center gap-1 text-xs text-positive">
                <IconCheck className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {(uploadError || error) && <p className="mt-2 text-xs text-negative">{uploadError ?? error}</p>}
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
