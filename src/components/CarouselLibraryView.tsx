"use client";
import { useState, useEffect } from "react";
import { SavedCarousel } from "@/lib/types";

// ── Tone label colors ──────────────────────────────────────────────────────────
const TONE_COLORS: Record<string, string> = {
  educational:     "#5F9E75",
  clickbait:       "#B86040",
  curiosity:       "#7A6AAA",
  "myth-bust":     "#A04040",
  "science-backed":"#4A82A0",
  "personal-story":"#A07830",
  "did-you-know":  "#6A8E4E",
  "smart-tip":     "#4A7A6A",
};

// ── CopyButton ─────────────────────────────────────────────────────────────────
function CopyButton({ text, onClick }: { text: string; onClick?: (e: React.MouseEvent) => void }) {
  const [copied, setCopied] = useState(false);
  function handle(e: React.MouseEvent) {
    e.stopPropagation();
    if (onClick) onClick(e);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handle}
      style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "9px 0",
        background: copied ? "var(--accent)" : "var(--surface-r)",
        border: `1px solid ${copied ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 8,
        fontSize: 12, fontWeight: 600,
        color: copied ? "#fff" : "var(--text)",
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        transition: "all 0.15s",
        letterSpacing: "0.01em",
      }}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <polyline points="1.5,6 4.5,9 10.5,3" stroke="currentColor" strokeWidth="1.9"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H9"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Copy caption
        </>
      )}
    </button>
  );
}

// ── DownloadIconButton ─────────────────────────────────────────────────────────
function DownloadIconButton({ href }: { href: string }) {
  function handle(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(href, "_blank");
  }
  return (
    <button
      onClick={handle}
      title="Download"
      style={{
        width: 36, height: 36, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-r)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: "pointer",
        color: "var(--muted)",
        transition: "color 0.14s, border-color 0.14s, background 0.14s",
      }}
      onMouseEnter={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = "var(--text)";
        b.style.borderColor = "var(--border-strong)";
        b.style.background = "var(--surface-h)";
      }}
      onMouseLeave={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = "var(--muted)";
        b.style.borderColor = "var(--border)";
        b.style.background = "var(--surface-r)";
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5v7M4.5 6.5l2.5 2.5 2.5-2.5"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1 10.5v1A1.5 1.5 0 0 0 2.5 13h9a1.5 1.5 0 0 0 1.5-1.5v-1"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: "var(--surface)", border: "1px solid var(--border)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ width: "100%", aspectRatio: "4/5", background: "var(--surface-r)",
        backgroundImage: "linear-gradient(90deg, var(--surface-r) 0%, var(--surface-h) 50%, var(--surface-r) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }} />
      <div style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 9, width: "45%", background: "var(--border)", borderRadius: 4 }} />
        <div style={{ height: 12, width: "90%", background: "var(--border)", borderRadius: 4 }} />
        <div style={{ height: 12, width: "70%", background: "var(--border)", borderRadius: 4 }} />
        <div style={{ height: 34, background: "var(--border)", borderRadius: 8, marginTop: 2 }} />
      </div>
    </div>
  );
}

// ── CarouselCard ───────────────────────────────────────────────────────────────
function CarouselCard({ c, onClick, onDelete }: { c: SavedCarousel; onClick: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    await fetch(`/api/carousel/${c.id}`, { method: "DELETE" });
    onDelete();
  }
  const hookImg = c.slideImages?.[0] ?? c.hookImageUrl ?? null;
  const toneColor = TONE_COLORS[c.hookTone] ?? "var(--accent)";
  const caption = c.content?.caption ?? "";
  const slideCount = (c.content?.slides?.length ?? 0) + 2;
  const shareHref = `${typeof window !== "undefined" ? window.location.origin : ""}/carousels/${c.id}`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--surface)",
        border: `1px solid ${hovered ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.18s, box-shadow 0.18s, transform 0.18s",
        boxShadow: hovered
          ? "0 8px 28px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.07)"
          : "0 1px 4px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* ── Hook image ── */}
      <div style={{
        width: "100%", aspectRatio: "4/5",
        background: "var(--surface-r)",
        position: "relative", overflow: "hidden",
      }}>
        {hookImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hookImg} alt={c.topic}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          /* No image fallback — gradient + italic topic */
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(155deg, var(--surface-h) 0%, var(--surface-r) 60%, var(--surface) 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "28px 20px", textAlign: "center", gap: 12,
          }}>
            <div style={{
              fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 400,
              fontStyle: "italic", color: "var(--muted)", lineHeight: 1.45,
            }}>
              {c.topic}
            </div>
            <div style={{ width: 28, height: 1, background: "var(--border-strong)" }} />
            <div style={{
              fontSize: 10, fontFamily: "var(--font-mono)",
              color: "var(--subtle)", letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              {c.hookTone}
            </div>
          </div>
        )}

        {/* Slide count pill */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(0,0,0,0.52)", backdropFilter: "blur(6px)",
          borderRadius: 20, padding: "3px 9px",
          fontSize: 10, fontWeight: 600,
          color: "rgba(255,255,255,0.92)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
        }}>
          {slideCount} slides
        </div>
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: "13px 13px 11px" }}>
        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 600,
            color: toneColor,
            textTransform: "uppercase", letterSpacing: "0.1em",
            fontFamily: "var(--font-mono)",
          }}>
            {c.hookTone.replace("-", " ")}
          </span>
          <span style={{ fontSize: 10, color: "var(--subtle)", fontFamily: "var(--font-mono)" }}>
            {new Date(c.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Topic */}
        <p style={{
          fontSize: 13, fontWeight: 500, color: "var(--text)",
          lineHeight: 1.4, marginBottom: 11,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {c.topic}
        </p>

        {/* Actions — stop propagation so card click doesn't fire */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: "flex", gap: 6, alignItems: "stretch" }}
        >
          {confirmDelete ? (
            <>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "9px 0",
                  background: "#A04040", border: "1px solid #A04040",
                  borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: "#fff", cursor: deleting ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-ui)", opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                style={{
                  width: 36, flexShrink: 0,
                  background: "var(--surface-r)", border: "1px solid var(--border)",
                  borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: "var(--muted)", cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                }}
              >✕</button>
            </>
          ) : (
            <>
              <CopyButton text={caption} />
              <DownloadIconButton href={shareHref} />
              {/* Trash */}
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                title="Delete"
                style={{
                  width: 36, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--surface-r)", border: "1px solid var(--border)",
                  borderRadius: 8, cursor: "pointer", color: "var(--muted)",
                  transition: "color 0.14s, border-color 0.14s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--error)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--error)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1.5 3.5h11M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M2.5 3.5l.75 8a1 1 0 0 0 1 .916h5.5a1 1 0 0 0 1-.916l.75-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CarouselLibraryView({ onOpen }: { onOpen?: (c: SavedCarousel) => void }) {
  const [carousels, setCarousels] = useState<SavedCarousel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/carousel/library")
      .then(r => r.json())
      .then(d => { setCarousels(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "32px 0 80px" }}>
      {/* Count */}
      <p style={{
        fontSize: 12, color: "var(--subtle)",
        fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
        marginBottom: 20,
      }}>
        {loading ? "Loading…" : `${carousels.length} carousel${carousels.length !== 1 ? "s" : ""}`}
      </p>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : carousels.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: 18,
            fontStyle: "italic", color: "var(--subtle)", marginBottom: 8,
          }}>
            No carousels saved yet.
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Build one and hit Save in the preview step.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {carousels
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            .map(c => (
              <CarouselCard
                key={c.id}
                c={c}
                onClick={() => onOpen?.(c)}
                onDelete={() => setCarousels(prev => prev.filter(x => x.id !== c.id))}
              />
            ))}
        </div>
      )}
    </div>
  );
}
