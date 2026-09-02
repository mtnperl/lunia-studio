"use client";
import { useMemo, useRef, useState } from "react";
import {
  Button, IconButton, Tooltip, Tabs, Menu, useContextMenu, Dialog, EmptyState, Skeleton, Badge, Spinner, Field, Input, Select, useToast, useConfirm,
  IcCopy, IcTrash, IcRefresh, IcPlus, IcCheck, IcDragHandle, type MenuItem, type Command,
} from "@/components/ui";
import { Shell, RailHead, useHistory, useAutosave, Editable } from "./Shell";
import { EmailTab, BlockTab, ImagesTab, EmailBriefTab } from "./EmailRails";
import { MOCK_EMAIL, SUBJECTS, ADDABLE_KINDS, BLOCK_KIND_LABELS, type MockBlock, type BlockKind, type MockEmailDoc } from "./mock-data";

type Doc = MockEmailDoc;
type View = "desktop" | "mobile";

const C = { navy: "var(--lunia-rich-navy)", deep: "var(--lunia-deep-navy)", slate: "var(--lunia-slate-blue)", ivory: "var(--lunia-soft-ivory)", aqua: "var(--lunia-aqua)", yellow: "var(--lunia-signal-yellow)", font: "var(--lunia-font)" };
const ROLE: Record<string, string> = { ivory: C.ivory, aqua: C.aqua, yellow: C.yellow, navy: C.navy, slate: C.slate };
const SPACING = { none: 0, tight: 8, default: 16, roomy: 24, loose: 32 } as const;
const GEN_STEPS = [
  { label: "Reading the brief", ms: 800 },
  { label: "Drafting three subject lines", ms: 1500 },
  { label: "Writing the opening", ms: 1400 },
  { label: "Writing the body", ms: 1600 },
  { label: "Laying out the offer", ms: 1200 },
  { label: "Choosing a hero image", ms: 1800 },
];

export default function EmailProposal({ startEmpty = false }: { startEmpty?: boolean }) {
  const history = useHistory<Doc | null>(startEmpty ? null : MOCK_EMAIL);
  const doc = history.value;
  const [view, setView] = useState<View>("desktop");
  const [selected, setSelected] = useState<string | null>(doc ? "b3" : null);
  const [railTab, setRailTab] = useState<"block" | "email" | "images" | "brief">("block");
  const saveState = useAutosave(doc);
  const { toast } = useToast();
  const confirm = useConfirm();
  const [regen, setRegen] = useState<Record<string, boolean>>({});
  const [alternates, setAlternates] = useState<Record<string, string[]>>({});
  const [gen, setGen] = useState<number | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [brief, setBrief] = useState({ topic: "", tone: "calm, editorial", offer: "" });
  const [drag, setDrag] = useState<{ from: number; over: number | null; pos: "before" | "after" } | null>(null);
  const [saved, setSaved] = useState(!startEmpty);

  const cur = doc?.blocks.find((b) => b.id === selected) ?? null;
  const idx = doc && cur ? doc.blocks.indexOf(cur) : -1;
  const patchDoc = (p: Partial<Doc>, key?: string) => history.set((d) => d ? { ...d, ...p } : d, key);
  const patch = (id: string, p: Partial<MockBlock>, key?: string) => history.set((d) => d ? { ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) } : d, key);
  const move = (from: number, to: number) => history.set((d) => { if (!d || from === to) return d; const blocks = [...d.blocks]; const [b] = blocks.splice(from, 1); blocks.splice(to, 0, b); return { ...d, blocks }; });
  const remove = (id: string) => {
    if (!doc) return; const before = doc.blocks;
    history.set((d) => d ? { ...d, blocks: d.blocks.filter((b) => b.id !== id) } : d); setSelected(null);
    toast({ title: "Block deleted", action: { label: "Undo", onClick: () => history.set((d) => d ? { ...d, blocks: before } : d) } });
  };
  const duplicate = (id: string) => history.set((d) => { if (!d) return d; const i = d.blocks.findIndex((b) => b.id === id); const blocks = [...d.blocks]; blocks.splice(i + 1, 0, { ...d.blocks[i], id: `${id}-c${Date.now()}` }); return { ...d, blocks }; });
  const add = (kind: BlockKind) => history.set((d) => {
    if (!d) return d;
    const b: MockBlock = { id: `b-${Date.now()}`, kind, sample: true,
      text: ["text", "cta", "stat", "promo", "testimonial"].includes(kind) ? (kind === "cta" ? "See the formula" : kind === "testimonial" ? "I stopped waking at 3am within the first week." : "Sample copy written from the brand facts. Keep it or clear it.") : undefined,
      heading: ["stat", "checklist", "promo", "imagetext", "headerimage", "ingredients", "discount", "comparison", "timeline"].includes(kind) ? (kind === "stat" ? "558 reviews" : kind === "checklist" ? "What is inside" : kind === "promo" ? "Offer" : BLOCK_KIND_LABELS[kind]) : undefined,
      items: kind === "checklist" ? ["Magnesium bisglycinate 500mg", "L-theanine 300mg", "Apigenin 50mg"] : undefined,
      imageUrl: ["hero", "image", "imagetext", "imagebullets", "headerimage", "grid", "trustgrid"].includes(kind) ? MOCK_EMAIL.blocks[1].imageUrl : undefined,
      author: kind === "testimonial" ? "Priya, verified buyer" : undefined, stars: kind === "testimonial" ? 5 : undefined };
    const at = idx >= 0 ? idx + 1 : d.blocks.length - 1; const blocks = [...d.blocks]; blocks.splice(at, 0, b);
    window.setTimeout(() => { setSelected(b.id); setRailTab("block"); }, 0);
    return { ...d, blocks };
  });
  const regenerate = (id: string) => {
    setRegen((r) => ({ ...r, [id]: true }));
    window.setTimeout(() => {
      setRegen((r) => { const n = { ...r }; delete n[id]; return n; });
      setAlternates((a) => ({ ...a, [id]: [
        "The night shift study is real, and it is about timing, not sedation. Melatonin tells the body when it is night; it does not make you sleepy.",
        "Melatonin is a clock signal. The study shows what a clean signal does for repair. Restore works on the other half: letting the nervous system stand down.",
        "Read the study precisely: a timing hormone, measured in people whose clocks were broken. For everyone else, the question is what keeps you awake.",
      ] }));
      toast({ title: "Three versions ready", description: "Pick one in the Block tab, or keep the current copy." });
    }, 1500);
  };

  const startGeneration = () => {
    setBriefOpen(false);
    history.reset({ ...MOCK_EMAIL, subject: "", subjects: [], topBanner: "", promoBand: "", blocks: [MOCK_EMAIL.blocks[0], MOCK_EMAIL.blocks[8]] });
    setSaved(false);
    setGen(0); let t = 0;
    GEN_STEPS.forEach((s, i) => {
      t += s.ms;
      window.setTimeout(() => {
        setGen(i + 1);
        if (i === 1) history.set((d) => d ? { ...d, subjects: MOCK_EMAIL.subjects, subject: MOCK_EMAIL.subjects[0], preheader: MOCK_EMAIL.preheader } : d);
        if (i === 2) history.set((d) => d ? { ...d, blocks: insertBefore(d.blocks, "b9", [MOCK_EMAIL.blocks[2]]) } : d);
        if (i === 3) history.set((d) => d ? { ...d, blocks: insertBefore(d.blocks, "b9", [MOCK_EMAIL.blocks[3], MOCK_EMAIL.blocks[4], MOCK_EMAIL.blocks[5]]) } : d);
        if (i === 4) history.set((d) => d ? { ...d, topBanner: MOCK_EMAIL.topBanner, promoBand: MOCK_EMAIL.promoBand, blocks: insertBefore(d.blocks, "b9", [MOCK_EMAIL.blocks[6], MOCK_EMAIL.blocks[7]]) } : d);
        if (i === 5) { history.set((d) => d ? { ...d, blocks: [d.blocks[0], MOCK_EMAIL.blocks[1], ...d.blocks.slice(1)] } : d); setGen(null); setSaved(true); toast({ title: "Email ready", description: "3 subject lines, 7 blocks, a banner and a promo band. Autosaved.", kind: "success" }); }
      }, t);
    });
  };

  const commands: Command[] = useMemo(() => [
    { id: "new", label: "New email", group: "Create", shortcut: "mod+n", onSelect: () => setBriefOpen(true) },
    { id: "import", label: "Import a Klaviyo flow", group: "Create", onSelect: () => toast({ title: "Import from Klaviyo", description: "Pick a flow; each message becomes an email in a deck." }) },
    ...ADDABLE_KINDS.map((k) => ({ id: `add-${k}`, label: `Add ${BLOCK_KIND_LABELS[k].toLowerCase()} block`, group: "Add block", shortcut: k === "text" ? "mod+shift+n" : undefined, onSelect: () => add(k) })),
    { id: "snippet", label: "Insert a saved snippet", group: "Add block", onSelect: () => toast({ title: "Snippets", description: "Your saved blocks." }) },
    { id: "dup", label: "Duplicate block", group: "Block", shortcut: "mod+d", onSelect: () => selected && duplicate(selected) },
    { id: "regen", label: "Rewrite this block, pick from 3", group: "Block", keywords: "ai regenerate", onSelect: () => selected && regenerate(selected) },
    { id: "del", label: "Delete block", group: "Block", shortcut: "backspace", onSelect: () => selected && remove(selected) },
    { id: "personalize", label: "Insert merge tag", group: "Block", keywords: "personalize first name klaviyo", onSelect: () => toast({ title: "Merge tag inserted" }) },
    { id: "fact", label: "Insert brand fact", group: "Block", onSelect: () => toast({ title: "Brand fact inserted" }) },
    { id: "mobile", label: view === "mobile" ? "Desktop preview" : "Mobile preview", group: "View", onSelect: () => setView((v) => (v === "mobile" ? "desktop" : "mobile")) },
    { id: "subjects", label: "Regenerate subject lines", group: "Email", onSelect: () => setRailTab("email") },
    { id: "banner", label: "Suggest a top banner", group: "Email", onSelect: () => setRailTab("email") },
    { id: "promo", label: "Suggest a promo band", group: "Email", onSelect: () => setRailTab("email") },
    { id: "shapes", label: "Restructure with a shape", group: "Email", onSelect: () => toast({ title: "Shape gallery" }) },
    { id: "improve", label: "Improve with Claude", group: "Email", onSelect: () => toast({ title: "Improving with Claude", description: "Subject and text blocks only. Revert is one click." }) },
    { id: "images", label: "Generate images", group: "Images", onSelect: () => setRailTab("images") },
    { id: "html", label: "Copy HTML", group: "Export", onSelect: () => toast({ title: "HTML copied", kind: "success" }) },
    { id: "export-html", label: "Export HTML file", group: "Export", onSelect: () => toast({ title: "campaign-melatonin.html downloaded", kind: "success" }) },
    { id: "klaviyo", label: "Push to Klaviyo", group: "Export", shortcut: "mod+e", onSelect: () => toast({ title: "Pushed to Klaviyo as a draft", description: "Open in Klaviyo from the export menu.", kind: "success" }) },
    { id: "save", label: "Save now", group: "Export", shortcut: "mod+s", onSelect: () => toast({ title: "Saved" }) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [selected, view]);

  const ctx = useContextMenu();
  const blockMenu = (id: string): MenuItem[] => [
    { label: "Duplicate", icon: <IcCopy size={14} />, shortcut: "mod+d", onSelect: () => duplicate(id) },
    { label: "Rewrite with AI, pick from 3", icon: <IcRefresh size={14} />, onSelect: () => regenerate(id) },
    { label: "Save as snippet", onSelect: () => toast({ title: "Snippet saved" }) },
    { label: "Copy block text", onSelect: () => toast({ title: "Copied" }) },
    { label: "Move up", disabled: idx <= 1, onSelect: () => move(idx, idx - 1) },
    { label: "Move down", disabled: !doc || idx >= doc.blocks.length - 2, onSelect: () => move(idx, idx + 1) },
    { type: "separator" },
    { label: "Delete", icon: <IcTrash size={14} />, danger: true, shortcut: "backspace", onSelect: () => remove(id) },
  ];
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLButtonElement | null>(null);
  const addItems: MenuItem[] = [
    { type: "heading", label: "Block" },
    ...ADDABLE_KINDS.map((k) => ({ label: BLOCK_KIND_LABELS[k], onSelect: () => add(k) })),
    { type: "separator" },
    { type: "heading", label: "Insert into the focused block" },
    { label: "Snippet", onSelect: () => toast({ title: "Snippets", description: "Saved blocks, inserted as a new block." }) },
    { label: "Personalize (merge tag)", onSelect: () => toast({ title: "First name, last order item, discount code" }) },
    { label: "Brand fact", onSelect: () => toast({ title: "Reviews, five-star share, customers, prices, dose, differentiators" }) },
  ];

  const left = doc && (
    <>
      <RailHead actions={<Tooltip label="Add block" shortcut="mod+shift+n"><IconButton title="Add block" size="sm" ref={addRef} onClick={() => setAddOpen(true)}><IcPlus size={14} /></IconButton></Tooltip>}>Blocks <Badge>{doc.blocks.length}</Badge></RailHead>
      <Menu open={addOpen} onClose={() => setAddOpen(false)} anchorRef={addRef} ariaLabel="Add block" items={addItems} />
      <div className="blocks" role="listbox" aria-label="Blocks">
        {doc.blocks.map((b, i) => {
          const locked = b.kind === "header" || b.kind === "footer";
          return (
            <button
              key={b.id} type="button" role="option" aria-selected={selected === b.id} className="blocks__item"
              draggable={!locked}
              data-dragging={drag?.from === i}
              data-drop={drag && drag.over === i && drag.from !== i && !locked ? drag.pos : undefined}
              onDragStart={(e) => { setDrag({ from: i, over: null, pos: "after" }); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setDrag((d) => d ? { ...d, over: i, pos: e.clientY < r.top + r.height / 2 ? "before" : "after" } : d); }}
              onDrop={(e) => { e.preventDefault(); if (!drag || locked) return; const to = drag.pos === "before" ? i : i + 1; move(drag.from, to > drag.from ? to - 1 : to); setDrag(null); }}
              onDragEnd={() => setDrag(null)}
              onClick={() => { setSelected(b.id); setRailTab("block"); }}
              onContextMenu={(e) => { if (locked) return; setSelected(b.id); ctx.bind.onContextMenu(e); }}
            >
              <span className="blocks__grip" aria-hidden="true">{locked ? <span style={{ width: 16 }} /> : <IcDragHandle size={14} />}</span>
              <span className="blocks__kind">{BLOCK_KIND_LABELS[b.kind]}</span>
              <span className="blocks__text">{b.heading ?? b.text ?? (b.kind === "header" ? "Logo, banner, preview text" : b.kind === "footer" ? "Promo band, address, unsubscribe" : "")}</span>
              {b.sample && <Badge tone="warning">Sample</Badge>}
              {regen[b.id] && <Spinner size={12} />}
            </button>
          );
        })}
        {gen !== null && gen < 5 && <div className="blocks__item" aria-hidden="true"><span className="blocks__grip" /><span className="blocks__kind">…</span><Skeleton width="60%" /></div>}
      </div>
      <Menu open={ctx.open} onClose={ctx.close} anchorRect={ctx.rect} items={selected ? blockMenu(selected) : []} ariaLabel="Block actions" />
      {gen !== null && (
        <div style={{ padding: "0 12px 12px" }}>
          <div className="gen" role="status" aria-live="polite">
            {GEN_STEPS.map((s, i) => { const st = i < gen ? "done" : i === gen ? "active" : "todo"; return <div key={s.label} className="gen__step" data-state={st}><span className="ic">{st === "done" ? <IcCheck size={14} /> : st === "active" ? <Spinner size={12} /> : <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--ui-border-strong)" }} />}</span>{s.label}</div>; })}
          </div>
        </div>
      )}
      <div style={{ padding: "0 12px 12px", display: "flex", gap: 6, fontSize: 11, color: "var(--ui-text-2)", flexWrap: "wrap" }}>
        {[["Subject", !!doc.subject], ["Hero", doc.blocks.some((b) => b.kind === "hero")], [`${doc.blocks.length - 2} blocks`, doc.blocks.length > 2], ["CTA", doc.blocks.some((b) => b.kind === "cta")]].map(([l, ok]) => <span key={String(l)} style={{ display: "inline-flex", gap: 4, alignItems: "center", color: ok ? "var(--ui-success)" : "var(--ui-text-3)" }}>{ok ? <IcCheck size={12} /> : "·"} {l}</span>)}
      </div>
    </>
  );

  const right = doc && (
    <>
      <div style={{ padding: "8px 8px 0" }}><Tabs value={railTab} onChange={setRailTab} ariaLabel="Properties" items={[{ value: "block", label: "Block" }, { value: "email", label: "Email" }, { value: "images", label: "Images" }, { value: "brief", label: "Brief" }]} /></div>
      <div className="shell__rail-body">
        {railTab === "block" && (!cur ? <EmptyState title="Nothing selected" description="Click a block in the email or the list to edit it." /> : (
          <BlockTab block={cur} index={idx} patch={(p, k) => patch(cur.id, p, k)} onRegenerate={() => regenerate(cur.id)} regen={!!regen[cur.id]} alternates={alternates[cur.id] ?? null}
            onPickAlternate={(t) => { if (t) patch(cur.id, { text: t }); setAlternates((a) => { const n = { ...a }; delete n[cur.id]; return n; }); if (t) toast({ title: "Version applied", action: { label: "Undo", onClick: history.undo } }); }}
            onDuplicate={() => duplicate(cur.id)} onDelete={() => remove(cur.id)} />
        ))}
        {railTab === "email" && <EmailTab doc={doc} patch={patchDoc} />}
        {railTab === "images" && <ImagesTab images={doc.images} onChange={(images) => patchDoc({ images })} />}
        {railTab === "brief" && <EmailBriefTab onRegenerateAll={() => { setSelected(null); startGeneration(); }} />}
      </div>
    </>
  );

  const width = view === "mobile" ? 375 : 600;
  const dark = doc?.theme === "navy";
  const canvas = doc ? (
    <>
      <div className="shell__stage" style={{ alignItems: "start" }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div style={{ width, background: dark ? C.navy : C.ivory, color: dark ? C.ivory : C.deep, fontFamily: C.font, boxShadow: "var(--ui-elev-2)", borderRadius: 2, overflow: "hidden", transition: "width var(--ui-dur-3) var(--ui-ease-in-out)" }} aria-label="Email preview">
          {doc.blocks.map((b) => (
            <div key={b.id} className={`sel-hover${selected === b.id ? " sel-outline" : ""}`} style={{ position: "relative", marginBottom: b.kind === "footer" || b.kind === "header" ? 0 : SPACING[doc.spacing] }} onClick={() => { setSelected(b.id); setRailTab("block"); }} onContextMenu={(e) => { if (b.kind === "header" || b.kind === "footer") return; setSelected(b.id); ctx.bind.onContextMenu(e); }}>
              {regen[b.id] ? <div style={{ padding: 24 }}><Skeleton height={14} /><div style={{ height: 8 }} /><Skeleton height={14} width="80%" /></div> : <EmailBlock block={b} doc={doc} dark={dark} mobile={view === "mobile"} onChange={(p) => patch(b.id, p, b.id)} onImageClick={() => setRailTab("images")} onCtaDrag={(x, y) => patchDoc({ cta: { ...doc.cta, x, y } }, "cta")} />}
            </div>
          ))}
        </div>
      </div>
      <div className="shell__zoombar"><span style={{ fontFamily: "var(--ui-font-mono)", fontSize: 11, color: "var(--ui-text-3)" }}>{width}px · the same HTML that gets exported · subject: {doc.subject || "not chosen yet"}</span></div>
    </>
  ) : (
    <div className="shell__stage">
      <EmptyState plain icon={<IcPlus size={28} strokeWidth={1.5} />} title="Start an email" description="Pick a subject or an offer. Subject lines arrive first, then the blocks fill in while you read." actions={<><Button variant="primary" onClick={() => setBriefOpen(true)}>New email</Button><Button onClick={() => { history.reset(MOCK_EMAIL); setSelected("b3"); }}>Open a recent one</Button><Button onClick={() => toast({ title: "Import from Klaviyo", description: "Pick a flow; each message becomes an email in a deck with batch restructure and save all." })}>Import from Klaviyo</Button></>} />
    </div>
  );

  return (
    <>
      <Shell<View>
        title={doc?.subject || "Untitled email"}
        onTitle={(t) => patchDoc({ subject: t }, "title")}
        kindLabel="Email"
        saveState={doc ? saveState : "saved"}
        canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.undo} onRedo={history.redo}
        views={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }]} view={view} onView={setView}
        exportLabel="Push to Klaviyo" onExport={() => toast({ title: "Pushed to Klaviyo as a draft", kind: "success" })}
        exportMenu={[
          { type: "heading", label: "Send it out" },
          { label: "Push to Klaviyo", shortcut: "mod+e", onSelect: () => toast({ title: "Pushed to Klaviyo as a draft", description: "Open in Klaviyo from this menu once it lands.", kind: "success" }) },
          { label: "Open in Klaviyo", disabled: true, onSelect: () => {} },
          { label: "Export HTML file", onSelect: () => toast({ title: "campaign-melatonin.html downloaded", kind: "success" }) },
          { label: "Copy HTML", onSelect: () => toast({ title: "HTML copied", kind: "success" }) },
          { type: "separator" },
          { label: "Improve with Claude", onSelect: () => toast({ title: "Improving with Claude", description: "Subject and text blocks only. Revert is one click." }) },
          { label: "Revert last improve", disabled: true, onSelect: () => {} },
          { type: "separator" },
          { label: "Discard this email", danger: true, onSelect: async () => { if (await confirm({ title: "Discard this email?", description: "It is removed from the library.", confirmLabel: "Discard", tone: "danger" })) { history.reset(null); toast({ title: "Email discarded", action: { label: "Undo", onClick: () => history.reset(MOCK_EMAIL) } }); } } },
        ]}
        saveAction={doc ? <Button size="sm" variant={saved ? "ghost" : "secondary"} onClick={() => { setSaved(true); toast({ title: saved ? "Updated in library" : "Saved to library", kind: "success" }); }}>{saved ? "Update" : "Save to library"}</Button> : null}
        commands={commands}
        left={left} right={right}
        topExtra={<Badge tone="warning">Proposal</Badge>}
      >
        {canvas}
      </Shell>
      <Dialog open={briefOpen} onClose={() => setBriefOpen(false)} title="New email" wide footer={<><Button onClick={() => setBriefOpen(false)}>Cancel</Button><Button variant="ghost" disabled={brief.topic.trim().length < 4} onClick={startGeneration}>Test (no AI)</Button><Button variant="primary" disabled={brief.topic.trim().length < 4} onClick={startGeneration}>Generate</Button></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Topic or angle">{(p) => <Input {...p} autoFocus value={brief.topic} onChange={(e) => setBrief({ ...brief, topic: e.target.value })} placeholder="Search subjects or type an angle" />}</Field>
            <div role="listbox" aria-label="Subjects" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {SUBJECTS.filter((s) => s.toLowerCase().includes(brief.topic.toLowerCase())).slice(0, 6).map((s) => <button key={s} type="button" role="option" aria-selected={brief.topic === s} className="ui-menu-item" data-active={brief.topic === s} onClick={() => setBrief({ ...brief, topic: s })}>{s}</button>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Tone">{(p) => <Select {...p} value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })}>{["calm, editorial", "warm, personal", "direct, product-first", "urgent, promotional"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
            <Field label="Occasion" hint="Optional">{(p) => <Input {...p} placeholder="Memorial Day weekend" />}</Field>
            <Field label="Offer" hint="Optional">{(p) => <Input {...p} value={brief.offer} onChange={(e) => setBrief({ ...brief, offer: e.target.value })} placeholder="Up to 35% off" />}</Field>
            <Field label="CTA link">{(p) => <Input {...p} defaultValue="https://lunialife.com/products/restore" />}</Field>
            <Field label="Layout">{(p) => <Select {...p} defaultValue="model"><option value="model">Let the model choose</option>{["Editorial", "Discount announcement", "Educational", "Proof-led", "Welcome", "Last call", "Ingredient deep dive", "Subscribe or one-time", "Wind-down story", "Why we're different"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
            <Button variant="ghost" size="sm" onClick={() => toast({ title: "Import from Klaviyo", description: "Rebuild an existing flow instead." })}>Import from Klaviyo instead</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function insertBefore(blocks: MockBlock[], id: string, add: MockBlock[]) { const i = blocks.findIndex((b) => b.id === id); const out = [...blocks]; out.splice(i < 0 ? blocks.length : i, 0, ...add); return out; }

/** Email blocks rendered from content tokens only. In production this is the
 *  real `renderCampaignEmail` HTML in an iframe with block ids, which is the
 *  same thing the export uses. Here it is React so the prototype can edit in
 *  place. */
function EmailBlock({ block: b, doc, dark, mobile, onChange, onImageClick, onCtaDrag }: { block: MockBlock; doc: MockEmailDoc; dark: boolean; mobile: boolean; onChange: (p: Partial<MockBlock>) => void; onImageClick: () => void; onCtaDrag: (x: number, y: number) => void }) {
  const ink = dark ? C.ivory : C.deep; const sub = dark ? "rgba(247,244,239,0.7)" : C.slate;
  const pad = mobile ? 20 : 32;
  const size = { s: 14, m: 16, l: 19 }[b.size ?? "m"];
  const hs = { S: 16, M: 20, L: 26, XL: 32 }[b.headerSize ?? "M"];
  const ha = ({ L: "left", C: "center", R: "right" } as const)[b.headerAlign ?? "C"];
  const banner = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((part, i) => part.startsWith("**") ? <span key={i} style={{ background: dark ? C.aqua : C.navy, color: dark ? C.navy : C.ivory, padding: "2px 8px", borderRadius: 2, marginLeft: 6 }}>{part.slice(2, -2)}</span> : <span key={i}>{part}</span>);
  const ctaBg = doc.cta.color ? ROLE[doc.cta.color] : (!dark ? C.navy : doc.cta.bottom === "navy" ? C.navy : C.ivory);
  const ctaFg = ctaBg === C.navy || ctaBg === C.slate ? C.ivory : C.navy;
  switch (b.kind) {
    case "header": return (
      <div>
        {doc.topBanner && <div style={{ background: dark ? "rgba(247,244,239,0.06)" : "rgba(1,37,63,0.06)", padding: "10px 16px", textAlign: "center", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: ink }}>{banner(doc.topBanner)}</div>}
        <div style={{ padding: `${pad}px ${pad}px 8px`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, letterSpacing: "0.2em", color: sub }}>{doc.showLogo ? <span style={{ fontWeight: 600, color: ink }}>LUNIA LIFE</span> : <span />}<span>View in browser</span></div>
      </div>
    );
    case "hero": {
      const ov = doc.cta.heroOverlayColor ? ROLE[doc.cta.heroOverlayColor] : ctaBg;
      const ovFg = ov === C.navy || ov === C.slate ? C.ivory : C.navy;
      return (
        <div style={{ position: "relative" }}>
          <img src={b.imageUrl} alt="" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onImageClick(); }} />
          {doc.cta.showOnHero && (
            <div
              role="button" tabIndex={0} aria-label="Hero call to action, drag to move"
              draggable={!doc.cta.locked}
              onDragEnd={(e) => { const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect(); onCtaDrag(Math.round(((e.clientX - r.left) / r.width) * 100), Math.round(((e.clientY - r.top) / r.height) * 100)); }}
              style={{ position: "absolute", left: `${doc.cta.x}%`, top: `${doc.cta.y}%`, transform: "translate(-50%, -50%)", background: ov, color: ovFg, padding: "14px 22px", fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", textAlign: "center", cursor: doc.cta.locked ? "default" : "grab", whiteSpace: "nowrap" }}
            >
              <Editable value={b.heading ?? doc.cta.label} onChange={(v) => onChange({ heading: v })} placeholder="hero caption" />
            </div>
          )}
        </div>
      );
    }
    case "text": return <div style={{ padding: `12px ${pad}px`, fontSize: size, lineHeight: 1.6, fontWeight: b.weight ?? 300, fontStyle: b.italic ? "italic" : undefined, color: ink, textAlign: b.align ?? "left" }}><Editable as="p" multiline value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="text" style={{ margin: 0 }} /></div>;
    case "stat": return <div style={{ margin: `0 ${pad}px`, padding: 24, border: `1px solid ${dark ? "rgba(247,244,239,0.25)" : C.slate}`, textAlign: ha }}><Editable value={b.heading ?? ""} onChange={(v) => onChange({ heading: v })} placeholder="stat heading" style={{ fontSize: hs * 2, fontWeight: 300, letterSpacing: "-0.02em", color: dark ? C.aqua : C.deep }} /><Editable value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="stat text" style={{ fontSize: 14, marginTop: 8, color: sub }} multiline /></div>;
    case "checklist": return <div style={{ padding: `0 ${pad}px` }}><Editable value={b.heading ?? ""} onChange={(v) => onChange({ heading: v })} placeholder="list heading" style={{ fontSize: hs * 0.6, letterSpacing: "0.18em", textTransform: "uppercase", color: sub, marginBottom: 10, textAlign: ha }} /><ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>{(b.items ?? []).map((it, i) => <li key={i} style={{ display: "flex", gap: 10, fontSize: 15, fontWeight: 300, color: ink }}><span style={{ color: dark ? C.aqua : C.deep }}>✓</span>{it}</li>)}</ul></div>;
    case "promo": return <div style={{ margin: `0 ${pad}px`, background: C.yellow, color: C.deep, padding: 20, textAlign: ha }}><Editable value={b.heading ?? ""} onChange={(v) => onChange({ heading: v })} placeholder="promo heading" style={{ fontSize: hs, fontWeight: 600 }} /><Editable value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="promo text" style={{ fontSize: 13, marginTop: 4 }} /></div>;
    case "cta": return <div style={{ padding: `8px ${pad}px 20px`, textAlign: "center" }}><span style={{ display: "inline-block", background: ctaBg, color: ctaFg, padding: "14px 28px", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}><Editable value={b.text ?? doc.cta.label} onChange={(v) => onChange({ text: v })} placeholder="button label" as="span" /></span></div>;
    case "testimonial": return <div style={{ margin: `0 ${pad}px`, padding: 20, borderLeft: `3px solid ${dark ? C.aqua : C.navy}` }}><div style={{ color: C.yellow, fontSize: 14, letterSpacing: 2 }}>{"★".repeat(b.stars ?? 5)}</div><Editable value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="quote" multiline style={{ fontSize: 16, fontStyle: "italic", fontWeight: 300, color: ink, marginTop: 6 }} /><Editable value={b.author ?? ""} onChange={(v) => onChange({ author: v })} placeholder="author" style={{ fontSize: 12, color: sub, marginTop: 6 }} /></div>;
    case "footer": return (
      <div>
        {doc.promoBand && <div style={{ margin: `0 ${pad}px 16px`, background: doc.promoColor ? ROLE[doc.promoColor] : C.yellow, color: doc.promoColor === "navy" || doc.promoColor === "slate" ? C.ivory : C.deep, padding: 16, textAlign: "center", fontSize: 14, fontWeight: 500 }}>{doc.promoBand}</div>}
        <div style={{ padding: `${pad}px`, borderTop: `1px solid ${dark ? "rgba(247,244,239,0.2)" : C.slate}`, fontSize: 11, lineHeight: 1.6, color: sub, textAlign: "center" }}>Lunia Life · 123 Sleep St, Melbourne · <u>Unsubscribe</u></div>
      </div>
    );
    default: return (
      <div style={{ margin: `0 ${pad}px`, padding: 18, border: `1px dashed ${dark ? "rgba(247,244,239,0.35)" : C.slate}`, display: "flex", gap: 12, alignItems: "center" }}>
        {b.imageUrl && <img src={b.imageUrl} alt="" style={{ width: 72, height: 72, objectFit: "cover", order: b.imageSide === "right" ? 2 : 0, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onImageClick(); }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: sub }}>{BLOCK_KIND_LABELS[b.kind]}</div>
          {b.heading !== undefined && <Editable value={b.heading} onChange={(v) => onChange({ heading: v })} placeholder="heading" style={{ fontSize: hs, fontWeight: 500, color: ink, textAlign: ha }} />}
          {b.text !== undefined && <Editable value={b.text} onChange={(v) => onChange({ text: v })} placeholder="text" multiline style={{ fontSize: 14, fontWeight: 300, color: ink }} />}
          {b.items && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14, color: ink }}>{b.items.map((it, i) => <li key={i}>{it}</li>)}</ul>}
        </div>
      </div>
    );
  }
}
