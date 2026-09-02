"use client";
import { useMemo, useRef, useState } from "react";
import {
  Button, IconButton, Tooltip, Tabs, Panel, Field, Input, Textarea, Select, Toggle, Menu, useContextMenu, Dialog, EmptyState, Skeleton, Badge, Spinner, useToast,
  IcCopy, IcTrash, IcRefresh, IcPlus, IcCheck, IcDragHandle, type MenuItem, type Command,
} from "@/components/ui";
import { Shell, RailHead, useHistory, useAutosave, Editable } from "./Shell";
import { MOCK_EMAIL, SUBJECTS, type MockBlock, type BlockKind } from "./mock-data";

type Doc = typeof MOCK_EMAIL;
type View = "desktop" | "mobile";

const C = { navy: "var(--lunia-rich-navy)", deep: "var(--lunia-deep-navy)", slate: "var(--lunia-slate-blue)", ivory: "var(--lunia-soft-ivory)", aqua: "var(--lunia-aqua)", yellow: "var(--lunia-signal-yellow)", font: "var(--lunia-font)" };
const KIND_LABEL: Record<BlockKind, string> = { header: "Header", hero: "Hero", text: "Text", stat: "Stat", checklist: "List", promo: "Promo", cta: "Button", footer: "Footer" };
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
  const [railTab, setRailTab] = useState<"block" | "email" | "brief">("block");
  const saveState = useAutosave(doc);
  const { toast } = useToast();
  const [regen, setRegen] = useState<Record<string, boolean>>({});
  const [gen, setGen] = useState<number | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [brief, setBrief] = useState({ topic: "", tone: "calm, editorial", offer: "" });
  const [drag, setDrag] = useState<{ from: number; over: number | null; pos: "before" | "after" } | null>(null);

  const cur = doc?.blocks.find((b) => b.id === selected) ?? null;
  const idx = doc && cur ? doc.blocks.indexOf(cur) : -1;
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
    const b: MockBlock = { id: `b-${Date.now()}`, kind, text: kind === "text" ? "Write the next point here." : kind === "cta" ? "See the formula" : undefined, heading: kind === "stat" ? "One number" : kind === "checklist" ? "What is inside" : kind === "promo" ? "Offer" : undefined, items: kind === "checklist" ? ["First item", "Second item"] : undefined, imageUrl: kind === "hero" ? MOCK_EMAIL.blocks[1].imageUrl : undefined };
    const at = idx >= 0 ? idx + 1 : d.blocks.length - 1; const blocks = [...d.blocks]; blocks.splice(at, 0, b);
    window.setTimeout(() => setSelected(b.id), 0);
    return { ...d, blocks };
  });
  const regenerate = (id: string) => {
    setRegen((r) => ({ ...r, [id]: true }));
    window.setTimeout(() => { patch(id, { text: "Rewritten: the point stays, the sentence gets shorter, and the claim stays inside what the study supports." }); setRegen((r) => { const n = { ...r }; delete n[id]; return n; }); toast({ title: "Block rewritten", description: "Only this block changed.", action: { label: "Undo", onClick: history.undo } }); }, 1500);
  };

  const startGeneration = () => {
    setBriefOpen(false);
    history.reset({ ...MOCK_EMAIL, subject: "", subjects: [], blocks: [MOCK_EMAIL.blocks[0], MOCK_EMAIL.blocks[8]] });
    setGen(0); let t = 0;
    GEN_STEPS.forEach((s, i) => {
      t += s.ms;
      window.setTimeout(() => {
        setGen(i + 1);
        if (i === 1) history.set((d) => d ? { ...d, subjects: MOCK_EMAIL.subjects, subject: MOCK_EMAIL.subjects[0] } : d);
        if (i === 2) history.set((d) => d ? { ...d, blocks: insertBefore(d.blocks, "b9", [MOCK_EMAIL.blocks[2]]) } : d);
        if (i === 3) history.set((d) => d ? { ...d, blocks: insertBefore(d.blocks, "b9", [MOCK_EMAIL.blocks[3], MOCK_EMAIL.blocks[4], MOCK_EMAIL.blocks[5]]) } : d);
        if (i === 4) history.set((d) => d ? { ...d, blocks: insertBefore(d.blocks, "b9", [MOCK_EMAIL.blocks[6], MOCK_EMAIL.blocks[7]]) } : d);
        if (i === 5) { history.set((d) => d ? { ...d, blocks: [d.blocks[0], MOCK_EMAIL.blocks[1], ...d.blocks.slice(1)] } : d); setGen(null); toast({ title: "Email ready", description: "3 subject lines, 7 blocks. Autosaved.", kind: "success" }); }
      }, t);
    });
  };

  const commands: Command[] = useMemo(() => [
    { id: "new", label: "New email", group: "Create", shortcut: "mod+n", onSelect: () => setBriefOpen(true) },
    { id: "add-text", label: "Add text block", group: "Block", shortcut: "mod+shift+n", onSelect: () => add("text") },
    { id: "add-stat", label: "Add stat block", group: "Block", onSelect: () => add("stat") },
    { id: "add-list", label: "Add checklist", group: "Block", onSelect: () => add("checklist") },
    { id: "add-promo", label: "Add promo band", group: "Block", onSelect: () => add("promo") },
    { id: "dup", label: "Duplicate block", group: "Block", shortcut: "mod+d", onSelect: () => selected && duplicate(selected) },
    { id: "regen", label: "Rewrite this block", group: "Block", keywords: "ai regenerate", onSelect: () => selected && regenerate(selected) },
    { id: "del", label: "Delete block", group: "Block", shortcut: "backspace", onSelect: () => selected && remove(selected) },
    { id: "mobile", label: view === "mobile" ? "Desktop preview" : "Mobile preview", group: "View", onSelect: () => setView((v) => (v === "mobile" ? "desktop" : "mobile")) },
    { id: "subjects", label: "Choose subject line", group: "Email", onSelect: () => setRailTab("email") },
    { id: "html", label: "Copy HTML", group: "Export", onSelect: () => toast({ title: "HTML copied", kind: "success" }) },
    { id: "klaviyo", label: "Push to Klaviyo", group: "Export", shortcut: "mod+e", onSelect: () => toast({ title: "Pushed to Klaviyo as a draft", description: "Opens in Klaviyo's editor.", kind: "success" }) },
    { id: "test", label: "Send a test email", group: "Export", onSelect: () => toast({ title: "Test sent to you" }) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [selected, view]);

  const ctx = useContextMenu();
  const blockMenu = (id: string): MenuItem[] => [
    { label: "Duplicate", icon: <IcCopy size={14} />, shortcut: "mod+d", onSelect: () => duplicate(id) },
    { label: "Rewrite with AI", icon: <IcRefresh size={14} />, onSelect: () => regenerate(id) },
    { label: "Move up", disabled: idx <= 1, onSelect: () => move(idx, idx - 1) },
    { label: "Move down", disabled: !doc || idx >= doc.blocks.length - 2, onSelect: () => move(idx, idx + 1) },
    { type: "separator" },
    { label: "Delete", icon: <IcTrash size={14} />, danger: true, shortcut: "backspace", onSelect: () => remove(id) },
  ];
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLButtonElement | null>(null);

  const left = doc && (
    <>
      <RailHead actions={<Tooltip label="Add block" shortcut="mod+shift+n"><IconButton title="Add block" size="sm" ref={addRef} onClick={() => setAddOpen(true)}><IcPlus size={14} /></IconButton></Tooltip>}>Blocks <Badge>{doc.blocks.length}</Badge></RailHead>
      <Menu open={addOpen} onClose={() => setAddOpen(false)} anchorRef={addRef} ariaLabel="Add block" items={(["text", "stat", "checklist", "promo", "hero", "cta"] as BlockKind[]).map((k) => ({ label: KIND_LABEL[k], onSelect: () => add(k) }))} />
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
              <span className="blocks__kind">{KIND_LABEL[b.kind]}</span>
              <span className="blocks__text">{b.heading ?? b.text ?? (b.kind === "header" ? "Logo and preheader" : b.kind === "footer" ? "Address and unsubscribe" : "")}</span>
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
    </>
  );

  const right = doc && (
    <>
      <div style={{ padding: "8px 12px 0" }}><Tabs value={railTab} onChange={setRailTab} ariaLabel="Properties" items={[{ value: "block", label: "Block" }, { value: "email", label: "Email" }, { value: "brief", label: "Brief" }]} /></div>
      {railTab === "block" && (
        <div className="shell__rail-body">
          {!cur ? (
            <EmptyState title="Nothing selected" description="Click a block in the email or the list to edit it." />
          ) : (
            <Panel title={KIND_LABEL[cur.kind]} actions={cur.kind !== "header" && cur.kind !== "footer" && <Tooltip label="Rewrite this block with AI"><IconButton title="Rewrite" size="sm" onClick={() => regenerate(cur.id)} disabled={!!regen[cur.id]}>{regen[cur.id] ? <Spinner /> : <IcRefresh size={14} />}</IconButton></Tooltip>}>
              {cur.heading !== undefined && <Field label="Heading">{(p) => <Input {...p} value={cur.heading} onChange={(e) => patch(cur.id, { heading: e.target.value }, "h")} />}</Field>}
              {cur.text !== undefined && <Field label={cur.kind === "cta" ? "Button label" : "Text"} hint={cur.kind === "text" ? `${cur.text.split(" ").length} words` : undefined}>{(p) => <Textarea {...p} rows={cur.kind === "cta" ? 1 : 5} value={cur.text} onChange={(e) => patch(cur.id, { text: e.target.value }, "t")} />}</Field>}
              {cur.items && <Field label="Items" hint="One per line">{(p) => <Textarea {...p} rows={4} value={cur.items?.join("\n")} onChange={(e) => patch(cur.id, { items: e.target.value.split("\n") }, "i")} />}</Field>}
              {cur.kind === "cta" && <Field label="Link">{(p) => <Input {...p} defaultValue="https://lunialife.com/products/restore" />}</Field>}
              {cur.kind === "hero" && <><div style={{ aspectRatio: "4/5", borderRadius: 6, overflow: "hidden", border: "1px solid var(--ui-border)" }}><img src={cur.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div><div style={{ display: "flex", gap: 6 }}><Button icon={<IcRefresh size={14} />} onClick={() => toast({ title: "Generating a new hero", description: "About 30 seconds." })}>New image</Button><Button onClick={() => toast({ title: "Asset library opens here" })}>Choose</Button></div></>}
              {(cur.kind === "text" || cur.kind === "stat") && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Field label="Align">{(p) => <Select {...p} value={cur.align ?? "left"} onChange={(e) => patch(cur.id, { align: e.target.value as "left" | "center" })}><option value="left">Left</option><option value="center">Center</option></Select>}</Field>
                  <Field label="Size">{(p) => <Select {...p} value={cur.size ?? "m"} onChange={(e) => patch(cur.id, { size: e.target.value as "s" | "m" | "l" })}><option value="s">Small</option><option value="m">Medium</option><option value="l">Large</option></Select>}</Field>
                </div>
              )}
              {cur.kind === "text" && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Button size="sm" onClick={() => patch(cur.id, { text: (cur.text ?? "").split(". ").slice(0, 2).join(". ") + "." })}>Shorten</Button><Button size="sm" onClick={() => toast({ title: "No banned claims found", kind: "success" })}>Check claims</Button><Button size="sm" onClick={() => toast({ title: "Merge tag inserted", description: "{{ first_name|default:'there' }}" })}>Personalise</Button></div>}
            </Panel>
          )}
        </div>
      )}
      {railTab === "email" && (
        <div className="shell__rail-body">
          <Panel title="Subject line">
            <div role="radiogroup" aria-label="Subject line" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {doc.subjects.map((s) => <button key={s} type="button" role="radio" aria-checked={doc.subject === s} className="ui-card-btn" onClick={() => history.set((d) => d ? { ...d, subject: s } : d)}><span className="ui-card-btn__title" style={{ fontWeight: 500 }}>{s}</span><span className="ui-card-btn__desc">{s.length} characters</span></button>)}
            </div>
            <Button icon={<IcRefresh size={14} />} onClick={() => toast({ title: "Three new subject lines" })}>More options</Button>
            <Field label="Preheader">{(p) => <Input {...p} value={doc.preheader} onChange={(e) => history.set((d) => d ? { ...d, preheader: e.target.value } : d, "pre")} />}</Field>
          </Panel>
          <Panel title="Theme">
            <Tabs value={doc.theme} onChange={(v) => history.set((d) => d ? { ...d, theme: v } : d)} ariaLabel="Email theme" items={[{ value: "navy", label: "Navy" }, { value: "cream", label: "Cream" }]} />
            <Field label="Block spacing">{(p) => <Select {...p} defaultValue="default"><option value="tight">Tight</option><option value="default">Default</option><option value="roomy">Roomy</option></Select>}</Field>
            <Toggle checked onChange={() => {}} label="Show social row in footer" />
          </Panel>
        </div>
      )}
      {railTab === "brief" && (
        <div className="shell__rail-body">
          <Panel title="Brief">
            <Field label="Topic">{(p) => <Textarea {...p} rows={2} defaultValue="Melatonin supplements boost DNA repair in night shift workers" />}</Field>
            <Field label="Tone">{(p) => <Select {...p} defaultValue="calm, editorial">{["calm, editorial", "warm, personal", "direct, product-first", "urgent, promotional"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
            <Field label="Offer">{(p) => <Input {...p} defaultValue="Three month plan, $60" />}</Field>
            <Button variant="primary" icon={<IcRefresh size={14} />} onClick={() => { setSelected(null); startGeneration(); }}>Regenerate from brief</Button>
            <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>Rewrites every block. Rewrite one block from its own panel when only one is wrong.</span>
          </Panel>
        </div>
      )}
    </>
  );

  const width = view === "mobile" ? 375 : 600;
  const dark = doc?.theme === "navy";
  const canvas = doc ? (
    <>
      <div className="shell__stage" style={{ alignItems: "start" }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div style={{ width, background: dark ? C.navy : C.ivory, color: dark ? C.ivory : C.deep, fontFamily: C.font, boxShadow: "var(--ui-elev-2)", borderRadius: 2, overflow: "hidden", transition: "width var(--ui-dur-3) var(--ui-ease-in-out)" }} aria-label="Email preview">
          {doc.blocks.map((b) => (
            <div key={b.id} className={`sel-hover${selected === b.id ? " sel-outline" : ""}`} style={{ position: "relative" }} onClick={() => { setSelected(b.id); setRailTab("block"); }} onContextMenu={(e) => { if (b.kind === "header" || b.kind === "footer") return; setSelected(b.id); ctx.bind.onContextMenu(e); }}>
              {regen[b.id] ? <div style={{ padding: 24 }}><Skeleton height={14} /><div style={{ height: 8 }} /><Skeleton height={14} width="80%" /></div> : <EmailBlock block={b} dark={dark} mobile={view === "mobile"} onChange={(p) => patch(b.id, p, b.id)} />}
            </div>
          ))}
        </div>
      </div>
      <div className="shell__zoombar"><span style={{ fontFamily: "var(--ui-font-mono)", fontSize: 11, color: "var(--ui-text-3)" }}>{width}px · the same HTML that gets exported · subject: {doc.subject || "not chosen yet"}</span></div>
    </>
  ) : (
    <div className="shell__stage">
      <EmptyState plain icon={<IcPlus size={28} strokeWidth={1.5} />} title="Start an email" description="Pick a subject or an offer. Subject lines arrive first, then the blocks fill in while you read." actions={<><Button variant="primary" onClick={() => setBriefOpen(true)}>New email</Button><Button onClick={() => { history.reset(MOCK_EMAIL); setSelected("b3"); }}>Open a recent one</Button><Button onClick={() => toast({ title: "Import from Klaviyo opens here" })}>Import from Klaviyo</Button></>} />
    </div>
  );

  return (
    <>
      <Shell<View>
        title={doc?.subject || "Untitled email"}
        onTitle={(t) => history.set((d) => d ? { ...d, subject: t } : d, "title")}
        kindLabel="Email"
        saveState={doc ? saveState : "saved"}
        canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.undo} onRedo={history.redo}
        views={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }]} view={view} onView={setView}
        exportLabel="Push to Klaviyo" onExport={() => toast({ title: "Pushed to Klaviyo as a draft", description: "Opens in Klaviyo's editor.", kind: "success" })}
        commands={commands}
        left={left} right={right}
        topExtra={<Badge tone="warning">Proposal</Badge>}
      >
        {canvas}
      </Shell>
      <Dialog open={briefOpen} onClose={() => setBriefOpen(false)} title="New email" wide footer={<><Button onClick={() => setBriefOpen(false)}>Cancel</Button><Button variant="primary" disabled={brief.topic.trim().length < 4} onClick={startGeneration}>Generate</Button></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Topic or angle">{(p) => <Input {...p} autoFocus value={brief.topic} onChange={(e) => setBrief({ ...brief, topic: e.target.value })} placeholder="Search subjects or type an angle" />}</Field>
            <div role="listbox" aria-label="Subjects" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {SUBJECTS.filter((s) => s.toLowerCase().includes(brief.topic.toLowerCase())).slice(0, 6).map((s) => <button key={s} type="button" role="option" aria-selected={brief.topic === s} className="ui-menu-item" data-active={brief.topic === s} onClick={() => setBrief({ ...brief, topic: s })}>{s}</button>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Tone">{(p) => <Select {...p} value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })}>{["calm, editorial", "warm, personal", "direct, product-first", "urgent, promotional"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
            <Field label="Offer" hint="Optional">{(p) => <Input {...p} value={brief.offer} onChange={(e) => setBrief({ ...brief, offer: e.target.value })} placeholder="Up to 35% off" />}</Field>
            <Field label="Start from">{(p) => <Select {...p} defaultValue="model"><option value="model">Let the model choose a layout</option><option value="edu">Educational</option><option value="proof">Proof-led</option><option value="last">Last call</option></Select>}</Field>
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
function EmailBlock({ block: b, dark, mobile, onChange }: { block: MockBlock; dark: boolean; mobile: boolean; onChange: (p: Partial<MockBlock>) => void }) {
  const ink = dark ? C.ivory : C.deep; const sub = dark ? "rgba(247,244,239,0.7)" : C.slate;
  const pad = mobile ? 20 : 32;
  const size = { s: 14, m: 16, l: 19 }[b.size ?? "m"];
  switch (b.kind) {
    case "header": return <div style={{ padding: `${pad}px ${pad}px 8px`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, letterSpacing: "0.2em", color: sub }}><span style={{ fontWeight: 600, color: ink }}>LUNIA LIFE</span><span>View in browser</span></div>;
    case "hero": return <div style={{ position: "relative" }}><img src={b.imageUrl} alt="" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} /><div style={{ position: "absolute", left: pad, right: pad, bottom: pad, background: C.ivory, color: C.deep, padding: "14px 18px", fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", textAlign: "center" }}><Editable value={b.heading ?? ""} onChange={(v) => onChange({ heading: v })} placeholder="hero caption" /></div></div>;
    case "text": return <div style={{ padding: `16px ${pad}px`, fontSize: size, lineHeight: 1.6, fontWeight: 300, color: ink, textAlign: b.align ?? "left" }}><Editable as="p" multiline value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="text" style={{ margin: 0 }} /></div>;
    case "stat": return <div style={{ margin: `8px ${pad}px`, padding: 24, border: `1px solid ${dark ? "rgba(247,244,239,0.25)" : C.slate}`, textAlign: "center" }}><Editable value={b.heading ?? ""} onChange={(v) => onChange({ heading: v })} placeholder="stat heading" style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-0.02em", color: dark ? C.aqua : C.deep }} /><Editable value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="stat text" style={{ fontSize: 14, marginTop: 8, color: sub }} multiline /></div>;
    case "checklist": return <div style={{ padding: `8px ${pad}px 16px` }}><Editable value={b.heading ?? ""} onChange={(v) => onChange({ heading: v })} placeholder="list heading" style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: sub, marginBottom: 10 }} /><ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>{(b.items ?? []).map((it, i) => <li key={i} style={{ display: "flex", gap: 10, fontSize: 15, fontWeight: 300, color: ink }}><span style={{ color: dark ? C.aqua : C.deep }}>✓</span>{it}</li>)}</ul></div>;
    case "promo": return <div style={{ margin: `12px ${pad}px`, background: C.yellow, color: C.deep, padding: 20, textAlign: "center" }}><Editable value={b.heading ?? ""} onChange={(v) => onChange({ heading: v })} placeholder="promo heading" style={{ fontSize: 20, fontWeight: 600 }} /><Editable value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="promo text" style={{ fontSize: 13, marginTop: 4 }} /></div>;
    case "cta": return <div style={{ padding: `16px ${pad}px 28px`, textAlign: "center" }}><span style={{ display: "inline-block", background: dark ? C.ivory : C.navy, color: dark ? C.navy : C.ivory, padding: "14px 28px", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}><Editable value={b.text ?? ""} onChange={(v) => onChange({ text: v })} placeholder="button label" as="span" /></span></div>;
    case "footer": return <div style={{ padding: `${pad}px`, borderTop: `1px solid ${dark ? "rgba(247,244,239,0.2)" : C.slate}`, fontSize: 11, lineHeight: 1.6, color: sub, textAlign: "center" }}>Lunia Life · 123 Sleep St, Melbourne · <u>Unsubscribe</u></div>;
  }
}
