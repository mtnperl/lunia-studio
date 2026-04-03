"use client";

import { useState, useEffect, useRef } from "react";
import { VideoAssetMetadata, VideoAdSceneType, SceneImageConfig, SceneImageFit } from "@/lib/types";

const SCENE_LABELS: Record<VideoAdSceneType, string> = {
  hook: "Hook",
  science: "Science",
  product: "Product",
  proof: "Proof",
  cta: "CTA",
};

const SCENE_DESCRIPTIONS: Record<VideoAdSceneType, string> = {
  hook: "Bold opening — attention grab",
  science: "Sleep stat / ingredient fact",
  product: "Lunia product showcase",
  proof: "Social proof / customer stat",
  cta: "Call to action — Shop Now",
};

const SCENE_ORDER: VideoAdSceneType[] = ["hook", "science", "product", "proof", "cta"];

type Props = {
  sceneImages: Partial<Record<VideoAdSceneType, SceneImageConfig>>;
  onUpdate: (images: Partial<Record<VideoAdSceneType, SceneImageConfig>>) => void;
  onNext: () => void;
  onBack: () => void;
};

type PickerState = {
  sceneType: VideoAdSceneType;
} | null;

export default function VideoAssetsStep({ sceneImages, onUpdate, onNext, onBack }: Props) {
  const [assets, setAssets] = useState<VideoAssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/video-assets")
      .then((r) => r.json())
      .then((d) => { setAssets(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const productImages = assets.filter(
    (a) => a.assetType === "product-image-vertical" || a.assetType === "lifestyle-image"
  );

  // ── Multi-file upload ──────────────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setUploadingCount(files.length);

    const results: string[] = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("assetType", "product-image-vertical");
        const res = await fetch("/api/video-assets/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const { error: msg } = await res.json();
          throw new Error(msg);
        }
        const { url } = await res.json();
        results.push(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "One or more uploads failed.");
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }

    // Refresh asset list
    const refreshed = await fetch("/api/video-assets").then((r) => r.json()).catch(() => []);
    setAssets(Array.isArray(refreshed) ? refreshed : []);

    // If a picker is open and this is the first upload, auto-select
    if (picker && results.length === 1) {
      setScene(picker.sceneType, { url: results[0], fit: "cover" });
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Scene image helpers ────────────────────────────────────────────────────
  function setScene(type: VideoAdSceneType, config: SceneImageConfig | null) {
    const next = { ...sceneImages };
    if (config === null) {
      delete next[type];
    } else {
      next[type] = config;
    }
    onUpdate(next);
  }

  function updateFit(type: VideoAdSceneType, fit: SceneImageFit) {
    const existing = sceneImages[type];
    if (!existing) return;
    setScene(type, { ...existing, fit });
  }

  function updatePosition(type: VideoAdSceneType, positionY: number) {
    const existing = sceneImages[type];
    if (!existing) return;
    setScene(type, { ...existing, position: `50% ${positionY}%` });
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    label: {
      fontFamily: "Inter, sans-serif",
      fontSize: 11,
      color: "var(--muted)",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      display: "block",
      marginBottom: 6,
    } as React.CSSProperties,
    chip: (active: boolean): React.CSSProperties => ({
      padding: "5px 12px",
      borderRadius: 4,
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      background: active ? "var(--accent-dim)" : "transparent",
      color: active ? "var(--accent)" : "var(--muted)",
      fontFamily: "Inter, sans-serif",
      fontSize: 11,
      cursor: "pointer",
      letterSpacing: "0.04em",
    }),
  };

  const isUploading = uploadingCount > 0;

  return (
    <div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 6 }}>
        Scene images
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
        Assign a background image to each scene. All are optional — skip any to use a clean dark background.
      </p>

      {error && (
        <div style={{ background: "rgba(184,92,92,0.12)", border: "1px solid var(--error)", borderRadius: 6, padding: "10px 16px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--error)" }}>
          {error}
        </div>
      )}

      {/* Scene cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {SCENE_ORDER.map((type) => {
          const cfg = sceneImages[type];
          const isOpen = picker?.sceneType === type;

          return (
            <div
              key={type}
              style={{
                background: "var(--surface)",
                border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
                transition: "border-color 0.15s",
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                }}
                onClick={() => setPicker(isOpen ? null : { sceneType: type })}
              >
                {/* Thumbnail or placeholder */}
                <div
                  style={{
                    width: 40,
                    height: 72,
                    borderRadius: 4,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--surface-r)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {cfg ? (
                    <img
                      src={cfg.url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: cfg.fit,
                        objectPosition: cfg.position ?? "50% 50%",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 16, opacity: 0.3 }}>—</span>
                  )}
                </div>

                {/* Labels */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {SCENE_LABELS[type]}
                    </span>
                    {cfg && (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--success)", letterSpacing: "0.04em" }}>
                        ✓ image set
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--muted)" }}>
                    {SCENE_DESCRIPTIONS[type]}
                  </span>
                </div>

                {/* Chevron */}
                <span style={{ color: "var(--muted)", fontSize: 12, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                  ▾
                </span>
              </div>

              {/* Expanded picker */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "16px" }}>

                  {/* Fit controls (shown when image is assigned) */}
                  {cfg && (
                    <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--surface-r)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Fit toggle */}
                      <div>
                        <label style={S.label}>Image Fit</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={S.chip(cfg.fit === "cover")} onClick={() => updateFit(type, "cover")}>
                            Fill (crop if needed)
                          </button>
                          <button style={S.chip(cfg.fit === "contain")} onClick={() => updateFit(type, "contain")}>
                            Fit (no crop, show all)
                          </button>
                        </div>
                      </div>

                      {/* Vertical position (only for cover) */}
                      {cfg.fit === "cover" && (
                        <div>
                          <label style={S.label}>
                            Vertical position — {Math.round(parseFloat((cfg.position ?? "50% 50%").split(" ")[1] ?? "50"))}%
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={parseFloat((cfg.position ?? "50% 50%").split(" ")[1] ?? "50")}
                            onChange={(e) => updatePosition(type, Number(e.target.value))}
                            style={{ width: "100%", accentColor: "var(--accent)" }}
                          />
                          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--subtle)" }}>
                            <span>Top</span><span>Center</span><span>Bottom</span>
                          </div>
                        </div>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => setScene(type, null)}
                        style={{ alignSelf: "flex-start", background: "transparent", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--error)", cursor: "pointer" }}
                      >
                        Remove image
                      </button>
                    </div>
                  )}

                  {/* Asset grid */}
                  {loading ? (
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Loading assets...</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
                      {/* None */}
                      <button
                        onClick={() => setScene(type, null)}
                        style={{
                          aspectRatio: "9/16",
                          background: "var(--surface-r)",
                          border: `1px solid ${!cfg ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: 6,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          color: "var(--muted)",
                          opacity: !cfg ? 1 : 0.5,
                        }}
                      >
                        —
                      </button>

                      {productImages.map((asset) => {
                        const isSelected = cfg?.url === asset.url;
                        return (
                          <button
                            key={asset.id}
                            onClick={() => setScene(type, { url: asset.url, fit: cfg?.fit ?? "cover", position: cfg?.position })}
                            style={{
                              aspectRatio: "9/16",
                              border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                              borderRadius: 6,
                              overflow: "hidden",
                              cursor: "pointer",
                              padding: 0,
                              background: "var(--surface-r)",
                              position: "relative",
                            }}
                          >
                            <img
                              src={asset.url}
                              alt={asset.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                            {isSelected && (
                              <div style={{
                                position: "absolute", inset: 0,
                                background: "rgba(200,169,110,0.25)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <span style={{ background: "var(--accent)", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--bg)", fontWeight: 700 }}>✓</span>
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* Upload tile */}
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={isUploading}
                        style={{
                          aspectRatio: "9/16",
                          background: "var(--surface)",
                          border: "1px dashed var(--border)",
                          borderRadius: 6,
                          cursor: isUploading ? "not-allowed" : "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          opacity: isUploading ? 0.5 : 1,
                        }}
                      >
                        <span style={{ fontSize: 20, color: "var(--muted)" }}>+</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--muted)" }}>
                          {isUploading ? `${uploadingCount} left` : "Upload"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden multi-file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={handleUpload}
      />

      {/* Quick multi-upload dropzone */}
      <div
        style={{
          border: "1px dashed var(--border)",
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--text)", marginBottom: 2 }}>
            Upload multiple images at once
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)" }}>
            JPEG · PNG · WebP · up to 30 MB each
          </div>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          style={{
            background: isUploading ? "var(--surface-r)" : "var(--accent)",
            color: isUploading ? "var(--muted)" : "var(--bg)",
            border: "none",
            borderRadius: 4,
            padding: "9px 20px",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            cursor: isUploading ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {isUploading ? `Uploading ${uploadingCount} file${uploadingCount !== 1 ? "s" : ""}...` : "Upload Images"}
        </button>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "10px 20px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: 4,
            padding: "10px 28px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--bg)",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          Preview Video
        </button>
      </div>
    </div>
  );
}
