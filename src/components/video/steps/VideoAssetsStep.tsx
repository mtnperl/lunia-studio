"use client";

import { useState, useEffect, useRef } from "react";
import { VideoAssetMetadata, VideoAdSceneType, VideoAdScene, SceneImageConfig, SceneImageFit } from "@/lib/types";
import { MiniRetroLoader } from "@/components/carousel/shared/RetroLoader";

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
  scenes: VideoAdScene[];
  topic: string;
  sceneImages: Partial<Record<VideoAdSceneType, SceneImageConfig>>;
  logoUrl?: string;
  onUpdate: (images: Partial<Record<VideoAdSceneType, SceneImageConfig>>) => void;
  onLogoUpdate: (url: string | undefined) => void;
  onNext: () => void;
  onBack: () => void;
};

type GenState = {
  prompt: string;
  promptLoading: boolean;
  imageLoading: boolean;
  generatedUrl: string | null;
  panelOpen: boolean;
};

const defaultGenState = (): GenState => ({
  prompt: "",
  promptLoading: false,
  imageLoading: false,
  generatedUrl: null,
  panelOpen: false,
});

export default function VideoAssetsStep({
  scenes,
  topic,
  sceneImages,
  logoUrl,
  onUpdate,
  onLogoUpdate,
  onNext,
  onBack,
}: Props) {
  const [assets, setAssets] = useState<VideoAssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<VideoAdSceneType | null>(null);
  const [genState, setGenState] = useState<Record<string, GenState>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/video-assets")
      .then((r) => r.json())
      .then((d) => { setAssets(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const productImages = assets.filter(
    (a) => a.assetType === "product-image-vertical" || a.assetType === "lifestyle-image"
  );
  const logoAssets = assets.filter((a) => a.assetType === "logo");

  // ── Upload helpers ─────────────────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, assetType = "product-image-vertical") {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setUploadingCount(files.length);

    const results: string[] = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("assetType", assetType);
        const res = await fetch("/api/video-assets/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
        const { url } = await res.json();
        results.push(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "One or more uploads failed.");
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }

    const refreshed = await fetch("/api/video-assets").then((r) => r.json()).catch(() => []);
    setAssets(Array.isArray(refreshed) ? refreshed : []);

    if (picker && results.length === 1) {
      setScene(picker, { url: results[0], fit: "cover" });
    }

    if (e.target) e.target.value = "";
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("assetType", "logo");
      const res = await fetch("/api/video-assets/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const { url } = await res.json();
      onLogoUpdate(url);
      const refreshed = await fetch("/api/video-assets").then((r) => r.json()).catch(() => []);
      setAssets(Array.isArray(refreshed) ? refreshed : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
    }
    if (e.target) e.target.value = "";
  }

  // ── Scene image helpers ────────────────────────────────────────────────────
  function setScene(type: VideoAdSceneType, config: SceneImageConfig | null) {
    const next = { ...sceneImages };
    if (config === null) delete next[type];
    else next[type] = config;
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

  // ── AI generation helpers ──────────────────────────────────────────────────
  function getGen(type: VideoAdSceneType): GenState {
    return genState[type] ?? defaultGenState();
  }

  function patchGen(type: VideoAdSceneType, patch: Partial<GenState>) {
    setGenState((prev) => ({ ...prev, [type]: { ...(prev[type] ?? defaultGenState()), ...patch } }));
  }

  async function generatePrompt(type: VideoAdSceneType) {
    const scene = scenes.find((s) => s.type === type);
    patchGen(type, { promptLoading: true });
    try {
      const res = await fetch("/api/video/generate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          sceneType: type,
          headline: scene?.headline ?? "",
          currentPrompt: getGen(type).prompt,
        }),
      });
      const { prompt } = await res.json();
      patchGen(type, { prompt: prompt ?? "", promptLoading: false });
    } catch {
      patchGen(type, { promptLoading: false });
    }
  }

  async function generateImage(type: VideoAdSceneType) {
    const prompt = getGen(type).prompt;
    if (!prompt.trim()) return;
    patchGen(type, { imageLoading: true });
    try {
      const res = await fetch("/api/video/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const { url, error: err } = await res.json();
      if (err) throw new Error(err);
      patchGen(type, { generatedUrl: url, imageLoading: false });
      // Auto-select generated image
      setScene(type, { url, fit: "cover" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed.");
      patchGen(type, { imageLoading: false });
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const FF = "Helvetica Neue, Helvetica, Arial, sans-serif";

  const S = {
    label: {
      fontFamily: FF,
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
      fontFamily: FF,
      fontSize: 11,
      cursor: "pointer",
      letterSpacing: "0.04em",
    }),
    smallBtn: (variant: "primary" | "ghost" = "ghost"): React.CSSProperties => ({
      padding: "6px 12px",
      borderRadius: 4,
      border: `1px solid ${variant === "primary" ? "var(--accent)" : "var(--border)"}`,
      background: variant === "primary" ? "var(--accent)" : "transparent",
      color: variant === "primary" ? "var(--bg)" : "var(--muted)",
      fontFamily: FF,
      fontSize: 11,
      fontWeight: variant === "primary" ? 600 : 400,
      cursor: "pointer",
      letterSpacing: "0.04em",
    }),
  };

  const isUploading = uploadingCount > 0;

  return (
    <div>
      <h2 style={{ fontFamily: FF, fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.02em" }}>
        Scene images
      </h2>
      <p style={{ fontFamily: FF, fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
        Assign a background image to each scene. Upload your own or generate with AI. All optional.
      </p>

      {error && (
        <div style={{ background: "rgba(184,92,92,0.12)", border: "1px solid var(--error)", borderRadius: 6, padding: "10px 16px", marginBottom: 16, fontFamily: FF, fontSize: 13, color: "var(--error)" }}>
          {error}
        </div>
      )}

      {/* ── Scene cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {SCENE_ORDER.map((type) => {
          const cfg = sceneImages[type];
          const isOpen = picker === type;
          const gen = getGen(type);
          const posY = parseFloat((cfg?.position ?? "50% 50%").split(" ")[1] ?? "50");

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
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                onClick={() => setPicker(isOpen ? null : type)}
              >
                {/* Thumbnail */}
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
                    <span style={{ fontFamily: FF, fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {SCENE_LABELS[type]}
                    </span>
                    {cfg && (
                      <span style={{ fontFamily: FF, fontSize: 10, color: "var(--success)", letterSpacing: "0.04em" }}>
                        ✓ set
                      </span>
                    )}
                    {gen.generatedUrl && !cfg && (
                      <span style={{ fontFamily: FF, fontSize: 10, color: "var(--muted)" }}>AI generated</span>
                    )}
                  </div>
                  <span style={{ fontFamily: FF, fontSize: 12, color: "var(--muted)" }}>
                    {SCENE_DESCRIPTIONS[type]}
                  </span>
                </div>

                <span style={{ color: "var(--muted)", fontSize: 12, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
              </div>

              {/* Expanded panel */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)", padding: 16 }}>

                  {/* Fit + position controls */}
                  {cfg && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: "12px 14px",
                        background: "var(--surface-r)",
                        borderRadius: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {/* Fit toggle */}
                      <div>
                        <label style={S.label}>Image Fit</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={S.chip(cfg.fit === "cover")} onClick={() => updateFit(type, "cover")}>
                            Fill (crop if needed)
                          </button>
                          <button style={S.chip(cfg.fit === "contain")} onClick={() => updateFit(type, "contain")}>
                            Fit (no crop)
                          </button>
                        </div>
                      </div>

                      {/* Vertical position with live preview */}
                      {cfg.fit === "cover" && (
                        <div>
                          <label style={S.label}>
                            Vertical position — {Math.round(posY)}%
                          </label>
                          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                            {/* Slider */}
                            <div style={{ flex: 1 }}>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={posY}
                                onChange={(e) => updatePosition(type, Number(e.target.value))}
                                style={{ width: "100%", accentColor: "var(--accent)" }}
                              />
                              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FF, fontSize: 10, color: "var(--subtle)" }}>
                                <span>Top</span><span>Center</span><span>Bottom</span>
                              </div>
                            </div>
                            {/* Live preview thumbnail */}
                            <div
                              style={{
                                width: 52,
                                height: 92,
                                borderRadius: 4,
                                overflow: "hidden",
                                border: "1px solid var(--accent)",
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={cfg.url}
                                alt="Position preview"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  objectPosition: cfg.position ?? "50% 50%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setScene(type, null)}
                        style={{ alignSelf: "flex-start", background: "transparent", border: "none", padding: 0, fontFamily: FF, fontSize: 11, color: "var(--error)", cursor: "pointer" }}
                      >
                        Remove image
                      </button>
                    </div>
                  )}

                  {/* AI generation panel */}
                  <div
                    style={{
                      marginBottom: 14,
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => {
                        const wasOpen = gen.panelOpen;
                        patchGen(type, { panelOpen: !wasOpen });
                        if (!wasOpen && !gen.prompt) generatePrompt(type);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 14px",
                        background: gen.panelOpen ? "var(--surface-r)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontFamily: FF,
                        fontSize: 12,
                        color: "var(--accent)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <span>Generate with AI (fal.ai)</span>
                      <span style={{ fontSize: 10, color: "var(--muted)", transform: gen.panelOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
                    </button>

                    {gen.panelOpen && (
                      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Prompt textarea */}
                        <div>
                          <label style={S.label}>Image prompt</label>
                          <textarea
                            value={gen.promptLoading ? "Generating prompt..." : gen.prompt}
                            onChange={(e) => patchGen(type, { prompt: e.target.value })}
                            readOnly={gen.promptLoading}
                            rows={3}
                            style={{
                              width: "100%",
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              padding: "8px 10px",
                              fontFamily: FF,
                              fontSize: 12,
                              color: "var(--text)",
                              resize: "vertical",
                              outline: "none",
                              boxSizing: "border-box",
                              opacity: gen.promptLoading ? 0.5 : 1,
                            }}
                          />
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => generatePrompt(type)}
                            disabled={gen.promptLoading}
                            style={S.smallBtn("ghost")}
                          >
                            {gen.promptLoading ? "..." : "Regenerate prompt"}
                          </button>
                          <button
                            onClick={() => generateImage(type)}
                            disabled={gen.imageLoading || !gen.prompt.trim()}
                            style={S.smallBtn("primary")}
                          >
                            {gen.imageLoading ? "Generating..." : "Generate image"}
                          </button>
                        </div>

                        {/* Generating loader */}
                        {gen.imageLoading && (
                          <div style={{ marginTop: 4 }}>
                            <MiniRetroLoader label={`${SCENE_LABELS[type].toUpperCase()} SCENE`} />
                          </div>
                        )}

                        {/* Generated image preview */}
                        {gen.generatedUrl && !gen.imageLoading && (
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <div style={{ width: 48, height: 86, borderRadius: 4, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                              <img src={gen.generatedUrl} alt="Generated" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div>
                              <div style={{ fontFamily: FF, fontSize: 11, color: "var(--success)", marginBottom: 4 }}>Image generated</div>
                              {cfg?.url !== gen.generatedUrl && (
                                <button
                                  onClick={() => setScene(type, { url: gen.generatedUrl!, fit: "cover" })}
                                  style={S.smallBtn("primary")}
                                >
                                  Use this image
                                </button>
                              )}
                              {cfg?.url === gen.generatedUrl && (
                                <span style={{ fontFamily: FF, fontSize: 11, color: "var(--accent)" }}>✓ In use</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Asset grid */}
                  {loading ? (
                    <div style={{ fontFamily: FF, fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Loading assets...</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
                      {/* None option */}
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
                            <img src={asset.url} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            {isSelected && (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  background: "rgba(255,216,0,0.2)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
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
                        <span style={{ fontSize: 18, color: "var(--muted)" }}>+</span>
                        <span style={{ fontFamily: FF, fontSize: 10, color: "var(--muted)" }}>
                          {isUploading ? `${uploadingCount}...` : "Upload"}
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

      {/* ── CTA Logo section ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "16px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: FF, fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
              CTA Logo
            </div>
            <div style={{ fontFamily: FF, fontSize: 12, color: "var(--muted)" }}>
              Shown on the final scene. Use a PNG with transparent background.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Current logo preview */}
          {logoUrl && (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: 120,
                  height: 48,
                  background: "#102635",
                  borderRadius: 4,
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <button
                onClick={() => onLogoUpdate(undefined)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--error)",
                  border: "none",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Logo from assets */}
          {logoAssets.length > 0 && !logoUrl && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {logoAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onLogoUpdate(a.url)}
                  style={{
                    padding: "6px 12px",
                    background: "var(--surface-r)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: FF,
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}

          {/* Upload new logo */}
          <button
            onClick={() => logoFileRef.current?.click()}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px dashed var(--border)",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: FF,
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            {logoUrl ? "Replace logo" : "Upload logo"}
          </button>
        </div>

        <input
          ref={logoFileRef}
          type="file"
          accept="image/png,image/svg+xml,image/webp"
          style={{ display: "none" }}
          onChange={handleLogoUpload}
        />
      </div>

      {/* ── Hidden multi-file input ───────────────────────────────────────────── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleUpload(e)}
      />

      {/* ── Quick multi-upload strip ──────────────────────────────────────────── */}
      <div
        style={{
          border: "1px dashed var(--border)",
          borderRadius: 8,
          padding: "18px 20px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontFamily: FF, fontSize: 13, color: "var(--text)", marginBottom: 2 }}>
            Upload multiple images at once
          </div>
          <div style={{ fontFamily: FF, fontSize: 11, color: "var(--muted)" }}>
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
            fontFamily: FF,
            fontSize: 12,
            fontWeight: 600,
            cursor: isUploading ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {isUploading ? `Uploading ${uploadingCount}...` : "Upload Images"}
        </button>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "10px 20px",
            fontFamily: FF,
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
            fontFamily: FF,
            fontSize: 13,
            fontWeight: 600,
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
