"use client";
import { useEffect, useState } from "react";
import type { SavedCampaign } from "@/lib/types";
import { SkeletonTile } from "@/components/campaign/Loaders";

export default function CampaignLibraryView({
  onOpen,
}: {
  onOpen: (campaign: SavedCampaign) => void;
}) {
  const [campaigns, setCampaigns] = useState<SavedCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/campaign/library")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCampaigns(data);
        else setError(data.error ?? "Failed to load campaigns");
      })
      .catch(() => setError("Failed to load campaigns"));
  }

  useEffect(load, []);

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/campaign/${id}`, { method: "DELETE" });
    setCampaigns((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
        Campaign library
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13, marginBottom: 28 }}>
        Saved email campaigns. Open one to keep editing.
      </p>

      {error && <div style={{ fontSize: 13, color: "var(--error)" }}>{error}</div>}
      {!campaigns && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--surface)" }}>
              <SkeletonTile aspect="4/3" />
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 12, borderRadius: 3, background: "var(--surface-h)" }} />
                <div style={{ height: 12, width: "60%", borderRadius: 3, background: "var(--surface-h)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {campaigns && campaigns.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>No campaigns yet — build one in the Campaign builder.</div>
      )}

      {campaigns && campaigns.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {campaigns.map((c) => {
            const hero = c.content.images.find((i) => i.role === "hero");
            const subject = c.content.subjectLines[c.content.selectedSubject] ?? c.content.subjectLines[0] ?? c.topic;
            return (
              <div
                key={c.id}
                onClick={() => onOpen(c)}
                style={{
                  border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden",
                  cursor: "pointer", background: "var(--surface)",
                }}
              >
                <div style={{ aspectRatio: "4/3", background: "#01253f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {hero?.url
                    ? <img src={hero.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>No hero image</span>}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {subject}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--subtle)" }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => remove(c.id, e)}
                      style={{ background: "transparent", border: "none", fontSize: 12, color: "var(--subtle)", cursor: "pointer", fontFamily: "inherit" }}
                    >Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
