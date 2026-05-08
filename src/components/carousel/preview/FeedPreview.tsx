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
  const bg = "#000";
  const textPrimary = "#fafafa";
  const textSecondary = "#a8a8a8";

  return (
    <>
      {/* Top bar — avatar + username + ··· */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: bg }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          padding: 1.5,
          background: `linear-gradient(135deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)`,
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            border: `2px solid ${bg}`,
            background: `linear-gradient(135deg, ${brandAccent} 0%, #8a4baa 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>L</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, lineHeight: 1.1 }}>{username}</div>
          <div style={{ fontSize: 11, color: textSecondary, lineHeight: 1.1 }}>Sponsored</div>
        </div>
        <IGMoreIcon />
      </div>

      {/* Slide */}
      <div style={{
        width: slideW, height: slideH, position: "relative", overflow: "hidden", background: bg,
      }}>
        <div style={{ transform: `scale(${slideScale})`, transformOrigin: "top left" }}>
          {slideNode}
        </div>
        {/* Slide counter chip top-right */}
        {total > 1 && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
            backdropFilter: "blur(4px)",
          }}>{index + 1}/{total}</div>
        )}
      </div>

      {/* Action row + dots */}
      <div style={{ position: "relative", padding: "6px 12px 0", background: bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <IGHeartIcon color={textPrimary} />
          <IGCommentIcon color={textPrimary} />
          <IGShareIcon color={textPrimary} />
          <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 4 }}>
            {total > 1 && Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i === index ? "#0095f6" : "rgba(255,255,255,0.3)",
                transition: "background 0.15s",
              }} />
            ))}
          </div>
          <IGBookmarkIcon color={textPrimary} />
        </div>
      </div>

      {/* Likes count */}
      <div style={{ padding: "8px 12px 0", background: bg, fontSize: 13, fontWeight: 600, color: textPrimary }}>
        Liked by <span style={{ fontWeight: 600 }}>jenna_sleeps</span> and <span style={{ fontWeight: 600 }}>1,247 others</span>
      </div>

      {/* Caption */}
      <div style={{ padding: "4px 12px 0", fontSize: 13, lineHeight: 1.4, color: textPrimary, background: bg }}>
        <span style={{ fontWeight: 600 }}>{username}</span>{" "}
        <span style={{ color: textPrimary }}>{captionPreview}</span>
        {captionPreview && <span style={{ color: textSecondary }}>… more</span>}
      </div>

      {/* View all comments */}
      <div style={{ padding: "4px 12px 0", fontSize: 13, color: textSecondary, background: bg }}>
        View all 28 comments
      </div>

      {/* Add a comment row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        background: bg,
        borderTop: "1px solid #1a1a1a",
        marginTop: 6,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: `linear-gradient(135deg, ${brandAccent} 0%, #8a4baa 100%)`,
          flexShrink: 0,
          fontSize: 9, fontWeight: 700, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>L</div>
        <div style={{ fontSize: 13, color: textSecondary, flex: 1 }}>Add a comment...</div>
        <div style={{ display: "flex", gap: 8, fontSize: 11, color: textSecondary }}>
          <span>♥</span>
          <span>+</span>
        </div>
      </div>

      {/* Time ago */}
      <div style={{ padding: "0 12px 10px", fontSize: 10, color: textSecondary, background: bg, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        2 hours ago
      </div>
    </>
  );
}

// ─── Instagram-style SVG icons ────────────────────────────────────────────────
function IGHeartIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function IGCommentIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

function IGShareIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function IGBookmarkIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IGMoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fafafa" aria-hidden>
      <circle cx="5" cy="12" r="1.6"/>
      <circle cx="12" cy="12" r="1.6"/>
      <circle cx="19" cy="12" r="1.6"/>
    </svg>
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
