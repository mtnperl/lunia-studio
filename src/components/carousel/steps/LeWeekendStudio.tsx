"use client";

// The studio for "Le week-end". The topic comes from the brief; here the
// column, cover, date and folio are set, the copy is written through the
// shared /generate route, the photo prompt is approved before any credits
// are spent, and the slides export as 1080x1350 JPGs through the shared
// compositor. The copy lint blocks export and names the string; word limits
// and measured overflow warn, and type is never shrunk to fit.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LeWeekendSlide } from "@/components/carousel/slides/LeWeekendSlides";
import type { LwPlan } from "@/lib/le-weekend-generate";
import { useCarouselApi } from "@/components/carousel/api-context";
import { compositeSlideWithImages } from "@/lib/slide-export";
import { saveFiles } from "@/lib/save-files";
import { readJsonResponse } from "@/lib/fetch-json";
import {
  LW_COLUMNS, LW_COLUMN_LABEL, LW_COVERS, LW_DEMO_POSTS, coversForColumn, exportFilename, frenchDate,
  lintLeWeekend, nextWeekendDate, photoToneFor, topLuminance,
  type LwColumn, type LwCover, type LwPost, type LwSlide,
} from "@/lib/le-weekend";

const PREVIEW_SCALE = 0.36;
const MEMORY_KEY = "lunia:leweekend:last";
const GRID_KEY = "lunia:leweekend:grid";

type Memory = { nextFolio: number; lastCover: LwCover; lastNonPhoto?: "ivory" | "navy" };
function readMemory(): Memory | null {
  try { const m = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? "null"); return m && typeof m.nextFolio === "number" ? m : null; } catch { return null; }
}
function writeMemory(post: LwPost) {
  try {
    const prev = readMemory();
    const m: Memory = {
      nextFolio: Math.max(prev?.nextFolio ?? 1, post.folio + post.slides.length),
      lastCover: post.cover,
      lastNonPhoto: post.cover === "photo" ? prev?.lastNonPhoto : post.cover,
    };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(m));
  } catch { /* private window: the planner falls back to its defaults */ }
}

type Props = {
  topic: string;
  initialPost?: LwPost | null;
  initialSavedId?: string | null;
  onChange?: (post: LwPost | null) => void;
  onSaved?: (id: string) => void;
};

export default function LeWeekendStudio({ topic, initialPost, initialSavedId, onChange, onSaved }: Props) {
  const apiBase = useCarouselApi();
  const [post, setPostState] = useState<LwPost | null>(initialPost ?? null);
  const setPost = (p: LwPost | null) => { setPostState(p); onChange?.(p); };
  // Everything starts on auto: the server reads the Instagram grid for the
  // cover and picks the column and slide count for the topic; date and folio
  // come from memory. Anything set by hand is kept.
  const [column, setColumn] = useState<LwColumn | "auto">(initialPost?.column ?? "auto");
  const [cover, setCover] = useState<LwCover | "auto">(initialPost?.cover ?? "auto");
  const [dateFr, setDateFr] = useState(initialPost?.dateFr ?? frenchDate(nextWeekendDate()));
  const [folio, setFolio] = useState(initialPost?.folio ?? 1);
  const [slideCount, setSlideCount] = useState<number | "auto">(initialPost?.slides.length ?? "auto");
  useEffect(() => {
    const m = readMemory();
    if (!initialPost && m) setFolio(m.nextFolio);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [busy, setBusy] = useState<null | "copy" | "image" | "export" | "save">(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(initialSavedId ?? null);
  useEffect(() => { if (initialSavedId) setSavedId(initialSavedId); }, [initialSavedId]);
  const [copied, setCopied] = useState(false);

  // Courrier is the navy page and nothing else is.
  useEffect(() => {
    if (column === "auto" || cover === "auto") return;
    const allowed = coversForColumn(column);
    if (!allowed.includes(cover)) setCover(allowed[0]);
  }, [column]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── The grid ──────────────────────────────────────────────────────────────
  // The live grid when the Meta token can read Instagram; otherwise the last
  // screenshot pasted here, kept in this browser until a new one replaces it.
  const [ig, setIg] = useState<{ username?: string; thumbs?: string[]; error?: string } | null>(null);
  const [pastedGrid, setPastedGrid] = useState<string | null>(null);
  const [plan, setPlan] = useState<LwPlan | null>(null);
  useEffect(() => {
    try { setPastedGrid(localStorage.getItem(GRID_KEY)); } catch { /* private window */ }
    fetch(`${apiBase}/le-weekend-grid`).then((r) => r.json()).then(setIg).catch(() => setIg({ error: "Could not reach the grid route" }));
  }, [apiBase]);
  async function takeGridScreenshot(file: File) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error("Could not read that screenshot")); i.src = url; });
      const w = Math.min(720, img.naturalWidth), h = Math.round(img.naturalHeight * (w / img.naturalWidth));
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      cv.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const data = cv.toDataURL("image/jpeg", 0.8);
      setPastedGrid(data);
      try { localStorage.setItem(GRID_KEY, data); } catch { /* too big or private: kept for this visit only */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that screenshot");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  useEffect(() => {
    if (ig?.thumbs?.length) return;
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); takeGridScreenshot(f); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ig]);

  // ── Generation ────────────────────────────────────────────────────────────
  // One click: plan the post against the grid, write it, and, for a photo
  // cover, generate the photograph straight after.
  async function generate() {
    setError(null);
    setBusy("copy");
    let written: LwPost | null = null;
    try {
      const res = await fetch(`${apiBase}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "le_week_end", topic, column, cover, dateFr, folio, slideCount, gridImage: ig?.thumbs?.length ? undefined : pastedGrid ?? undefined }),
      });
      const data = await readJsonResponse<{ post?: LwPost; plan?: LwPlan; error?: string }>(res, "generation");
      if (!res.ok || !data.post) throw new Error(data.error ?? "Generation failed");
      written = data.post;
      setPlan(data.plan ?? null);
      setPost(data.post);
      setSavedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(null);
    }
    if (written?.cover === "photo" && written.imagePrompt?.trim()) await generateImage(written);
  }

  function loadDemo(i: number) {
    const d = LW_DEMO_POSTS[i];
    setDateFr(d.dateFr); setFolio(d.folio);
    setPlan(null);
    setPost(structuredClone(d));
    setSavedId(null);
  }

  // ── The photograph ────────────────────────────────────────────────────────
  const proxied = (url?: string) => !url ? undefined : url.startsWith("data:") || url.startsWith("/") ? url : `${apiBase}/image-proxy?url=${encodeURIComponent(url)}`;
  const imageSrc = proxied(post?.imageUrl);

  // Ivory or navy type, read off the top 40% of the photo whenever it changes.
  useEffect(() => {
    if (!post || !imageSrc) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      const w = 54, h = 68;
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      // Cover-crop to 4:5, as the slide does.
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = w / scale, sh = h / scale;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
      try {
        const tone = photoToneFor(topLuminance(ctx.getImageData(0, 0, w, h).data, w, h));
        const footRows = Math.round(h * 0.15);
        const foot = photoToneFor(topLuminance(ctx.getImageData(0, h - footRows, w, footRows).data, w, footRows, 1));
        setPostState((p) => (p && (p.photoTone !== tone || p.photoFootTone !== foot) ? { ...p, photoTone: tone, photoFootTone: foot } : p));
      } catch (err) { console.warn("[le-weekend] could not read the photo", err); }
    };
    img.src = imageSrc;
    return () => { alive = false; };
  }, [imageSrc]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateImage(target: LwPost | null = post) {
    const post = target;
    if (!post?.imagePrompt?.trim()) return;
    setError(null);
    setBusy("image");
    try {
      const res = await fetch(`${apiBase}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A verbatim prompt, the 4:5 frame, and a mood that never attaches
        // the bottle or the logo as references.
        body: JSON.stringify({ slideIndex: 0, topic: post.topic, customPrompt: post.imagePrompt, imageAspect: "4:5", imageStyle: "realistic", moodId: "organic-natural" }),
      });
      const data = await readJsonResponse<{ url?: string; error?: string }>(res, "image");
      if (!res.ok || !data.url) throw new Error(data.error ?? "Image generation failed");
      setPost({ ...post, imageUrl: data.url, photoTone: undefined, photoFootTone: undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setBusy(null);
    }
  }

  /** An upload is cropped to 1080x1350 here, so the draft and the save stay small. */
  async function uploadImage(file: File) {
    if (!post) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error("Could not read that image")); i.src = url; });
      const cv = document.createElement("canvas");
      cv.width = 1080; cv.height = 1350;
      const scale = Math.max(1080 / img.naturalWidth, 1350 / img.naturalHeight);
      const sw = 1080 / scale, sh = 1350 / scale;
      cv.getContext("2d")!.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, 1080, 1350);
      setPost({ ...post, imageUrl: cv.toDataURL("image/jpeg", 0.9), photoTone: undefined, photoFootTone: undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ── Checks ────────────────────────────────────────────────────────────────
  const lint = useMemo(() => (post ? lintLeWeekend(post) : { copy: [], words: [] }), [post]);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [overflow, setOverflow] = useState<string[]>([]);
  const signature = JSON.stringify(post);
  useEffect(() => {
    if (!post) { setOverflow([]); return; }
    let alive = true;
    (async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!alive) return;
      const out: string[] = [];
      exportRefs.current.slice(0, post.slides.length).forEach((node, i) => {
        node?.querySelectorAll<HTMLElement>("[data-lw-fit]").forEach((el) => {
          const v = el.scrollHeight - el.clientHeight, h = el.scrollWidth - el.clientWidth;
          if (v > 1) out.push(`Slide ${i + 1}: text runs ${v}px past the page. Cut words; the type will not shrink.`);
          else if (h > 1) out.push(`Slide ${i + 1}: the ${el.dataset.lwFit} is ${h}px too wide for the page.`);
        });
      });
      setOverflow(out);
    })();
    return () => { alive = false; };
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const missingPhoto = post?.cover === "photo" && !post.imageUrl;
  const exportBlockers = [...lint.copy, ...(missingPhoto ? ["Slide 1: the photo cover has no photograph yet"] : [])];

  async function loadDataUrl(src: string): Promise<string> {
    if (src.startsWith("data:")) return src;
    const blob = await (await fetch(src.startsWith("/") || src.startsWith(apiBase) ? src : proxied(src)!)).blob();
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
  }

  async function handleExport() {
    if (!post || exportBlockers.length) return;
    setError(null);
    setBusy("export");
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const files: File[] = [];
      for (let i = 0; i < post.slides.length; i++) {
        const node = exportRefs.current[i];
        if (!node) throw new Error("Slide not mounted");
        files.push(await compositeSlideWithImages(node, Array.from(node.querySelectorAll("img")), {
          filename: exportFilename(post, i), exportH: 1350, loadDataUrl, type: "image/jpeg", quality: 0.9, pixelRatio: 1,
        }));
      }
      files.push(new File([post.caption], `leweekend_${post.folio}_${post.column}_caption.txt`, { type: "text/plain" }));
      await saveFiles(files, `Le week-end p. ${post.folio}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(`Export failed: ${err instanceof Error ? err.message : "try again"}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    if (!post) return;
    setError(null);
    setBusy("save");
    try {
      const res = await fetch(`${apiBase}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(savedId ? { id: savedId } : {}), topic: post.topic, format: "le_week_end", leWeekendContent: post }),
      });
      const data = await readJsonResponse<{ id?: string; error?: string; imageUrl?: string }>(res, "save");
      if (!res.ok || !data.id) throw new Error(data.error ?? "Save failed");
      writeMemory(post);
      setSavedId(data.id);
      onSaved?.(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const label: CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "var(--ui-tracking-caps)", marginBottom: 6, display: "block" };
  const panel: CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 16 };
  const field: CSSProperties = { width: "100%", fontFamily: "inherit", fontSize: 13, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)", boxSizing: "border-box" };
  const btn = (primary = false): CSSProperties => ({ background: primary ? "var(--accent)" : "var(--surface)", color: primary ? "var(--ui-on-ink)" : "var(--text)", border: primary ? "none" : "1.5px solid var(--border)", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
  const covers: LwCover[] = column === "auto" ? [...LW_COVERS] : coversForColumn(column);
  const busyLabel = busy === "copy" ? "Reading the grid, writing..." : busy === "image" ? "Generating the photo..." : null;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6, letterSpacing: "var(--ui-tracking-tight)" }}>Le week-end</h2>
      <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
        The sleep column of a French weekend magazine, for: <span style={{ color: "var(--text)", fontWeight: 600 }}>{topic || post?.topic}</span>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 20, alignItems: "start" }}>
        <div style={panel}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label><span style={label}>Column</span>
              <select style={field} value={column} onChange={(e) => setColumn(e.target.value as LwColumn | "auto")}>
                <option value="auto">Auto (fits the topic)</option>
                {LW_COLUMNS.map((c) => <option key={c} value={c}>{LW_COLUMN_LABEL[c]}</option>)}
              </select>
            </label>
            <label><span style={label}>Cover</span>
              <select style={field} value={cover} onChange={(e) => setCover(e.target.value as LwCover | "auto")}>
                <option value="auto">Auto (fits the grid)</option>
                {covers.map((c) => <option key={c} value={c}>{c === "navy" && column === "auto" ? "navy (courrier)" : c}</option>)}
              </select>
            </label>
            <label><span style={label}>Slides</span>
              <select style={field} value={slideCount} onChange={(e) => setSlideCount(e.target.value === "auto" ? "auto" : Number(e.target.value))}>
                <option value="auto">Auto</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label><span style={label}>Date</span>
              <input style={field} value={dateFr} onChange={(e) => setDateFr(e.target.value)} />
            </label>
            <label><span style={label}>Folio (p.)</span>
              <input style={field} type="number" min={1} value={folio} onChange={(e) => setFolio(Math.max(1, Number(e.target.value) || 1))} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button style={btn(true)} disabled={!!busy || !topic} onClick={generate}>{busyLabel ?? (post ? "Write again" : "Write the post")}</button>
            <button style={btn()} disabled={!!busy} onClick={() => loadDemo(0)}>Demo: lexique</button>
            <button style={btn()} disabled={!!busy} onClick={() => loadDemo(1)}>Demo: courrier</button>
          </div>
        </div>
        <GridFit ig={ig} pasted={pastedGrid} plan={plan} post={post} imageSrc={imageSrc} onScreenshot={takeGridScreenshot} />
      </div>

      {error && <div style={{ fontSize: 13, color: "var(--error)", margin: "0 0 16px" }}>{error}</div>}

      {post && (
        <>
          {exportBlockers.length > 0 && <Notice tone="error" title="Export blocked" items={exportBlockers} />}
          {(lint.words.length > 0 || overflow.length > 0) && <Notice tone="warn" title="Too long for the page" items={[...lint.words, ...overflow]} />}

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            {post.slides.map((_, i) => (
              <div key={i}>
                <LeWeekendSlide post={post} index={i} scale={PREVIEW_SCALE} imageSrc={imageSrc} />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{exportFilename(post, i)}</div>
              </div>
            ))}
          </div>

          <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }} aria-hidden>
            {post.slides.map((_, i) => (
              <div key={i} ref={(el) => { exportRefs.current[i] = el; }} style={{ width: 1080, height: 1350 }}>
                <LeWeekendSlide post={post} index={i} scale={1} imageSrc={imageSrc} />
              </div>
            ))}
          </div>

          {post.cover === "photo" && (
            <div style={panel}>
              <span style={label}>Photo prompt (generated with the post; edit and generate again if it misses)</span>
              <textarea style={{ ...field, minHeight: 110 }} value={post.imagePrompt ?? ""} onChange={(e) => setPost({ ...post, imagePrompt: e.target.value })} />
              <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button style={btn(true)} disabled={!!busy || !post.imagePrompt?.trim()} onClick={() => generateImage()}>{busy === "image" ? "Generating..." : post.imageUrl ? "Generate again" : "Generate the photo"}</button>
                <label style={{ ...btn(), display: "inline-block" }}>
                  Upload a photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
                </label>
                {post.imageUrl && <span style={{ fontSize: 12, color: "var(--muted)" }}>Headline set in {post.photoTone ?? "..."}, footer in {post.photoFootTone ?? "..."}, read from the photo.</span>}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
            <div style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={label}>Caption</span>
                <button onClick={() => navigator.clipboard.writeText(post.caption).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); })} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>{copied ? "Copied" : "Copy"}</button>
              </div>
              <textarea style={{ ...field, minHeight: 260, lineHeight: 1.5 }} value={post.caption} onChange={(e) => setPost({ ...post, caption: e.target.value })} />
            </div>
            <div style={panel}>
              <span style={label}>Claims to verify before posting ({post.claimsToVerify.length})</span>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                {post.claimsToVerify.map((c, i) => <li key={i} style={{ marginBottom: 6 }}>{c}</li>)}
              </ol>
            </div>
          </div>

          <div style={panel}>
            <span style={label}>Edit the text</span>
            {post.slides.map((s, i) => (
              <SlideFields key={i} index={i} slide={s} fieldStyle={field} onChange={(next) => setPost({ ...post, slides: post.slides.map((x, j) => (j === i ? next : x)) })} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button style={{ ...btn(true), opacity: exportBlockers.length ? 0.5 : 1 }} disabled={!!busy || exportBlockers.length > 0} title={exportBlockers.join("\n")} onClick={handleExport}>
              {busy === "export" ? "Exporting..." : `Export ${post.slides.length} JPG${post.slides.length === 1 ? "" : "s"} + caption`}
            </button>
            <button style={btn()} disabled={!!busy} onClick={handleSave}>{busy === "save" ? "Saving..." : savedId ? "Save changes" : "Save to library"}</button>
            {savedId && busy !== "save" && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>Saved</span>}
          </div>
        </>
      )}
    </div>
  );
}

function Notice({ tone, title, items }: { tone: "error" | "warn"; title: string; items: string[] }) {
  const color = tone === "error" ? "var(--error)" : "var(--text)";
  return (
    <div role={tone === "error" ? "alert" : "status"} style={{ border: `1px solid ${tone === "error" ? "rgba(184,92,92,0.35)" : "var(--border)"}`, background: tone === "error" ? "rgba(184,92,92,0.06)" : "var(--surface)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

/** Every string field of a slide as an input, every list as one input per item. */
function SlideFields({ index, slide, onChange, fieldStyle }: { index: number; slide: LwSlide; onChange: (s: LwSlide) => void; fieldStyle: CSSProperties }) {
  const fields = slide.fields as Record<string, unknown>;
  const set = (k: string, v: unknown) => onChange({ ...slide, fields: { ...fields, [k]: v } } as LwSlide);
  const long = (t: string) => t.length > 60;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Slide {index + 1} · {slide.template}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {Object.entries(fields).map(([k, v]) => {
          if (typeof v === "string") {
            return (
              <label key={k} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, alignItems: "start", fontSize: 12, color: "var(--muted)" }}>
                {k}
                {k === "gender"
                  ? <select style={fieldStyle} value={v} onChange={(e) => set(k, e.target.value)}><option>n.f.</option><option>n.m.</option></select>
                  : long(v) || k === "sideNote"
                    ? <textarea style={{ ...fieldStyle, minHeight: 54 }} value={v} onChange={(e) => set(k, e.target.value)} />
                    : <input style={fieldStyle} value={v} onChange={(e) => set(k, e.target.value)} />}
              </label>
            );
          }
          if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
            return v.map((x: string, j) => (
              <label key={`${k}-${j}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: 12, color: "var(--muted)" }}>
                {k} {j + 1}
                <input style={fieldStyle} value={x} onChange={(e) => set(k, v.map((y: string, n) => (n === j ? e.target.value : y)))} />
              </label>
            ));
          }
          return null;
        })}
      </div>
    </div>
  );
}

/**
 * The Instagram grid with the new post dropped into the top-left slot, and
 * the planner's reason. The live grid when the token can read Instagram;
 * otherwise a pasted screenshot, which is asked for once and remembered.
 */
function GridFit({ ig, pasted, plan, post, imageSrc, onScreenshot }: {
  ig: { username?: string; thumbs?: string[]; error?: string } | null;
  pasted: string | null; plan: LwPlan | null; post: LwPost | null; imageSrc?: string;
  onScreenshot: (f: File) => void;
}) {
  const TILE = 88;
  const live = ig?.thumbs?.length ? ig.thumbs : null;
  const head: CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "var(--ui-tracking-caps)", marginBottom: 8 };
  const note: CSSProperties = { fontSize: 12, color: "var(--muted)", lineHeight: 1.45 };
  const cover = post ? (
    <div style={{ width: TILE, height: TILE * 1.25, overflow: "hidden", outline: "2px solid var(--accent)", outlineOffset: -2 }}>
      <LeWeekendSlide post={post} index={0} scale={TILE / 1080} imageSrc={imageSrc} />
    </div>
  ) : null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
      <div style={head}>Grid fit</div>
      {live ? (
        <>
          <div style={{ ...note, marginBottom: 8 }}>Live grid{ig?.username ? ` of @${ig.username}` : ""}{post ? ", with this post in front" : ""}.</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${TILE}px)`, gap: 2 }}>
            {cover}
            {live.slice(0, post ? 8 : 9).map((t, i) => <img key={i} src={t} alt="" style={{ width: TILE, height: TILE * 1.25, objectFit: "cover", display: "block" }} />)}
          </div>
        </>
      ) : pasted ? (
        <>
          <div style={{ ...note, marginBottom: 8 }}>From your last pasted screenshot. Paste a new one any time (⌘V).</div>
          {cover && <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>{cover}<span style={note}>goes top-left of:</span></div>}
          <img src={pasted} alt="Instagram grid screenshot" style={{ width: "100%", display: "block", borderRadius: 4 }} />
        </>
      ) : (
        <div style={note}>
          Paste a screenshot of the Instagram profile grid here (⌘V) and the cover will be picked to fit it. Until then the cover follows the rhythm of the saved posts.
        </div>
      )}
      {!live && (
        <label style={{ ...note, display: "inline-block", marginTop: 8, color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>
          {pasted ? "Replace screenshot" : "Upload a screenshot"}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onScreenshot(f); e.target.value = ""; }} />
        </label>
      )}
      {plan && (
        <div style={{ ...note, marginTop: 10, color: "var(--text)" }}>
          <strong>{plan.cover} · {LW_COLUMN_LABEL[plan.column]} · {plan.slideCount} slide{plan.slideCount === 1 ? "" : "s"}.</strong> {plan.reason}
          {plan.photoDirection && <div style={{ ...note, marginTop: 6 }}>Photo: {plan.photoDirection}</div>}
        </div>
      )}
      {!live && ig?.error && (
        <div style={{ ...note, marginTop: 10, fontSize: 11 }}>
          Live grid off: {ig.error}. To read it automatically, give the Meta token the instagram_basic and pages_show_list permissions with the Instagram account linked to a Facebook page.
        </div>
      )}
    </div>
  );
}
