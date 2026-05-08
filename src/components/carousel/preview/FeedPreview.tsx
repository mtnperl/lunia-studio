"use client";
import { type ReactNode } from "react";

export type FeedMode = "instagram" | "tiktok";

type Props = {
  /** Slide rendered at scale=1 (1080×1350 or 1080×1920). FeedPreview scales it to fit. */
  slideNode: ReactNode;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  caption?: string;
  mode: FeedMode;
  aspect: "4:5" | "9:16";
  username?: string;
  brandAccent?: string;
};

const FRAME_W_IG = 380;
const FRAME_W_TT = 360;

export default function FeedPreview({
  slideNode,
  index,
  total,
  onPrev,
  onNext,
  caption,
  mode,
  aspect,
  username = "lunia_life",
  brandAccent = "#1e7a8a",
}: Props) {
  const isIG = mode === "instagram";
  const frameW = isIG ? FRAME_W_IG : FRAME_W_TT;
  // Slide visible area inside the phone frame
  const slideW = frameW;
  const slideH = aspect === "9:16" ? Math.round(slideW * 16 / 9) : Math.round(slideW * 5 / 4);
  // Source slide is 1080px wide; scale to fit frame
  const slideScale = slideW / 1080;
  const captionPreview = (caption ?? "").trim().split(/\s+/).slice(0, 18).join(" ");
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      padding: "20px 0", userSelect: "none",
    }}>
      {/* Mode label */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--subtle)", textTransform: "uppercase" }}>
        {isIG ? "Instagram feed preview" : "TikTok feed preview"}
      </div>

      {/* Phone frame + arrows */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <NavArrow direction="left" disabled={isFirst} onClick={onPrev} />

        <div style={{
          width: frameW,
          background: "#000",
          border: "1px solid #2a2a2a",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 18px 56px rgba(0,0,0,0.45), 0 0 0 6px #111 inset",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#fff",
        }}>
          {isIG ? (
            <InstagramChromeAndSlide
              username={username}
              brandAccent={brandAccent}
              slideNode={slideNode}
              slideW={slideW}
              slideH={slideH}
              slideScale={slideScale}
              index={index}
              total={total}
              captionPreview={captionPreview}
            />
          ) : (
            <TikTokChromeAndSlide
              username={username}
              brandAccent={brandAccent}
              slideNode={slideNode}
              slideW={slideW}
              slideH={slideH}
              slideScale={slideScale}
              captionPreview={captionPreview}
            />
          )}
        </div>

        <NavArrow direction="right" disabled={isLast} onClick={onNext} />
      </div>

      {/* Slide counter */}
      <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>
        Slide {index + 1} of {total}
      </div>
    </div>
  );
}

// ─── Instagram chrome + slide ─────────────────────────────────────────────────
function InstagramChromeAndSlide({
  username, brandAccent, slideNode, slideW, slideH, slideScale, index, total, captionPreview,
}: {
  username: string; brandAccent: string;
  slideNode: ReactNode; slideW: number; slideH: number; slideScale: number;
  index: number; total: number; captionPreview: string;
}) {
  return (
    <>
      {/* Top bar — avatar + username + ··· */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#000" }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: `linear-gradient(135deg, ${brandAccent} 0%, #8a4baa 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
        }}>L</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{username}</div>
        <div style={{ marginLeft: "auto", fontSize: 18, color: "#fff", letterSpacing: 1 }}>···</div>
      </div>

      {/* Slide */}
      <div style={{
        width: slideW, height: slideH, position: "relative", overflow: "hidden", background: "#000",
      }}>
        <div style={{ transform: `scale(${slideScale})`, transformOrigin: "top left" }}>
          {slideNode}
        </div>
        {/* Slide counter chip top-right */}
        {total > 1 && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 12,
          }}>{index + 1}/{total}</div>
        )}
      </div>

      {/* Action row — heart / comment / share / save */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 14, fontSize: 22, background: "#000" }}>
        <span>♡</span>
        <span style={{ fontSize: 20 }}>💬</span>
        <span style={{ fontSize: 20 }}>✈</span>
        <span style={{ marginLeft: "auto" }}>🔖</span>
      </div>

      {/* Slide dots */}
      {total > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, paddingBottom: 6, background: "#000" }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i === index ? brandAccent : "rgba(255,255,255,0.35)",
              transition: "background 0.15s",
            }} />
          ))}
        </div>
      )}

      {/* Caption preview */}
      <div style={{ padding: "4px 12px 12px", fontSize: 12, lineHeight: 1.4, color: "#eee", background: "#000" }}>
        <span style={{ fontWeight: 600 }}>{username}</span>{" "}
        {captionPreview}
        {captionPreview && <span style={{ color: "#9ab" }}>… more</span>}
      </div>
    </>
  );
}

// ─── TikTok chrome + slide ────────────────────────────────────────────────────
function TikTokChromeAndSlide({
  username, brandAccent, slideNode, slideW, slideH, slideScale, captionPreview,
}: {
  username: string; brandAccent: string;
  slideNode: ReactNode; slideW: number; slideH: number; slideScale: number;
  captionPreview: string;
}) {
  return (
    <div style={{ width: slideW, height: slideH, position: "relative", overflow: "hidden", background: "#000" }}>
      {/* Slide */}
      <div style={{ transform: `scale(${slideScale})`, transformOrigin: "top left" }}>
        {slideNode}
      </div>

      {/* Right rail — overlaid */}
      <div style={{
        position: "absolute", right: 8, bottom: 70, display: "flex", flexDirection: "column", gap: 16,
        alignItems: "center", color: "#fff",
      }}>
        <div style={{
          position: "relative",
          width: 40, height: 40, borderRadius: "50%",
          background: `linear-gradient(135deg, ${brandAccent} 0%, #8a4baa 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700,
          border: "2px solid #fff",
        }}>
          L
          <div style={{
            position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
            width: 16, height: 16, borderRadius: "50%", background: "#ff2c55",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "#fff",
          }}>+</div>
        </div>
        <RailIcon glyph="♡" label="12.4K" />
        <RailIcon glyph="💬" label="284" />
        <RailIcon glyph="✈" label="Share" />
        <RailIcon glyph="🎵" label="" spin />
      </div>

      {/* Bottom-left caption + handle */}
      <div style={{
        position: "absolute", left: 12, right: 70, bottom: 12,
        display: "flex", flexDirection: "column", gap: 6, color: "#fff",
        textShadow: "0 1px 6px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>@{username}</div>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: "#fff", opacity: 0.95 }}>
          {captionPreview}{captionPreview ? "…" : ""}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11 }}>♪</span>
          <span>original sound · {username}</span>
        </div>
      </div>
    </div>
  );
}

function RailIcon({ glyph, label, spin }: { glyph: string; label: string; spin?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{
        fontSize: 26,
        animation: spin ? "feedSpin 4s linear infinite" : undefined,
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
      }}>{glyph}</span>
      {label && <span style={{ fontSize: 10, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{label}</span>}
      <style>{`@keyframes feedSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NavArrow({ direction, disabled, onClick }: { direction: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous slide" : "Next slide"}
      style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "var(--surface)",
        color: disabled ? "var(--subtle)" : "var(--text)",
        border: "1px solid var(--border)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontSize: 18, fontWeight: 600, fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "transform 0.12s, background 0.12s",
      }}
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}
