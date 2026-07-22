"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CampaignContent, CampaignBlock, CampaignImageSlot, CampaignSnippet } from "@/lib/types";
import { renderCampaignEmail } from "@/lib/campaign-email-html";
import ImageSlotControl from "./ImageSlotControl";
import { Spinner } from "./Loaders";
import { useInsertAtCursor } from "./useInsertAtCursor";
import { PRODUCT } from "@/lib/lunia-brand-guidelines";

type BlockKind = NonNullable<CampaignBlock["kind"]>;
const BLOCK_KINDS: { key: BlockKind; label: string; title: string }[] = [
  { key: "text", label: "Text", title: "A paragraph block" },
  { key: "stat", label: "Stat", title: "A big-number stat or testimonial callout" },
  { key: "discount", label: "Discount", title: "A discount/coupon callout" },
  { key: "checklist", label: "Checklist", title: "A bulleted benefit/ingredient list" },
];

// Klaviyo merge-tag presets. `|default:'...'` keeps a broken/missing profile
// field from rendering literally blank — plain text, survives copy-paste
// into Klaviyo untouched.
const PERSONALIZATION_TOKENS: { label: string; token: string }[] = [
  { label: "First name", token: "{{ first_name|default:'there' }}" },
  { label: "Last order item", token: "{{ event.extra.line_items.0.product_name|default:'your last order' }}" },
  { label: "Discount code", token: "{{ discount_code|default:'' }}" },
];

// A short, curated slice of PRODUCT facts worth one-click-inserting into copy
// — the numbers/claims a human editor would otherwise have to remember or
// retype exactly. Not the full brand handbook (that's for AI prompts).
const BRAND_FACTS: { label: string; text: string }[] = [
  { label: "Review count", text: `${PRODUCT.reviewCount} reviews, ${PRODUCT.reviewStars} stars average` },
  { label: "Five-star %", text: `${PRODUCT.fiveStarPct}% five-star reviews` },
  { label: "Customer count", text: `${PRODUCT.customerCount} customers` },
  { label: "Single bottle price", text: `$${PRODUCT.price1Bottle.toFixed(2)}` },
  { label: "Subscription price", text: `$${PRODUCT.priceSubscription.toFixed(2)}` },
  { label: "Price per serving", text: PRODUCT.pricePerServing },
  { label: "Dose", text: PRODUCT.dose },
  ...PRODUCT.differentiators.map((d) => ({ label: d.length > 40 ? `${d.slice(0, 40)}…` : d, text: d })),
];

const newId = () => crypto.randomUUID();

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--subtle)",
  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
};
const fieldLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 4,
};
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontSize: 13,
  fontFamily: "inherit", color: "var(--text)", padding: "7px 10px",
  borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)",
};
const miniBtn = (active = false): React.CSSProperties => ({
  padding: "3px 9px", fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  background: active ? "var(--accent-dim)" : "transparent",
  color: active ? "var(--accent)" : "var(--muted)",
  borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
});

// ── Block toolbar primitives ────────────────────────────────────────────────
// Apple-style controls per DESIGN.md: 1px borders, near-black active state,
// no shadows / lift / emoji. Grouping related actions into segmented controls
// (align, weight) keeps the toolbar from reading as a wall of pills.
type BlockWeight = NonNullable<CampaignBlock["weight"]>;

const BLOCK_WEIGHTS: { key: BlockWeight; label: string; title: string }[] = [
  { key: "thin", label: "100", title: "Inter Thin (100)" },
  { key: "extralight", label: "200", title: "Inter ExtraLight (200)" },
  { key: "light", label: "300", title: "Inter Light (300)" },
  { key: "normal", label: "400", title: "Inter Normal (400)" },
];

const segWrap: React.CSSProperties = {
  display: "inline-flex", border: "1px solid var(--border)",
  borderRadius: 6, overflow: "hidden", background: "var(--bg)",
};

function SegButton({ active, onClick, title, last, children }: {
  active: boolean; onClick: () => void; title: string; last?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`blk-seg${active ? " is-active" : ""}`}
      onClick={onClick}
      title={title}
      aria-pressed={active}
      style={{
        minWidth: 32, height: 28, padding: "0 10px",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 600, lineHeight: 1, fontFamily: "inherit",
        border: "none", borderRight: last ? "none" : "1px solid var(--border)",
        background: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--text)" : "var(--muted)", cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function IconButton({ onClick, title, active, children }: {
  onClick: () => void; title: string; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="blk-icon"
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, padding: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)",
        color: active ? "var(--text)" : "var(--muted)", cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const iconProps = {
  width: 13, height: 13, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};
const IcAlignLeft = () => (<svg {...iconProps}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="14" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>);
const IcAlignCenter = () => (<svg {...iconProps}><line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>);
const IcCopy = () => (<svg {...iconProps}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>);
const IcCheck = () => (<svg {...iconProps} strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>);
const IcTrash = () => (<svg {...iconProps}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" /></svg>);
const IcBookmarkPlus = () => (<svg {...iconProps}><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="12" y1="5" x2="12" y2="11" /></svg>);

export default function CampaignEditor({
  topic,
  content,
  savedId,
  onChange,
  onSaved,
}: {
  topic: string;
  content: CampaignContent;
  savedId: string | null;
  onChange: (next: CampaignContent) => void;
  onSaved: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy HTML");
  const [klaviyoBusy, setKlaviyoBusy] = useState(false);
  const [klaviyoResult, setKlaviyoResult] = useState<{ editorUrl: string } | null>(null);
  const [klaviyoError, setKlaviyoError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [subjectsBusy, setSubjectsBusy] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [improveBusy, setImproveBusy] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  // Snapshot of the content taken right before an "Improve with Claude" rewrite,
  // so the user can revert to the verbatim import. Null when there's nothing to
  // revert to.
  const [preImprove, setPreImprove] = useState<CampaignContent | null>(null);
  // Autosave — "idle" before any edit this session, "dirty" while a debounced
  // save is pending, "saving" mid-request, "saved" once it lands. Manual Save
  // (below) and autosave share the same /api/campaign/save call and status.
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTOSAVE_DEBOUNCE_MS = 2500;
  // savedId is a prop; a debounced autosave callback can fire several renders
  // after the click/keystroke that scheduled it, so it needs a ref, same
  // reasoning as latestContent below.
  const savedIdRef = useRef(savedId);
  useEffect(() => { savedIdRef.current = savedId; }, [savedId]);

  // In-session undo/redo (no persistence — cleared on unmount/navigate-away).
  // Snapshots are coalesced: rapid consecutive commits (e.g. typing) collapse
  // into ONE undo step covering the whole burst, so Cmd+Z undoes an edit, not
  // a keystroke. A commit with no follow-up within UNDO_COALESCE_MS — the
  // common case for a discrete action like removing a block or swapping an
  // image — becomes its own step naturally, no special-casing needed.
  const undoStackRef = useRef<CampaignContent[]>([]);
  const redoStackRef = useRef<CampaignContent[]>([]);
  const pendingUndoSnapshotRef = useRef<CampaignContent | null>(null);
  const undoCoalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const UNDO_COALESCE_MS = 700;
  const UNDO_MAX_DEPTH = 50;
  // Bumped on every history push/pop purely to re-render the undo/redo
  // buttons' disabled state — the stacks themselves live in refs.
  const [historyVersion, setHistoryVersion] = useState(0);

  // Clear pending timers on unmount (FlowDeck remounts this component per
  // email via `key`) so a stale autosave/undo-coalesce never fires after the
  // instance it belongs to is gone.
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (undoCoalesceTimerRef.current) clearTimeout(undoCoalesceTimerRef.current);
    };
  }, []);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Preview scaling — the email is hard-coded to 600px so we render the
  // iframe at the email's NATIVE width and CSS-scale it down to fit the
  // preview pane. Previously the iframe just stretched to whatever pane
  // width was available (~520px on typical screens), which is < 600px and
  // therefore triggered the email's `@media (max-width:600px)` mobile
  // rules INSIDE the desktop preview. That made the preview disagree with
  // what real email clients render.
  const previewPaneRef = useRef<HTMLDivElement | null>(null);
  const [paneWidth, setPaneWidth] = useState(600);
  const [iframeBodyHeight, setIframeBodyHeight] = useState(600);
  // True while the iframe is mid-reload (srcDoc changed but onLoad hasn't
  // fired yet). Drives a soft spinner overlay so the preview never goes
  // visually blank between edits.
  const [previewLoading, setPreviewLoading] = useState(true);
  // Live preview viewport — desktop = full container width (~520px), mobile
  // = 375px (iPhone-class viewport) so the email's @media (max-width:600px)
  // overrides kick in and the user can preview the mobile layout. Default
  // is desktop per user direction.
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Per-slot lock on the most recently generated URL. When ImageSlotControl
  // finishes a generation it registers the new URL here via markGenerated().
  // updateImage() below uses the map to detect + reject any subsequent state
  // mutation that tries to silently change a generated slot's URL to a
  // different value while the slot is still in "generated" mode.
  //
  // This is the firewall against the "hero image reverts to default" bug:
  // even if some race or stale render emits an onChange with the previous
  // asset URL, the guard preserves the freshly generated URL.
  const generatedUrlLock = useRef<Map<string, string>>(new Map());
  function markGenerated(slotId: string, url: string) {
    generatedUrlLock.current.set(slotId, url);
  }

  // Shared "insert at cursor" plumbing for snippets, personalization tokens,
  // and brand facts — see useInsertAtCursor.ts.
  const insertHook = useInsertAtCursor();
  const [snippets, setSnippets] = useState<CampaignSnippet[]>([]);
  const [snippetPickerOpen, setSnippetPickerOpen] = useState(false);
  const [personalizationPickerOpen, setPersonalizationPickerOpen] = useState(false);
  const [brandFactsPickerOpen, setBrandFactsPickerOpen] = useState(false);
  const [savingSnippetFor, setSavingSnippetFor] = useState<string | null>(null);
  const [addBlockMenuOpen, setAddBlockMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/campaign/snippets")
      .then((r) => r.json())
      .then((data) => { if (alive && Array.isArray(data)) setSnippets(data); })
      .catch(() => { /* best-effort — snippet picker just shows empty */ });
    return () => { alive = false; };
  }, []);

  /** Insert plain text (a personalization token, a brand fact) into whichever
   *  text block is currently focused — falling back to the first "text" kind
   *  block if none is focused, so the button still does something useful on
   *  first click rather than silently no-op'ing. */
  function insertIntoFocusedBlock(text: string) {
    const c = latestContent.current;
    const id = insertHook.focusedId.current ?? c.blocks.find((b) => !b.kind || b.kind === "text")?.id;
    const block = id ? c.blocks.find((b) => b.id === id) : undefined;
    if (!block) return;
    insertHook.insertAtCursor(text, block.body, (next) => updateBlock(block.id, { body: next }), block.id);
  }

  async function saveBlockAsSnippet(block: CampaignBlock) {
    const name = window.prompt("Name this snippet:", block.body.slice(0, 40) || "Untitled snippet");
    if (!name || !name.trim()) return;
    setSavingSnippetFor(block.id);
    try {
      const { id: _id, ...blockShape } = block;
      void _id;
      const res = await fetch("/api/campaign/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), block: blockShape }),
      });
      const data = await res.json();
      if (res.ok && data.id) setSnippets((prev) => [data, ...prev]);
    } catch { /* best-effort */ } finally {
      setSavingSnippetFor(null);
    }
  }

  function insertSnippet(snippet: CampaignSnippet) {
    const c = latestContent.current;
    commit({ ...c, blocks: [...c.blocks, { ...snippet.block, id: newId() }] });
    setSnippetPickerOpen(false);
  }

  // Always-fresh mirror of `content`. Async handlers (image generation, banner
  // / subject suggestions) can resolve LONG after the click that started them —
  // by then the `content` captured in their closure is stale, and splatting it
  // back reverts whatever the user edited in the meantime (the "upload an image
  // and my top banner resets" bug). Merging into `latestContent.current`
  // instead keeps every other field intact. Mirrors the `latestSlot` ref inside
  // ImageSlotControl, one level up.
  const latestContent = useRef(content);
  useEffect(() => { latestContent.current = content; }, [content]);
  function flushUndoSnapshot() {
    if (pendingUndoSnapshotRef.current) {
      undoStackRef.current = [...undoStackRef.current, pendingUndoSnapshotRef.current].slice(-UNDO_MAX_DEPTH);
      pendingUndoSnapshotRef.current = null;
    }
  }

  function scheduleAutosave() {
    setAutosaveStatus("dirty");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => { void runAutosave(); }, AUTOSAVE_DEBOUNCE_MS);
  }

  async function runAutosave() {
    setAutosaveStatus("saving");
    try {
      const res = await fetch("/api/campaign/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedIdRef.current ?? undefined, topic, content: latestContent.current }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        onSaved(data.id);
        setAutosaveStatus("saved");
      } else {
        // Silent failure — stays effectively "dirty" so the status pill keeps
        // reflecting reality; the next edit re-schedules and tries again.
        setAutosaveStatus("dirty");
      }
    } catch {
      setAutosaveStatus("dirty");
    }
  }

  // Commit a full next-content, updating the mirror synchronously so back-to-back
  // patches compose without waiting for the effect. `patch` is the partial-update
  // shorthand every field handler funnels through. `fromHistory` is set only by
  // undo()/redo() themselves, so their own commits don't re-enter the undo stack
  // or clear the redo stack they just built.
  function commit(next: CampaignContent, opts?: { fromHistory?: boolean }) {
    const prev = latestContent.current;
    latestContent.current = next;
    onChange(next);
    if (!opts?.fromHistory) {
      if (pendingUndoSnapshotRef.current === null) pendingUndoSnapshotRef.current = prev;
      if (undoCoalesceTimerRef.current) clearTimeout(undoCoalesceTimerRef.current);
      undoCoalesceTimerRef.current = setTimeout(() => {
        flushUndoSnapshot();
        setHistoryVersion((v) => v + 1);
      }, UNDO_COALESCE_MS);
      redoStackRef.current = [];
      scheduleAutosave();
    }
  }
  function patch(p: Partial<CampaignContent>) {
    commit({ ...latestContent.current, ...p });
  }

  function undo() {
    flushUndoSnapshot();
    const prevState = undoStackRef.current.pop();
    if (!prevState) return;
    redoStackRef.current.push(latestContent.current);
    commit(prevState, { fromHistory: true });
    setHistoryVersion((v) => v + 1);
  }
  function redo() {
    const nextState = redoStackRef.current.pop();
    if (!nextState) return;
    undoStackRef.current.push(latestContent.current);
    commit(nextState, { fromHistory: true });
    setHistoryVersion((v) => v + 1);
  }
  const canUndo = historyVersion >= 0 && (undoStackRef.current.length > 0 || pendingUndoSnapshotRef.current !== null);
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;

  // Cmd+Z / Cmd+Shift+Z (or Ctrl on non-Mac) while the editor is mounted. Not
  // scoped to "not inside a textarea" — these are controlled React inputs, so
  // the browser's own per-field undo history is already unreliable for them;
  // app-level undo taking over (same as Notion/Figma) is the right default.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const html = useMemo(() => renderCampaignEmail(content), [content]);

  // Concise email copy (subject + promo + body) handed to the image-prompt
  // generator so regenerated prompts reflect THIS email's message, not a
  // generic stock scene.
  const emailContext = useMemo(() => {
    const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
    return [subject, content.promoBand, ...content.blocks.map((b) => b.body)]
      .filter(Boolean)
      .join("\n")
      .slice(0, 1200);
  }, [content]);

  // Lightweight hash of the HTML body so the iframe gets a fresh `key` on
  // every content change. Without this, some browsers don't re-fetch images
  // inside a srcDoc when the URL changes — the iframe element is preserved,
  // not remounted. Keying on a content-derived string forces React to unmount
  // and re-mount the iframe, which guarantees fresh image loads.
  const htmlKey = useMemo(() => {
    let h = 0;
    for (let i = 0; i < html.length; i++) {
      h = ((h << 5) - h + html.charCodeAt(i)) | 0;
    }
    return String(h);
  }, [html]);

  function fitIframe() {
    const f = iframeRef.current;
    if (!f?.contentDocument?.body) return;
    // Read the rendered email body height, then drive the iframe height +
    // outer wrapper height via state. The wrapper height is scaled, the
    // iframe height is native.
    setIframeBodyHeight(f.contentDocument.body.scrollHeight);
    setPreviewLoading(false);
  }

  // Whenever the rendered HTML changes (a keystroke, a regeneration), flip
  // the loading flag back on so the spinner overlay reappears until the
  // iframe finishes painting and fitIframe → setPreviewLoading(false).
  useEffect(() => {
    setPreviewLoading(true);
  }, [htmlKey]);

  // Track the preview pane width so we can scale a 600px iframe down to fit.
  useEffect(() => {
    const el = previewPaneRef.current;
    if (!el) return;
    const update = () => setPaneWidth(el.clientWidth);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Native widths matching the email's own breakpoints. Mobile mode
  // intentionally renders at 375px (an iPhone-class viewport) so the
  // email's `@media (max-width:600px)` rules kick in. Desktop renders at
  // 600px — the email's hard-coded container width — so what you see is
  // literally what a 600px+ email client renders.
  const NATIVE_DESKTOP = 600;
  const NATIVE_MOBILE = 375;
  const nativeWidth = previewMode === "mobile" ? NATIVE_MOBILE : NATIVE_DESKTOP;
  // Scale factor — never upscale (cap at 1), only shrink if the pane is
  // narrower than the native width. Subtract a couple of px so the inner
  // 1px border in mobile mode doesn't cause a clipped right edge.
  const previewScale = Math.min(1, Math.max(0, paneWidth - 2) / nativeWidth);

  // ── field updates ──────────────────────────────────────────────────────────
  // Every updater reads from `latestContent.current` (not the closure `content`)
  // and commits through `commit`, so a slow async handler resolving mid-edit
  // never clobbers a field the user just changed.
  function updateBlock(id: string, changes: Partial<CampaignBlock>) {
    const c = latestContent.current;
    commit({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...changes } : b)) });
  }
  function removeBlock(id: string) {
    const c = latestContent.current;
    commit({ ...c, blocks: c.blocks.filter((b) => b.id !== id) });
  }
  function addBlock(kind: BlockKind = "text") {
    const c = latestContent.current;
    const base: CampaignBlock = { id: newId(), body: "", align: "left", kind };
    if (kind === "checklist") base.items = [];
    commit({ ...c, blocks: [...c.blocks, base] });
  }
  function updateImage(next: CampaignImageSlot) {
    const c = latestContent.current;
    const prev = c.images.find((i) => i.id === next.id);
    let final = next;

    // If the user explicitly switched the source away from generated,
    // they're abandoning the generated image — clear the lock.
    if (prev?.source === "generated" && next.source !== "generated") {
      generatedUrlLock.current.delete(next.id);
    }

    // While the slot is in "generated" mode, the URL can ONLY change in two
    // legitimate ways:
    //   (a) Generate produced a brand new URL → ImageSlotControl calls
    //       markGenerated() BEFORE its onChange. The lock has the new URL
    //       and matches next.url. No-op.
    //   (b) User cleared the URL by switching to Generated mode (url=null).
    //       That's an explicit reset.
    // Anything else — different URL, no markGenerated, source still
    // "generated" — is the revert bug. Preserve the locked URL.
    if (next.source === "generated") {
      const locked = generatedUrlLock.current.get(next.id);
      if (locked && next.url !== null && next.url !== locked) {
        console.warn("[CampaignEditor] suspicious URL change on generated slot — preserving locked URL", {
          slotId: next.id,
          attemptedUrl: next.url,
          preservedUrl: locked,
        });
        final = { ...next, url: locked, assetId: undefined };
      }
    }

    commit({ ...c, images: c.images.map((i) => (i.id === next.id ? final : i)) });
  }
  function removeImage(id: string) {
    const c = latestContent.current;
    commit({ ...c, images: c.images.filter((i) => i.id !== id) });
  }
  function addImage() {
    const c = latestContent.current;
    if (c.images.length >= 5) return;
    commit({
      ...c,
      images: [...c.images, { id: newId(), role: "secondary", source: "generated", aspect: "1:1", prompt: "", url: null }],
    });
  }

  function exportHtml() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "email"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /** Copy any piece of campaign text to the clipboard and flash a ✓ /Err
   *  indicator next to whichever button kicked it off. The `key` is a
   *  free-form identifier the caller uses to drive its own UI state —
   *  e.g. `block:<uuid>` for text blocks, `subj:<index>` for subject
   *  lines, `preview` for the preview text. */
  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1500);
    } catch {
      setCopiedKey(`err:${key}`);
      setTimeout(() => setCopiedKey((curr) => (curr === `err:${key}` ? null : curr)), 1500);
    }
  }

  async function suggestPromoBand() {
    if (promoBusy) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/campaign/suggest-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, current: content.promoBand ?? "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.promoBand) {
        setPromoError(data.error ?? "Suggestion failed");
        return;
      }
      patch({ promoBand: data.promoBand });
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPromoBusy(false);
    }
  }

  async function suggestTopBanner() {
    if (bannerBusy) return;
    setBannerBusy(true);
    setBannerError(null);
    try {
      const res = await fetch("/api/campaign/suggest-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, current: content.topBanner ?? "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.topBanner) {
        setBannerError(data.error ?? "Suggestion failed");
        return;
      }
      patch({ topBanner: data.topBanner });
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBannerBusy(false);
    }
  }

  async function regenerateSubjects() {
    if (subjectsBusy) return;
    setSubjectsBusy(true);
    setSubjectsError(null);
    try {
      const res = await fetch("/api/campaign/regenerate-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, current: content.subjectLines }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.subjectLines) || data.subjectLines.length === 0) {
        setSubjectsError(data.error ?? "Regeneration failed");
        return;
      }
      // Replace all options and reset the selection to the first.
      patch({ subjectLines: data.subjectLines, selectedSubject: 0 });
    } catch (err) {
      setSubjectsError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubjectsBusy(false);
    }
  }

  // Opt-in Lunia-voice rewrite of the copy only (selected subject + every text
  // block). Images, promo band, CTA, and layout are left untouched. Reversible.
  async function improveWithClaude() {
    if (improveBusy) return;
    const c = latestContent.current;
    if (c.blocks.length === 0 && c.subjectLines.length === 0) return;
    setImproveBusy(true);
    setImproveError(null);
    const snapshot = c;
    // Only "text" (or unset) blocks go through the prose rewrite — stat/
    // discount/checklist blocks hold structured fields, not free prose, and
    // the rewrite prompt has no concept of them.
    const textBlocks = c.blocks.filter((b) => !b.kind || b.kind === "text");
    try {
      const subject = c.subjectLines[c.selectedSubject] ?? c.subjectLines[0] ?? "";
      const res = await fetch("/api/campaign/rewrite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject, blocks: textBlocks.map((b) => b.body) }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.blocks)) {
        setImproveError(data.error ?? "Improve failed");
        return;
      }
      // Apply onto the LATEST content (not the stale snapshot) so any edits made
      // while the request was in flight survive. Match rewrites back by block
      // id (via position within the textBlocks subset we sent), not by index
      // into the full block list — a block added/removed/reordered mid-flight,
      // or a non-text block, is left untouched rather than silently corrupted.
      const cur = latestContent.current;
      const idx = cur.selectedSubject;
      const nextSubjects = data.subject
        ? cur.subjectLines.map((s, i) => (i === idx ? String(data.subject) : s))
        : cur.subjectLines;
      const nextBlocks = cur.blocks.map((b) => {
        const pos = textBlocks.findIndex((tb) => tb.id === b.id);
        return pos !== -1 && typeof data.blocks[pos] === "string" ? { ...b, body: data.blocks[pos] } : b;
      });
      setPreImprove(snapshot);
      commit({ ...cur, subjectLines: nextSubjects, blocks: nextBlocks });
    } catch (err) {
      setImproveError(err instanceof Error ? err.message : "Network error");
    } finally {
      setImproveBusy(false);
    }
  }

  function revertImprove() {
    if (!preImprove) return;
    commit(preImprove);
    setPreImprove(null);
    setImproveError(null);
  }

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(html);
      setCopyLabel("Copied ✓");
      setTimeout(() => setCopyLabel("Copy HTML"), 2000);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy HTML"), 2000);
    }
  }

  async function pushToKlaviyo() {
    if (klaviyoBusy) return;
    setKlaviyoBusy(true);
    setKlaviyoError(null);
    setKlaviyoResult(null);
    try {
      const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? topic;
      const res = await fetch("/api/campaign/klaviyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, topic, subject }),
      });
      const data = await res.json();
      if (!res.ok || !data.editorUrl) {
        setKlaviyoError(data.error ?? "Push failed");
        return;
      }
      setKlaviyoResult({ editorUrl: data.editorUrl });
    } catch (err) {
      setKlaviyoError(err instanceof Error ? err.message : "Network error");
    } finally {
      setKlaviyoBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    try {
      const res = await fetch("/api/campaign/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId ?? undefined, topic, content }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        setSaveError(data.error ?? "Save failed");
        return;
      }
      onSaved(data.id);
      setAutosaveStatus("saved");
    } catch {
      setSaveError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  const secondaryImages = content.images.filter((i) => i.role === "secondary");

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* ── Live preview ───────────────────────────────────────────────────── */}
      <div style={{ flex: "1 1 520px", minWidth: 320 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ ...sectionLabel, marginBottom: 0 }}>Live preview</div>
          {/* Desktop / Mobile preview toggle. Default = desktop. */}
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            {(["desktop", "mobile"] as const).map((mode) => {
              const active = previewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  title={mode === "desktop" ? "Show the desktop layout" : "Show how the email reflows on mobile (~375px viewport)"}
                  style={{
                    padding: "4px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    border: "none",
                    borderRight: mode === "desktop" ? "1px solid var(--border)" : "none",
                    background: active ? "var(--accent-dim)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
        {/* Navy wrapper so the iframe blends with the email's own navy body.
            The iframe is rendered at its NATIVE width (600px desktop, 375px
            mobile) and CSS-scaled down to fit the pane — that way the
            email's own @media (max-width:600px) rules trigger at the right
            moments and the preview matches what real clients render. */}
        <div ref={previewPaneRef} style={{
          border: previewMode === "mobile" ? "none" : "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          // Desktop: navy bg so the iframe at 600px blends edge-to-edge with
          // the email body. Mobile: no bg — only the scaled iframe carries
          // the navy, so there are no navy wings beside the 375px frame.
          background: previewMode === "mobile" ? "transparent" : "#01253f",
          padding: previewMode === "mobile" ? "8px 0" : 0,
          display: "flex",
          justifyContent: "center",
          position: "relative",
        }}>
          <div style={{
            // Outer wrapper takes the SCALED size so the layout below
            // flows correctly. Mobile gets a subtle outline to read as a
            // device frame; desktop is flush.
            width: nativeWidth * previewScale,
            height: iframeBodyHeight * previewScale,
            minHeight: 600 * previewScale,
            position: "relative",
            overflow: "hidden",
            border: previewMode === "mobile" ? "1px solid var(--border)" : "none",
            borderRadius: previewMode === "mobile" ? 12 : 0,
            boxSizing: "border-box",
            background: "#01253f",
          }}>
            <iframe
              key={`${htmlKey}-${previewMode}`}
              ref={iframeRef}
              srcDoc={html}
              onLoad={fitIframe}
              title="Campaign preview"
              style={{
                width: nativeWidth,
                height: Math.max(600, iframeBodyHeight),
                border: "none",
                display: "block",
                background: "#01253f",
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                opacity: previewLoading ? 0.55 : 1,
                transition: "opacity 120ms ease-out",
              }}
            />
          </div>
          {/* Light spinner overlay while the iframe re-renders. Sits on top
              of the navy wrapper so it's visible during the brief blank
              window between srcDoc change and onLoad. */}
          {previewLoading && (
            <div style={{
              position: "absolute",
              top: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              zIndex: 2,
              pointerEvents: "none",
            }}>
              <Spinner size={11} color="#01253f" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#01253f", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Updating
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div style={{ flex: "1 1 340px", minWidth: 300, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Top banner — thin white strip above the logo. Renders uppercase
            via CSS; wrap a fragment with **double asterisks** to highlight
            it with the brand color (navy pill). */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ ...fieldLabel, marginBottom: 0 }}>Top banner (optional)</label>
            <button
              style={{ ...miniBtn(false), display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={suggestTopBanner}
              disabled={bannerBusy}
              title="Generate a short top-banner line from the campaign topic"
            >
              {bannerBusy && <Spinner size={10} />}
              {bannerBusy ? "Thinking…" : "✨ Suggest"}
            </button>
          </div>
          <input type="text" value={content.topBanner ?? ""}
            placeholder="e.g. SAVE **26%** WITH A 3-MONTH SUBSCRIPTION"
            onChange={(e) => patch({ topBanner: e.target.value || undefined })} style={input} />
          {bannerError && <div style={{ marginTop: 4, fontSize: 11, color: "var(--error)" }}>{bannerError}</div>}
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--subtle)", lineHeight: 1.4 }}>
            Wrap a phrase in <code style={{ fontFamily: "monospace" }}>**double asterisks**</code> to mark it with the brand color. Renders in caps automatically.
          </div>
          {/* Logo visibility — the logo strip sits at the very top of the email,
              just below this banner. Off hides it without losing the logo url. */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={content.showLogo !== false}
              onChange={(e) => patch({ showLogo: e.target.checked })}
              style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Show logo</span>
            <span style={{ fontSize: 10, color: "var(--subtle)" }}>Hide the logo strip at the top of the email</span>
          </label>
        </div>

        {/* Subject */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...sectionLabel, marginBottom: 0 }}>Subject line</span>
            <button
              style={{ ...miniBtn(false), display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={regenerateSubjects}
              disabled={subjectsBusy}
              title="Replace all three subject lines with fresh options"
            >
              {subjectsBusy && <Spinner size={10} />}
              {subjectsBusy ? "Writing…" : "↻ Regenerate"}
            </button>
          </div>
          {subjectsError && <div style={{ marginBottom: 6, fontSize: 11, color: "var(--error)" }}>{subjectsError}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {content.subjectLines.map((s, i) => {
              const active = content.selectedSubject === i;
              const key = `subj:${i}`;
              const copied = copiedKey === key;
              const errored = copiedKey === `err:${key}`;
              return (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                  <button
                    onClick={() => patch({ selectedSubject: i })}
                    style={{
                      flex: 1, textAlign: "left", padding: "8px 10px", borderRadius: 6,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-dim)" : "var(--bg)",
                      color: "var(--text)", fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                    }}
                  >{s}</button>
                  <button
                    onClick={() => copyText(key, s)}
                    title="Copy this subject line to the clipboard"
                    style={{
                      ...miniBtn(copied), padding: "0 10px", flexShrink: 0,
                    }}
                  >
                    {copied ? "✓" : errored ? "Err" : "📋"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview text */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ ...fieldLabel, marginBottom: 0 }}>Preview text</label>
            <button
              onClick={() => copyText("preview", content.previewText)}
              title="Copy the preview text to the clipboard"
              style={miniBtn(copiedKey === "preview")}
            >
              {copiedKey === "preview" ? "✓" : copiedKey === "err:preview" ? "Err" : "📋 Copy"}
            </button>
          </div>
          <input type="text" value={content.previewText}
            onChange={(e) => patch({ previewText: e.target.value })} style={input} />
        </div>

        {/* Promo band */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ ...fieldLabel, marginBottom: 0 }}>Promo band (optional)</label>
            <button
              style={{ ...miniBtn(false), display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={suggestPromoBand}
              disabled={promoBusy}
              title="Generate a short promo band line from the campaign topic"
            >
              {promoBusy && <Spinner size={10} />}
              {promoBusy ? "Thinking…" : "✨ Suggest"}
            </button>
          </div>
          <input type="text" value={content.promoBand ?? ""}
            placeholder="e.g. MEMORIAL DAY WEEKEND SALE"
            onChange={(e) => patch({ promoBand: e.target.value || undefined })} style={input} />
          {promoError && <div style={{ marginTop: 4, fontSize: 11, color: "var(--error)" }}>{promoError}</div>}
        </div>

        {/* Blocks */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <span style={sectionLabel}>Text blocks</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
              <div style={{ position: "relative" }}>
                <button style={miniBtn(false)} onClick={() => setAddBlockMenuOpen((v) => !v)}>+ Block ▾</button>
                {addBlockMenuOpen && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: 130, overflow: "hidden",
                  }}>
                    {BLOCK_KINDS.map((k) => (
                      <button
                        key={k.key}
                        title={k.title}
                        onClick={() => { addBlock(k.key); setAddBlockMenuOpen(false); }}
                        style={{
                          display: "block", width: "100%", textAlign: "left", padding: "7px 10px",
                          fontSize: 12, fontFamily: "inherit", border: "none", background: "transparent",
                          color: "var(--text)", cursor: "pointer",
                        }}
                      >{k.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button style={miniBtn(false)} onClick={() => setSnippetPickerOpen((v) => !v)} disabled={snippets.length === 0} title={snippets.length === 0 ? "No saved snippets yet" : "Insert a saved snippet as a new block"}>
                  Snippets ▾
                </button>
                {snippetPickerOpen && snippets.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: 200, maxHeight: 240, overflowY: "auto",
                  }}>
                    {snippets.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => insertSnippet(s)}
                        title={s.block.body || s.name}
                        style={{
                          display: "block", width: "100%", textAlign: "left", padding: "7px 10px",
                          fontSize: 12, fontFamily: "inherit", border: "none", background: "transparent",
                          color: "var(--text)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}
                      >{s.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button style={miniBtn(false)} onClick={() => setPersonalizationPickerOpen((v) => !v)} title="Insert a Klaviyo merge tag into the focused block">
                  Personalize ▾
                </button>
                {personalizationPickerOpen && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden",
                  }}>
                    {PERSONALIZATION_TOKENS.map((t) => (
                      <button
                        key={t.token}
                        onClick={() => { insertIntoFocusedBlock(t.token); setPersonalizationPickerOpen(false); }}
                        style={{
                          display: "block", width: "100%", textAlign: "left", padding: "7px 10px",
                          fontSize: 12, fontFamily: "inherit", border: "none", background: "transparent",
                          color: "var(--text)", cursor: "pointer",
                        }}
                      >{t.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button style={miniBtn(false)} onClick={() => setBrandFactsPickerOpen((v) => !v)} title="Insert a canonical Lunia fact into the focused block">
                  Brand facts ▾
                </button>
                {brandFactsPickerOpen && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: 220, maxHeight: 260, overflowY: "auto",
                  }}>
                    {BRAND_FACTS.map((f) => (
                      <button
                        key={f.label}
                        onClick={() => { insertIntoFocusedBlock(f.text); setBrandFactsPickerOpen(false); }}
                        title={f.text}
                        style={{
                          display: "block", width: "100%", textAlign: "left", padding: "7px 10px",
                          fontSize: 12, fontFamily: "inherit", border: "none", background: "transparent",
                          color: "var(--text)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}
                      >{f.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <style>{`
            .blk-seg{ transition: background 130ms ease, color 130ms ease; }
            .blk-seg:hover:not(.is-active){ background: var(--surface-h); color: var(--text); }
            .blk-icon{ transition: background 130ms ease, color 130ms ease, border-color 130ms ease; }
            .blk-icon:hover{ background: var(--surface-h); color: var(--text); border-color: var(--border-strong); }
          `}</style>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.blocks.map((b, i) => {
              const weight = b.weight ?? "light";
              const kind: BlockKind = b.kind ?? "text";
              const copied = copiedKey === `block:${b.id}`;
              const copyErr = copiedKey === `err:block:${b.id}`;
              return (
                <div key={b.id} style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", overflow: "hidden" }}>
                  {/* Header — block identity + block-level actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 0" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Block {i + 1}{kind !== "text" && ` · ${BLOCK_KINDS.find((k) => k.key === kind)?.label}`}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <IconButton
                        onClick={() => saveBlockAsSnippet(b)}
                        title="Save this block as a reusable snippet"
                        active={savingSnippetFor === b.id}
                      >
                        {savingSnippetFor === b.id ? <Spinner size={12} /> : <IcBookmarkPlus />}
                      </IconButton>
                      <IconButton onClick={() => copyText(`block:${b.id}`, b.body)} title="Copy block text" active={copied}>
                        {copied ? <IcCheck /> : copyErr ? <span style={{ fontSize: 12, fontWeight: 700 }}>!</span> : <IcCopy />}
                      </IconButton>
                      <IconButton onClick={() => removeBlock(b.id)} title="Delete block"><IcTrash /></IconButton>
                    </div>
                  </div>

                  {kind === "text" && (
                    <>
                      {/* Toolbar — alignment · italic · weight, grouped */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 10px" }}>
                        <div style={segWrap}>
                          <SegButton active={b.align === "left"} onClick={() => updateBlock(b.id, { align: "left" })} title="Align left"><IcAlignLeft /></SegButton>
                          <SegButton active={b.align === "center"} onClick={() => updateBlock(b.id, { align: "center" })} title="Align center" last><IcAlignCenter /></SegButton>
                        </div>
                        <div style={segWrap}>
                          <SegButton active={!!b.italic} onClick={() => updateBlock(b.id, { italic: !b.italic })} title="Italic" last>
                            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 13, fontWeight: 600 }}>I</span>
                          </SegButton>
                        </div>
                        <div style={{ ...segWrap, marginLeft: "auto" }}>
                          {BLOCK_WEIGHTS.map((w, wi) => (
                            <SegButton
                              key={w.key}
                              active={weight === w.key}
                              onClick={() => updateBlock(b.id, { weight: w.key })}
                              title={w.title}
                              last={wi === BLOCK_WEIGHTS.length - 1}
                            >{w.label}</SegButton>
                          ))}
                        </div>
                      </div>
                      {/* Body — supports **bold**, [text](url), and {{ merge_tags }} */}
                      <div style={{ padding: "0 10px 10px" }}>
                        <textarea
                          ref={insertHook.registerTextarea(b.id)}
                          onFocus={() => insertHook.onFocusBlock(b.id)}
                          value={b.body}
                          onChange={(e) => updateBlock(b.id, { body: e.target.value })}
                          rows={3}
                          placeholder="**bold**, [link text](url), {{ first_name }} all supported"
                          style={{ ...input, resize: "vertical", lineHeight: 1.55, fontSize: 12, background: "var(--bg)" }}
                        />
                      </div>
                    </>
                  )}

                  {kind === "stat" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        type="text"
                        value={b.statValue ?? ""}
                        onChange={(e) => updateBlock(b.id, { statValue: e.target.value })}
                        placeholder="e.g. 558 reviews"
                        style={{ ...input, fontSize: 12 }}
                      />
                      <input
                        type="text"
                        value={b.statLabel ?? ""}
                        onChange={(e) => updateBlock(b.id, { statLabel: e.target.value })}
                        placeholder="e.g. 91% five-star"
                        style={{ ...input, fontSize: 12 }}
                      />
                    </div>
                  )}

                  {kind === "discount" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        type="text"
                        value={b.discountCode ?? ""}
                        onChange={(e) => updateBlock(b.id, { discountCode: e.target.value })}
                        placeholder="e.g. SLEEP20"
                        style={{ ...input, fontSize: 12 }}
                      />
                      <input
                        type="text"
                        value={b.discountDescription ?? ""}
                        onChange={(e) => updateBlock(b.id, { discountDescription: e.target.value })}
                        placeholder="e.g. 20% off your first order"
                        style={{ ...input, fontSize: 12 }}
                      />
                    </div>
                  )}

                  {kind === "checklist" && (
                    <div style={{ padding: "8px 10px 10px" }}>
                      <textarea
                        value={(b.items ?? []).join("\n")}
                        onChange={(e) => updateBlock(b.id, { items: e.target.value.split("\n") })}
                        rows={4}
                        placeholder={"One benefit per line, e.g.\nMagnesium bisglycinate\nL-theanine\nApigenin"}
                        style={{ ...input, resize: "vertical", lineHeight: 1.55, fontSize: 12, background: "var(--bg)" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Images */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={sectionLabel}>Images</span>
            {content.images.length < 5 && <button style={miniBtn(false)} onClick={addImage}>+ Image</button>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.images.map((img) => {
              const label = img.role === "hero"
                ? "Hero image"
                : `Image ${secondaryImages.indexOf(img) + 2}`;
              return (
                <ImageSlotControl
                  key={img.id}
                  slot={img}
                  label={label}
                  topic={topic}
                  emailContext={emailContext}
                  onChange={updateImage}
                  onGenerated={(url) => markGenerated(img.id, url)}
                  // Hero carries the primary CTA overlay — no remove control,
                  // so it can't be silently dropped from the email.
                  onRemove={img.role === "hero" ? undefined : () => removeImage(img.id)}
                />
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div>
          <div style={sectionLabel}>Call to action</div>
          <label style={fieldLabel}>Button label</label>
          <input type="text" value={content.cta.label}
            onChange={(e) => patch({ cta: { ...latestContent.current.cta, label: e.target.value } })}
            style={{ ...input, marginBottom: 8 }} />
          <label style={fieldLabel}>Button link</label>
          <input type="text" value={content.cta.url}
            onChange={(e) => patch({ cta: { ...latestContent.current.cta, url: e.target.value } })}
            style={input} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button
            className="btn"
            onClick={save}
            disabled={saving}
            style={{ minWidth: 120, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            {saving && <Spinner size={13} color="var(--bg)" />}
            {saving ? "Saving…" : savedId ? "Saved ✓ Update" : "Save campaign"}
          </button>
          <span
            title={
              autosaveStatus === "saving" ? "Autosaving…"
              : autosaveStatus === "dirty" ? "Unsaved changes"
              : autosaveStatus === "saved" ? "Saved automatically"
              : ""
            }
            style={{ fontSize: 11, color: "var(--subtle)", display: "inline-flex", alignItems: "center", gap: 5, minWidth: 90 }}
          >
            {autosaveStatus === "saving" && (<><Spinner size={10} />Saving…</>)}
            {autosaveStatus === "dirty" && "Unsaved changes"}
            {autosaveStatus === "saved" && "Saved just now"}
          </span>
          <div style={{ display: "inline-flex", gap: 2, borderLeft: "1px solid var(--border)", paddingLeft: 8, marginLeft: 2 }}>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (⌘Z)"
              style={{
                width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)",
                color: canUndo ? "var(--text)" : "var(--subtle)", cursor: canUndo ? "pointer" : "default",
                fontFamily: "inherit", fontSize: 13, opacity: canUndo ? 1 : 0.5,
              }}
            >↺</button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (⌘⇧Z)"
              style={{
                width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)",
                color: canRedo ? "var(--text)" : "var(--subtle)", cursor: canRedo ? "pointer" : "default",
                fontFamily: "inherit", fontSize: 13, opacity: canRedo ? 1 : 0.5,
              }}
            >↻</button>
          </div>
          <button className="btn-ghost" onClick={exportHtml}>↓ Export HTML</button>
          <button className="btn-ghost" onClick={copyHtml}>📋 {copyLabel}</button>
          <button
            className="btn-ghost"
            onClick={improveWithClaude}
            disabled={improveBusy}
            title="Rewrite the subject and body copy in Lunia voice. Images and links are left unchanged; you can revert."
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {improveBusy && <Spinner size={13} />}
            {improveBusy ? "Improving…" : "✨ Improve with Claude"}
          </button>
          {preImprove && !improveBusy && (
            <button
              className="btn-ghost"
              onClick={revertImprove}
              title="Restore the original imported copy"
            >
              ↩ Revert
            </button>
          )}
          <button
            className="btn-ghost"
            onClick={pushToKlaviyo}
            disabled={klaviyoBusy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {klaviyoBusy && <Spinner size={13} />}
            {klaviyoBusy ? "Pushing…" : "🚀 Push to Klaviyo"}
          </button>
          {klaviyoResult && (
            <a
              href={klaviyoResult.editorUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens this template directly in the Klaviyo editor."
              style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "underline" }}
            >
              Open in Klaviyo →
            </a>
          )}
          {klaviyoError && <span style={{ fontSize: 12, color: "var(--error)" }}>{klaviyoError}</span>}
          {improveError && <span style={{ fontSize: 12, color: "var(--error)" }}>{improveError}</span>}
          {saveError && <span style={{ fontSize: 12, color: "var(--error)" }}>{saveError}</span>}
        </div>
      </div>
    </div>
  );
}
