"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CAMPAIGN_BLOCK_KINDS } from "@/lib/types";
import { BRAND_COLOR_ROLES, BRAND_ROLE_LABELS } from "@/lib/campaign-theme";
import BlockImageControl from "./BlockImageControl";
import InlineStyleToolbar from "./InlineStyleToolbar";
import { useAssets, pickSampleImageUrl } from "./useAssets";
import { sampleBlock, emptyBlock } from "@/lib/campaign-block-samples";
import { stripInlineTokens } from "@/lib/campaign-inline-style";
import { withImagePrompt, suggestImagePrompt, blockOwnText, type EmailImageContext } from "@/lib/campaign-image-prompt";
import { clampHeroCta } from "@/lib/campaign-editor-state";
import type { CampaignContent, CampaignBlock, CampaignImageSlot, CampaignSnippet, CampaignBlockKind } from "@/lib/types";
import { renderCampaignEmail } from "@/lib/campaign-email-html";
import ImageSlotControl from "./ImageSlotControl";
import { Spinner, BlockSkeleton } from "./Loaders";
import { useInsertAtCursor } from "./useInsertAtCursor";
import { PRODUCT } from "@/lib/lunia-brand-guidelines";
import { getSubjectLineHints } from "@/lib/subject-line-hints";
import { CAMPAIGN_LAYOUT_PRESETS, type CampaignLayoutPreset } from "@/lib/campaign-layout-presets";
import { layoutBlockToCampaignBlock, blocksToSourceText } from "@/lib/campaign-layout-prompts";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Section } from "@/components/ui/Section";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import {
  IcAlignLeft, IcAlignCenter, IcCopy, IcCheck, IcTrash, IcBookmarkPlus, IcDragHandle,
  IcChevron, IcDownload, IcSend, IcUndo, IcRedo, IcRefresh, IcPlus,
} from "@/components/ui/icons";
import {
  reorderBlocks, applyUndo, applyRedo, applySuggestion, type SuggestionMode,
  completionItems as computeCompletionItems,
} from "@/lib/campaign-editor-state";

type BlockKind = CampaignBlockKind;

/** Menu metadata for every block kind. A Record keyed on the kind union rather
 *  than a hand-ordered array, so adding a kind to CAMPAIGN_BLOCK_KINDS without
 *  giving it a label fails the build — the array form would have compiled fine
 *  and just quietly omitted it from the "+ Block" menu. Display order lives
 *  separately in BLOCK_KIND_ORDER. */
const BLOCK_KIND_META: Record<BlockKind, { label: string; title: string }> = {
  text: { label: "Text", title: "A paragraph block" },
  stat: { label: "Stat", title: "A big-number stat callout" },
  discount: { label: "Discount", title: "A discount/coupon callout, or a value-stack price" },
  checklist: { label: "Checklist", title: "A bulleted benefit/ingredient list" },
  testimonial: { label: "Testimonial", title: "A star rating + review quote + attribution" },
  timeline: { label: "Timeline", title: "A results-over-time progression (e.g. Day 30, Day 60...)" },
  trustgrid: { label: "Trust grid", title: "A 2-column grid of image + caption trust points" },
  comparison: { label: "Comparison", title: "A one-time vs subscribe side-by-side comparison" },
  ingredients: { label: "Ingredients", title: "A supplement-facts panel: ingredient name + dose rows" },
  image: { label: "Image", title: "An image placed here in the flow — full width, edge-to-edge, or beside copy" },
  table: { label: "Table", title: "A comparison or pricing table, 2 to 4 columns, with one row emphasised" },
  imagetext: { label: "Image + text", title: "A picture beside copy, on either side, stacking on mobile" },
  imagebullets: { label: "Image + bullets", title: "A picture beside a bulleted list with a colour you choose" },
  grid: { label: "Grid", title: "A 2-column grid of picture + heading + caption, each able to generate its own image" },
  headerimage: { label: "Header image", title: "A header treatment that replaces the hero: headline card over the image, or highlighted headline above it" },
};

/** Menu order. Defaults to declaration order in CAMPAIGN_BLOCK_KINDS; listing
 *  it explicitly keeps presentation order independent of the type registry. */
const BLOCK_KIND_ORDER: readonly BlockKind[] = CAMPAIGN_BLOCK_KINDS;

const BLOCK_KINDS: { key: BlockKind; label: string; title: string }[] = BLOCK_KIND_ORDER.map(
  (key) => ({ key, ...BLOCK_KIND_META[key] }),
);

/** Layout options for a kind:"image" block. "column" is the default because
 *  it is the one people reach for: the full content width, not the half-width
 *  square the fixed 2-up grid produces. */
const IMAGE_LAYOUTS: { key: NonNullable<CampaignBlock["imageLayout"]>; label: string; title: string }[] = [
  { key: "column", label: "Full width", title: "Spans the 552px content column" },
  { key: "bleed", label: "Full bleed", title: "Edge-to-edge across the whole 600px shell, no side padding" },
  { key: "split", label: "Split", title: "Half image, half copy — stacks on mobile" },
];

// Prefilled Lunia formula for a new ingredients block — editable, so it's one
// tweak instead of typing the whole label from scratch.

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

/** One-line preview text for a block of any kind, used in the pending-
 *  suggestion review list and the regenerate-alternates picker. */
function blockPreviewText(b: CampaignBlock): string {
  return stripInlineTokens(
    b.body ||
    b.statValue ||
    b.discountDescription ||
    b.testimonialQuote ||
    b.items?.join(", ") ||
    b.timelineRows?.map((r) => r.label).join(", ") ||
    b.trustItems?.map((t) => t.caption).join(", ") ||
    b.ingredientItems?.map((it) => it.name).join(", ") ||
    b.comparisonLeftLabel ||
    b.imageHeading ||
    b.headerHeadline ||
    b.headerPillText ||
    b.bulletItems?.filter(Boolean).join(", ") ||
    b.tableHeaders?.filter(Boolean).join(" / ") ||
    b.gridCells?.map((c) => c.heading ?? c.caption).filter(Boolean).join(", ") ||
    (b.kind === "image"
      ? [b.imageOverlayHeadline, b.imageSplitText].find((t) => t?.trim()) ?? "Image"
      : "") ||
    "—"
  );
}

// Section/field labels — --muted (not --subtle) at 11/12px so they clear
// WCAG AA and read as structure, not disabled captions.
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
};
const fieldLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 4,
};
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontSize: 13,
  fontFamily: "inherit", color: "var(--text)", padding: "8px 12px",
  borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)",
};
// Secondary text-button, sized for real clicking (min-height 32px, 12px text,
// --text at rest so it never reads as disabled). `active` = selected state
// (accent-dim wash + accent border), distinct from a solid primary Button.
const miniBtn = (active = false): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  minHeight: 32, padding: "0 12px", fontSize: 12, fontWeight: 500,
  border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
  background: active ? "var(--accent-dim)" : "transparent",
  color: active ? "var(--text)" : "var(--text)",
  borderRadius: 4, cursor: "pointer", fontFamily: "inherit", lineHeight: 1,
  whiteSpace: "nowrap",
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

/** A named, individually-collapsible group of controls — Header / Images /
 *  Actions. 1px-border/no-shadow card language, a chevron + label, not a
 *  Monday-style colored header bar. Collapse state is a plain local toggle
 *  (defaultCollapsed seeds the initial value from the gating rule) rather
 *  than something that re-collapses out from under the user mid-edit. */

/** Shared "add/remove row" list editor for block kinds whose content is an
 *  array of small multi-field records (timeline's {label,text}, trust
 *  grid's {imageUrl,caption}) — checklist's textarea-as-lines trick doesn't
 *  generalize past a single field per line, so this is the one reusable
 *  pattern for both. */
function RepeatableRows<T extends Record<string, string>>({
  rows, fields, onChange, addLabel = "+ Row",
}: {
  rows: T[];
  fields: { key: keyof T; placeholder: string }[];
  onChange: (next: T[]) => void;
  addLabel?: string;
}) {
  function updateRow(i: number, patch: Partial<T>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function addRow() {
    const blank = Object.fromEntries(fields.map((f) => [f.key, ""])) as T;
    onChange([...rows, blank]);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {fields.map((f) => (
            <input
              key={String(f.key)}
              type="text"
              value={row[f.key] ?? ""}
              onChange={(e) => updateRow(i, { [f.key]: e.target.value } as Partial<T>)}
              placeholder={f.placeholder}
              style={{ ...input, fontSize: 12, flex: 1 }}
            />
          ))}
          <IconButton onClick={() => removeRow(i)} title="Remove row"><IcTrash /></IconButton>
        </div>
      ))}
      <button type="button" onClick={addRow} style={{ ...miniBtn(false), alignSelf: "flex-start" }}>{addLabel}</button>
    </div>
  );
}

/** A restructure produced elsewhere (the flow-level "Make it all visual"
 *  batch) and handed to this editor to review. Seeds the same pending-review
 *  path a locally-triggered restructure uses, so there is exactly one review
 *  UI and one apply path regardless of where the suggestion came from. */
export type SeededPending = {
  blocks: CampaignBlock[];
  meta: { topBanner?: string; promoBand?: string; ctaLabel?: string };
  mode: SuggestionMode;
};

export default function CampaignEditor({
  topic,
  content,
  savedId,
  onChange,
  onSaved,
  initialPending = null,
  onPendingResolved,
}: {
  topic: string;
  content: CampaignContent;
  savedId: string | null;
  onChange: (next: CampaignContent) => void;
  onSaved: (id: string) => void;
  /** Read once, on mount. FlowDeck remounts this component per email via
   *  `key`, so a per-email seeded review lands exactly where it belongs. */
  initialPending?: SeededPending | null;
  /** Fired when a seeded review is accepted or discarded, so the owner can
   *  drop it and not re-seed it on the next remount. */
  onPendingResolved?: () => void;
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
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [pendingBlocks, setPendingBlocks] = useState<{ block: CampaignBlock; included: boolean }[] | null>(
    initialPending
      ? initialPending.blocks.map((block) => ({
          // Seeded by the flow-level batch, which does not know this email's
          // context. Fill any missing prompt so every image block in the
          // review is ready to generate, same as a local restructure.
          block: withImagePrompt(block, {
            subject: content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "",
            topic,
            copy: content.blocks.map((b) => b.body).filter(Boolean),
          }),
          included: true,
        }))
      : null,
  );
  const [pendingMeta, setPendingMeta] = useState<{ topBanner?: string; promoBand?: string; ctaLabel?: string }>(
    initialPending?.meta ?? {},
  );
  // How the pending suggestion will be applied. "append" is Suggest layout and
  // the presets; "replace" is Make it visual, which re-expresses the copy that
  // is already there and would duplicate every paragraph if it appended.
  const [pendingMode, setPendingMode] = useState<SuggestionMode>(initialPending?.mode ?? "append");
  // Shared with AssetPicker, so this costs one request per session. Used only
  // to give a newly-added block a picture without spending a generation.
  const assets = useAssets();
  const [restructureBusy, setRestructureBusy] = useState(false);
  const [restructureStyle, setRestructureStyle] = useState<"default" | "editorial">("default");
  const [restructureError, setRestructureError] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [regenBusyId, setRegenBusyId] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenAlternates, setRegenAlternates] = useState<{ blockId: string; alternates: CampaignBlock[] } | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  // Snapshot of the content taken right before an "Improve with Claude" rewrite,
  // so the user can revert to the verbatim import. Null when there's nothing to
  // revert to.
  const [preImprove, setPreImprove] = useState<CampaignContent | null>(null);
  // Autosave — "idle" before any edit this session, "dirty" while a debounced
  // save is pending, "saving" mid-request, "saved" once it lands. Manual Save
  // (below) and autosave share the same /api/campaign/save call and status.
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  // Bumped each time autosaveStatus transitions to "saved", so the checkmark
  // pulse (120-150ms hover-state timing convention, no new motion
  // vocabulary) replays on every save, not just the first.
  const [saveConfirmTick, setSaveConfirmTick] = useState(0);
  useEffect(() => {
    if (autosaveStatus === "saved") setSaveConfirmTick((t) => t + 1);
  }, [autosaveStatus]);
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
    const step = applyUndo(undoStackRef.current, redoStackRef.current, latestContent.current);
    if (!step) return;
    undoStackRef.current = step.undoStack;
    redoStackRef.current = step.redoStack;
    commit(step.content, { fromHistory: true });
    setHistoryVersion((v) => v + 1);
  }
  function redo() {
    const step = applyRedo(undoStackRef.current, redoStackRef.current, latestContent.current);
    if (!step) return;
    undoStackRef.current = step.undoStack;
    redoStackRef.current = step.redoStack;
    commit(step.content, { fromHistory: true });
    setHistoryVersion((v) => v + 1);
  }
  const canUndo = historyVersion >= 0 && (undoStackRef.current.length > 0 || pendingUndoSnapshotRef.current !== null);
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;

  // Cmd+Z / Cmd+Shift+Z (undo/redo, pre-existing), plus Cmd+Shift+N (new
  // block), Cmd+D (duplicate block), Cmd+S (save) — all new shortcuts added
  // by this redesign. Not scoped to "not inside a textarea" — these are
  // controlled React inputs, so the browser's own per-field undo history is
  // already unreliable for them; app-level shortcuts taking over (same as
  // Notion/Figma) is the right default. Every branch preventDefault()s so
  // none fall through to the browser (bookmark dialog for Cmd+D, save-page
  // dialog for Cmd+S).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (key === "n" && e.shiftKey) {
        e.preventDefault();
        addBlock("text");
      } else if (key === "d") {
        e.preventDefault();
        duplicateFocusedBlock();
      } else if (key === "s") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const html = useMemo(() => renderCampaignEmail(content), [content]);

  // Rendered before/after for a pending RESTRUCTURE. Built from the real
  // renderer, not an approximation, because this diff is the only thing
  // standing between a hallucinated number and a live send: fact preservation
  // in the restructure prompt is not enforced in code. Only computed while a
  // replace-mode suggestion is open, so the normal edit loop pays nothing.
  const restructureDiff = useMemo(() => {
    if (!pendingBlocks || pendingMode !== "replace") return null;
    const after = applySuggestion(content, pendingBlocks, pendingMeta, "replace");
    return { before: renderCampaignEmail(content), after: renderCampaignEmail(after) };
  }, [pendingBlocks, pendingMode, pendingMeta, content]);

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
    // An iframe is its own scrolling context — a mouse wheel over it never
    // bubbles to the parent page, so with the cursor anywhere over the
    // preview, scrolling silently does nothing (the preview itself has no
    // internal overflow to consume the gesture either, since it's sized to
    // fit its content exactly). Forward the wheel delta to the outer page
    // so scrolling over the preview scrolls the editor like everywhere
    // else. The iframe is fully remounted (new `key`) on every content
    // change, so this listener never needs manual cleanup.
    f.contentDocument.addEventListener(
      "wheel",
      (e: WheelEvent) => window.scrollBy(e.deltaX, e.deltaY),
      { passive: true },
    );
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
  /** `changes` may be an updater, which receives the block as it is RIGHT NOW.
   *
   *  Use the updater form for anything that rebuilds an array (grid cells,
   *  table rows). The plain-object form closes over whatever the array looked
   *  like when the component last rendered, which is fine for a keystroke but
   *  silently wrong across an await: two grid cells generating at once both
   *  captured the same empty array, so whichever image finished second wrote
   *  its cell into that stale array and erased the first one. */
  function updateBlock(
    id: string,
    changes: Partial<CampaignBlock> | ((prev: CampaignBlock) => Partial<CampaignBlock>),
  ) {
    const c = latestContent.current;
    commit({
      ...c,
      blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...(typeof changes === "function" ? changes(b) : changes) } : b)),
    });
  }
  function removeBlock(id: string) {
    const c = latestContent.current;
    // An image block owns its slot exclusively — drop both together so a
    // deleted block can't strand an orphan slot that would silently reappear
    // in the fixed 2-up grid.
    const gone = c.blocks.find((b) => b.id === id);
    const orphanSlotId = gone?.kind === "image" ? gone.imageSlotId : undefined;
    commit({
      ...c,
      blocks: c.blocks.filter((b) => b.id !== id),
      images: orphanSlotId ? c.images.filter((i) => i.id !== orphanSlotId) : c.images,
    });
  }
  // New blocks arrive filled in. An empty block asks you to picture the result
  // before you can judge it; a seeded one lets you say yes, no, or nudge. The
  // content is real brand fact drawn from PRODUCT (the one exception being the
  // testimonial, which is visibly placeholder — see campaign-block-samples).
  //
  // The picture comes from the asset library, never from a generation: a click
  // that adds a block must not spend one.
  /** What this email is about, for writing an image prompt that belongs to it
   *  rather than to wellness in general. */
  function emailImageContext(c: CampaignContent): EmailImageContext {
    return {
      subject: c.subjectLines[c.selectedSubject] ?? c.subjectLines[0] ?? "",
      topic,
      copy: c.blocks.map((b) => b.body).filter(Boolean),
    };
  }

  function addBlock(kind: BlockKind = "text") {
    const c = latestContent.current;
    // The picture is NOT generated here: the block arrives with a prompt
    // written from this email's own copy, and Generate stays a deliberate
    // press on the block itself.
    const base = withImagePrompt(sampleBlock(kind, newId(), pickSampleImageUrl(assets)), emailImageContext(c));
    // An image block places a slot rather than owning an image itself, so it
    // is created together with the slot it points at — one commit, one undo
    // step, and the slot keeps working with the existing ImageSlotControl.
    if (kind === "image") {
      const slot: CampaignImageSlot = {
        id: newId(), role: "secondary", source: "generated", aspect: "16:9", prompt: "", url: null,
      };
      base.imageSlotId = slot.id;
      commit({ ...c, blocks: [...c.blocks, base], images: [...c.images, slot] });
      return;
    }
    commit({ ...c, blocks: [...c.blocks, base] });
  }

  /** Accept the starter content as your own: drops the Sample chip, changes
   *  nothing about the copy. */
  function keepSample(id: string) {
    updateBlock(id, { isSample: undefined });
  }

  /** Reset the block to the empty shape it would have had before samples
   *  existed. Not a delete — the block stays, its starter copy goes. */
  function clearSample(id: string) {
    const c = latestContent.current;
    const b = c.blocks.find((x) => x.id === id);
    if (!b) return;
    const cleared = emptyBlock(b.kind ?? "text", b.id);
    // An image block keeps its slot pointer: the slot lives in content.images
    // and clearing the copy must not orphan it.
    if (b.kind === "image") cleared.imageSlotId = b.imageSlotId;
    commit({ ...c, blocks: c.blocks.map((x) => (x.id === id ? cleared : x)) });
  }
  // Duplicates the currently-focused block (Cmd+D), falling back to the last
  // block so the shortcut still does something useful with nothing focused.
  function duplicateFocusedBlock() {
    const c = latestContent.current;
    if (c.blocks.length === 0) return;
    const id = insertHook.focusedId.current ?? c.blocks[c.blocks.length - 1]!.id;
    const idx = c.blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy: CampaignBlock = { ...c.blocks[idx]!, id: newId() };
    // Two blocks pointing at one slot would share a url and delete each
    // other's image — give the copy its own slot.
    let images = c.images;
    if (copy.kind === "image" && copy.imageSlotId) {
      const src = c.images.find((i) => i.id === copy.imageSlotId);
      if (src) {
        const clone: CampaignImageSlot = { ...src, id: newId() };
        copy.imageSlotId = clone.id;
        images = [...c.images, clone];
      }
    }
    const next = [...c.blocks];
    next.splice(idx + 1, 0, copy);
    commit({ ...c, blocks: next, images });
  }
  // Native HTML5 drag-and-drop reorder. One commit() call with the
  // reordered array produces one undo entry, same as removeBlock.
  function reorderBlock(draggedId: string, overId: string) {
    const c = latestContent.current;
    const next = reorderBlocks(c.blocks, draggedId, overId);
    if (next === c.blocks) return; // no-op drag
    commit({ ...c, blocks: next });
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
    const placed = new Set(
      c.blocks.filter((b) => b.kind === "image" && b.imageSlotId).map((b) => b.imageSlotId!),
    );
    if (c.images.filter((i) => !placed.has(i.id)).length >= 5) return;
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

  // Suggests a full block-by-block layout from the current subject line.
  // Never writes into content.blocks directly — lands in pendingBlocks for
  // per-block Accept/Skip review first (see the review UI in the render).
  async function suggestLayout() {
    if (layoutBusy) return;
    const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
    if (!subject.trim()) {
      setLayoutError("Type a subject line first.");
      return;
    }
    setLayoutBusy(true);
    setLayoutError(null);
    try {
      const res = await fetch("/api/campaign/suggest-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.blocks)) {
        setLayoutError(data.error ?? "Suggestion failed");
        return;
      }
      setPendingBlocks((data.blocks as CampaignBlock[]).map((block) => ({ block, included: true })));
      setPendingMeta({ topBanner: data.topBanner, promoBand: data.promoBand, ctaLabel: data.ctaLabel });
      setPendingMode("append");
      setTemplatePickerOpen(false);
    } catch (err) {
      setLayoutError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLayoutBusy(false);
    }
  }

  // Presets skip the LLM call but share the exact same pending-review shape
  // and apply path as an AI suggestion.
  function applyPreset(preset: CampaignLayoutPreset) {
    setPendingBlocks(preset.blocks.map((b) => ({ block: layoutBlockToCampaignBlock(b), included: true })));
    setPendingMeta({ topBanner: preset.topBanner, promoBand: preset.promoBand, ctaLabel: preset.ctaLabel });
    setPendingMode("append");
    setTemplatePickerOpen(false);
    setLayoutError(null);
  }

  // "Make it visual": re-expresses the copy already in the email as a richer
  // set of blocks. Lands in the SAME pending-review path as suggestLayout, but
  // in "replace" mode — the restructured blocks carry the same words, so
  // appending them would duplicate the whole email.
  //
  // Fact preservation is prompt-only (the code-enforced verifier was cut in the
  // 2026-08-21 CEO review), which is exactly why this never applies silently:
  // the rendered before/after diff below is the only check that the model did
  // not invent a number.
  async function restructureBlocks(style: "default" | "editorial" = "default") {
    if (restructureBusy) return;
    const c = latestContent.current;
    const subject = c.subjectLines[c.selectedSubject] ?? c.subjectLines[0] ?? "";
    setRestructureBusy(true);
    setRestructureError(null);
    try {
      setRestructureStyle(style);
      const res = await fetch("/api/campaign/restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: c.blocks, subject, topic, style }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.blocks)) {
        setRestructureError(data.error ?? "Restructure failed");
        return;
      }
      // The model supplies imagePrompt for image kinds; fill in any it left
      // empty so every image block in the review is ready to generate.
      const ctx = emailImageContext(c);
      setPendingBlocks(
        (data.blocks as CampaignBlock[]).map((block) => ({ block: withImagePrompt(block, ctx), included: true })),
      );
      setPendingMeta({ topBanner: data.topBanner, promoBand: data.promoBand, ctaLabel: data.ctaLabel });
      setPendingMode("replace");
      setTemplatePickerOpen(false);
    } catch (err) {
      setRestructureError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRestructureBusy(false);
    }
  }

  function togglePendingBlock(index: number) {
    setPendingBlocks((prev) => prev && prev.map((p, i) => (i === index ? { ...p, included: !p.included } : p)));
  }

  // Applies every included pending block as ONE undo/redo snapshot (a single
  // commit() call with the full new blocks array), same reasoning as
  // drag-and-drop reorder — not one commit per accepted block.
  function acceptPendingBlocks() {
    if (!pendingBlocks) return;
    commit(applySuggestion(latestContent.current, pendingBlocks, pendingMeta, pendingMode));
    setPendingBlocks(null);
    setPendingMeta({});
    setPendingMode("append");
    onPendingResolved?.();
  }

  function discardPendingBlocks() {
    setPendingBlocks(null);
    setPendingMeta({});
    setPendingMode("append");
    onPendingResolved?.();
  }

  // Fetches 3 alternates for one block from the AI and opens a small picker.
  async function regenerateBlock(block: CampaignBlock) {
    if (regenBusyId) return;
    setRegenBusyId(block.id);
    setRegenError(null);
    const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
    const { id: _id, ...currentFields } = block;
    void _id;
    try {
      const res = await fetch("/api/campaign/regenerate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: block.kind ?? "text", currentFields, subject, topic }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.alternates)) {
        setRegenError(data.error ?? "Regeneration failed");
        return;
      }
      setRegenAlternates({ blockId: block.id, alternates: data.alternates });
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRegenBusyId(null);
    }
  }

  function pickRegeneratedAlternate(alternate: CampaignBlock) {
    if (!regenAlternates) return;
    const { id: _id, ...fields } = alternate;
    void _id;
    updateBlock(regenAlternates.blockId, fields);
    setRegenAlternates(null);
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
      setCopyLabel("Copied");
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

  // Slots placed by a kind:"image" block are edited inside that block's card,
  // so the Images section lists only the hero and the unplaced secondaries
  // that still render in the fixed 2-up grid. Listing both would give one
  // image two independent-looking controls.
  const placedSlotIds = new Set(
    content.blocks.filter((b) => b.kind === "image" && b.imageSlotId).map((b) => b.imageSlotId!),
  );
  const unplacedImages = content.images.filter((i) => !placedSlotIds.has(i.id));
  const secondaryImages = unplacedImages.filter((i) => i.role === "secondary");

  // Collapse gates (checked once on mount, then a plain manual toggle —
  // re-collapsing live under an in-progress edit would fight the user).
  const activeSubjectLine = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
  const heroImageFilled = content.images.some((i) => i.role === "hero" && !!i.url);
  const headerDefaultCollapsed = !!activeSubjectLine.trim() && heroImageFilled;
  const imagesDefaultCollapsed = heroImageFilled;

  // Completion indicator — derived purely from content (see campaign-editor-state.ts).
  const completionItems = computeCompletionItems(content);

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
        {/* Completion indicator — text checklist, --success/--muted tokens,
            SVG check / empty ring (no emoji). */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, fontWeight: 500 }}>
          {completionItems.map((it) => (
            <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: it.done ? "var(--success)" : "var(--muted)" }}>
              {it.done
                ? <IcCheck size={14} />
                : <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>}
              {it.label}
            </span>
          ))}
        </div>

        <Section title="Header" defaultCollapsed={headerDefaultCollapsed}>
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
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
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
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Hide the logo strip at the top of the email</span>
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
              {subjectsBusy ? "Writing…" : "✨ Regenerate"}
            </button>
          </div>
          {subjectsError && <div style={{ marginBottom: 6, fontSize: 11, color: "var(--error)" }}>{subjectsError}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
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
                    style={{ ...miniBtn(copied), padding: "0 10px", flexShrink: 0 }}
                  >
                    {copied ? <IcCheck size={15} /> : errored ? <span style={{ fontSize: 12, fontWeight: 700 }}>!</span> : <IcCopy size={15} />}
                  </button>
                </div>
              );
            })}
          </div>
          {(() => {
            const activeSubject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "";
            const hints = getSubjectLineHints(activeSubject);
            if (hints.length === 0) return null;
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {hints.map((h) => (
                  <span key={h.id} style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 5,
                    border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)",
                  }}>{h.text}</span>
                ))}
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 6, position: "relative" }}>
            <Button
              variant="primary"
              onClick={suggestLayout}
              disabled={layoutBusy}
              title="Suggest a complete block-by-block layout from the subject line above"
              style={{ flex: 1 }}
            >
              {layoutBusy && <Spinner size={10} color="var(--bg)" />}
              {layoutBusy ? "Drafting…" : "✨ Suggest layout"}
            </Button>
            <button
              style={{ ...miniBtn(templatePickerOpen), flex: 1 }}
              onClick={() => setTemplatePickerOpen((v) => !v)}
              title="Apply a named starting-point layout"
            >
              Templates <IcChevron size={14} style={{ transform: templatePickerOpen ? "rotate(180deg)" : "none", transition: "transform 130ms ease" }} />
            </button>
            {templatePickerOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
                boxShadow: "none", overflow: "hidden",
              }}>
                {CAMPAIGN_LAYOUT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                      border: "none", borderBottom: "1px solid var(--border)", background: "transparent",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{preset.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{preset.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {layoutError && <div style={{ marginTop: 6, fontSize: 11, color: "var(--error)" }}>{layoutError}</div>}
          {layoutBusy && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <BlockSkeleton lines={1} />
              <BlockSkeleton lines={2} />
            </div>
          )}
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
              {copiedKey === "preview" ? <IcCheck size={15} /> : copiedKey === "err:preview" ? <span style={{ fontSize: 12, fontWeight: 700 }}>!</span> : <><IcCopy size={15} /> Copy</>}
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
        </Section>

        <Section title="Body" defaultCollapsed={false}>
        {/* Whole-email colour theme. Lives in Body because it is the only
            section that never auto-collapses: headerDefaultCollapsed and
            imagesDefaultCollapsed both close once the email has a subject and
            a hero, which is precisely when you would reach for this. */}
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>Email theme</label>
          <div style={segWrap}>
            <SegButton
              active={(content.theme ?? "navy") === "navy"}
              onClick={() => patch({ theme: "navy" })}
              title="Navy shell, white copy (default)"
            >Navy</SegButton>
            <SegButton
              active={content.theme === "cream"}
              onClick={() => patch({ theme: "cream" })}
              title="Soft Ivory background with dark copy, the brand handbook's light treatment"
              last
            >Cream</SegButton>
          </div>
          {/* The matching note in the CTA block lives in the Images section,
              which auto-collapses once a hero image exists — i.e. exactly when
              someone is likely to switch themes. Repeat it here, where the
              switch actually happened, so the disabled CTA control is never
              unexplained. */}
          {content.theme === "cream" && (
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
              On cream the CTA is always navy, for contrast. Your Cream/Navy button
              choice is kept and returns if you switch back.
            </div>
          )}
        </div>
        {/* Make it visual — restructures the copy ALREADY in this email into a
            richer block layout. Lives here rather than next to "Suggest layout"
            (which sits in Header, because it is driven by the subject line):
            this one reads content.blocks, so it belongs with the blocks. Also
            deliberately not in FlowDeck — FlowDeck only exists during an import
            session, so a campaign reopened from the gallery could never reach
            it. The sparkle is DESIGN.md's sanctioned exception for
            LLM-triggering buttons. */}
        {(() => {
          const enough = blocksToSourceText(content.blocks).length >= 40;
          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  style={{ ...miniBtn(false), flex: 1, justifyContent: "center", opacity: enough ? 1 : 0.45 }}
                  onClick={() => restructureBlocks("default")}
                  disabled={restructureBusy || !enough}
                  title={
                    enough
                      ? "Re-express this email's existing copy as a richer block layout. Nothing is applied until you review the before/after."
                      : "Write the email body first, then make it visual"
                  }
                >
                  {restructureBusy && restructureStyle === "default" && <Spinner size={10} color="var(--text)" />}
                  {restructureBusy && restructureStyle === "default" ? "Restructuring…" : "✨ Make it visual"}
                </button>
                {/* The dense, image-led shape the big DTC supplement brands
                    use, in Lunia's voice and palette: a header image, then
                    alternating picture-and-copy rows, and almost no bare
                    paragraphs. Same copy rules as the plain version. */}
                <button
                  style={{ ...miniBtn(false), flex: 1, justifyContent: "center", opacity: enough ? 1 : 0.45 }}
                  onClick={() => restructureBlocks("editorial")}
                  disabled={restructureBusy || !enough}
                  title={
                    enough
                      ? "Same copy, laid out AG1-style in Lunia's branding: header image, alternating image-and-text rows, coloured bullets. Nothing is applied until you review it."
                      : "Write the email body first, then make it visual"
                  }
                >
                  {restructureBusy && restructureStyle === "editorial" && <Spinner size={10} color="var(--text)" />}
                  {restructureBusy && restructureStyle === "editorial" ? "Restructuring…" : "✨ AG1 style"}
                </button>
              </div>
              {restructureError && (
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--error)" }}>{restructureError}</div>
              )}
            </div>
          );
        })()}
        {/* The review panel lives in Body, not Header, even though "Suggest
            layout" (its other producer) sits in Header: what it reviews is
            BLOCKS, and Header is collapsed by default — a review rendered
            there is a review nobody sees. */}

        {/* Pending layout suggestion — never written into content.blocks
            until accepted, so a suggestion never silently overwrites the
            existing body. */}
        {pendingBlocks && (
          <div style={{ border: "1px solid var(--accent)", borderRadius: 8, padding: 12, background: "var(--accent-dim)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ ...sectionLabel, marginBottom: 0 }}>
                {pendingMode === "replace"
                  ? "Restructured layout — this REPLACES the body"
                  : "Suggested layout — review before adding"}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={miniBtn(false)} onClick={() => setPendingBlocks((prev) => prev && prev.map((p) => ({ ...p, included: true })))}>Accept all</button>
                <button style={miniBtn(false)} onClick={discardPendingBlocks}>Discard all</button>
              </div>
            </div>
            {restructureDiff && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>
                  Same words, new structure. Check every number against the left
                  side before accepting — the restructure is not fact-checked in code.
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>
                  Image blocks arrive with a prompt already written from this
                  email&apos;s copy. Nothing is generated until you press Generate
                  on the block.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { key: "before", label: "Before", doc: restructureDiff.before },
                    { key: "after", label: "After", doc: restructureDiff.after },
                  ] as const).map((pane) => (
                    <div key={pane.key} style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 4,
                      }}>{pane.label}</div>
                      {/* 600px document scaled to the pane width. overflow:hidden
                          on the frame plus a fixed height keeps two full emails
                          glanceable side by side; the real preview pane on the
                          right is still the place to read one closely. */}
                      <div style={{
                        height: 260, overflow: "hidden", borderRadius: 6,
                        border: "1px solid var(--border)", background: "#ffffff",
                      }}>
                        <iframe
                          srcDoc={pane.doc}
                          title={`${pane.label} restructure`}
                          sandbox=""
                          scrolling="no"
                          style={{
                            width: 600, height: 1040, border: 0, display: "block",
                            transform: "scale(0.25)", transformOrigin: "top left",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {/* Staged reveal: each suggested block fades in with a stagger
                  (min(80ms, 500ms/blockCount) per block) as it lands — framed
                  as functional progress feedback per DESIGN.md's Decisions
                  Log, not decoration. A fade only, DESIGN.md's existing
                  220ms ease-out timing, no bounce/spring. */}
              {pendingBlocks.map((p, i) => (
                <label key={p.block.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
                  borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer",
                  animation: "fadeIn 220ms ease-out both",
                  animationDelay: `${i * Math.min(80, 500 / pendingBlocks.length)}ms`,
                }}>
                  <input type="checkbox" checked={p.included} onChange={() => togglePendingBlock(i)}
                    style={{ marginTop: 2, width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 2 }}>
                      {p.block.kind ?? "text"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {blockPreviewText(p.block)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <button
              style={{ ...miniBtn(true), width: "100%", justifyContent: "center" }}
              onClick={acceptPendingBlocks}
              disabled={!pendingBlocks.some((p) => p.included)}
            >
              {pendingMode === "replace"
                ? `Replace body with ${pendingBlocks.filter((p) => p.included).length} block${pendingBlocks.filter((p) => p.included).length === 1 ? "" : "s"}`
                : `Add ${pendingBlocks.filter((p) => p.included).length} block${pendingBlocks.filter((p) => p.included).length === 1 ? "" : "s"} to email`}
            </button>
          </div>
        )}
        {/* Blocks */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <span style={sectionLabel}>Text blocks</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
              <div style={{ position: "relative" }}>
                <button style={miniBtn(addBlockMenuOpen)} onClick={() => setAddBlockMenuOpen((v) => !v)}><IcPlus size={14} /> Block <IcChevron size={14} style={{ transform: addBlockMenuOpen ? "rotate(180deg)" : "none", transition: "transform 130ms ease" }} /></button>
                {addBlockMenuOpen && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "none", minWidth: 130, overflow: "hidden",
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
                  Snippets <IcChevron size={14} style={{ transform: snippetPickerOpen ? "rotate(180deg)" : "none", transition: "transform 130ms ease" }} />
                </button>
                {snippetPickerOpen && snippets.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "none", minWidth: 200, maxHeight: 240, overflowY: "auto",
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
                  Personalize <IcChevron size={14} style={{ transform: personalizationPickerOpen ? "rotate(180deg)" : "none", transition: "transform 130ms ease" }} />
                </button>
                {personalizationPickerOpen && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "none", minWidth: 180, overflow: "hidden",
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
                  Brand facts <IcChevron size={14} style={{ transform: brandFactsPickerOpen ? "rotate(180deg)" : "none", transition: "transform 130ms ease" }} />
                </button>
                {brandFactsPickerOpen && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 5,
                    background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 6,
                    boxShadow: "none", minWidth: 220, maxHeight: 260, overflowY: "auto",
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
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => setDraggedBlockId(b.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedBlockId) reorderBlock(draggedBlockId, b.id);
                    setDraggedBlockId(null);
                  }}
                  onDragEnd={() => setDraggedBlockId(null)}
                  style={{
                    border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", overflow: "hidden",
                    opacity: draggedBlockId === b.id ? 0.5 : 1,
                  }}
                >
                  {/* Header — block identity + block-level actions. Destructive
                      Delete is split to the right of a divider and rendered
                      `danger` so it reads destructive, distinct from the
                      benign snippet/copy/regenerate cluster. */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 0", gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      <span style={{ cursor: "grab", color: "var(--muted)", display: "inline-flex" }} title="Drag to reorder"><IcDragHandle size={16} /></span>
                      Block {i + 1}{kind !== "text" && ` · ${BLOCK_KINDS.find((k) => k.key === kind)?.label}`}
                      {/* Starter content still in place. The chip clears only
                          on an explicit Keep or Clear, never on the first
                          keystroke: a table has twelve cells, and editing one
                          of them does not make the other eleven yours. */}
                      {b.isSample && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span
                            title="This block still holds its starter content"
                            style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                              padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
                              border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)",
                            }}
                          >Sample</span>
                          <button
                            type="button"
                            onClick={() => keepSample(b.id)}
                            title="Keep this copy as your own and drop the Sample label"
                            style={{ ...miniBtn(false), fontSize: 10, padding: "2px 7px", letterSpacing: 0, textTransform: "none" }}
                          >Keep</button>
                          <button
                            type="button"
                            onClick={() => clearSample(b.id)}
                            title="Empty this block and start from scratch. The block stays."
                            style={{ ...miniBtn(false), fontSize: 10, padding: "2px 7px", letterSpacing: 0, textTransform: "none" }}
                          >Clear</button>
                        </span>
                      )}
                    </span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {kind !== "image" && (
                        <>
                          <IconButton
                            onClick={() => saveBlockAsSnippet(b)}
                            title="Save this block as a reusable snippet"
                            active={savingSnippetFor === b.id}
                          >
                            {savingSnippetFor === b.id ? <Spinner size={14} /> : <IcBookmarkPlus />}
                          </IconButton>
                          <IconButton onClick={() => copyText(`block:${b.id}`, b.body)} title="Copy block text" active={copied}>
                            {copied ? <IcCheck /> : copyErr ? <span style={{ fontSize: 13, fontWeight: 700 }}>!</span> : <IcCopy />}
                          </IconButton>
                          <IconButton onClick={() => regenerateBlock(b)} title="Regenerate this block with AI" active={regenBusyId === b.id}>
                            {regenBusyId === b.id ? <Spinner size={14} /> : <IcRefresh />}
                          </IconButton>
                        </>
                      )}
                      <span className="ui-divider-v" style={{ height: 24 }} />
                      <IconButton onClick={() => removeBlock(b.id)} title="Delete block" danger><IcTrash /></IconButton>
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
                      {/* Body — supports **bold**, [text](url), {{ merge_tags }},
                          and [[size,style,colour]]…[[/]] for styling a phrase. */}
                      <div style={{ padding: "0 10px 10px" }}>
                        <InlineStyleToolbar
                          blockId={b.id}
                          value={b.body}
                          onChange={(next) => updateBlock(b.id, { body: next })}
                          getSelection={insertHook.getSelection}
                          setSelection={insertHook.setSelection}
                          preserveSelectionOnClick={insertHook.preserveSelectionOnClick}
                        />
                        <AutoTextarea
                          registerRef={insertHook.registerTextarea(b.id)}
                          onFocus={() => insertHook.onFocusBlock(b.id)}
                          value={b.body}
                          onChange={(e) => updateBlock(b.id, { body: e.target.value })}
                          minHeight={64}
                          placeholder="**bold**, [link text](url), {{ first_name }} all supported"
                          style={{ ...input, lineHeight: 1.55, fontSize: 12, background: "var(--bg)" }}
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
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="text"
                          value={b.originalPrice ?? ""}
                          onChange={(e) => updateBlock(b.id, { originalPrice: e.target.value })}
                          placeholder="Original price, e.g. $87.99"
                          style={{ ...input, fontSize: 12, flex: 1 }}
                        />
                        <input
                          type="text"
                          value={b.newPrice ?? ""}
                          onChange={(e) => updateBlock(b.id, { newPrice: e.target.value })}
                          placeholder="New price, e.g. FREE"
                          style={{ ...input, fontSize: 12, flex: 1 }}
                        />
                      </div>
                    </div>
                  )}

                  {kind === "imagetext" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        type="text"
                        value={b.imageHeading ?? ""}
                        onChange={(e) => updateBlock(b.id, { imageHeading: e.target.value })}
                        placeholder="Heading, e.g. Energy you can count on"
                        style={{ ...input, fontSize: 12 }}
                      />
                      <div>
                        <InlineStyleToolbar
                          blockId={b.id}
                          value={b.body}
                          onChange={(next) => updateBlock(b.id, { body: next })}
                          getSelection={insertHook.getSelection}
                          setSelection={insertHook.setSelection}
                          preserveSelectionOnClick={insertHook.preserveSelectionOnClick}
                        />
                        <AutoTextarea
                          registerRef={insertHook.registerTextarea(b.id)}
                          onFocus={() => insertHook.onFocusBlock(b.id)}
                          value={b.body}
                          onChange={(e) => updateBlock(b.id, { body: e.target.value })}
                          minHeight={70}
                          placeholder="The copy beside the picture"
                          style={{ ...input, lineHeight: 1.55, fontSize: 12, background: "var(--bg)" }}
                        />
                      </div>
                      <div>
                        <label style={fieldLabel}>Image side</label>
                        <div style={segWrap}>
                          <SegButton active={(b.imagePosition ?? "left") === "left"} onClick={() => updateBlock(b.id, { imagePosition: "left" })} title="Picture on the left">Left</SegButton>
                          <SegButton active={b.imagePosition === "right"} onClick={() => updateBlock(b.id, { imagePosition: "right" })} title="Picture on the right. On mobile both stack, text first." last>Right</SegButton>
                        </div>
                      </div>
                      <BlockImageControl
                        imageUrl={b.imageUrl}
                        imagePrompt={b.imagePrompt}
                        aspect="1:1"
                        topic={topic}
                        suggestPrompt={() => suggestImagePrompt(b, emailImageContext(content))}
                        blockText={blockOwnText(b)}
                        emailContext={emailImageContext(content).copy?.join(" ")}
                        onChange={(patch) => updateBlock(b.id, patch)}
                      />
                    </div>
                  )}

                  {kind === "imagebullets" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <AutoTextarea
                        value={(b.bulletItems ?? []).join("\n")}
                        onChange={(e) => updateBlock(b.id, { bulletItems: e.target.value.split("\n") })}
                        minHeight={70}
                        placeholder={"One bullet per line, e.g.\nBoosts energy levels\nSupports immune health"}
                        style={{ ...input, lineHeight: 1.55, fontSize: 12, background: "var(--bg)" }}
                      />
                      <div>
                        <label style={fieldLabel}>Bullet colour</label>
                        {/* Roles, not hex. An off-brand colour is not
                            expressible, and a role that would be illegible on
                            the active theme is swapped at render time. */}
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {BRAND_COLOR_ROLES.map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => updateBlock(b.id, { bulletColor: b.bulletColor === role ? undefined : role })}
                              style={{ ...miniBtn(b.bulletColor === role), fontSize: 11 }}
                              title={`${BRAND_ROLE_LABELS[role]} bullets`}
                            >{BRAND_ROLE_LABELS[role]}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={fieldLabel}>Image side</label>
                        <div style={segWrap}>
                          <SegButton active={(b.imagePosition ?? "left") === "left"} onClick={() => updateBlock(b.id, { imagePosition: "left" })} title="Picture on the left">Left</SegButton>
                          <SegButton active={b.imagePosition === "right"} onClick={() => updateBlock(b.id, { imagePosition: "right" })} title="Picture on the right" last>Right</SegButton>
                        </div>
                      </div>
                      <BlockImageControl
                        imageUrl={b.imageUrl}
                        imagePrompt={b.imagePrompt}
                        aspect="1:1"
                        topic={topic}
                        suggestPrompt={() => suggestImagePrompt(b, emailImageContext(content))}
                        blockText={blockOwnText(b)}
                        emailContext={emailImageContext(content).copy?.join(" ")}
                        onChange={(patch) => updateBlock(b.id, patch)}
                      />
                    </div>
                  )}

                  {kind === "grid" && (() => {
                    const cells = b.gridCells ?? [];
                    // Updater form, NOT the render-time `cells`: image
                    // generation is async and two cells can be in flight at
                    // once, so this has to read the block as it is now.
                    const setCell = (i: number, patch: Partial<NonNullable<CampaignBlock["gridCells"]>[number]>) =>
                      updateBlock(b.id, (prev) => ({
                        gridCells: (prev.gridCells ?? []).map((c, j) => (j === i ? { ...c, ...patch } : c)),
                      }));
                    return (
                      <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {cells.map((c, i) => (
                          <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cell {i + 1}</span>
                              <div style={{ flex: 1 }} />
                              <IconButton onClick={() => updateBlock(b.id, (prev) => ({ gridCells: (prev.gridCells ?? []).filter((_, j) => j !== i) }))} title="Remove cell"><IcTrash /></IconButton>
                            </div>
                            <input type="text" value={c.heading ?? ""} onChange={(e) => setCell(i, { heading: e.target.value })} placeholder="Heading" style={{ ...input, fontSize: 12 }} />
                            <input type="text" value={c.caption ?? ""} onChange={(e) => setCell(i, { caption: e.target.value })} placeholder="Caption" style={{ ...input, fontSize: 12 }} />
                            <BlockImageControl
                              imageUrl={c.imageUrl}
                              imagePrompt={c.imagePrompt}
                              aspect="1:1"
                              topic={topic}
                              suggestPrompt={() => suggestImagePrompt({ kind: "grid", gridCells: [c] }, emailImageContext(content))}
                              blockText={blockOwnText({ kind: "grid", gridCells: [c] })}
                              emailContext={emailImageContext(content).copy?.join(" ")}
                              onChange={(patch) => setCell(i, patch)}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          style={{ ...miniBtn(false), alignSelf: "flex-start" }}
                          disabled={cells.length >= 6}
                          title={cells.length >= 6 ? "Six cells is the maximum" : "Add a cell"}
                          onClick={() => updateBlock(b.id, (prev) => ({ gridCells: [...(prev.gridCells ?? []), {}] }))}
                        >+ Cell</button>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>Two columns, stacking on mobile. Each cell can generate its own image from its own text.</div>
                      </div>
                    );
                  })()}

                  {kind === "headerimage" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                        This replaces the hero image at the top of the email while it has content.
                      </div>
                      <div>
                        <label style={fieldLabel}>Style</label>
                        <div style={segWrap}>
                          <SegButton active={(b.headerStyle ?? "card") === "card"} onClick={() => updateBlock(b.id, { headerStyle: "card" })} title="Headline in a panel overlapping the top of the image">Card</SegButton>
                          <SegButton active={b.headerStyle === "pill"} onClick={() => updateBlock(b.id, { headerStyle: "pill" })} title="Highlighted eyebrow and headline above the image" last>Pill</SegButton>
                        </div>
                      </div>
                      {b.headerStyle === "pill" && (
                        <input type="text" value={b.headerPillText ?? ""} onChange={(e) => updateBlock(b.id, { headerPillText: e.target.value })} placeholder="Highlighted eyebrow, e.g. PRO Move:" style={{ ...input, fontSize: 12 }} />
                      )}
                      <AutoTextarea
                        value={b.headerHeadline ?? ""}
                        onChange={(e) => updateBlock(b.id, { headerHeadline: e.target.value })}
                        minHeight={48}
                        placeholder="Headline"
                        style={{ ...input, lineHeight: 1.4, fontSize: 12, background: "var(--bg)" }}
                      />
                      {(b.headerStyle ?? "card") === "card" && (
                        <input type="text" value={b.headerSubcard ?? ""} onChange={(e) => updateBlock(b.id, { headerSubcard: e.target.value })} placeholder="Second card, optional, e.g. Make a PRO move." style={{ ...input, fontSize: 12 }} />
                      )}
                      <BlockImageControl
                        imageUrl={b.imageUrl}
                        imagePrompt={b.imagePrompt}
                        aspect="4:5"
                        topic={topic}
                        suggestPrompt={() => suggestImagePrompt(b, emailImageContext(content))}
                        blockText={blockOwnText(b)}
                        emailContext={emailImageContext(content).copy?.join(" ")}
                        onChange={(patch) => updateBlock(b.id, patch)}
                      />
                    </div>
                  )}

                  {kind === "table" && (() => {
                    // RepeatableRows does not fit here: it is typed for
                    // Record<string,string> rows, and a table row is a
                    // variable-length array whose width is set by the headers.
                    const headers = b.tableHeaders ?? ["", ""];
                    const rows = b.tableRows ?? [];
                    const cols = headers.length;
                    // Updater form throughout, same reasoning as the grid: an
                    // array rebuilt from a render-time closure is correct for a
                    // keystroke and wrong the moment anything async lands
                    // between the read and the write.
                    const setHeaders = (next: string[]) =>
                      updateBlock(b.id, (prev) => ({
                        tableHeaders: next,
                        // Keep every row exactly as wide as the header row, so
                        // changing the column count can never leave ragged data.
                        tableRows: (prev.tableRows ?? []).map((r) => ({
                          cells: Array.from({ length: next.length }, (_, i) => r.cells?.[i] ?? ""),
                        })),
                      }));
                    const setCell = (ri: number, ci: number, v: string) =>
                      updateBlock(b.id, (prev) => ({
                        tableRows: (prev.tableRows ?? []).map((r, i) =>
                          i === ri
                            ? { cells: Array.from({ length: cols }, (_, j) => (j === ci ? v : r.cells?.[j] ?? "")) }
                            : r,
                        ),
                      }));
                    return (
                      <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={fieldLabel}>Columns</label>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {headers.map((h, i) => (
                            <input
                              key={i}
                              type="text"
                              value={h}
                              onChange={(e) => setHeaders(headers.map((x, j) => (j === i ? e.target.value : x)))}
                              placeholder={i === 0 ? "Path" : "Per bottle"}
                              style={{ ...input, fontSize: 12, flex: 1, minWidth: 0 }}
                            />
                          ))}
                          <button
                            type="button"
                            style={{ ...miniBtn(false), flexShrink: 0 }}
                            disabled={cols >= 4}
                            title={cols >= 4 ? "Four columns is the maximum that stays readable at 600px" : "Add a column"}
                            onClick={() => setHeaders([...headers, ""])}
                          >+</button>
                          <button
                            type="button"
                            style={{ ...miniBtn(false), flexShrink: 0 }}
                            disabled={cols <= 2}
                            title={cols <= 2 ? "A table needs at least two columns" : "Remove the last column"}
                            onClick={() => setHeaders(headers.slice(0, -1))}
                          >-</button>
                        </div>

                        <label style={{ ...fieldLabel, marginTop: 4 }}>Rows</label>
                        {rows.map((r, ri) => (
                          <div key={ri} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={() => updateBlock(b.id, { tableEmphasisRow: b.tableEmphasisRow === ri ? undefined : ri })}
                              title={b.tableEmphasisRow === ri ? "Remove emphasis" : "Emphasise this row"}
                              style={{ ...miniBtn(b.tableEmphasisRow === ri), flexShrink: 0, width: 26, justifyContent: "center" }}
                            >★</button>
                            {Array.from({ length: cols }, (_, ci) => (
                              <input
                                key={ci}
                                type="text"
                                value={r.cells?.[ci] ?? ""}
                                onChange={(e) => setCell(ri, ci, e.target.value)}
                                style={{ ...input, fontSize: 12, flex: 1, minWidth: 0 }}
                              />
                            ))}
                            <IconButton
                              onClick={() =>
                                updateBlock(b.id, (prev) => ({
                                  tableRows: (prev.tableRows ?? []).filter((_, i) => i !== ri),
                                  // Keep the emphasis pointing at the same row,
                                  // or drop it if that row just went away.
                                  tableEmphasisRow:
                                    b.tableEmphasisRow === undefined || b.tableEmphasisRow === ri
                                      ? undefined
                                      : b.tableEmphasisRow > ri
                                        ? b.tableEmphasisRow - 1
                                        : b.tableEmphasisRow,
                                }))
                              }
                              title="Remove row"
                            ><IcTrash /></IconButton>
                          </div>
                        ))}
                        <button
                          type="button"
                          style={{ ...miniBtn(false), alignSelf: "flex-start" }}
                          disabled={rows.length >= 12}
                          title={rows.length >= 12 ? "Twelve rows is the maximum" : "Add a row"}
                          onClick={() => updateBlock(b.id, (prev) => ({ tableRows: [...(prev.tableRows ?? []), { cells: Array.from({ length: cols }, () => "") }] }))}
                        >+ Row</button>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          First column is left-aligned, the rest right. The starred row is emphasised.
                          Tables shrink on mobile rather than stacking.
                        </div>
                      </div>
                    );
                  })()}

                  {kind === "checklist" && (
                    <div style={{ padding: "8px 10px 10px" }}>
                      <AutoTextarea
                        value={(b.items ?? []).join("\n")}
                        onChange={(e) => updateBlock(b.id, { items: e.target.value.split("\n") })}
                        minHeight={84}
                        placeholder={"One benefit per line, e.g.\nMagnesium bisglycinate\nL-theanine\nApigenin"}
                        style={{ ...input, lineHeight: 1.55, fontSize: 12, background: "var(--bg)" }}
                      />
                    </div>
                  )}

                  {kind === "testimonial" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <AutoTextarea
                        value={b.testimonialQuote ?? ""}
                        onChange={(e) => updateBlock(b.id, { testimonialQuote: e.target.value })}
                        minHeight={52}
                        placeholder="e.g. Falling asleep used to take an hour. Now it takes ten minutes."
                        style={{ ...input, lineHeight: 1.55, fontSize: 12, background: "var(--bg)" }}
                      />
                      <input
                        type="text"
                        value={b.testimonialAuthor ?? ""}
                        onChange={(e) => updateBlock(b.id, { testimonialAuthor: e.target.value })}
                        placeholder="e.g. Sarah K., verified customer"
                        style={{ ...input, fontSize: 12 }}
                      />
                      <div style={segWrap}>
                        {[1, 2, 3, 4, 5].map((n, ni) => (
                          <SegButton
                            key={n}
                            active={(b.testimonialStars ?? 5) === n}
                            onClick={() => updateBlock(b.id, { testimonialStars: n })}
                            title={`${n} star${n === 1 ? "" : "s"}`}
                            last={ni === 4}
                          >{n}</SegButton>
                        ))}
                      </div>
                    </div>
                  )}

                  {kind === "timeline" && (
                    <div style={{ padding: "8px 10px 10px" }}>
                      <RepeatableRows
                        rows={b.timelineRows ?? []}
                        fields={[
                          { key: "label", placeholder: "e.g. 30 DAYS" },
                          { key: "text", placeholder: "e.g. 85% felt more energy" },
                        ]}
                        onChange={(next) => updateBlock(b.id, { timelineRows: next })}
                        addLabel="+ Row"
                      />
                    </div>
                  )}

                  {kind === "trustgrid" && (
                    <div style={{ padding: "8px 10px 10px" }}>
                      <RepeatableRows
                        rows={b.trustItems ?? []}
                        fields={[
                          { key: "imageUrl", placeholder: "Image URL (optional)" },
                          { key: "caption", placeholder: "e.g. Tested for 500+ pesticides" },
                        ]}
                        onChange={(next) => updateBlock(b.id, { trustItems: next })}
                        addLabel="+ Row"
                      />
                    </div>
                  )}

                  {kind === "comparison" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", gap: 10 }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Left</span>
                        <input type="text" value={b.comparisonLeftLabel ?? ""} onChange={(e) => updateBlock(b.id, { comparisonLeftLabel: e.target.value })} placeholder="e.g. One-time" style={{ ...input, fontSize: 12 }} />
                        <input type="text" value={b.comparisonLeftPrice ?? ""} onChange={(e) => updateBlock(b.id, { comparisonLeftPrice: e.target.value })} placeholder="e.g. $99" style={{ ...input, fontSize: 12 }} />
                        <input type="text" value={b.comparisonLeftPerk ?? ""} onChange={(e) => updateBlock(b.id, { comparisonLeftPerk: e.target.value })} placeholder="e.g. No commitment" style={{ ...input, fontSize: 12 }} />
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Right (emphasized)</span>
                        <input type="text" value={b.comparisonRightLabel ?? ""} onChange={(e) => updateBlock(b.id, { comparisonRightLabel: e.target.value })} placeholder="e.g. Subscribe & save" style={{ ...input, fontSize: 12 }} />
                        <input type="text" value={b.comparisonRightPrice ?? ""} onChange={(e) => updateBlock(b.id, { comparisonRightPrice: e.target.value })} placeholder="e.g. $69" style={{ ...input, fontSize: 12 }} />
                        <input type="text" value={b.comparisonRightPerk ?? ""} onChange={(e) => updateBlock(b.id, { comparisonRightPerk: e.target.value })} placeholder="e.g. Free shipping, cancel anytime" style={{ ...input, fontSize: 12 }} />
                      </div>
                    </div>
                  )}

                  {kind === "image" && (() => {
                    const slot = content.images.find((i) => i.id === b.imageSlotId);
                    const layout = b.imageLayout ?? "column";
                    return (
                      <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Layout</span>
                          <div style={segWrap}>
                            {IMAGE_LAYOUTS.map((l, li) => (
                              <SegButton
                                key={l.key}
                                active={layout === l.key}
                                title={l.title}
                                last={li === IMAGE_LAYOUTS.length - 1}
                                onClick={() => {
                                  // Full width and bleed are 16:9 banners; split
                                  // is half-width, where a square reads better.
                                  // Retarget the slot so the next generate comes
                                  // back at the aspect this layout expects.
                                  updateBlock(b.id, { imageLayout: l.key });
                                  if (slot) {
                                    const aspect = l.key === "split" ? "1:1" : "16:9";
                                    if (slot.aspect !== aspect) updateImage({ ...slot, aspect });
                                  }
                                }}
                              >
                                {l.label}
                              </SegButton>
                            ))}
                          </div>
                        </div>

                        {layout === "split" && (
                          <>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Image side</span>
                              <div style={segWrap}>
                                <SegButton active={(b.imageSplitSide ?? "left") === "left"} onClick={() => updateBlock(b.id, { imageSplitSide: "left" })} title="Image on the left">Left</SegButton>
                                <SegButton active={b.imageSplitSide === "right"} onClick={() => updateBlock(b.id, { imageSplitSide: "right" })} title="Image on the right" last>Right</SegButton>
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Copy beside the image</span>
                              <textarea
                                value={b.imageSplitText ?? ""}
                                onChange={(e) => updateBlock(b.id, { imageSplitText: e.target.value })}
                                placeholder="A short paragraph that sits next to the image."
                                style={{ ...input, fontSize: 12, minHeight: 72, resize: "vertical" }}
                              />
                            </div>
                          </>
                        )}

                        {layout !== "split" && (
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Text over the image (optional)</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <input type="text" value={b.imageOverlayEyebrow ?? ""} onChange={(e) => updateBlock(b.id, { imageOverlayEyebrow: e.target.value })} placeholder="Eyebrow, e.g. CLINICALLY STUDIED" style={{ ...input, fontSize: 12 }} />
                              <input type="text" value={b.imageOverlayHeadline ?? ""} onChange={(e) => updateBlock(b.id, { imageOverlayHeadline: e.target.value })} placeholder="Headline laid over the photo" style={{ ...input, fontSize: 12 }} />
                            </div>
                            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                              Rendered as real text, never baked into the image. Outlook shows it as a caption underneath.
                            </div>
                          </div>
                        )}

                        {slot ? (
                          <ImageSlotControl
                            slot={slot}
                            label="Image"
                            topic={topic}
                            emailContext={emailContext}
                            onChange={updateImage}
                            onGenerated={(url) => markGenerated(slot.id, url)}
                          />
                        ) : (
                          <div style={{ fontSize: 11, color: "var(--error)" }}>This image block lost its image slot. Delete it and add a new one.</div>
                        )}
                      </div>
                    );
                  })()}

                  {kind === "ingredients" && (
                    <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Panel heading</span>
                        <input type="text" value={b.ingredientHeading ?? ""} onChange={(e) => updateBlock(b.id, { ingredientHeading: e.target.value })} placeholder="e.g. What's inside" style={{ ...input, fontSize: 12 }} />
                      </div>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Ingredients (name + dose)</span>
                        <RepeatableRows
                          rows={b.ingredientItems ?? []}
                          fields={[{ key: "name", placeholder: "Ingredient, e.g. Magnesium Glycinate" }, { key: "dose", placeholder: "Dose, e.g. 400mg" }]}
                          onChange={(next) => updateBlock(b.id, { ingredientItems: next })}
                          addLabel="+ Ingredient"
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Trust line (optional)</span>
                        <input type="text" value={b.ingredientFootnote ?? ""} onChange={(e) => updateBlock(b.id, { ingredientFootnote: e.target.value })} placeholder="e.g. Melatonin-free · Third-party tested" style={{ ...input, fontSize: 12 }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {regenError && <div style={{ marginTop: 6, fontSize: 11, color: "var(--error)" }}>{regenError}</div>}
          {regenAlternates && (
            <div style={{ marginTop: 10, border: "1px solid var(--accent)", borderRadius: 8, padding: 12, background: "var(--accent-dim)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ ...sectionLabel, marginBottom: 0 }}>Pick a version</span>
                <button style={miniBtn(false)} onClick={() => setRegenAlternates(null)}>Cancel</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {regenAlternates.alternates.map((alt) => (
                  <button
                    key={alt.id}
                    onClick={() => pickRegeneratedAlternate(alt)}
                    style={{
                      textAlign: "left", padding: "8px 10px", borderRadius: 6,
                      border: "1px solid var(--border)", background: "var(--bg)",
                      color: "var(--text)", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {blockPreviewText(alt)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </Section>

        <Section title="Images" defaultCollapsed={imagesDefaultCollapsed}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={sectionLabel}>Images</span>
            {unplacedImages.length < 5 && <button style={miniBtn(false)} onClick={addImage}>+ Image</button>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {unplacedImages.map((img) => {
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
            style={{ ...input, marginBottom: 8 }} />
          {/* Bottom button and hero overlay styled independently.
              On the cream theme both collapse to the handbook treatment
              (ivory on Rich Navy), because a cream pill on an ivory ground is
              invisible. The controls are disabled and say why rather than
              silently ignoring the pick, and cta.style is left untouched so
              switching back to Navy restores the choice. */}
          {content.theme === "cream" && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, lineHeight: 1.5 }}>
              On the cream theme the CTA is always navy, for contrast. Your saved
              choice is kept and comes back if you switch to Navy.
            </div>
          )}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", opacity: content.theme === "cream" ? 0.45 : 1 }}>
            <div>
              <label style={fieldLabel}>Bottom button</label>
              <div style={{ ...segWrap, pointerEvents: content.theme === "cream" ? "none" : "auto" }}>
                <SegButton
                  active={(content.cta.style ?? "cream") === "cream"}
                  onClick={() => patch({ cta: { ...latestContent.current.cta, style: "cream" } })}
                  title="Cream button, navy text (default)"
                >Cream</SegButton>
                <SegButton
                  active={content.cta.style === "navy"}
                  onClick={() => patch({ cta: { ...latestContent.current.cta, style: "navy" } })}
                  title="Navy button, white text"
                  last
                >Navy</SegButton>
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Hero overlay</label>
              <div style={{ ...segWrap, opacity: content.cta.showOnHero === false ? 0.4 : 1, pointerEvents: content.theme === "cream" ? "none" : "auto" }}>
                <SegButton
                  active={(content.cta.heroStyle ?? content.cta.style ?? "cream") === "cream"}
                  onClick={() => patch({ cta: { ...latestContent.current.cta, heroStyle: "cream" } })}
                  title="Cream overlay on the hero image, navy text"
                >Cream</SegButton>
                <SegButton
                  active={(content.cta.heroStyle ?? content.cta.style) === "navy"}
                  onClick={() => patch({ cta: { ...latestContent.current.cta, heroStyle: "navy" } })}
                  title="Navy overlay on the hero image, white text"
                  last
                >Navy</SegButton>
              </div>
            </div>
          </div>
          {/* Hero overlay visibility — the pill on top of the hero image, not
              the bottom button below it. Off removes the overlay entirely;
              the hero stays tappable via its wrapping link either way. */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={content.cta.showOnHero !== false}
              onChange={(e) => patch({ cta: { ...latestContent.current.cta, showOnHero: e.target.checked } })}
              style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Show CTA on hero image</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Remove the button overlay from the hero photo</span>
          </label>
          {/* Where the pill sits on the hero. Unset means the original
              bottom-centre placement and the renderer emits the exact markup
              it always did, so nothing saved before this shifts. Positions are
              clamped so the pill cannot leave the image. */}
          {content.cta.showOnHero !== false && (() => {
            const positioned = content.cta.heroX !== undefined || content.cta.heroY !== undefined;
            const pos = clampHeroCta(content.cta.heroX ?? 50, content.cta.heroY ?? 88);
            const locked = !!content.cta.heroLocked;
            const nudge = (dx: number, dy: number, big: boolean) => {
              const step = big ? 10 : 2;
              const next = clampHeroCta(pos.x + dx * step, pos.y + dy * step);
              patch({ cta: { ...latestContent.current.cta, heroX: next.x, heroY: next.y } });
            };
            const arrow = (dx: number, dy: number, glyph: string, title: string) => (
              <button
                type="button"
                disabled={locked}
                onClick={(e) => nudge(dx, dy, e.shiftKey)}
                title={locked ? "Unlock to move the CTA" : `${title}. Hold Shift for a bigger step.`}
                style={{
                  width: 26, height: 24, borderRadius: 5, fontSize: 12, lineHeight: 1,
                  border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
                  fontFamily: "inherit", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.4 : 1,
                }}
              >{glyph}</button>
            );
            const spacer = <span style={{ width: 26, height: 24 }} />;
            return (
              <div style={{ marginTop: 10 }}>
                <label style={fieldLabel}>CTA position on the hero</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 26px)", gap: 3 }}>
                    {spacer}{arrow(0, -1, "\u2191", "Move up")}{spacer}
                    {arrow(-1, 0, "\u2190", "Move left")}
                    <button
                      type="button"
                      disabled={locked || !positioned}
                      onClick={() => patch({ cta: { ...latestContent.current.cta, heroX: undefined, heroY: undefined } })}
                      title={positioned ? "Reset to the default bottom-centre placement" : "Already at the default placement"}
                      style={{
                        width: 26, height: 24, borderRadius: 5, fontSize: 10, lineHeight: 1,
                        border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
                        fontFamily: "inherit", cursor: locked || !positioned ? "not-allowed" : "pointer",
                        opacity: locked || !positioned ? 0.4 : 1,
                      }}
                    >{"\u21BA"}</button>
                    {arrow(1, 0, "\u2192", "Move right")}
                    {spacer}{arrow(0, 1, "\u2193", "Move down")}{spacer}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => patch({ cta: { ...latestContent.current.cta, heroLocked: !locked } })}
                      style={{ ...miniBtn(locked), fontSize: 11 }}
                      title={locked ? "Unlock so the arrows move the CTA" : "Lock the position so it cannot be nudged by accident"}
                    >{locked ? "Locked" : "Unlocked"}</button>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {positioned ? `${pos.x}% across, ${pos.y}% down` : "Default: bottom centre"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
            The bottom CTA button and the hero-image overlay are styled independently.
            In Outlook the pill is decorative: the whole hero stays tappable, and
            the bottom button is the guaranteed render.
          </div>
        </div>
        </Section>

        <Section title="Actions" defaultCollapsed={false}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={save}
            disabled={saving}
            style={{ minWidth: 120, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            {saving && <Spinner size={13} color="var(--bg)" />}
            {saving ? "Saving…" : savedId ? (
              <>Saved <span key={saveConfirmTick} style={{ display: "inline-flex", animation: "pulse 150ms ease-out" }}><IcCheck size={14} /></span> Update</>
            ) : "Save campaign"}
          </button>
          <span
            title={
              autosaveStatus === "saving" ? "Autosaving…"
              : autosaveStatus === "dirty" ? "Unsaved changes"
              : autosaveStatus === "saved" ? "Saved automatically"
              : ""
            }
            style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5, minWidth: 90 }}
          >
            {autosaveStatus === "saving" && (<><Spinner size={10} />Saving…</>)}
            {autosaveStatus === "dirty" && "Unsaved changes"}
            {autosaveStatus === "saved" && "Saved just now"}
          </span>
          <span className="ui-divider-v" style={{ height: 28 }} />
          <div style={{ display: "inline-flex", gap: 4 }}>
            <IconButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)"><IcUndo /></IconButton>
            <IconButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)"><IcRedo /></IconButton>
          </div>
          <button className="btn-ghost" onClick={exportHtml} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><IcDownload size={15} /> Export HTML</button>
          <button className="btn-ghost" onClick={copyHtml} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><IcCopy size={15} /> {copyLabel}</button>
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
              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <IcUndo size={15} /> Revert
            </button>
          )}
          <button
            className="btn-ghost"
            onClick={pushToKlaviyo}
            disabled={klaviyoBusy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {klaviyoBusy && <Spinner size={13} />}
            {klaviyoBusy ? "Pushing…" : (<><IcSend size={15} /> Push to Klaviyo</>)}
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
        </Section>
      </div>
    </div>
  );
}
