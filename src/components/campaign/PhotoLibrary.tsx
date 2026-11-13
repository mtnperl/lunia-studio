"use client";
/* eslint-disable @next/next/no-img-element -- Private asset URLs use the existing browser/proxy pipeline, not the Next image optimizer. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { AssetMetadata } from "@/lib/types";
import { assetHasText, emailEligible, formatLabel, groupAssetFamilies, needsTextReview, rankEmailAssets } from "@/lib/asset-selection";
import { prepareManualPhoto } from "@/lib/manual-photo-pick";
import { useAssets, refreshAssets, mergeAssetDetails } from "./useAssets";

type Props = { currentUrl?: string; selectedId?: string; copy?: string; exclude?: string[]; onPick?: (asset: AssetMetadata) => void; onClose?: () => void };
type View = "recommended" | "preferred" | "all";
const button: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", color: "var(--text)", padding: "6px 9px", font: "inherit", cursor: "pointer" };
const muted: React.CSSProperties = { fontSize: 11, color: "var(--muted)", lineHeight: 1.5 };

function reviewLabel(asset: AssetMetadata) {
  if (asset.textReview?.status === "typo") return "Typo found";
  if (asset.textReview?.status === "uncertain") return "Text needs review";
  if (asset.textReview?.status === "passed") return assetHasText(asset) ? "Text checked" : "No text · checked";
  return needsTextReview(asset) ? "Text not checked" : "";
}

/** A photo is the choice; size and caption are versions of that choice. */
export default function PhotoLibrary({ currentUrl, selectedId, copy = "", exclude, onPick, onClose }: Props) {
  const assets = useAssets();
  const [view, setView] = useState<View>("recommended");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("any");
  const [shape, setShape] = useState("any");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string | undefined>(selectedId);
  const [limit, setLimit] = useState(12);
  const [busy, setBusy] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [message, setMessage] = useState("");
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState<string[]>([]);
  const pickSequence = useRef(0);
  const [picking, setPicking] = useState(false);
  const checking = useRef(false);
  const mounted = useRef(true);
  const stopCheck = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const chosen = assets?.find((a) => a.id === selected) ?? assets?.find((a) => a.id === selectedId || a.url === currentUrl);
  const allFamilies = useMemo(() => groupAssetFamilies(assets ?? []), [assets]);
  const family = allFamilies.find((f) => f.assets.some((a) => a.id === chosen?.id));
  const ranked = useMemo(() => {
    const pool = (assets ?? []).filter((a) => !["logo", "carousel-style"].includes(a.assetType));
    const ordered = view === "all" ? pool : rankEmailAssets(pool, copy, true);
    return new Map(ordered.map((asset, index) => [asset.id, index]));
  }, [assets, view, copy]);
  const families = useMemo(() => {
    const skip = new Set(exclude ?? []);
    if (currentUrl) skip.delete(currentUrl);
    const excludedKeys = new Set(allFamilies.filter((f) => f.assets.some((a) => skip.has(a.url))).map((f) => f.key));
    const order = ranked;
    const q = query.trim().toLowerCase();
    function matches(a: AssetMetadata) {
      if (view === "preferred" && a.assetType !== "gen-z" && a.preference !== "preferred") return false;
      if (category !== "all" && a.assetType !== category) return false;
      if (q && !`${a.name} ${a.textReview?.sceneDescription || a.description || ""} ${a.textReview?.text ?? ""}`.toLowerCase().includes(q)) return false;
      if (text !== "any" && assetHasText(a) !== (text === "caption")) return false;
      if (shape !== "any" && (!a.width || !a.height || (shape === "square" ? Math.abs(a.width / a.height - 1) >= .03 : shape === "portrait" ? a.width >= a.height : a.width <= a.height))) return false;
      return true;
    }
    return allFamilies.filter((f) => view === "all" || !excludedKeys.has(f.key))
      .flatMap((f) => {
        const representative = f.assets.filter((a) => order.has(a.id) && matches(a))
          .sort((a, b) => order.get(a.id)! - order.get(b.id)!)[0];
        return representative ? [{ ...f, representative }] : [];
      }).sort((a, b) => order.get(a.representative.id)! - order.get(b.representative.id)!);
  }, [ranked, allFamilies, currentUrl, exclude, view, query, category, text, shape]);

  async function request(path: string, body: unknown, method = "POST") {
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => { throw new Error(`Image service unavailable (${res.status}). Please retry.`); });
    if (!res.ok) throw new Error(data.error ?? "Could not save this change.");
    return data;
  }

  async function checkImages(ids: string[], force = false) {
    const data = await request("/api/assets/review", { ids, force });
    mergeAssetDetails(data.results ?? []);
    if (data.failures?.length) throw new Error("Some images could not be checked. Retry before using them.");
    return data.results as { id: string; textReview: NonNullable<AssetMetadata["textReview"]> }[];
  }

  async function choose(asset: AssetMetadata) {
    if (busy) return;
    setSelected(asset.id);
    setMessage("");
    const sequence = ++pickSequence.current;
    if (!onPick) return;
    setPicking(true);
    if (!asset.textReview && assetHasText(asset)) setMessage("Checking caption before replacing the email image…");
    try {
      const ready = await prepareManualPhoto(asset, async (id) => {
        const results = await checkImages([id]);
        if (!results[0]?.textReview) throw new Error("Caption check unavailable. Try a clean version or retry.");
        return results[0].textReview;
      });
      if (sequence !== pickSequence.current || !mounted.current) return;
      onPick(ready);
      setMessage("Email image replaced. Use Undo in the editor to go back.");
    } catch (error) {
      if (sequence === pickSequence.current && mounted.current) setMessage(error instanceof Error ? error.message : "Could not replace image.");
    } finally {
      if (sequence === pickSequence.current && mounted.current) setPicking(false);
    }
  }

  async function curate(preference: NonNullable<AssetMetadata["preference"]>) {
    if (!chosen || busy) return;
    setBusy(true); setMessage("");
    try { await request(`/api/assets/${encodeURIComponent(chosen.id)}`, { preference, applyToFamily: true }, "PATCH"); await refreshAssets(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update image."); }
    finally { setBusy(false); }
  }

  async function checkGenZ() {
    if (checking.current || busy) return;
    checking.current = true; stopCheck.current = false; setBusy(true); setAuditing(true);
    const pending = (assets ?? []).filter((a) => a.assetType === "gen-z" && !a.textReview && a.preference !== "archived");
    let done = 0; let typos = 0; let uncertain = 0;
    try {
      for (let i = 0; i < pending.length; i += 6) {
        if (!mounted.current || stopCheck.current) break;
        setMessage(`Checking Gen Z text: ${done} of ${pending.length}…`);
        const results = await checkImages(pending.slice(i, i + 6).map((a) => a.id));
        done += results.length;
        typos += results.filter((r) => r.textReview.status === "typo").length;
        uncertain += results.filter((r) => r.textReview.status === "uncertain").length;
      }
      setMessage(pending.length ? `Checked ${done} of ${pending.length} images. ${typos} with typos; ${uncertain} need a closer look. These stay out of recommendations.${done < pending.length ? " Run the check again to resume." : ""}` : "All Gen Z images have been checked. Select an image to see its result.");
    } catch (error) { setMessage(`Checked ${done} of ${pending.length}. ${error instanceof Error ? error.message : "Check failed."} Completed results are saved.`); }
    finally { setBusy(false); setAuditing(false); checking.current = false; }
  }

  async function group() {
    setBusy(true); setMessage("");
    try {
      await request("/api/assets/families", { ids: linked });
      await refreshAssets(); setLinking(false); setLinked([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not link versions."); }
    finally { setBusy(false); }
  }

  async function split() {
    if (!chosen) return;
    setBusy(true); setMessage("");
    try { await request(`/api/assets/${encodeURIComponent(chosen.id)}`, { familyId: chosen.id }, "PATCH"); await refreshAssets(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not separate version."); }
    finally { setBusy(false); }
  }

  const filterStyle: React.CSSProperties = { ...button, minWidth: 0, flex: "1 1 100px", maxWidth: "100%" };
  return <section aria-label="Photo library" style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)", padding: 10, fontSize: 12, display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <strong style={{ flex: 1 }}>{onPick ? "Choose a photo" : "Curate photos"}</strong>
      <span style={muted}>Gen Z first. Versions together.</span>
      {onClose && <button type="button" style={button} onClick={onClose} aria-label="Close photo library">Close</button>}
    </div>
    {!assets && <p role="status" style={muted}>Loading photos…</p>}
    {assets?.length === 0 && <p style={muted}>No photos yet. Upload images in Assets.</p>}
    {message && <p role="status" aria-live="polite" style={{ ...muted, margin: 0, position: "sticky", top: 0, zIndex: 2, background: "var(--surface)", padding: 8, borderRadius: 6 }}>{message}</p>}
    {!!assets?.length && <>
      <div role="group" aria-label="Browse photos" style={{ display: "flex", gap: 4 }}>
        {(["recommended", "preferred", "all"] as const).map((tab) => <button key={tab} type="button" aria-pressed={view === tab} style={{ ...button, flex: 1, background: view === tab ? "var(--accent-dim)" : "var(--surface)" }} onClick={() => { setView(tab); setLimit(12); }}>{tab === "all" ? "All photos" : tab === "preferred" ? "Preferred" : "Recommended"}</button>)}
      </div>
      <input type="search" aria-label="Search photos" placeholder="Search photos or words in the image" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(12); }} style={{ ...button, width: "100%", boxSizing: "border-box", cursor: "text" }} />
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <select aria-label="Photo category" value={category} onChange={(e) => { setCategory(e.target.value); setLimit(12); }} style={filterStyle}>
          <option value="all">All styles</option><option value="gen-z">Gen Z</option><option value="lifestyle">Lifestyle</option><option value="product-image">Product</option><option value="email-generated">From emails</option><option value="carousel-generated">From carousels</option><option value="other">Other</option>
        </select>
        <select aria-label="Image text" value={text} onChange={(e) => { setText(e.target.value); setLimit(12); }} style={filterStyle}><option value="any">With or without text</option><option value="clean">Clean photo</option><option value="caption">With caption</option></select>
        <select aria-label="Image format" value={shape} onChange={(e) => { setShape(e.target.value); setLimit(12); }} style={filterStyle}><option value="any">All formats</option><option value="square">Square</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select>
      </div>
      {chosen && <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 7 }}>
        <img src={chosen.url} alt={chosen.description || chosen.name} style={{ display: "block", width: "100%", maxHeight: 240, objectFit: "contain", background: "var(--surface)", borderRadius: 5 }} />
        <strong style={{ overflowWrap: "anywhere" }}>{chosen.name}</strong>
        <div style={muted}>{formatLabel(chosen)} · {reviewLabel(chosen) || "Text not checked"}{chosen.preference === "archived" ? " · Archived" : ""}</div>
        {!!chosen.textReview?.issues.length && <div role="note" style={{ ...muted, color: "var(--error)" }}>{chosen.textReview.issues.join(" ")}</div>}
        {chosen.textReview?.text && <details style={muted}><summary>Read image text</summary><p style={{ whiteSpace: "pre-wrap" }}>{chosen.textReview.text}</p></details>}
        {family && family.assets.length > 1 && <>
          <span style={muted}>Same photo · {family.assets.length} versions{family.inferred ? " · matched by filename" : ""}</span>
          <div role="group" aria-label="Versions of selected photo" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 5 }}>
            {family.assets.map((variant) => <button key={variant.id} type="button" disabled={busy} style={{ ...button, textAlign: "left", borderColor: chosen.id === variant.id ? "var(--accent)" : "var(--border)", opacity: variant.textReview?.status === "typo" ? .55 : 1 }} aria-pressed={chosen.id === variant.id} onClick={() => void choose(variant)}>
              <img src={variant.url} alt="" loading="lazy" style={{ width: "100%", height: 65, objectFit: "contain" }} />
              <span style={{ display: "block", ...muted }}>{formatLabel(variant)}<br />{assetHasText(variant) ? "With caption" : "Clean"} · {reviewLabel(variant)}</span>
            </button>)}
          </div>
          <button type="button" disabled={busy} style={button} onClick={split}>This is a different photo</button>
        </>}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>

          <button type="button" disabled={busy} aria-pressed={chosen.preference === "preferred"} style={button} onClick={() => curate(chosen.preference === "preferred" ? "available" : "preferred")}>{chosen.preference === "preferred" ? "Preferred" : "Prefer"}</button>
          <button type="button" disabled={busy} style={button} onClick={() => curate(chosen.preference === "archived" ? "available" : "archived")}>{chosen.preference === "archived" ? "Restore" : "Don't recommend"}</button>
          <button type="button" disabled={busy} style={button} onClick={async () => { setBusy(true); setMessage(""); try { await checkImages([chosen.id], true); setMessage("Image checked. See the result above."); } catch (error) { setMessage(error instanceof Error ? error.message : "Check failed."); } finally { setBusy(false); } }}>Recheck text</button>
        </div>
      </div>}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ ...muted, flex: 1 }}>{families.length} distinct photos</span>
        <button type="button" disabled={busy} onClick={checkGenZ} style={button}>Check Gen Z text</button>
        {auditing && <button type="button" style={button} onClick={() => { stopCheck.current = true; setMessage("Stopping after the current batch. Completed checks are saved."); }}>Stop check</button>}
        {!onPick && <button type="button" disabled={busy} onClick={() => { setLinking(!linking); setLinked([]); }} style={button}>{linking ? "Cancel grouping" : "Link versions"}</button>}
      </div>
      {linking && <div style={muted}>Select cards that are versions of the same photograph. <button type="button" disabled={busy || linked.length < 2 || linked.length > 50} style={button} onClick={group}>Link {linked.length} versions</button></div>}
      <div role="group" aria-label="Photo contact sheet" onKeyDown={(event) => {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[event.key];
        if (index >= 0 && step !== undefined) {
          event.preventDefault();
          buttons[Math.max(0, Math.min(buttons.length - 1, index + step))]?.focus();
        }
      }} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7, maxHeight: 420, overflowY: "auto" }}>
        {families.slice(0, limit).map((f) => {
          const a = f.representative;
          const active = f.assets.some((v) => v.id === chosen?.id);
          const picked = f.assets.every((v) => linked.includes(v.id));
          return <button key={f.key} type="button" aria-pressed={linking ? picked : active} disabled={busy} onClick={() => {
            if (linking) setLinked((ids) => picked ? ids.filter((id) => !f.assets.some((v) => v.id === id)) : [...new Set([...ids, ...f.assets.map((v) => v.id)])]);
            else void choose(a);
          }} style={{ ...button, padding: 3, minWidth: 0, textAlign: "left", border: `2px solid ${(linking ? picked : active) ? "var(--accent)" : "var(--border)"}` }} title={a.description || a.name}>
            <img src={a.url} alt={a.description || a.name} loading="lazy" style={{ width: "100%", aspectRatio: "4/5", objectFit: "contain", display: "block", background: "var(--surface)", borderRadius: 4 }} />
            <span style={{ display: "block", fontSize: 10, padding: "4px 2px", overflowWrap: "anywhere" }}>{a.assetType === "gen-z" ? "Gen Z · Priority" : a.preference === "preferred" ? "Preferred" : a.assetType} {f.assets.length > 1 ? `· ${f.assets.length} versions` : ""}</span>
            <span style={{ display: "block", ...muted, fontSize: 9 }}>{reviewLabel(a)}{!emailEligible(a, true) ? " · Not recommended" : ""}</span>
          </button>;
        })}
      </div>
      {!families.length && <p style={muted}>No photos match. Try All photos or clear a filter.</p>}
      {families.length > limit && <button type="button" style={button} onClick={() => setLimit((n) => n + 12)}>Show 12 more photos</button>}
      <p style={{ ...muted, margin: 0 }}>{onPick ? "Click a photo or version to replace the email image. Captions are checked on selection. Use Undo in the editor to go back. Group photos in Assets." : "Select a photo to inspect its text, set preferences or link its versions. Archived photos remain available under All photos."}</p>
    </>}
    {picking && <span style={muted}>Selecting image… You can choose another photo.</span>}
  </section>;
}
