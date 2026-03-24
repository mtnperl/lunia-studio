"use client";
import { useState } from "react";
import { AdCTA } from "@/lib/types";

const ANGLES = ["Discount", "Urgency", "Social Proof", "Education", "Story"];
const EMOTIONS = ["Confident", "Calm", "Playful", "Aspirational"];
const CTA_OPTIONS: AdCTA[] = ["Shop Now", "Learn More", "Get Offer"];

const HEADLINE_LIMIT = 27;
const PRIMARY_LIMIT = 125;

interface AdResult {
  headline: string;
  primaryText: string;
  cta: AdCTA;
  imageUrl: string | null;
  complianceNote: string;
}

function CharCounter({ value, limit }: { value: string; limit: number }) {
  const count = value.length;
  const over = count > limit;
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      color: over ? "#dc2626" : "var(--muted)",
      marginLeft: 6,
    }}>
      {count}/{limit}
    </span>
  );
}

function PhoneMockup({ result }: { result: AdResult }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginTop: 20,
    }}>
      <div style={{
        width: 260,
        borderRadius: 28,
        border: "3px solid var(--border)",
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        position: "relative",
      }}>
        {/* Phone notch */}
        <div style={{
          background: "var(--border)",
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ width: 60, height: 10, borderRadius: 5, background: "rgba(0,0,0,0.15)" }} />
        </div>
        {/* Meta-style feed preview */}
        <div style={{ background: "#fff", padding: "10px 0 0" }}>
          {/* Fake account header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px 8px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #1e7a8a, #0d4f5c)" }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#000" }}>Lunia Life</div>
              <div style={{ fontSize: 10, color: "#888" }}>Sponsored</div>
            </div>
          </div>
          {/* Ad image */}
          {result.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.imageUrl}
              alt="Ad preview"
              style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%",
              aspectRatio: "1/1",
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Image unavailable</span>
            </div>
          )}
          {/* Ad copy */}
          <div style={{ padding: "10px 10px 6px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#000", marginBottom: 2, lineHeight: 1.3 }}>
              {result.headline || "Headline"}
            </div>
            <div style={{ fontSize: 10, color: "#333", lineHeight: 1.4, marginBottom: 8 }}>
              {result.primaryText || "Primary text goes here."}
            </div>
            {/* CTA button */}
            <div style={{
              background: "#1e7a8a",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "5px 10px",
              borderRadius: 4,
              textAlign: "center",
              width: "100%",
            }}>
              {result.cta}
            </div>
          </div>
        </div>
        {/* Home indicator */}
        <div style={{ height: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.2)" }} />
        </div>
      </div>
    </div>
  );
}

export default function AdsView() {
  const [competitorCopy, setCompetitorCopy] = useState("");
  const [angle, setAngle] = useState("");
  const [emotion, setEmotion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [regenCopyLoading, setRegenCopyLoading] = useState(false);
  const [result, setResult] = useState<AdResult | null>(null);
  // Editable output fields
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState<AdCTA>("Shop Now");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [adTab, setAdTab] = useState<"generate" | "library">("generate");

  function applyResult(r: AdResult, keepImage?: boolean) {
    setResult((prev) => keepImage && prev ? { ...prev, headline: r.headline, primaryText: r.primaryText, cta: r.cta, complianceNote: r.complianceNote } : r);
    setHeadline(r.headline);
    setPrimaryText(r.primaryText);
    setCta(r.cta);
    setSavedId(null);
    setSaveFailed(false);
  }

  async function handleGenerate() {
    if (!competitorCopy.trim() || generating) return;
    setGenerating(true);
    setSavedId(null);
    setSaveFailed(false);
    try {
      const res = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorCopy, angle, emotion }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      applyResult(data);
    } catch (err) {
      console.error("[AdsView] generate error", err);
      alert("Generation failed — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenCopy() {
    if (!competitorCopy.trim() || regenCopyLoading) return;
    setRegenCopyLoading(true);
    setSavedId(null);
    try {
      const res = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorCopy, angle, emotion, skipImage: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Keep existing image, update copy only
      setHeadline(data.headline);
      setPrimaryText(data.primaryText);
      setCta(data.cta);
      setResult((prev) => prev ? { ...prev, headline: data.headline, primaryText: data.primaryText, cta: data.cta, complianceNote: data.complianceNote } : prev);
    } catch (err) {
      console.error("[AdsView] regen-copy error", err);
      alert("Copy regeneration failed — please try again.");
    } finally {
      setRegenCopyLoading(false);
    }
  }

  async function handleSave() {
    if (!result?.imageUrl || saving) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      const res = await fetch("/api/ads/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorCopy,
          angle,
          emotion,
          headline,
          primaryText,
          cta,
          imageUrl: result.imageUrl,
          complianceNote: result.complianceNote,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSavedId(data.id);
    } catch (err) {
      console.error("[AdsView] save error", err);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(`${headline}\n${primaryText}\nCTA: ${cta}`);
  }

  const canGenerate = competitorCopy.trim().length > 0 && !generating;
  const canSave = !!(result?.imageUrl) && !saving && !savedId;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 80px" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>Ads</p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, marginBottom: 16 }}>
          Paste a competitor ad and get a Lunia-branded version in under a minute.
        </p>
        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, width: "fit-content" }}>
          {([{ key: "generate", label: "Generate" }, { key: "library", label: "Library" }] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setAdTab(t.key)}
              style={{
                fontSize: 13, fontWeight: 500, padding: "5px 14px",
                background: adTab === t.key ? "var(--bg)" : "transparent",
                color: adTab === t.key ? "var(--text)" : "var(--muted)",
                border: adTab === t.key ? "1px solid var(--border)" : "1px solid transparent",
                borderRadius: 6, cursor: "pointer",
                boxShadow: adTab === t.key ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                fontFamily: "inherit", transition: "all .15s",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {adTab === "library" && <AdsLibraryInline />}

      {adTab === "generate" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: result ? "1fr 1fr" : "1fr",
          gap: 32,
          alignItems: "start",
        }}>
          {/* Left — Input Panel */}
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
                Competitor ad copy
              </label>
              <textarea
                value={competitorCopy}
                onChange={(e) => setCompetitorCopy(e.target.value.slice(0, 2000))}
                placeholder="Paste a competitor ad here — headline and body copy..."
                rows={6}
                style={{
                  width: "100%",
                  resize: "vertical",
                  fontSize: 14,
                  lineHeight: 1.5,
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", marginTop: 3 }}>
                {competitorCopy.length}/2000
              </div>
            </div>

            {/* Angle */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
                Angle
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                {ANGLES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAngle(angle === a ? "" : a)}
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "4px 10px",
                      background: angle === a ? "#1e7a8a" : "var(--surface)",
                      color: angle === a ? "#fff" : "var(--muted)",
                      border: `1px solid ${angle === a ? "#1e7a8a" : "var(--border)"}`,
                      borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                      transition: "all .12s",
                    }}
                  >{a}</button>
                ))}
              </div>
              <input
                type="text"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="Or type a custom angle..."
                style={{
                  width: "100%",
                  fontSize: 13,
                  padding: "7px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Emotion */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
                Emotion
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EMOTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmotion(emotion === e ? "" : e)}
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "4px 10px",
                      background: emotion === e ? "#1e7a8a" : "var(--surface)",
                      color: emotion === e ? "#fff" : "var(--muted)",
                      border: `1px solid ${emotion === e ? "#1e7a8a" : "var(--border)"}`,
                      borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                      transition: "all .12s",
                    }}
                  >{e}</button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 14,
                fontWeight: 700,
                background: canGenerate ? "#1e7a8a" : "var(--surface)",
                color: canGenerate ? "#fff" : "var(--muted)",
                border: `1px solid ${canGenerate ? "#1e7a8a" : "var(--border)"}`,
                borderRadius: 8,
                cursor: canGenerate ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "all .12s",
              }}
            >
              {generating ? "Generating... (~30-40s)" : "Generate Ad"}
            </button>
            {generating && (
              <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
                Claude is rewriting your ad, then generating an image...
              </p>
            )}
          </div>

          {/* Right — Output Panel */}
          {result && (
            <div>
              {/* Compliance badge */}
              {result.complianceNote ? (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  background: "#fefce8", border: "1px solid #fde047",
                  borderRadius: 8, padding: "10px 12px", marginBottom: 14,
                }}>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#854d0e" }}>Review flagged</div>
                    <div style={{ fontSize: 12, color: "#713f12", marginTop: 2 }}>{result.complianceNote}</div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#f0fdf4", border: "1px solid #86efac",
                  borderRadius: 8, padding: "8px 12px", marginBottom: 14,
                }}>
                  <span style={{ fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>Compliance clean</span>
                </div>
              )}

              {/* Editable fields */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Headline
                  </label>
                  <CharCounter value={headline} limit={HEADLINE_LIMIT} />
                </div>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "8px 10px",
                    border: `1px solid ${headline.length > HEADLINE_LIMIT ? "#dc2626" : "var(--border)"}`,
                    borderRadius: 6,
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Primary Text
                  </label>
                  <CharCounter value={primaryText} limit={PRIMARY_LIMIT} />
                </div>
                <textarea
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: "8px 10px",
                    border: `1px solid ${primaryText.length > PRIMARY_LIMIT ? "#dc2626" : "var(--border)"}`,
                    borderRadius: 6,
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                  CTA
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {CTA_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCta(c)}
                      style={{
                        fontSize: 12, fontWeight: 500, padding: "5px 12px",
                        background: cta === c ? "#1e7a8a" : "var(--surface)",
                        color: cta === c ? "#fff" : "var(--muted)",
                        border: `1px solid ${cta === c ? "#1e7a8a" : "var(--border)"}`,
                        borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        transition: "all .12s",
                      }}
                    >{c}</button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <button
                  onClick={handleCopyAll}
                  style={{
                    fontSize: 13, fontWeight: 600,
                    padding: "7px 14px",
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  }}
                >Copy All</button>

                <button
                  onClick={handleRegenCopy}
                  disabled={regenCopyLoading || generating}
                  style={{
                    fontSize: 13, fontWeight: 600,
                    padding: "7px 14px",
                    background: "var(--surface)",
                    color: regenCopyLoading ? "var(--muted)" : "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    cursor: regenCopyLoading || generating ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >{regenCopyLoading ? "Rewriting..." : "↺ Regen copy"}</button>

                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  style={{
                    fontSize: 13, fontWeight: 700,
                    padding: "7px 18px",
                    background: savedId ? "#f0fdf4" : canSave ? "#1e7a8a" : "var(--surface)",
                    color: savedId ? "#166534" : canSave ? "#fff" : "var(--muted)",
                    border: `1px solid ${savedId ? "#86efac" : canSave ? "#1e7a8a" : "var(--border)"}`,
                    borderRadius: 6,
                    cursor: canSave ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                    transition: "all .12s",
                  }}
                >
                  {savedId ? "Saved ✓" : saving ? "Saving..." : !result?.imageUrl ? "Image required to save" : "Save to Library"}
                </button>
              </div>
              {saveFailed && (
                <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>Save failed — please try again.</p>
              )}

              {/* Phone mockup */}
              <PhoneMockup result={{ ...result, headline, primaryText, cta }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline library — rendered within AdsView when library tab is active
function AdsLibraryInline() {
  const [ads, setAds] = useState<import("@/lib/types").SavedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useState(() => {
    fetch("/api/ads/library")
      .then((r) => r.json())
      .then((d) => { setAds(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  });

  async function handleDelete(id: string) {
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    setAds((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
  }

  if (loading) return <div style={{ fontSize: 14, color: "var(--muted)", padding: "40px 0" }}>Loading library...</div>;

  if (ads.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No saved ads</div>
        <div style={{ fontSize: 13 }}>Generate one and hit &quot;Save to Library&quot; in the generate tab.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        {ads.length} saved {ads.length === 1 ? "ad" : "ads"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {ads.map((ad) => (
          <div
            key={ad.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            {/* Thumbnail */}
            {ad.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.imageUrl}
                alt={ad.headline}
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", aspectRatio: "1/1", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>No image</span>
              </div>
            )}
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{ad.headline}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                {new Date(ad.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {confirmDeleteId === ad.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(ad.id)}
                      style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >Delete</button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >Cancel</button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(ad.id)}
                    style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                  >Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
