"use client";
// Multi-file uploader for BrandAssets. User can drop/select N files at once;
// each one appears in a queue where they can change its kind before upload.
// Uploads run sequentially (auto bg-remove + auto-tag can take ~5-15s per
// logo, so parallel would thrash FAL/Anthropic rate limits).
//
// The server handles:
//   - Logo background removal (BiRefNet v2)
//   - Auto-tagging (Claude Haiku vision)
// The UI just shows progress + the resulting tags per file.

import { useRef, useState } from "react";
import type { BrandAsset, BrandAssetKind } from "@/lib/types";

type QueueStatus = "pending" | "uploading" | "done" | "error";

type QueueItem = {
  id: string;              // local UUID — not the saved asset id
  file: File;
  previewUrl: string;
  kind: BrandAssetKind;
  status: QueueStatus;
  error?: string;
  result?: { bgRemoved: boolean; autoTagged: boolean; tags: string[] };
};

type Props = {
  onUploaded: () => void;
};

function inferKind(filename: string): BrandAssetKind {
  const lower = filename.toLowerCase();
  if (/logo|mark|wordmark|brandmark/.test(lower)) return "logo";
  if (/product|bottle|pack|sku|hero/.test(lower)) return "product";
  return "reference";
}

function localId(): string {
  // crypto.randomUUID available in modern browsers; fall back to Math.random
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function AssetUploader({ onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const accepted = arr.filter((f) =>
      ["image/png", "image/jpeg", "image/webp"].includes(f.type),
    );
    const rejected = arr.length - accepted.length;
    if (rejected > 0) {
      setGlobalError(`Skipped ${rejected} file(s) — only PNG, JPEG, or WebP allowed.`);
    }
    const items: QueueItem[] = accepted.map((f) => ({
      id: localId(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      kind: inferKind(f.name),
      status: "pending",
    }));
    setQueue((prev) => [...prev, ...items]);
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function removeItem(id: string) {
    setQueue((prev) => {
      const found = prev.find((q) => q.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  }

  function clearDone() {
    setQueue((prev) => {
      prev.filter((q) => q.status === "done").forEach((q) => URL.revokeObjectURL(q.previewUrl));
      return prev.filter((q) => q.status !== "done");
    });
  }

  async function uploadOne(item: QueueItem): Promise<void> {
    updateItem(item.id, { status: "uploading", error: undefined });
    const fd = new FormData();
    fd.append("file", item.file);
    fd.append("kind", item.kind);
    // Name defaults to filename minus extension.
    fd.append("name", item.file.name.replace(/\.[^.]+$/, ""));
    // Server handles bg-removal (logos) + auto-tag by default.

    try {
      const res = await fetch("/api/brand-assets/upload", { method: "POST", body: fd });
      const data = (await res.json()) as {
        asset?: BrandAsset;
        bgRemoved?: boolean;
        autoTagged?: boolean;
        error?: string;
      };
      if (!res.ok || !data.asset) {
        updateItem(item.id, { status: "error", error: data.error ?? "Upload failed" });
        return;
      }
      updateItem(item.id, {
        status: "done",
        result: {
          bgRemoved: !!data.bgRemoved,
          autoTagged: !!data.autoTagged,
          tags: data.asset.tags ?? [],
        },
      });
    } catch {
      updateItem(item.id, { status: "error", error: "Network error" });
    }
  }

  async function uploadAll() {
    setRunning(true);
    setGlobalError(null);
    // Snapshot at start; new items added during run go in the next wave.
    const pending = queue.filter((q) => q.status === "pending");
    for (const item of pending) {
      await uploadOne(item);
    }
    setRunning(false);
    if (pending.length > 0) onUploaded();
  }

  async function retryOne(id: string) {
    const item = queue.find((q) => q.id === id);
    if (!item) return;
    await uploadOne(item);
    onUploaded();
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        style={{
          padding: "24px 20px",
          borderRadius: 10,
          border: "1px dashed var(--border-strong)",
          background: "var(--surface)",
          color: "var(--muted)",
          fontSize: 13,
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        📎 Drop images here or click to select — multiple files supported, PNG / JPEG / WebP, ≤ 8 MB each.
        <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 6 }}>
          Logos auto-background-removed · all assets auto-tagged via Claude vision
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />

      {globalError && (
        <div style={{ fontSize: 12, color: "var(--warning)" }}>⚠ {globalError}</div>
      )}

      {queue.length > 0 && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <span>
              {queue.length} file{queue.length === 1 ? "" : "s"} · {pendingCount} pending · {doneCount} done
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {doneCount > 0 && (
                <button
                  onClick={clearDone}
                  disabled={running}
                  style={{
                    background: "transparent",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "5px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: running ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Clear done
                </button>
              )}
              <button
                onClick={uploadAll}
                disabled={running || pendingCount === 0}
                style={{
                  background: "var(--accent)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: running || pendingCount === 0 ? "not-allowed" : "pointer",
                  opacity: running || pendingCount === 0 ? 0.5 : 1,
                  fontFamily: "inherit",
                }}
              >
                {running ? "Uploading…" : `Upload ${pendingCount || ""}`.trim()}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {queue.map((q) => (
              <div
                key={q.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr auto auto",
                  gap: 12,
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  background:
                    q.status === "error"
                      ? "rgba(184,92,92,0.06)"
                      : q.status === "done"
                        ? "rgba(95,158,117,0.06)"
                        : "transparent",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.previewUrl}
                  alt=""
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "contain",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {q.file.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {Math.round(q.file.size / 1024)} KB
                    {q.status === "uploading" && " · processing (bg-remove + tag)…"}
                    {q.status === "error" && ` · ⚠ ${q.error}`}
                    {q.status === "done" && q.result && (
                      <>
                        {q.result.bgRemoved ? " · ✓ bg removed" : ""}
                        {q.result.autoTagged ? " · ✓ tagged" : ""}
                      </>
                    )}
                  </div>
                  {q.status === "done" && q.result && q.result.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {q.result.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: "var(--surface-r)",
                            color: "var(--muted)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={q.kind}
                  onChange={(e) =>
                    updateItem(q.id, { kind: e.target.value as BrandAssetKind })
                  }
                  disabled={q.status === "uploading" || q.status === "done"}
                  style={{
                    padding: "5px 8px",
                    fontSize: 12,
                    background: "var(--bg)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                    fontFamily: "inherit",
                  }}
                >
                  <option value="product">Product</option>
                  <option value="logo">Logo</option>
                  <option value="reference">Reference</option>
                </select>
                <div style={{ display: "flex", gap: 6 }}>
                  {q.status === "error" && (
                    <button
                      onClick={() => retryOne(q.id)}
                      disabled={running}
                      style={{
                        background: "transparent",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: running ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Retry
                    </button>
                  )}
                  {q.status !== "uploading" && (
                    <button
                      onClick={() => removeItem(q.id)}
                      style={{
                        background: "transparent",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                        borderRadius: 5,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
