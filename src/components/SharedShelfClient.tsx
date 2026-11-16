"use client";
import { useState } from "react";
import { zipSync } from "fflate";

export interface SharedAsset {
  id: string;
  url: string;
  name: string;
  type: string;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
};

/** A filename that has an extension and does not collide with one already used. */
function fileName(a: SharedAsset, used: Set<string>): string {
  let base = a.name.trim() || a.id;
  if (!/\.[a-z0-9]{2,4}$/i.test(base)) base += `.${EXT[a.type] ?? "jpg"}`;
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) name = base.replace(/(\.[^.]+)$/, ` (${n})$1`);
  used.add(name.toLowerCase());
  return name;
}

/** Same-origin fetch through the existing image proxy, so the bytes can be
 *  saved or zipped regardless of which CDN holds the original. */
async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(`/api/carousel/image-proxy?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function save(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export default function SharedShelfClient({ label, assets }: { label: string; assets: SharedAsset[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadOne(a: SharedAsset) {
    setBusyId(a.id);
    setError(null);
    try {
      const bytes = await fetchBytes(a.url);
      save(new Blob([bytes as BlobPart], { type: a.type }), fileName(a, new Set()));
    } catch {
      // Proxy refused or failed — the original is still reachable directly.
      window.open(a.url, "_blank", "noopener");
    } finally {
      setBusyId(null);
    }
  }

  async function downloadAll() {
    setError(null);
    setZipProgress({ done: 0, total: assets.length });
    const used = new Set<string>();
    const files: Record<string, Uint8Array> = {};
    const failed: string[] = [];
    // ponytail: whole zip is built in memory; fine for a few hundred photos,
    // stream it (fflate Zip + showSaveFilePicker) if shelves reach GBs.
    let next = 0;
    async function worker() {
      while (next < assets.length) {
        const a = assets[next++]!;
        try {
          files[fileName(a, used)] = await fetchBytes(a.url);
        } catch {
          failed.push(a.name);
        }
        setZipProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    }
    try {
      await Promise.all(Array.from({ length: 4 }, worker));
      if (Object.keys(files).length > 0) {
        // Level 0: images are already compressed, deflating them again only costs time.
        const zipped = zipSync(files, { level: 0 });
        save(new Blob([zipped as BlobPart], { type: "application/zip" }), `Lunia Life - ${label}.zip`);
      }
      if (failed.length > 0) setError(`Could not include ${failed.length} file${failed.length > 1 ? "s" : ""}: ${failed.join(", ")}`);
    } finally {
      setZipProgress(null);
    }
  }

  const zipping = zipProgress !== null;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#1D1D1F", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 16px 80px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E6E73", margin: "0 0 8px" }}>
              Lunia Life · Shared assets
            </p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: 36, letterSpacing: "-0.01em", margin: 0 }}>
              {label}
            </h1>
            <p style={{ fontSize: 13, color: "#6E6E73", margin: "6px 0 0", fontVariantNumeric: "tabular-nums" }}>
              {assets.length} file{assets.length !== 1 ? "s" : ""}
            </p>
          </div>
          {assets.length > 0 && (
            <button
              onClick={downloadAll}
              disabled={zipping}
              style={{
                padding: "10px 18px", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                background: "#1D1D1F", color: "#FFFFFF", border: "none", borderRadius: 8,
                cursor: zipping ? "wait" : "pointer", opacity: zipping ? 0.7 : 1, fontVariantNumeric: "tabular-nums",
              }}
            >
              {zipping ? `Preparing ${zipProgress.done}/${zipProgress.total}…` : "Download all (.zip)"}
            </button>
          )}
        </div>

        {error && (
          <div role="alert" style={{ border: "1px solid #D2D2D7", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#C40000" }}>
            {error}
          </div>
        )}

        {assets.length === 0 ? (
          <p style={{ fontSize: 14, color: "#6E6E73", padding: "60px 0", textAlign: "center" }}>This folder is empty.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(200px, 100%), 1fr))", gap: 16 }}>
            {assets.map((a) => (
              <div key={a.id} style={{ border: "1px solid #D2D2D7", borderRadius: 10, overflow: "hidden", background: "#F5F5F7" }}>
                <div style={{ aspectRatio: "1", background: "#FFFFFF", borderBottom: "1px solid #D2D2D7" }}>
                  <img src={a.url} alt={a.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span title={a.name} style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </span>
                  <button
                    onClick={() => downloadOne(a)}
                    disabled={busyId === a.id}
                    aria-label={`Download ${a.name}`}
                    style={{
                      flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: "inherit", color: "#1D1D1F",
                      background: "#FFFFFF", border: "1px solid #BCBCC5", borderRadius: 6, padding: "4px 10px",
                      cursor: busyId === a.id ? "wait" : "pointer",
                    }}
                  >
                    {busyId === a.id ? "…" : "Download"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
