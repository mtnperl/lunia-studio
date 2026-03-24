"use client";
import { useState, useEffect } from "react";
import { SavedCarousel } from "@/lib/types";

export default function CarouselLibraryView() {
  const [carousels, setCarousels] = useState<SavedCarousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/carousel/library")
      .then((r) => r.json())
      .then((d) => { setCarousels(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/carousel/${id}`, { method: "DELETE" });
    setCarousels((prev) => prev.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
  }

  if (loading) {
    return <div style={{ fontSize: 14, color: "var(--muted)", padding: "40px 0" }}>Loading library...</div>;
  }

  if (carousels.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No saved carousels</div>
        <div style={{ fontSize: 13 }}>Generate one and hit "Save carousel" in the preview step.</div>
      </div>
    );
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function copyShareLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/carousels/${id}`);
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        {carousels.length} saved {carousels.length === 1 ? "carousel" : "carousels"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {carousels.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 18,
              background: "var(--surface)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>{c.topic}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 4,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                {c.hookTone}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
              Saved {formatDate(c.savedAt)}
            </div>
            <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--muted)", marginBottom: 14, lineHeight: 1.4, borderLeft: "2px solid var(--border)", paddingLeft: 10 }}>
              "{c.content.hooks[c.selectedHook]?.headline}"
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <a
                href={`/carousels/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                  textDecoration: "none",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "6px 12px",
                  background: "var(--bg)",
                }}
              >
                View ↗
              </a>
              <button
                onClick={() => copyShareLink(c.id)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "6px 12px",
                  background: "var(--bg)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Copy link
              </button>
              {confirmDeleteId === c.id ? (
                <>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 0" }}
                  >Delete</button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 0" }}
                  >Cancel</button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(c.id)}
                  style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 0" }}
                >Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
