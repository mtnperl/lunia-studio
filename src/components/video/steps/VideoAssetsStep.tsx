"use client";

import { useState, useRef } from "react";
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
  captionsMode?: boolean;
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

// ── Phone mock preview ────────────────────────────────────────────────────────

const PREVIEW_BRAND = {
  bg: "#102635", surface: "#2c3f51", text: "#F7F4EF",
  muted: "#8faabb", accent: "#ffd800", secondary: "#bffbf8",
  FF: "Helvetica Neue, Helvetica, Arial, sans-serif",
};

function ScenePhonePreview({
  type, scene, cfg, logoUrl,
}: {
  type: VideoAdSceneType | null;
  scene?: VideoAdScene;
  cfg?: SceneImageConfig;
  logoUrl?: string;
}) {
  const { bg, text, accent, muted, secondary, FF } = PREVIEW_BRAND;
  const W = 250;
  const H = 444; // 9:16

  if (!type || !scene) {
    return (
      <div style={{
        width: W, height: H, background: "var(--surface)",
        border: "2px solid var(--border)", borderRadius: 28,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 10, flexShrink: 0,
        position: "sticky", top: 20,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--border)", opacity: 0.4 }} />
        <span style={{ fontFamily: FF, fontSize: 12, color: "var(--subtle)", textAlign: "center", lineHeight: 1.5, padding: "0 20px" }}>
          Open a scene card<br />to see a preview
        </span>
      </div>
    );
  }

  const overlayAlpha = type === "cta" ? 0.65 : type === "hook" ? 0.52 : 0.58;
  const isProduct = type === "product";
  const isCta = type === "cta";
  const isProof = type === "proof";

  return (
    <div style={{
      width: W, height: H, borderRadius: 28,
      border: "3px solid #1e3548",
      overflow: "hidden", flexShrink: 0,
      position: "sticky", top: 20,
      background: bg,
      boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
    }}>
      {/* Background image */}
      {cfg && (
        <img src={cfg.url} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: cfg.fit, objectPosition: cfg.position ?? "50% 50%",
        }} />
      )}
      {cfg && (
        <div style={{ position: "absolute", inset: 0, background: `rgba(16,38,53,${overlayAlpha})` }} />
      )}

      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, zIndex: 2 }} />

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        display: "flex", flexDirection: "column",
        padding: isCta ? 0 : "28px 20px",
        justifyContent: isCta ? "center" : isProduct ? "flex-end" : "flex-start",
        alignItems: isCta ? "center" : "flex-start",
      }}>

        {/* Scene badge */}
        {!isCta && (
          <div style={{ fontFamily: FF, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 12 }}>
            {type} scene
          </div>
        )}

        {/* Stat */}
        {scene.stat && (type === "science" || isProof) && (
          <div style={{
            fontFamily: FF,
            fontSize: isProof ? 52 : 44,
            fontWeight: 700, color: isProof ? accent : secondary,
            lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 6,
          }}>
            {scene.stat}
          </div>
        )}

        {/* Caption */}
        {scene.caption && (
          <div style={{
            fontFamily: FF, fontSize: 10, color: muted,
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontWeight: 500,
          }}>
            {scene.caption}
          </div>
        )}

        {/* Product: bottom gradient + text */}
        {isProduct ? (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "24px 20px",
            background: "linear-gradient(to top, rgba(16,38,53,0.95) 0%, rgba(16,38,53,0.6) 60%, transparent 100%)",
          }}>
            <div style={{ fontFamily: FF, fontSize: 22, fontWeight: 700, color: text, lineHeight: 1.1, marginBottom: 8 }}>{scene.headline}</div>
            {scene.subline && <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 500, color: muted, lineHeight: 1.4 }}>{scene.subline}</div>}
          </div>
        ) : isCta ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "0 20px" }}>
            <div style={{ fontFamily: FF, fontSize: 28, fontWeight: 700, color: text, lineHeight: 1.05, letterSpacing: "-0.02em", textAlign: "center" }}>{scene.headline}</div>
            {scene.subline && <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 500, color: muted, lineHeight: 1.4, textAlign: "center" }}>{scene.subline}</div>}
            <div style={{ background: accent, color: bg, fontFamily: FF, fontSize: 13, fontWeight: 700, padding: "10px 28px", borderRadius: 3, letterSpacing: "0.1em", marginTop: 6 }}>SHOP NOW</div>
            {logoUrl && <img src={logoUrl} style={{ height: 28, marginTop: 4, mixBlendMode: "screen" as const, objectFit: "contain" }} />}
            {!logoUrl && <div style={{ fontFamily: FF, fontSize: 16, fontWeight: 700, color: accent, letterSpacing: "0.2em" }}>LUNIA LIFE</div>}
          </div>
        ) : (
          <>
            <div style={{ fontFamily: FF, fontSize: 22, fontWeight: 700, color: text, lineHeight: 1.1, letterSpacing: "-0.01em", marginBottom: 10 }}>{scene.headline}</div>
            {scene.subline && <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 500, color: muted, lineHeight: 1.4 }}>{scene.subline}</div>}
          </>
        )}

        {/* Stars for proof */}
        {isProof && (
          <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", gap: 5 }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ width: 14, height: 14, background: accent, clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }} />)}
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: accent, zIndex: 2 }} />
    </div>
  );
}

export default function VideoAssetsStep({
  scenes,
  topic,
  sceneImages,
  logoUrl,
  onUpdate,
  onLogoUpdate,
  onNext,
  onBack,
  captionsMode = false,
}: Props) {
  const [assets, setAssets] = useState<VideoAssetMetadata[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<VideoAdSceneType | null>(null);
  const [genState, setGenState] = useState<Record<string, GenState>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  async function loadAssets() {
    if (assetsLoaded || assetsLoading) return;
    setAssetsLoading(true);
    try {
      const d = await fetch("/api/video-assets").then((r) => r.json()).catch(() => []);
      setAssets(Array.isArray(d) ? d : []);
      setAssetsLoaded(true);
    } finally {
      setAssetsLoading(false);
    }
  }

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
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
      {/* Left column */}
      <div style={{ flex: 1, minWidth: 0 }}>
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

                    {/* Choose from assets button */}
                    <div style={{ marginBottom: 14 }}>
                      <button
                        onClick={loadAssets}
                        disabled={assetsLoading || assetsLoaded}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 4,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: assetsLoaded ? "var(--subtle)" : "var(--muted)",
                          fontFamily: FF,
                          fontSize: 12,
                          cursor: assetsLoading || assetsLoaded ? "default" : "pointer",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {assetsLoading ? "Loading..." : assetsLoaded ? "Assets loaded" : "Choose from assets"}
                      </button>
                    </div>

                    {/* Asset grid — only shown after load */}
                    {assetsLoaded && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8, marginBottom: 14 }}>
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

      {/* Right column — phone preview */}
      <ScenePhonePreview
        type={picker}
        scene={scenes.find((s) => s.type === picker)}
        cfg={picker ? sceneImages[picker] : undefined}
        logoUrl={logoUrl}
      />
    </div>
  );
}
