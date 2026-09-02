"use client";
import { useState } from "react";
import {
  Button, IconButton, Tooltip, Panel, PanelSectionTitle, Field, Input, Textarea, Select, Toggle, Slider, Skeleton, Badge, Spinner, useToast,
  IcCopy, IcTrash, IcRefresh, IcPlus, IcCheck,
} from "@/components/ui";
import { Seg, Row, Note } from "./rail-bits";
import { HOOK_OPTIONS, type MockSlide } from "./mock-data";

/* ── Shared style state for the whole document ─────────────────────────── */
export type StyleState = {
  format: "4:5" | "9:16";
  preset: "editorial" | "default" | "freepress";
  contrast: "standard" | "high";
  imageStyle: "realistic" | "illustration" | "anime" | "vector";
  logo: "S" | "M" | "L" | "XL";
  arrows: "S" | "M" | "L" | "XL";
  watermark: boolean;
  showArrows: boolean;
  showNumbers: boolean;
  showCitationBars: boolean;
  slidesBg: "dark" | "light" | "custom";
  customBg: string;
  hookWeight: "Default" | "Medium" | "Bold" | "Black";
  headlineSize: "S" | "M" | "L" | "XL";
  bodySize: "S" | "M" | "L" | "XL";
  citationSize: "S" | "M" | "L" | "XL";
};
export const DEFAULT_STYLE: StyleState = {
  format: "4:5", preset: "editorial", contrast: "standard", imageStyle: "realistic", logo: "L", arrows: "L", watermark: true,
  showArrows: true, showNumbers: false, showCitationBars: true, slidesBg: "light", customBg: "#F7F4EF", hookWeight: "Default",
  headlineSize: "M", bodySize: "M", citationSize: "M",
};
export const HOOK_WEIGHT_PX = { Default: 300, Medium: 400, Bold: 600, Black: 800 } as const;
const SIZES = ["S", "M", "L", "XL"] as const;
const sizeOpts = SIZES.map((s) => ({ value: s, label: s }));

type Common = { slide: MockSlide; patch: (p: Partial<MockSlide>, key?: string) => void; regen: boolean; onRegenerate: (what: "copy" | "graphic" | "image" | "background") => void; style: StyleState; setStyle: (p: Partial<StyleState>) => void; index: number };

/* ── Slide tab: hook ───────────────────────────────────────────────────── */
export function HookSlidePanel({ slide, patch, regen, onRegenerate, style, setStyle, hookIndex, onPickHook }: Common & { hookIndex: number; onPickHook: (i: number) => void }) {
  const { toast } = useToast();
  const [model, setModel] = useState<"auto" | "gpt">("auto");
  const [direction, setDirection] = useState("auto");
  const [subject, setSubject] = useState("auto");
  const [paper, setPaper] = useState<"white" | "warm">("white");
  const [promptOpen, setPromptOpen] = useState(false);
  const [history] = useState([slide.imageUrl, slide.imageUrl, slide.imageUrl]);
  return (
    <>
      <Panel title="Hook copy" actions={<Tooltip label="Three fresh hooks"><IconButton title="Regenerate hooks" size="sm" onClick={() => toast({ title: "Three new hooks", description: "Pick one below. Slide 1 text changes, the image stays." })}><IcRefresh size={14} /></IconButton></Tooltip>}>
        <Field label="Eyebrow">{(p) => <Input {...p} value={slide.eyebrow ?? ""} onChange={(e) => patch({ eyebrow: e.target.value }, "eyebrow")} />}</Field>
        <Field label="Headline" hint={`${slide.headline.length} characters`}>{(p) => <Textarea {...p} rows={2} value={slide.headline} onChange={(e) => patch({ headline: e.target.value }, "headline")} />}</Field>
        <Field label="Subline">{(p) => <Input {...p} value={slide.body ?? ""} onChange={(e) => patch({ body: e.target.value }, "body")} />}</Field>
        <Seg label="Headline weight" value={style.hookWeight} onChange={(v) => setStyle({ hookWeight: v })} options={(["Default", "Medium", "Bold", "Black"] as const).map((w) => ({ value: w, label: w }))} />
        <Note>Weights the image was pre-rendered at swap instantly. Others need a new image.</Note>
        <PanelSectionTitle>Hook variants</PanelSectionTitle>
        <div role="radiogroup" aria-label="Hook variant" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {HOOK_OPTIONS.map((h, i) => (
            <button key={i} type="button" role="radio" aria-checked={hookIndex === i} className="ui-card-btn" style={{ padding: "8px 10px" }} onClick={() => onPickHook(i)}>
              <span className="ui-card-btn__title" style={{ fontWeight: 500 }}>{h.headline}</span>
              <span className="ui-card-btn__desc">{h.eyebrow}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Image" actions={<Tooltip label="Generate a new hook image"><IconButton title="New image" size="sm" disabled={regen} onClick={() => onRegenerate("image")}>{regen ? <Spinner /> : <IcRefresh size={14} />}</IconButton></Tooltip>}>
        <div style={{ aspectRatio: "4/5", borderRadius: 6, overflow: "hidden", border: "1px solid var(--ui-border)", background: "var(--ui-surface-2)" }}>
          {regen ? <Skeleton width="100%" height="100%" /> : slide.imageUrl ? <img src={slide.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Skeleton width="100%" height="100%" />}
        </div>
        <Row>
          <Button variant="primary" size="sm" icon={<IcRefresh size={12} />} onClick={() => onRegenerate("image")} disabled={regen}>New image</Button>
          <Button size="sm" onClick={() => toast({ title: "Three prompt directions", description: "Prompt only, no image spent." })}>3 directions</Button>
          <Button size="sm" onClick={() => toast({ title: "Generating the other 3 weights", description: "Medium, Bold and Black, in parallel." })}>Other weights</Button>
        </Row>
        <Seg label="Style" value={style.imageStyle} onChange={(v) => setStyle({ imageStyle: v })} options={[{ value: "realistic", label: "Realistic" }, { value: "illustration", label: "Illustration" }, { value: "anime", label: "Anime" }, { value: "vector", label: "Vector" }]} />
        <Seg label="Model" value={model} onChange={setModel} options={[{ value: "auto", label: "Auto (Recraft)" }, { value: "gpt", label: "GPT Image 2" }]} />
        <Seg label="Direction" value={direction} onChange={setDirection} options={["auto", "macro", "environmental", "abstract", "symbolic", "natural"].map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))} />
        <Seg label="Subject" value={subject} onChange={setSubject} options={["auto", "person", "still life", "environment"].map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))} />
        <Seg label="Paper tone" value={paper} onChange={setPaper} options={[{ value: "white", label: "White ivory" }, { value: "warm", label: "Warm ivory" }]} />
        <Seg label="Contrast" value={style.contrast} onChange={(v) => setStyle({ contrast: v })} options={[{ value: "standard", label: "Standard" }, { value: "high", label: "High contrast" }]} />
        {style.contrast === "high" && <Note>Applies on the next image: ivory type band over a near-black subject.</Note>}
        <Field label="Prompt">{(p) => <Textarea {...p} rows={3} defaultValue="Editorial still life of fermented foods on ivory linen, soft morning light, one luminous focal element" />}</Field>
        <Field label="Guidelines" hint="Feeds the prompt rewrite">{(p) => <Textarea {...p} rows={2} placeholder="e.g. no people, keep the bottle out of frame" />}</Field>
        <PanelSectionTitle>Suggested concepts</PanelSectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {["Kimchi jar on linen, condensation on glass", "Miso bowl at dusk, steam rising", "Chickpeas and salmon plated, overhead"].map((c) => <button key={c} type="button" className="ui-menu-item" onClick={() => toast({ title: "Concept used", description: c })}>{c}</button>)}
        </div>
        <button type="button" className="ui-menu-item" aria-expanded={promptOpen} onClick={() => setPromptOpen((v) => !v)} style={{ color: "var(--ui-text-2)" }}>{promptOpen ? "Hide" : "Show"} the full prompt sent to the engine</button>
        {promptOpen && <><Textarea rows={5} defaultValue="Editorial photograph, 4:5, soft ivory paper ground #F7F4EF, one still-life subject, natural window light, no text, no logos, navy #01253F is the only chromatic anchor..." aria-label="Full prompt override" /><Button size="sm" variant="ghost" onClick={() => toast({ title: "Override cleared" })}>Reset to default</Button></>}
        <PanelSectionTitle>History</PanelSectionTitle>
        <Row>
          {history.map((h, i) => <button key={i} type="button" className="ui-focusable" aria-label={`Revert to image ${i + 1}`} onClick={() => toast({ title: `Reverted to image ${i + 1}` })} style={{ width: 48, height: 60, borderRadius: 4, overflow: "hidden", border: i === 0 ? "2px solid var(--ui-text)" : "1px solid var(--ui-border)", padding: 0, background: "var(--ui-surface-2)" }}>{h && <img src={h} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</button>)}
          <Note>Session only, last 8.</Note>
        </Row>
      </Panel>

      <Panel title="Overlays" collapsible defaultCollapsed actions={<Button size="sm" variant="ghost" onClick={() => toast({ title: "Overlays reset" })}>Reset</Button>}>
        <OverlayRow label="Editorial frame" defaultOn max={1} step={0.05} color />
        <OverlayRow label="Soft vignette" max={0.6} step={0.05} />
        <OverlayRow label="Colour grade" max={2} step={0.1} />
        <OverlayRow label="Film grain" max={0.2} step={0.01} />
        <WashControls />
      </Panel>
    </>
  );
}

function OverlayRow({ label, defaultOn = false, max, step, color = false }: { label: string; defaultOn?: boolean; max: number; step: number; color?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  const [v, setV] = useState(max / 2);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Row gap={8}>
        <Toggle checked={on} onChange={setOn} label={label} />
        {color && on && <input type="color" defaultValue="#01253f" aria-label={`${label} colour`} style={{ width: 24, height: 24, padding: 0, border: "1px solid var(--ui-border-strong)", borderRadius: 4, background: "none", marginLeft: "auto" }} />}
      </Row>
      {on && <Slider value={v} onChange={setV} min={0} max={max} step={step} label={`${label} strength`} format={(x) => x.toFixed(2)} />}
    </div>
  );
}
function WashControls() {
  const [mode, setMode] = useState<"dark" | "light" | "none">("none");
  const [styleW, setStyleW] = useState<"flat" | "gradient">("flat");
  const [op, setOp] = useState(0.4);
  return (
    <>
      <Seg label="Background wash" value={mode} onChange={setMode} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "none", label: "None" }]} />
      {mode !== "none" && (
        <>
          {mode === "light" && <Row gap={8}><span className="ui-field__label">Wash colour</span><input type="color" defaultValue="#F7F4EF" aria-label="Wash colour" style={{ width: 24, height: 24, padding: 0, border: "1px solid var(--ui-border-strong)", borderRadius: 4, background: "none" }} /></Row>}
          <Field label="Opacity">{(p) => <Slider id={p.id} value={op} onChange={setOp} min={0} max={1} step={0.05} format={(x) => x.toFixed(2)} />}</Field>
          <Seg label="Style" value={styleW} onChange={setStyleW} options={[{ value: "flat", label: "Flat" }, { value: "gradient", label: "Gradient" }]} />
        </>
      )}
    </>
  );
}

/* ── Slide tab: content ────────────────────────────────────────────────── */
export function ContentSlidePanel({ slide, patch, regen, onRegenerate, style, setStyle, index }: Common) {
  const { toast } = useToast();
  const [iconsOpen, setIconsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [used] = useState(1);
  return (
    <>
      <Panel title={`Slide ${index + 1} copy`} actions={<Tooltip label="Rewrite this slide's copy"><IconButton title="Regenerate copy" size="sm" disabled={regen} onClick={() => onRegenerate("copy")}>{regen ? <Spinner /> : <IcRefresh size={14} />}</IconButton></Tooltip>}>
        <Field label="Headline" hint={`${slide.headline.length} characters`}>{(p) => <Textarea {...p} rows={2} value={slide.headline} onChange={(e) => patch({ headline: e.target.value }, "headline")} />}</Field>
        <Seg label="Headline size" value={style.headlineSize} onChange={(v) => setStyle({ headlineSize: v })} options={sizeOpts} />
        <Field label="Body">{(p) => <Textarea {...p} rows={4} value={slide.body ?? ""} onChange={(e) => patch({ body: e.target.value }, "body")} />}</Field>
        <Seg label="Body size" value={style.bodySize} onChange={(v) => setStyle({ bodySize: v })} options={[...sizeOpts, { value: "XL" as const, label: "2XL" }]} />
        <Field label="Citation">{(p) => <Textarea {...p} rows={2} value={slide.citation ?? ""} onChange={(e) => patch({ citation: e.target.value }, "citation")} />}</Field>
        <Row gap={8}><Seg label="Citation size" value={style.citationSize} onChange={(v) => setStyle({ citationSize: v })} options={sizeOpts} /><Toggle checked={style.showCitationBars} onChange={(v) => setStyle({ showCitationBars: v })} label="Show bar" /></Row>
        <Row>
          <Button size="sm" onClick={() => patch({ body: (slide.body ?? "").split(". ").slice(0, 1).join(". ") + "." })}>Shorter</Button>
          <Button size="sm" onClick={() => onRegenerate("copy")} icon={<IcRefresh size={12} />}>Regen slide</Button>
          <Button size="sm" onClick={() => toast({ title: "No banned claims found", kind: "success" })}>Check claims</Button>
        </Row>
      </Panel>

      <Panel title="Graphic" actions={<Tooltip label="New graphic for this slide"><IconButton title="Regenerate graphic" size="sm" disabled={regen} onClick={() => onRegenerate("graphic")}><IcRefresh size={14} /></IconButton></Tooltip>}>
        <Field label="Type">{(p) => <Select {...p} value={slide.graphic ?? "none"} onChange={(e) => patch({ graphic: e.target.value as MockSlide["graphic"] })}><option value="none">None</option><option value="stat">Hero number</option><option value="list">Two column list</option><option value="timeline">Timeline</option></Select>}</Field>
        <Row>
          <Button size="sm" onClick={() => toast({ title: "Graphic type picker", description: "32 live thumbnails in three tiers, click one to lock it." })}>Change type</Button>
          <Button size="sm" onClick={() => toast({ title: "Graphic data editor", description: "Every field of the graphic, validated live." })}>Edit data</Button>
          <Button size="sm" onClick={() => setIconsOpen((v) => !v)} aria-expanded={iconsOpen}>Icons</Button>
        </Row>
        {iconsOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: "1px solid var(--ui-border)", borderRadius: 6 }}>
            <Row gap={8}><Button size="sm" variant="primary" onClick={() => toast({ title: "Three icons suggested" })}>Suggest 3</Button><Note>{(slide.icons ?? []).length}/4 selected</Note><Button size="sm" variant="ghost" onClick={() => patch({ icons: [] })}>Clear</Button></Row>
            <Row>{["moon", "leaf", "bowl", "brain", "clock", "heart", "sun", "bed"].map((n) => <button key={n} type="button" className="ui-tab" aria-pressed={(slide.icons ?? []).includes(n)} onClick={() => patch({ icons: (slide.icons ?? []).includes(n) ? (slide.icons ?? []).filter((x) => x !== n) : [...(slide.icons ?? []), n].slice(0, 4) })}>{n}</button>)}</Row>
            <Seg label="Layout" value="row" onChange={() => {}} options={["row", "column", "grid", "scattered"].map((l) => ({ value: l, label: l }))} />
            <Row gap={8}><Toggle checked onChange={() => {}} label="Labels" /><Seg value="hug" onChange={() => {}} options={[{ value: "hug", label: "Hug body" }, { value: "center", label: "Centered" }]} /></Row>
            <Seg label="Icon size" value="M" onChange={() => {}} options={sizeOpts} />
            <Note>Categories: sleep, health, lifestyle, fitness, mind, daily.</Note>
          </div>
        )}
        <Field label="Regenerate with a comment" hint={`${used}/5 used this session`}>{(p) => <Textarea {...p} rows={2} value={comment} onChange={(e) => setComment(e.target.value.slice(0, 400))} placeholder="e.g. make it a comparison of two foods" />}</Field>
        <Button size="sm" onClick={() => onRegenerate("graphic")} icon={<IcRefresh size={12} />}>{comment ? "Regenerate with comment" : "Regenerate"}</Button>
      </Panel>

      <Panel title="Background" collapsible defaultCollapsed>
        <Row>
          <Button size="sm" onClick={() => onRegenerate("background")} icon={<IcRefresh size={12} />}>{slide.bgImageUrl ? "Regen background" : "AI background"}</Button>
          {slide.bgImageUrl && <Button size="sm" variant="ghost" onClick={() => patch({ bgImageUrl: undefined })}>Clear</Button>}
        </Row>
        {slide.bgImageUrl && <Field label="Dim">{(p) => <Slider id={p.id} value={slide.bgDim ?? 0.3} onChange={(v) => patch({ bgDim: v })} min={0} max={0.9} step={0.05} format={(x) => x.toFixed(2)} />}</Field>}
        <Note>Atmospheric image at low opacity behind the copy. Slides 1 to 3 only.</Note>
      </Panel>

      <Panel title="Export this slide" collapsible defaultCollapsed>
        <Row><Button size="sm" onClick={() => toast({ title: "Slide PNG downloaded" })}>PNG</Button><Button size="sm" onClick={() => toast({ title: "Preview HD", description: "Server render at full resolution, opens in a viewer with Download." })}>Preview HD</Button></Row>
      </Panel>
    </>
  );
}

/* ── Slide tab: takeaway ───────────────────────────────────────────────── */
export function TakeawayPanel({ slide, patch }: Common) {
  const pts = slide.bullets ?? [];
  const setPts = (b: string[]) => patch({ bullets: b }, "pts");
  return (
    <>
      <Panel title="Takeaway">
        <Field label="Headline">{(p) => <Input {...p} value={slide.headline} onChange={(e) => patch({ headline: e.target.value }, "headline")} />}</Field>
        <PanelSectionTitle>Recap points · {pts.length}/3</PanelSectionTitle>
        {pts.map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Input value={pt} aria-label={`Point ${i + 1}`} onChange={(e) => setPts(pts.map((x, k) => (k === i ? e.target.value : x)))} />
            <IconButton title="Move up" size="sm" disabled={i === 0} onClick={() => { const b = [...pts]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; setPts(b); }}>↑</IconButton>
            <IconButton title="Move down" size="sm" disabled={i === pts.length - 1} onClick={() => { const b = [...pts]; [b[i + 1], b[i]] = [b[i], b[i + 1]]; setPts(b); }}>↓</IconButton>
            <IconButton title="Remove point" size="sm" danger disabled={pts.length <= 1} onClick={() => setPts(pts.filter((_, k) => k !== i))}><IcTrash size={14} /></IconButton>
          </div>
        ))}
        {pts.length < 3 && <Button size="sm" icon={<IcPlus size={12} />} onClick={() => setPts([...pts, "New point"])}>Add point</Button>}
        <Field label="Interaction">{(p) => <Select {...p} value={slide.interaction ?? "save"} onChange={(e) => patch({ interaction: e.target.value as MockSlide["interaction"] })}><option value="save">Save</option><option value="send">Send</option><option value="comment">Comment</option></Select>}</Field>
        <Field label="Interaction label">{(p) => <Input {...p} value={slide.interactionLabel ?? ""} onChange={(e) => patch({ interactionLabel: e.target.value }, "il")} />}</Field>
        <Field label="Follow line">{(p) => <Input {...p} value={slide.followLine ?? ""} onChange={(e) => patch({ followLine: e.target.value }, "fl")} />}</Field>
      </Panel>
      <Panel title="Export this slide" collapsible defaultCollapsed><Row><Button size="sm">PNG</Button></Row></Panel>
    </>
  );
}

/* ── Style tab ─────────────────────────────────────────────────────────── */
export function StyleTab({ style, setStyle }: { style: StyleState; setStyle: (p: Partial<StyleState>) => void }) {
  return (
    <>
      <Panel title="Format">
        <Seg label="Aspect" value={style.format} onChange={(v) => setStyle({ format: v })} options={[{ value: "4:5", label: "4:5 Feed" }, { value: "9:16", label: "9:16 Story" }]} />
        <Note>{style.format === "4:5" ? "1080 by 1350. Instagram feed preview." : "1080 by 1920. TikTok feed preview."}</Note>
        <Seg label="Preset" value={style.preset} onChange={(v) => setStyle({ preset: v })} options={[{ value: "editorial", label: "Editorial" }, { value: "default", label: "Default" }, { value: "freepress", label: "Free press" }]} />
      </Panel>
      <Panel title="Branding">
        <Seg label="Logo size" value={style.logo} onChange={(v) => setStyle({ logo: v })} options={sizeOpts} />
        <Seg label="Arrow size" value={style.arrows} onChange={(v) => setStyle({ arrows: v })} options={sizeOpts} />
        <Toggle checked={style.watermark} onChange={(v) => setStyle({ watermark: v })} label="Lunia Life watermark" />
      </Panel>
      <Panel title="Decoration">
        <Toggle checked={style.showArrows} onChange={(v) => setStyle({ showArrows: v })} label="Slide arrows" />
        <Toggle checked={style.showNumbers} onChange={(v) => setStyle({ showNumbers: v })} label="Slide numbers" />
        <Toggle checked={style.showCitationBars} onChange={(v) => setStyle({ showCitationBars: v })} label="Citation bars" />
      </Panel>
      <Panel title="Slide background">
        <Seg value={style.slidesBg} onChange={(v) => setStyle({ slidesBg: v })} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "custom", label: "Custom" }]} />
        {style.slidesBg === "custom" && <Row gap={8}><input type="color" value={style.customBg} onChange={(e) => setStyle({ customBg: e.target.value })} aria-label="Custom background" style={{ width: 28, height: 28, padding: 0, border: "1px solid var(--ui-border-strong)", borderRadius: 4, background: "none" }} /><Note>Ink is derived from the background&apos;s luminance.</Note><Button size="sm" variant="ghost" onClick={() => setStyle({ slidesBg: "light" })}>Clear</Button></Row>}
        <Note>Applies to content, takeaway and CTA slides. Editorial content slides stay ivory.</Note>
      </Panel>
      <Panel title="Palette" collapsible defaultCollapsed>
        <Row>{["--lunia-deep-navy", "--lunia-rich-navy", "--lunia-slate-blue", "--lunia-soft-ivory", "--lunia-aqua", "--lunia-signal-yellow"].map((c) => <span key={c} title={c} style={{ width: 24, height: 24, borderRadius: 4, background: `var(${c})`, border: "1px solid var(--ui-border)" }} />)}</Row>
        <Note>Closed set. The lint flags anything else.</Note>
      </Panel>
    </>
  );
}

/* ── Brief tab ─────────────────────────────────────────────────────────── */
export function BriefTab({ topic, tone, onTopic, onTone, onRegenerateAll }: { topic: string; tone: string; onTopic: (t: string) => void; onTone: (t: string) => void; onRegenerateAll: () => void }) {
  const { toast } = useToast();
  const [format, setFormat] = useState<"standard" | "engagement" | "dyk">("standard");
  const [sub, setSub] = useState<"reveal" | "diagnostic">("reveal");
  const [length, setLength] = useState<"concise" | "standard">("concise");
  const [seo, setSeo] = useState(true);
  return (
    <>
      <Panel title="Brief">
        <Field label="Topic">{(p) => <Textarea {...p} rows={2} value={topic} onChange={(e) => onTopic(e.target.value)} />}</Field>
        <Row><Button size="sm" onClick={() => toast({ title: "Subject library", description: "369 subjects, search and categories." })}>Change subject</Button><Button size="sm" onClick={() => toast({ title: "Suggested topics", description: "Five suggestions based on what is unused." })}>Suggest topics</Button></Row>
        <Seg label="Format" value={format} onChange={setFormat} options={[{ value: "standard", label: "Standard" }, { value: "engagement", label: "Engagement" }, { value: "dyk", label: "Did you know" }]} />
        {format === "engagement" && <Seg label="Engagement type" value={sub} onChange={setSub} options={[{ value: "reveal", label: "Reveal" }, { value: "diagnostic", label: "Diagnostic" }]} />}
        <Field label="Hook tone" hint="Top pick from the recommender is marked">{(p) => <Select {...p} value={tone} onChange={(e) => onTone(e.target.value)}>{["Educational", "Science-backed", "Myth-bust", "Bold hook", "Personal story", "The Symptom", "The Paradox", "The Tell"].map((t, i) => <option key={t}>{t}{i === 0 ? " · top pick" : ""}</option>)}</Select>}</Field>
        <Seg label="Content length" value={length} onChange={setLength} options={[{ value: "concise", label: "Concise" }, { value: "standard", label: "Standard" }]} />
        <Toggle checked={seo} onChange={setSeo} label="Brand SEO line in caption" />
        <Button variant="primary" icon={<IcRefresh size={14} />} onClick={onRegenerateAll}>Regenerate from brief</Button>
        <Note>Rewrites every slide. Regenerate one slide from its own panel when only one is wrong.</Note>
      </Panel>
      <Panel title="Document" collapsible defaultCollapsed>
        <Row><Button size="sm" onClick={() => toast({ title: "Link copied", description: "Public share page for this carousel." })} icon={<IcCopy size={12} />}>Copy link</Button><Button size="sm" onClick={() => toast({ title: "Email draft started", description: "Caption becomes the topic, hook image becomes the hero." })}>Turn into email</Button></Row>
        <Note>Saved to the library automatically. Discard from the export menu if you do not want to keep it.</Note>
      </Panel>
    </>
  );
}

/* ── Caption tab ───────────────────────────────────────────────────────── */
export function CaptionTab({ caption, onChange }: { caption: string; onChange: (c: string) => void }) {
  const { toast } = useToast();
  return (
    <Panel title="Instagram caption" actions={<Button size="sm" variant="primary" icon={<IcCopy size={12} />} onClick={() => { navigator.clipboard?.writeText(caption).catch(() => {}); toast({ title: "Caption copied", kind: "success" }); }}>Copy</Button>}>
      <Textarea rows={14} value={caption} onChange={(e) => onChange(e.target.value)} aria-label="Instagram caption" />
      <Row><Button size="sm" onClick={() => toast({ title: "Caption rewritten", description: "Same facts, tighter." })} icon={<IcRefresh size={12} />}>Rewrite</Button><Button size="sm" onClick={() => onChange(caption + "\n\nFrom Lunia Life, a sleep and longevity brand. Lunia Restore: melatonin-free, GMP-manufactured. www.lunialife.com")}>Add brand SEO line</Button></Row>
      <Note>{caption.length} characters · {caption.split(/\s+/).filter(Boolean).length} words</Note>
    </Panel>
  );
}

/* ── Check tab (fact check) ────────────────────────────────────────────── */
export function CheckTab({ slides }: { slides: MockSlide[] }) {
  const { toast } = useToast();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const run = () => { setState("running"); window.setTimeout(() => setState("done"), 2200); };
  const units = slides.filter((s) => s.kind === "content");
  return (
    <>
      <Panel title="Fact check" actions={<Button size="sm" variant={state === "idle" ? "primary" : "secondary"} busy={state === "running"} onClick={run}>{state === "done" ? "Re-check" : "Verify"}</Button>}>
        {state === "idle" && <Note>Not checked yet. Every claim on every slide is checked against its source. Advisory, not blocking.</Note>}
        {state === "running" && <div className="gen" role="status">{units.map((u, i) => <div key={u.id} className="gen__step" data-state={i === 0 ? "active" : "todo"}><span className="ic">{i === 0 ? <Spinner size={12} /> : <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--ui-border-strong)" }} />}</span>Slide {i + 2}</div>)}</div>}
        {state === "done" && (
          <>
            <Row gap={8}><Badge tone="warning">1 needs a decision</Badge><Badge tone="success">2 clean</Badge><Badge>0 unchecked</Badge></Row>
            <div style={{ border: "1px solid var(--ui-warning)", borderRadius: 6, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <strong style={{ fontSize: 13 }}>Slide 3 · vitamin B6 as the required cofactor</strong>
              <Note>Source says pyridoxal phosphate is the cofactor for glutamate decarboxylase. Same thing, different name; the source quote uses the enzyme form.</Note>
              <Row>
                <Button size="sm" variant="primary" onClick={() => toast({ title: "Fix applied to slide 3", description: "Save to keep it.", action: { label: "Undo", onClick: () => {} } })} icon={<IcCheck size={12} />}>Apply fix</Button>
                <Button size="sm" onClick={() => toast({ title: "Looking this up" })}>Look this up</Button>
                <Button size="sm" variant="ghost" onClick={() => toast({ title: "Marked verified by you" })}>I verified this</Button>
                <Button size="sm" variant="ghost" onClick={() => toast({ title: "Marked wrong" })}>Mark wrong</Button>
              </Row>
            </div>
            <details><summary style={{ fontSize: 12, color: "var(--ui-text-2)", cursor: "pointer" }}>Clean · 2 slides</summary><Note>Slide 2, slide 4. Each claim, its verdict and the source quote sit here.</Note></details>
          </>
        )}
      </Panel>
    </>
  );
}
