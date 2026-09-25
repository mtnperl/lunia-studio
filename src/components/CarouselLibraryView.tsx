"use client";
import { useState, useEffect, useRef } from "react";
import { Menu, useConfirm, useToast, IcTrash } from "@/components/ui";
import { SavedCarousel } from "@/lib/types";

// ── Tone label colors ──────────────────────────────────────────────────────────
const TONE_COLORS: Record<string, string> = {
  educational:     "#5F9E75",
  clickbait:       "#B86040",
  "myth-bust":     "#A04040",
  "science-backed":"#4A82A0",
  "personal-story":"#A07830",
  "did-you-know":  "#6A8E4E",
  symptom:         "#B0763E",
  paradox:         "#8E5A8A",
  tell:            "#3F6F8A",
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
function CarouselCard({ c, onClick, onDelete, onConvertToCampaign, onVary, selecting = false, selected = false }: { c: SavedCarousel; onClick: () => void; onDelete: () => void; onVary?: (c: SavedCarousel) => void; onConvertToCampaign?: (c: SavedCarousel) => void; selecting?: boolean; selected?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const confirm = useConfirm();
  const { toast } = useToast();

  async function handleDelete() {
    setDeleting(true);
    if (await deleteCarousel(c.id)) {
      onDelete();
      return;
    }
    setDeleting(false);
    toast({ title: "Couldn't delete that carousel", description: c.topic, kind: "danger" });
  }

  async function askDelete() {
    const ok = await confirm({ title: "Delete this carousel?", description: c.topic, confirmLabel: "Delete", tone: "danger" });
    if (ok) void handleDelete();
  }
  // The three two-slide formats share the card: a paper tile with the
  // format's name and the piece's first line, no hook image.
  const isDidYouKnow = c.format === "did_you_know" || c.format === "chartbook" || c.format === "primer";
  const formatLabel = c.format === "chartbook" ? "Chartbook" : c.format === "primer" ? "Primer" : "Did you know?";
  const hookImg = c.slideImages?.[0] ?? c.hookImageUrl ?? null;
  const toneColor = isDidYouKnow ? "#102635" : (TONE_COLORS[c.hookTone] ?? "var(--accent)");
  const caption = c.format === "chartbook" ? (c.chartbookContent?.caption ?? "")
    : c.format === "primer" ? (c.primerContent?.caption ?? "")
    : isDidYouKnow ? (c.didYouKnowContent?.caption ?? "") : (c.content?.caption ?? "");
  const slideCount = isDidYouKnow ? 2 : (c.content?.slides?.length ?? 0) + 2;
  const shareHref = `${typeof window !== "undefined" ? window.location.origin : ""}/carousels/${c.id}`;
  const dykPreviewText = c.format === "chartbook" ? (c.chartbookContent?.cover.question ?? "")
    : c.format === "primer" ? (c.primerContent?.cover.title ?? "")
    : isDidYouKnow
    ? c.didYouKnowContent?.slide1.body1.map((t) => t.text).join("").slice(0, 100) ?? ""
    : "";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--surface)",
        border: `1px solid ${selected || hovered ? "var(--accent)" : "var(--border)"}`,
        outline: selected ? "1px solid var(--accent)" : "none",
        opacity: deleting ? 0.5 : 1,
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
        {isDidYouKnow ? (
          <div style={{
            width: "100%", height: "100%",
            background: "#EEEBE3",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "24px 20px", textAlign: "center", gap: 14,
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic", fontWeight: 500, fontSize: 26,
              color: "#102635", letterSpacing: "0.01em",
            }}>
              {formatLabel}
            </div>
            <div style={{
              fontFamily: "Inter, 'Helvetica Neue', sans-serif",
              fontWeight: 400, fontSize: 12, lineHeight: 1.4,
              color: "#1A1A1A",
              display: "-webkit-box", WebkitLineClamp: 5,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {dykPreviewText}…
            </div>
          </div>
        ) : hookImg ? (
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

        {/* Selection mark, in select mode only. */}
        {selecting && (
          <div aria-hidden style={{
            position: "absolute", top: 10, left: 10, width: 22, height: 22, borderRadius: 6,
            border: `1.5px solid ${selected ? "var(--accent)" : "rgba(255,255,255,0.9)"}`,
            background: selected ? "var(--accent)" : "rgba(0,0,0,0.28)",
            color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700,
          }}>
            {selected ? "\u2713" : ""}
          </div>
        )}

        {/* Delete, one click from the grid (plus the confirm). Sits on the
            picture like the slide-count pill so the action row keeps its room. */}
        {!selecting && (
          <button
            type="button"
            title="Delete carousel"
            aria-label="Delete carousel"
            disabled={deleting}
            onClick={(e) => { e.stopPropagation(); void askDelete(); }}
            style={{
              position: "absolute", top: 8, left: 8, width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 20, border: "none", cursor: "pointer",
              background: "rgba(0,0,0,0.52)",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            <IcTrash size={14} />
          </button>
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
            {isDidYouKnow ? formatLabel.toLowerCase().replace("?", "") : c.hookTone.replace("-", " ")}
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

        {/* Actions: copy the caption, open, delete, and a menu for the rest.
            Hidden while selecting so a click anywhere on the card selects it. */}
        <div onClick={(e) => e.stopPropagation()} style={{ display: selecting ? "none" : "flex", gap: 6, alignItems: "stretch" }}>
          <CopyButton text={caption} />
          <button type="button" className="ui-btn ui-btn--sm ui-btn--secondary" onClick={onClick} style={{ flex: 1 }}>Open</button>
          <button ref={menuRef} type="button" className="ui-btn ui-btn--sm ui-btn--secondary ui-btn--icon" title="More actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} style={{ width: 36, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
          <Menu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorRef={menuRef}
            placement="bottom-end"
            ariaLabel="Carousel actions"
            items={[
              ...(onVary ? [{ label: "Vary: new subject, same structure", onSelect: () => onVary(c) }] : []),
              ...(onConvertToCampaign ? [{ label: "Turn into an email", onSelect: () => onConvertToCampaign(c) }] : []),
              { label: "Download slides", onSelect: () => { window.open(shareHref, "_blank", "noopener,noreferrer"); } },
              { type: "separator" as const },
              { label: deleting ? "Deleting" : "Delete", danger: true, disabled: deleting, onSelect: () => void askDelete() },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/** DELETE one saved carousel. Resolves true only when the server removed it,
 *  so the grid never drops a card that is still in the library. */
async function deleteCarousel(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/carousel/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CarouselLibraryView({ onOpen, onConvertToCampaign, onVary }: { onOpen?: (c: SavedCarousel) => void; onVary?: (c: SavedCarousel) => void; onConvertToCampaign?: (c: SavedCarousel) => void }) {
  const [carousels, setCarousels] = useState<SavedCarousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const confirm = useConfirm();
  const { toast } = useToast();

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Delete ${ids.length} carousel${ids.length === 1 ? "" : "s"}?`,
      description: "They are removed from the library and their share links stop working.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setBulkDeleting(true);
    // One at a time. The library is a single stored list that each delete
    // reads, filters and writes back, so parallel deletes race and the last
    // write brings the others' carousels back.
    const results: { id: string; ok: boolean }[] = [];
    for (const id of ids) results.push({ id, ok: await deleteCarousel(id) });
    const gone = new Set(results.filter((r) => r.ok).map((r) => r.id));
    const failed = results.length - gone.size;
    setCarousels((prev) => prev.filter((x) => !gone.has(x.id)));
    setBulkDeleting(false);
    if (failed > 0) {
      // Keep the ones that failed selected so a retry is one click.
      setSelected(new Set(results.filter((r) => !r.ok).map((r) => r.id)));
      toast({ title: `${failed} of ${results.length} couldn't be deleted`, description: "They're still selected. Try again.", kind: "danger" });
    } else {
      exitSelect();
      toast({ title: `Deleted ${gone.size} carousel${gone.size === 1 ? "" : "s"}`, kind: "success" });
    }
  }

  useEffect(() => {
    fetch("/api/carousel/library")
      .then(r => r.json())
      .then(d => { setCarousels(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "32px 0 80px" }}>
      {/* Count, and the select-to-delete controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, minHeight: 28 }}>
        <p style={{
          fontSize: 12, color: "var(--subtle)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.04em", margin: 0,
        }}>
          {loading ? "Loading…" : selecting
            ? `${selected.size} of ${carousels.length} selected`
            : `${carousels.length} carousel${carousels.length !== 1 ? "s" : ""}`}
        </p>
        {!loading && carousels.length > 0 && (
          <div style={{ display: "flex", gap: 6 }}>
            {selecting ? (
              <>
                <button type="button" className="ui-btn ui-btn--sm ui-btn--ghost" disabled={bulkDeleting}
                  onClick={() => setSelected(selected.size === carousels.length ? new Set() : new Set(carousels.map((c) => c.id)))}>
                  {selected.size === carousels.length ? "Select none" : "Select all"}
                </button>
                <button type="button" className="ui-btn ui-btn--sm ui-btn--secondary" disabled={bulkDeleting} onClick={exitSelect}>Cancel</button>
                <button type="button" className="ui-btn ui-btn--sm ui-btn--danger" disabled={bulkDeleting || selected.size === 0} onClick={() => void deleteSelected()}>
                  {bulkDeleting ? "Deleting…" : `Delete ${selected.size || ""}`.trim()}
                </button>
              </>
            ) : (
              <button type="button" className="ui-btn ui-btn--sm ui-btn--secondary" onClick={() => setSelecting(true)}>Select</button>
            )}
          </div>
        )}
      </div>

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
                onClick={() => (selecting ? toggleSelected(c.id) : onOpen?.(c))}
                selecting={selecting}
                selected={selected.has(c.id)}
                onDelete={() => setCarousels(prev => prev.filter(x => x.id !== c.id))}
                onConvertToCampaign={onConvertToCampaign}
                onVary={onVary}
              />
            ))}
        </div>
      )}
    </div>
  );
}
