"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button, IconButton, Tooltip, Tabs, Panel, PanelSectionTitle, Field, Input, Textarea, Select, Toggle, Slider, Menu, useContextMenu,
  Dialog, EmptyState, Skeleton, Badge, CardButton, useToast, useConfirm, Spinner, Popover,
  IcCopy, IcTrash, IcRefresh, IcPlus, IcCheck, type MenuItem, type Command,
} from "@/components/ui";
import { Shell, RailHead, useHistory, useAutosave, useFitScale } from "./Shell";
import { SlideCanvas, SLIDE_W, SLIDE_H, type SlideElement } from "./SlideCanvas";
import { MOCK_CAROUSEL, SUBJECTS, HOOK_OPTIONS, type MockSlide } from "./mock-data";

type Doc = typeof MOCK_CAROUSEL;
type View = "editor" | "preview";
type Direction = { props: "rail" | "floating"; brief: "rail" | "sheet" };

const DIR_KEY = "lunia:proposal:direction";
function readDir(): Direction {
  try { return { props: "rail", brief: "rail", ...JSON.parse(localStorage.getItem(DIR_KEY) ?? "{}") }; } catch { return { props: "rail", brief: "rail" }; }
}

const GEN_STEPS = [
  { label: "Reading the brief", ms: 900 },
  { label: "Drafting three hooks", ms: 1800 },
  { label: "Writing slide 2", ms: 1400 },
  { label: "Writing slide 3", ms: 1300 },
  { label: "Writing slide 4", ms: 1300 },
  { label: "Writing the takeaway", ms: 1100 },
  { label: "Finding citations", ms: 1200 },
  { label: "Rendering the hook image", ms: 2200 },
];

export default function CarouselProposal({ startEmpty = false }: { startEmpty?: boolean }) {
  const history = useHistory<Doc | null>(startEmpty ? null : MOCK_CAROUSEL);
  const doc = history.value;
  const [dir, setDir] = useState<Direction>({ props: "rail", brief: "rail" });
  useEffect(() => { setDir(readDir()); }, []);
  const updateDir = (d: Partial<Direction>) => { const next = { ...dir, ...d }; setDir(next); localStorage.setItem(DIR_KEY, JSON.stringify(next)); };

  const [view, setView] = useState<View>("editor");
  const [selected, setSelected] = useState<string[]>(() => (doc?.slides[0] ? [doc.slides[0].id] : []));
  const [element, setElement] = useState<SlideElement | null>(null);
  const [railTab, setRailTab] = useState<"slide" | "style" | "brief">("slide");
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [showArrows, setShowArrows] = useState(true);
  const [showNumbers, setShowNumbers] = useState(false);
  const [logoScale, setLogoScale] = useState(100);
  const saveState = useAutosave(doc);
  const { toast } = useToast();
  const confirm = useConfirm();

  const current = doc?.slides.find((s) => s.id === selected[0]) ?? doc?.slides[0] ?? null;
  const idx = doc && current ? doc.slides.indexOf(current) : 0;

  const patchSlide = useCallback((id: string, patch: Partial<MockSlide>, key?: string) => {
    history.set((d) => d ? { ...d, slides: d.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : d, key);
  }, [history]);

  /* ── slide operations ────────────────────────────────────────────────── */
  const duplicate = (ids: string[]) => history.set((d) => {
    if (!d) return d;
    const out: MockSlide[] = [];
    d.slides.forEach((s) => { out.push(s); if (ids.includes(s.id)) out.push({ ...s, id: `${s.id}-copy-${Date.now()}` }); });
    return { ...d, slides: out };
  });
  const remove = async (ids: string[]) => {
    if (!doc) return;
    if (ids.length > 1 && !(await confirm({ title: `Delete ${ids.length} slides?`, description: "You can undo this with Cmd Z.", confirmLabel: "Delete", tone: "danger" }))) return;
    const before = doc.slides;
    history.set((d) => d ? { ...d, slides: d.slides.filter((s) => !ids.includes(s.id)) } : d);
    setSelected([]);
    toast({ title: ids.length === 1 ? "Slide deleted" : `${ids.length} slides deleted`, action: { label: "Undo", onClick: () => history.set((d) => d ? { ...d, slides: before } : d) } });
  };
  const move = (from: number, to: number) => history.set((d) => {
    if (!d || from === to) return d;
    const slides = [...d.slides]; const [s] = slides.splice(from, 1); slides.splice(to, 0, s);
    return { ...d, slides };
  });
  const [regen, setRegen] = useState<Record<string, boolean>>({});
  const regenerate = (ids: string[], what: "copy" | "graphic" = "copy") => {
    setRegen((r) => ({ ...r, ...Object.fromEntries(ids.map((i) => [i, true])) }));
    window.setTimeout(() => {
      ids.forEach((id) => patchSlide(id, what === "copy" ? { headline: rewrite(doc?.slides.find((s) => s.id === id)?.headline ?? "") } : { graphic: "stat" }));
      setRegen((r) => { const n = { ...r }; ids.forEach((i) => delete n[i]); return n; });
      toast({ title: ids.length === 1 ? `Slide ${what} regenerated` : `${ids.length} slides regenerated`, description: "The rest of the carousel is untouched.", action: { label: "Undo", onClick: history.undo } });
    }, 1600);
  };
  const addSlide = () => history.set((d) => {
    if (!d) return d;
    const s: MockSlide = { id: `s-${Date.now()}`, kind: "content", headline: "New slide", body: "Write the point this slide makes in one or two sentences.", citation: "", graphic: "none" };
    const slides = [...d.slides]; slides.splice(idx + 1, 0, s);
    window.setTimeout(() => setSelected([s.id]), 0);
    return { ...d, slides };
  });

  /* ── selection ──────────────────────────────────────────────────────── */
  const selectSlide = (id: string, e?: React.MouseEvent) => {
    if (e?.shiftKey && doc && selected.length) {
      const a = doc.slides.findIndex((s) => s.id === selected[0]); const b = doc.slides.findIndex((s) => s.id === id);
      const [lo, hi] = a < b ? [a, b] : [b, a];
      setSelected([selected[0], ...doc.slides.slice(lo, hi + 1).map((s) => s.id).filter((x) => x !== selected[0])]);
    } else if (e?.metaKey || e?.ctrlKey) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else setSelected([id]);
    setElement(null);
    setRailTab("slide");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!doc) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setSelected([doc.slides[Math.min(idx + 1, doc.slides.length - 1)].id]); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setSelected([doc.slides[Math.max(idx - 1, 0)].id]); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(selected); }
      else if ((e.key === "Backspace" || e.key === "Delete") && selected.length) { e.preventDefault(); remove(selected); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); setSelected(doc.slides.map((s) => s.id)); }
      else if (e.key === "Escape") { setSelected(current ? [current.id] : []); setElement(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── drag reorder in the filmstrip ──────────────────────────────────── */
  const [drag, setDrag] = useState<{ from: number; over: number | null; pos: "before" | "after" } | null>(null);

  /* ── generation ─────────────────────────────────────────────────────── */
  const [briefOpen, setBriefOpen] = useState(false);
  const [gen, setGen] = useState<{ step: number; hooks: typeof HOOK_OPTIONS | null; pickedHook: number | null; slides: MockSlide[] } | null>(null);
  const [brief, setBrief] = useState({ topic: "", tone: "Educational", style: "Editorial", length: "Concise" });
  const startGeneration = () => {
    setBriefOpen(false);
    const base = { ...MOCK_CAROUSEL, title: brief.topic || MOCK_CAROUSEL.title, topic: brief.topic || MOCK_CAROUSEL.topic, tone: brief.tone, slides: [] as MockSlide[] };
    history.reset(base);
    setGen({ step: 0, hooks: null, pickedHook: null, slides: [] });
    let t = 0;
    GEN_STEPS.forEach((s, i) => {
      t += s.ms;
      window.setTimeout(() => {
        setGen((g) => g ? { ...g, step: i + 1, hooks: i >= 1 ? HOOK_OPTIONS : g.hooks } : g);
        if (i >= 2 && i <= 5) {
          const slide = MOCK_CAROUSEL.slides[i - 1];
          history.set((d) => d ? { ...d, slides: [...d.slides.filter((x) => x.kind !== "hook" || true), slide] } : d);
        }
        if (i === 7) {
          history.set((d) => d ? { ...d, slides: d.slides.map((x) => (x.kind === "hook" ? { ...x, imageUrl: MOCK_CAROUSEL.slides[0].imageUrl } : x)) } : d);
          setGen(null);
          toast({ title: "Carousel ready", description: "5 slides, 4 citations. Nothing is saved to the library until you keep it.", kind: "success" });
        }
      }, t);
    });
  };
  const pickHook = (i: number) => {
    setGen((g) => g ? { ...g, pickedHook: i } : g);
    const h = HOOK_OPTIONS[i];
    history.set((d) => d ? { ...d, slides: [{ ...MOCK_CAROUSEL.slides[0], ...h, imageUrl: undefined }, ...d.slides.filter((s) => s.kind !== "hook")] } : d);
    setSelected(["s1"]);
  };

  /* ── canvas fit ─────────────────────────────────────────────────────── */
  const [fitScale, attachStage] = useFitScale(SLIDE_W, SLIDE_H, 40, 1);
  const scale = zoom === "fit" ? fitScale : zoom / 100;

  /* ── commands ───────────────────────────────────────────────────────── */
  const commands: Command[] = useMemo(() => [
    { id: "new", label: "New carousel", group: "Create", shortcut: "mod+n", onSelect: () => setBriefOpen(true) },
    { id: "add", label: "Add slide after this one", group: "Slide", shortcut: "mod+shift+n", onSelect: addSlide },
    { id: "dup", label: "Duplicate slide", group: "Slide", shortcut: "mod+d", onSelect: () => duplicate(selected) },
    { id: "regen", label: "Regenerate slide copy", group: "Slide", keywords: "rewrite ai", onSelect: () => regenerate(selected) },
    { id: "regen-g", label: "Regenerate slide graphic", group: "Slide", onSelect: () => regenerate(selected, "graphic") },
    { id: "del", label: "Delete slide", group: "Slide", shortcut: "backspace", onSelect: () => remove(selected) },
    { id: "all", label: "Select all slides", group: "Slide", shortcut: "mod+a", onSelect: () => doc && setSelected(doc.slides.map((s) => s.id)) },
    { id: "preview", label: "Preview at Instagram size", group: "View", onSelect: () => setView("preview") },
    { id: "arrows", label: showArrows ? "Hide slide arrows" : "Show slide arrows", group: "Style", onSelect: () => setShowArrows((v) => !v) },
    { id: "export", label: "Export PNGs", group: "Export", shortcut: "mod+e", onSelect: () => toast({ title: "Exporting 5 PNGs", description: "1080 by 1350, one file per slide.", kind: "success" }) },
    { id: "caption", label: "Copy Instagram caption", group: "Export", onSelect: () => toast({ title: "Caption copied" }) },
    { id: "email", label: "Turn into an email", group: "Create", keywords: "campaign convert", onSelect: () => toast({ title: "Email draft started from this carousel" }) },
    { id: "help", label: "Keyboard shortcuts", group: "Help", shortcut: "?", onSelect: () => toast({ title: "Arrows move, Cmd D duplicates, Backspace deletes, Cmd Z undoes." }) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [selected, doc, showArrows]);

  const ctx = useContextMenu();
  const slideMenu = (ids: string[]): MenuItem[] => [
    { type: "heading", label: ids.length > 1 ? `${ids.length} slides` : `Slide ${idx + 1}` },
    { label: "Duplicate", icon: <IcCopy size={14} />, shortcut: "mod+d", onSelect: () => duplicate(ids) },
    { label: "Regenerate copy", icon: <IcRefresh size={14} />, onSelect: () => regenerate(ids) },
    { label: "Regenerate graphic", icon: <IcRefresh size={14} />, disabled: ids.some((i) => doc?.slides.find((s) => s.id === i)?.kind !== "content"), onSelect: () => regenerate(ids, "graphic") },
    { type: "separator" },
    { label: "Delete", icon: <IcTrash size={14} />, danger: true, shortcut: "backspace", onSelect: () => remove(ids) },
  ];

  /* ── rails ──────────────────────────────────────────────────────────── */
  const left = doc && (
    <>
      <RailHead actions={<Tooltip label="Add slide" shortcut="mod+shift+n"><IconButton title="Add slide" size="sm" onClick={addSlide}><IcPlus size={14} /></IconButton></Tooltip>}>Slides <Badge>{doc.slides.length}</Badge></RailHead>
      <div className="strip" role="listbox" aria-label="Slides" aria-multiselectable>
        {doc.slides.map((s, i) => {
          const multi = selected.length > 1 && selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={selected[0] === s.id}
              data-multi={multi}
              data-dragging={drag?.from === i}
              data-drop={drag && drag.over === i && drag.from !== i ? drag.pos : undefined}
              className="strip__item"
              draggable
              onDragStart={(e) => { setDrag({ from: i, over: null, pos: "after" }); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setDrag((d) => d ? { ...d, over: i, pos: e.clientY < r.top + r.height / 2 ? "before" : "after" } : d); }}
              onDrop={(e) => { e.preventDefault(); if (!drag) return; const to = drag.pos === "before" ? i : i + 1; move(drag.from, to > drag.from ? to - 1 : to); setDrag(null); }}
              onDragEnd={() => setDrag(null)}
              onClick={(e) => selectSlide(s.id, e)}
              onContextMenu={(e) => { if (!selected.includes(s.id)) setSelected([s.id]); ctx.bind.onContextMenu(e); }}
            >
              <div className="strip__thumb" style={{ aspectRatio: `${SLIDE_W} / ${SLIDE_H}` }}>
                {regen[s.id] ? <Skeleton width="100%" height="100%" /> : <ThumbSlide slide={s} showArrows={showArrows} />}
              </div>
              <div className="strip__label"><span className="n">{i + 1}</span>{s.kind === "hook" ? "Hook" : s.kind === "takeaway" ? "Takeaway" : s.headline}</div>
            </button>
          );
        })}
        {gen && gen.step >= 2 && gen.step < 7 && <div className="strip__item" aria-hidden="true"><div className="strip__thumb"><Skeleton width="100%" height="100%" /></div><div className="strip__label"><span className="n">{doc.slides.length + 1}</span>Writing</div></div>}
      </div>
      <Menu open={ctx.open} onClose={ctx.close} anchorRect={ctx.rect} items={slideMenu(selected)} ariaLabel="Slide actions" />
      {gen && <div style={{ padding: "0 12px 12px" }}><GenProgress step={gen.step} /></div>}
    </>
  );

  const right = doc && current && (
    <>
      <div style={{ padding: "8px 12px 0" }}>
        <Tabs value={railTab} onChange={setRailTab} ariaLabel="Properties" items={[{ value: "slide", label: "Slide" }, { value: "style", label: "Style" }, { value: "brief", label: "Brief" }]} />
      </div>
      {railTab === "slide" && (
        <div className="shell__rail-body">
          {selected.length > 1 ? (
            <Panel title={`${selected.length} slides selected`}>
              <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Actions here apply to every selected slide.</span>
              <Button onClick={() => regenerate(selected)} icon={<IcRefresh size={14} />}>Regenerate copy</Button>
              <Button onClick={() => duplicate(selected)} icon={<IcCopy size={14} />}>Duplicate</Button>
              <Button variant="danger" onClick={() => remove(selected)} icon={<IcTrash size={14} />}>Delete</Button>
            </Panel>
          ) : (
            <>
              <Panel title={current.kind === "hook" ? "Hook slide" : current.kind === "takeaway" ? "Takeaway" : `Slide ${idx + 1}`} actions={<Tooltip label="Regenerate this slide's copy"><IconButton title="Regenerate copy" size="sm" onClick={() => regenerate([current.id])} disabled={!!regen[current.id]}>{regen[current.id] ? <Spinner /> : <IcRefresh size={14} />}</IconButton></Tooltip>}>
                {dir.props === "rail" ? (
                  <>
                    {current.eyebrow !== undefined && <Field label="Eyebrow">{(p) => <Input {...p} value={current.eyebrow} onChange={(e) => patchSlide(current.id, { eyebrow: e.target.value }, "eyebrow")} onFocus={() => setElement("eyebrow")} />}</Field>}
                    <Field label="Headline" hint={`${current.headline.length} characters`}>{(p) => <Textarea {...p} rows={2} value={current.headline} onChange={(e) => patchSlide(current.id, { headline: e.target.value }, "headline")} onFocus={() => setElement("headline")} />}</Field>
                    {current.body !== undefined && <Field label="Body">{(p) => <Textarea {...p} rows={4} value={current.body} onChange={(e) => patchSlide(current.id, { body: e.target.value }, "body")} onFocus={() => setElement("body")} />}</Field>}
                    {current.citation !== undefined && <Field label="Citation">{(p) => <Textarea {...p} rows={2} value={current.citation} onChange={(e) => patchSlide(current.id, { citation: e.target.value }, "citation")} onFocus={() => setElement("citation")} />}</Field>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Button size="sm" onClick={() => patchSlide(current.id, { headline: shorten(current.headline) })}>Shorten</Button>
                      <Button size="sm" onClick={() => patchSlide(current.id, { headline: punch(current.headline) })}>Punch up</Button>
                      <Button size="sm" onClick={() => toast({ title: "No banned claims found", kind: "success" })}>Check claims</Button>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Click any text on the slide to edit it there. The floating toolbar carries shorten, punch up and regenerate.</span>
                )}
              </Panel>
              {current.kind === "content" && (
                <Panel title="Graphic">
                  <Field label="Type">{(p) => <Select {...p} value={current.graphic ?? "none"} onChange={(e) => patchSlide(current.id, { graphic: e.target.value as MockSlide["graphic"] })}><option value="none">None</option><option value="stat">Hero number</option><option value="list">Two column list</option><option value="timeline">Timeline</option></Select>}</Field>
                  <Button onClick={() => regenerate([current.id], "graphic")} icon={<IcRefresh size={14} />}>Regenerate graphic</Button>
                </Panel>
              )}
              {current.kind === "hook" && (
                <Panel title="Image">
                  <div style={{ aspectRatio: "4/3", borderRadius: 6, overflow: "hidden", border: "1px solid var(--ui-border)" }}>{current.imageUrl ? <img src={current.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Skeleton width="100%" height="100%" />}</div>
                  <div style={{ display: "flex", gap: 6 }}><Button onClick={() => toast({ title: "Generating a new hook image", description: "About 30 seconds. The slide stays editable meanwhile." })} icon={<IcRefresh size={14} />}>New image</Button><Button onClick={() => toast({ title: "Asset library opens here" })}>Choose</Button></div>
                  <Field label="Image prompt">{(p) => <Textarea {...p} rows={3} defaultValue="Editorial still life of fermented foods on ivory linen, soft morning light" />}</Field>
                </Panel>
              )}
            </>
          )}
        </div>
      )}
      {railTab === "style" && (
        <div className="shell__rail-body">
          <Panel title="Format">
            <Field label="Aspect">{(p) => <Select {...p} defaultValue="4:5"><option value="4:5">4:5 Feed, 1080 by 1350</option><option value="9:16">9:16 Story, 1080 by 1920</option></Select>}</Field>
            <Field label="Preset">{(p) => <Select {...p} defaultValue="editorial"><option value="editorial">Editorial scientific</option><option value="default">Default</option><option value="freepress">Free press</option></Select>}</Field>
          </Panel>
          <Panel title="Branding">
            <Field label="Logo size">{(p) => <Slider id={p.id} value={logoScale} onChange={setLogoScale} min={60} max={140} format={(v) => `${v}%`} />}</Field>
            <Toggle checked={showArrows} onChange={setShowArrows} label="Slide arrows" />
            <Toggle checked={showNumbers} onChange={setShowNumbers} label="Slide numbers" />
            <Toggle checked onChange={() => {}} label="Citation bars" />
          </Panel>
          <Panel title="Palette">
            <PanelSectionTitle>Content colours</PanelSectionTitle>
            <div style={{ display: "flex", gap: 6 }}>
              {["--lunia-deep-navy", "--lunia-rich-navy", "--lunia-slate-blue", "--lunia-soft-ivory", "--lunia-aqua", "--lunia-signal-yellow"].map((c) => <span key={c} title={c} style={{ width: 24, height: 24, borderRadius: 4, background: `var(${c})`, border: "1px solid var(--ui-border)" }} />)}
            </div>
            <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>Closed set. The lint flags anything else.</span>
          </Panel>
        </div>
      )}
      {railTab === "brief" && (
        <div className="shell__rail-body">
          <Panel title="Brief">
            <Field label="Topic">{(p) => <Textarea {...p} rows={2} value={doc.topic} onChange={(e) => history.set((d) => d ? { ...d, topic: e.target.value } : d, "topic")} />}</Field>
            <Field label="Hook tone">{(p) => <Select {...p} value={doc.tone} onChange={(e) => history.set((d) => d ? { ...d, tone: e.target.value } : d)}>{["Educational", "Science-backed", "Myth-bust", "Bold hook", "The Paradox", "The Symptom"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
            <Field label="Length">{(p) => <Select {...p} defaultValue="Concise"><option>Concise</option><option>Standard</option></Select>}</Field>
            <Button variant="primary" onClick={() => { setSelected([]); startGeneration(); }} icon={<IcRefresh size={14} />}>Regenerate from brief</Button>
            <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>Rewrites every slide. Regenerate one slide from its own panel instead when only one is wrong.</span>
          </Panel>
          <Panel title="Caption" collapsible defaultCollapsed>
            <Textarea rows={6} value={doc.caption} onChange={(e) => history.set((d) => d ? { ...d, caption: e.target.value } : d, "caption")} aria-label="Instagram caption" />
            <Button onClick={() => toast({ title: "Caption copied" })} icon={<IcCopy size={14} />}>Copy caption</Button>
          </Panel>
        </div>
      )}
    </>
  );

  /* ── canvas ─────────────────────────────────────────────────────────── */
  const floatRef = useRef<HTMLDivElement | null>(null);
  const canvas = doc && current ? (
    view === "editor" ? (
      <>
        <div className="shell__stage" ref={attachStage} onClick={(e) => { if (e.target === e.currentTarget) setElement(null); }}>
          <div className="shell__stage-inner" style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", boxShadow: "var(--ui-elev-2)" }} onContextMenu={ctx.bind.onContextMenu}>
              {regen[current.id] ? (
                <div style={{ width: SLIDE_W, height: SLIDE_H, background: "var(--lunia-soft-ivory)", display: "grid", placeItems: "center" }}><div style={{ transform: `scale(${1 / scale})`, display: "flex", gap: 10, alignItems: "center", color: "var(--lunia-slate-blue)", fontSize: 14 }}><Spinner /> Rewriting this slide</div></div>
              ) : (
                <SlideCanvas slide={current} editable selected={element} onSelect={setElement} onChange={(p) => patchSlide(current.id, p, Object.keys(p)[0])} showArrows={showArrows} showNumber={showNumbers} index={idx} total={doc.slides.length} logoScale={logoScale / 100} />
              )}
            </div>
            {dir.props === "floating" && element && !regen[current.id] && (
              <div ref={floatRef} className="float-toolbar" style={{ left: "50%", top: -10 }} role="toolbar" aria-label="Text actions">
                <Button size="sm" variant="ghost" onClick={() => patchSlide(current.id, { [element]: shorten(String(current[element as keyof MockSlide] ?? "")) } as Partial<MockSlide>)}>Shorten</Button>
                <Button size="sm" variant="ghost" onClick={() => patchSlide(current.id, { [element]: punch(String(current[element as keyof MockSlide] ?? "")) } as Partial<MockSlide>)}>Punch up</Button>
                <Button size="sm" variant="ghost" onClick={() => regenerate([current.id])} icon={<IcRefresh size={12} />}>Rewrite</Button>
                <span className="ui-divider-v" />
                <IconButton size="sm" title="Check claims" onClick={() => toast({ title: "No banned claims found", kind: "success" })}><IcCheck size={14} /></IconButton>
              </div>
            )}
          </div>
          {selected.length > 1 && (
            <div className="bulkbar" role="toolbar" aria-label="Bulk actions">
              <span>{selected.length} slides</span>
              <Button size="sm" variant="ghost" onClick={() => regenerate(selected)}>Regenerate copy</Button>
              <Button size="sm" variant="ghost" onClick={() => duplicate(selected)}>Duplicate</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(selected)}>Delete</Button>
              <IconButton size="sm" title="Clear selection" onClick={() => setSelected([current.id])} style={{ color: "var(--ui-bg)" }}><span aria-hidden="true">✕</span></IconButton>
            </div>
          )}
        </div>
        <div className="shell__zoombar">
          <Button size="sm" variant="ghost" onClick={() => setZoom("fit")} aria-pressed={zoom === "fit"}>Fit</Button>
          <Slider value={zoom === "fit" ? Math.round(scale * 100) : zoom} onChange={(v) => setZoom(v)} min={20} max={100} format={(v) => `${v}%`} label="Zoom" />
          <span style={{ marginLeft: 12, color: "var(--ui-text-3)", fontFamily: "var(--ui-font-mono)", fontSize: 11 }}>1080 × 1350 · slide {idx + 1} of {doc.slides.length}</span>
        </div>
      </>
    ) : (
      <PreviewMode doc={doc} showArrows={showArrows} />
    )
  ) : (
    <div className="shell__stage">
      <div style={{ maxWidth: 520 }}>
        <EmptyState plain icon={<IcPlus size={28} strokeWidth={1.5} />} title="Start a carousel" description="Pick a subject or paste a topic. Hooks arrive in a few seconds, then the slides fill in one at a time while you read." actions={<><Button variant="primary" onClick={() => setBriefOpen(true)}>New carousel</Button><Button onClick={() => { history.reset(MOCK_CAROUSEL); setSelected(["s1"]); }}>Open a recent one</Button></>} />
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {["Start from a template", "Duplicate a winner", "Paste a study link"].map((t) => <CardButton key={t} role="toggle" title={t} onClick={() => setBriefOpen(true)} />)}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Shell<View>
        title={doc?.title ?? "Untitled carousel"}
        onTitle={(t) => history.set((d) => d ? { ...d, title: t } : d, "title")}
        kindLabel="Carousel"
        saveState={doc ? saveState : "saved"}
        canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.undo} onRedo={history.redo}
        views={[{ value: "editor", label: "Editor" }, { value: "preview", label: "Instagram preview" }]} view={view} onView={setView}
        exportLabel="Export" onExport={() => toast({ title: "Exporting 5 PNGs", description: "1080 by 1350, one file per slide.", kind: "success" })}
        commands={commands}
        left={left} right={right}
        topExtra={<DirectionSwitch dir={dir} onChange={updateDir} />}
      >
        {canvas}
      </Shell>
      <BriefSheet open={briefOpen} onClose={() => setBriefOpen(false)} brief={brief} setBrief={setBrief} onGenerate={startGeneration} />
      {gen && gen.hooks && gen.pickedHook === null && doc && (
        <HookPicker hooks={gen.hooks} onPick={pickHook} />
      )}
    </>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function ThumbSlide({ slide, showArrows }: { slide: MockSlide; showArrows: boolean }) {
  return <div style={{ transform: `scale(${1 / 5.5})`, transformOrigin: "top left", width: SLIDE_W, height: SLIDE_H, position: "absolute" }}><SlideCanvas slide={slide} showArrows={showArrows} /></div>;
}

function GenProgress({ step }: { step: number }) {
  return (
    <div className="gen" role="status" aria-live="polite">
      {GEN_STEPS.map((s, i) => {
        const state = i < step ? "done" : i === step ? "active" : "todo";
        return (
          <div key={s.label} className="gen__step" data-state={state}>
            <span className="ic">{state === "done" ? <IcCheck size={14} /> : state === "active" ? <Spinner size={12} /> : <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--ui-border-strong)" }} />}</span>
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

function HookPicker({ hooks, onPick }: { hooks: typeof HOOK_OPTIONS; onPick: (i: number) => void }) {
  return (
    <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 150, width: "min(880px, calc(100vw - 48px))", background: "var(--ui-surface-2)", border: "1px solid var(--ui-border)", borderRadius: 12, boxShadow: "var(--ui-elev-3)", padding: 20, animation: "ui-pop-in var(--ui-dur-3) var(--ui-ease-out)" }} role="dialog" aria-label="Choose a hook">
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Choose a hook</h2>
        <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>The slides keep writing while you decide.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {hooks.map((h, i) => (
          <button key={i} type="button" className="ui-card-btn" onClick={() => onPick(i)} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ aspectRatio: "4/5", position: "relative", overflow: "hidden" }}>
              <div style={{ transform: "scale(0.245)", transformOrigin: "top left", position: "absolute" }}><SlideCanvas slide={{ id: "h", kind: "hook", ...h }} /></div>
            </div>
            <span style={{ padding: "8px 12px", fontSize: 12, color: "var(--ui-text-2)" }}>{h.eyebrow}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BriefSheet({ open, onClose, brief, setBrief, onGenerate }: { open: boolean; onClose: () => void; brief: { topic: string; tone: string; style: string; length: string }; setBrief: (b: typeof brief) => void; onGenerate: () => void }) {
  const [q, setQ] = useState("");
  const hits = SUBJECTS.filter((s) => s.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <Dialog open={open} onClose={onClose} title="New carousel" wide footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={brief.topic.trim().length < 4} onClick={onGenerate}>Generate</Button></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Topic" hint="Pick a subject or write your own.">{(p) => <Input {...p} autoFocus value={brief.topic} onChange={(e) => { setBrief({ ...brief, topic: e.target.value }); setQ(e.target.value); }} placeholder="Search 369 subjects or type a topic" />}</Field>
          <div role="listbox" aria-label="Subjects" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {hits.map((s) => <button key={s} type="button" role="option" aria-selected={brief.topic === s} className="ui-menu-item" data-active={brief.topic === s} onClick={() => setBrief({ ...brief, topic: s })}>{s}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Hook tone">{(p) => <Select {...p} value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })}>{["Educational", "Science-backed", "Myth-bust", "Bold hook", "The Paradox", "The Symptom", "The Tell", "Personal story"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
          <Field label="Style">{(p) => <Select {...p} value={brief.style} onChange={(e) => setBrief({ ...brief, style: e.target.value })}>{["Editorial", "Default", "Free press"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
          <Field label="Length">{(p) => <Select {...p} value={brief.length} onChange={(e) => setBrief({ ...brief, length: e.target.value })}>{["Concise", "Standard"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
          <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>Format, contrast, image style and the rest live in the Style tab afterwards, where you can see what they do.</span>
        </div>
      </div>
    </Dialog>
  );
}

function PreviewMode({ doc, showArrows }: { doc: Doc; showArrows: boolean }) {
  const [i, setI] = useState(0);
  const [s, attachStage] = useFitScale(SLIDE_W, SLIDE_H + 260, 24, 0.5);
  return (
    <div className="shell__stage" ref={attachStage} style={{ gridRow: "1 / -1" }}>
      <div style={{ width: SLIDE_W * s, position: "relative" }}>
        <div style={{ background: "#000", color: "#fff", borderRadius: 12 * s * 2, overflow: "hidden", fontFamily: "var(--ui-font)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: `${14 * s * 2}px ${16 * s * 2}px`, fontSize: 13 }}><span style={{ width: 28, height: 28, borderRadius: 14, background: "#333" }} /><b>lunia_life</b></div>
          <div style={{ position: "relative", width: SLIDE_W * s, height: SLIDE_H * s, overflow: "hidden" }}>
            <div style={{ transform: `scale(${s})`, transformOrigin: "top left" }}><SlideCanvas slide={doc.slides[i]} showArrows={showArrows} /></div>
            <span style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>{i + 1}/{doc.slides.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: 10 }}>{doc.slides.map((_, k) => <i key={k} style={{ width: 6, height: 6, borderRadius: 3, background: k === i ? "#4a90e2" : "#555" }} />)}</div>
          <div style={{ padding: "0 16px 16px", fontSize: 13, lineHeight: 1.4, color: "#ddd" }}><b style={{ color: "#fff" }}>lunia_life</b> {doc.caption.split("\n")[0].slice(0, 120)}… <span style={{ color: "#888" }}>more</span></div>
        </div>
        <div style={{ position: "absolute", top: "45%", left: -44 }}><IconButton title="Previous slide" outlined onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0}>‹</IconButton></div>
        <div style={{ position: "absolute", top: "45%", right: -44 }}><IconButton title="Next slide" outlined onClick={() => setI((k) => Math.min(doc.slides.length - 1, k + 1))} disabled={i === doc.slides.length - 1}>›</IconButton></div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ui-text-3)", marginTop: 12 }}>True 1080 by 1350 render at {Math.round(s * 100)}%. Arrow keys move.</p>
      </div>
    </div>
  );
}

function DirectionSwitch({ dir, onChange }: { dir: Direction; onChange: (d: Partial<Direction>) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <Button ref={ref} variant="ghost" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}><Badge tone="warning">Proposal</Badge> Directions</Button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} placement="bottom" ariaLabel="Open directions" width={320}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="ui-field__label">Direction 1: where slide text is edited</div>
            <Tabs value={dir.props} onChange={(v) => onChange({ props: v })} ariaLabel="Properties direction" items={[{ value: "rail", label: "Rail + on canvas" }, { value: "floating", label: "Floating toolbar" }]} />
            <p style={{ fontSize: 12, color: "var(--ui-text-2)", margin: "6px 0 0" }}>Rail keeps every field visible and scannable. Floating keeps eyes on the artwork. Recommended: rail, with on-canvas editing in both.</p>
          </div>
          <div>
            <div className="ui-field__label">Direction 2: where the brief lives</div>
            <Tabs value={dir.brief} onChange={(v) => onChange({ brief: v })} ariaLabel="Brief direction" items={[{ value: "rail", label: "Brief tab in rail" }, { value: "sheet", label: "Sheet, then hidden" }]} />
            <p style={{ fontSize: 12, color: "var(--ui-text-2)", margin: "6px 0 0" }}>Rail keeps the brief editable after generation, so tone or topic can change without starting over. Recommended: rail.</p>
          </div>
        </div>
      </Popover>
    </>
  );
}

/* Tiny text transforms so the buttons do something visible in the prototype. */
function shorten(s: string) { const w = s.split(" "); return w.length > 5 ? w.slice(0, Math.ceil(w.length * 0.7)).join(" ") : s; }
function punch(s: string) { return s.endsWith(".") ? s.slice(0, -1) : s.replace(/^(\w+)/, (m) => m.toUpperCase()); }
function rewrite(s: string) { const alts = ["Your gut makes the GABA that matters", "Fermented food feeds the GABA factory", "The barrier stops food GABA at the door"]; return alts.find((a) => a !== s) ?? s; }
