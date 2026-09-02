"use client";
import { useState } from "react";
import {
  Button, IconButton, Tooltip, Panel, PanelSectionTitle, Field, Input, Textarea, Select, Toggle, Slider, Skeleton, Badge, Spinner, useToast,
  IcCopy, IcTrash, IcRefresh, IcPlus, IcBookmarkPlus,
} from "@/components/ui";
import { Seg, Row, Note, RoleSwatches } from "./rail-bits";
import { BLOCK_KIND_LABELS, type MockBlock, type MockEmailDoc, type ImageSlot } from "./mock-data";

type Patch = (p: Partial<MockEmailDoc>, key?: string) => void;

/* ── Email tab: header, theme, shapes, CTA ─────────────────────────────── */
export function EmailTab({ doc, patch }: { doc: MockEmailDoc; patch: Patch }) {
  const { toast } = useToast();
  const hint = (s: string) => (s.length > 60 ? "Long for mobile" : /!|free|%/i.test(s) ? "Spam-ish words" : "Good length");
  return (
    <>
      <Panel title="Header">
        <Field label="Top banner" hint="Optional. **bold** becomes a brand-colour pill. Renders uppercase.">{(p) => (
          <div style={{ display: "flex", gap: 4 }}>
            <Input {...p} value={doc.topBanner} onChange={(e) => patch({ topBanner: e.target.value }, "tb")} placeholder="Leave empty for no banner" />
            <Tooltip label="Suggest a top banner"><IconButton title="Suggest banner" outlined onClick={() => patch({ topBanner: "Sleep deeper this week / **first month $20**" })}><IcRefresh size={14} /></IconButton></Tooltip>
          </div>
        )}</Field>
        <Toggle checked={doc.showLogo} onChange={(v) => patch({ showLogo: v })} label="Show logo" />
        <PanelSectionTitle>Subject line</PanelSectionTitle>
        <div role="radiogroup" aria-label="Subject line" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {doc.subjects.map((s) => (
            <div key={s} style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
              <button type="button" role="radio" aria-checked={doc.subject === s} className="ui-card-btn" style={{ padding: "8px 10px" }} onClick={() => patch({ subject: s })}>
                <span className="ui-card-btn__title" style={{ fontWeight: 500 }}>{s}</span>
                <span className="ui-card-btn__desc">{s.length} chars · {hint(s)}</span>
              </button>
              <IconButton title="Copy subject line" size="sm" onClick={() => toast({ title: "Subject copied" })}><IcCopy size={14} /></IconButton>
            </div>
          ))}
        </div>
        <Button size="sm" icon={<IcRefresh size={12} />} onClick={() => patch({ subjects: ["What the night shift study really shows", "A timing signal, not a sedative", "Melatonin at 7am, explained"], subject: "What the night shift study really shows" })}>Regenerate subjects</Button>
        <Field label="Preview text">{(p) => (
          <div style={{ display: "flex", gap: 4 }}>
            <Input {...p} value={doc.preheader} onChange={(e) => patch({ preheader: e.target.value }, "pre")} />
            <IconButton title="Copy preview text" outlined onClick={() => toast({ title: "Preview text copied" })}><IcCopy size={14} /></IconButton>
          </div>
        )}</Field>
        <Field label="Promo band" hint="Optional. Sits above the footer.">{(p) => (
          <div style={{ display: "flex", gap: 4 }}>
            <Input {...p} value={doc.promoBand} onChange={(e) => patch({ promoBand: e.target.value }, "pb")} placeholder="Leave empty for no band" />
            <Tooltip label="Suggest a promo band"><IconButton title="Suggest promo band" outlined onClick={() => patch({ promoBand: "Subscribe and save 20%. Cancel any time." })}><IcRefresh size={14} /></IconButton></Tooltip>
          </div>
        )}</Field>
        <div className="ui-field"><span className="ui-field__label">Promo band colour</span><RoleSwatches value={doc.promoColor} onChange={(v) => patch({ promoColor: v })} /></div>
      </Panel>

      <Panel title="Theme and layout">
        <Seg label="Email theme" value={doc.theme} onChange={(v) => patch({ theme: v })} options={[{ value: "navy", label: "Navy" }, { value: "cream", label: "Cream" }]} />
        {doc.theme === "cream" && <Note>On cream the CTA is always navy for contrast. Your button colour is kept and returns if you switch back.</Note>}
        <Seg label="Space between blocks" value={doc.spacing} onChange={(v) => patch({ spacing: v })} options={[{ value: "none", label: "None" }, { value: "tight", label: "Tight" }, { value: "default", label: "Default" }, { value: "roomy", label: "Roomy" }, { value: "loose", label: "Loose" }]} />
        <Row>
          <Button size="sm" onClick={() => toast({ title: "Shape gallery", description: "Eleven layouts plus your saved ones, each rendered with this email's copy. Picking one restructures the body and shows a before and after to accept or discard." })}>Shapes</Button>
          <Button size="sm" variant="ghost" icon={<IcBookmarkPlus size={12} />} onClick={() => toast({ title: "Layout saved", description: "Structure only, never the copy." })}>Save this layout</Button>
        </Row>
      </Panel>

      <Panel title="Call to action">
        <Field label="Button label">{(p) => <Input {...p} value={doc.cta.label} onChange={(e) => patch({ cta: { ...doc.cta, label: e.target.value } }, "ctal")} />}</Field>
        <Field label="Button link">{(p) => <Input {...p} value={doc.cta.link} onChange={(e) => patch({ cta: { ...doc.cta, link: e.target.value } }, "ctau")} />}</Field>
        <div className="ui-field"><span className="ui-field__label">Button colour</span><RoleSwatches value={doc.cta.color} onChange={(v) => patch({ cta: { ...doc.cta, color: v } })} /></div>
        {!doc.cta.color && <Seg label="Bottom button" value={doc.cta.bottom} onChange={(v) => patch({ cta: { ...doc.cta, bottom: v } })} options={[{ value: "cream", label: "Cream" }, { value: "navy", label: "Navy" }]} />}
        <Toggle checked={doc.cta.showOnHero} onChange={(v) => patch({ cta: { ...doc.cta, showOnHero: v } })} label="Show CTA on hero image" />
        {doc.cta.showOnHero && (
          <>
            <div className="ui-field"><span className="ui-field__label">Hero overlay colour</span><RoleSwatches value={doc.cta.heroOverlayColor} onChange={(v) => patch({ cta: { ...doc.cta, heroOverlayColor: v } })} /></div>
            <PanelSectionTitle>Hero position</PanelSectionTitle>
            <Row gap={8}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 28px)", gap: 2 }} role="group" aria-label="Nudge CTA">
                <span /><IconButton title="Up 2%, Shift for 10%" size="sm" outlined disabled={doc.cta.locked} onClick={(e) => patch({ cta: { ...doc.cta, y: Math.max(0, doc.cta.y - (e.shiftKey ? 10 : 2)) } })}>↑</IconButton><span />
                <IconButton title="Left" size="sm" outlined disabled={doc.cta.locked} onClick={(e) => patch({ cta: { ...doc.cta, x: Math.max(0, doc.cta.x - (e.shiftKey ? 10 : 2)) } })}>←</IconButton>
                <IconButton title="Reset to bottom centre" size="sm" outlined onClick={() => patch({ cta: { ...doc.cta, x: 50, y: 88 } })}>↺</IconButton>
                <IconButton title="Right" size="sm" outlined disabled={doc.cta.locked} onClick={(e) => patch({ cta: { ...doc.cta, x: Math.min(100, doc.cta.x + (e.shiftKey ? 10 : 2)) } })}>→</IconButton>
                <span /><IconButton title="Down" size="sm" outlined disabled={doc.cta.locked} onClick={(e) => patch({ cta: { ...doc.cta, y: Math.min(100, doc.cta.y + (e.shiftKey ? 10 : 2)) } })}>↓</IconButton><span />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Toggle checked={doc.cta.locked} onChange={(v) => patch({ cta: { ...doc.cta, locked: v } })} label={doc.cta.locked ? "Locked" : "Unlocked"} />
                <Note>{doc.cta.x}% across, {doc.cta.y}% down. Or drag it on the hero.</Note>
              </div>
            </Row>
          </>
        )}
      </Panel>
    </>
  );
}

/* ── Block tab ─────────────────────────────────────────────────────────── */
export function BlockTab({ block: b, index, patch, onRegenerate, regen, alternates, onPickAlternate, onDuplicate, onDelete }: {
  block: MockBlock; index: number; patch: (p: Partial<MockBlock>, key?: string) => void;
  onRegenerate: () => void; regen: boolean; alternates: string[] | null; onPickAlternate: (t: string | null) => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  const { toast } = useToast();
  const locked = b.kind === "header" || b.kind === "footer";
  const hasHeader = ["stat", "checklist", "promo", "imagetext", "headerimage", "ingredients", "testimonial", "timeline", "comparison", "discount"].includes(b.kind);
  if (locked) return <Panel title={BLOCK_KIND_LABELS[b.kind]}><Note>{b.kind === "header" ? "Logo, top banner and preview text are set in the Email tab." : "Address and unsubscribe come from the template. Promo band is set in the Email tab."}</Note></Panel>;
  return (
    <>
      <Panel
        title={`Block ${index} · ${BLOCK_KIND_LABELS[b.kind]}`}
        actions={<>
          <Tooltip label="Rewrite with AI, pick from 3"><IconButton title="Regenerate block" size="sm" disabled={regen} onClick={onRegenerate}>{regen ? <Spinner /> : <IcRefresh size={14} />}</IconButton></Tooltip>
          <Tooltip label="Save as snippet"><IconButton title="Save as snippet" size="sm" onClick={() => toast({ title: "Snippet saved", description: "Insert it from the Block menu." })}><IcBookmarkPlus size={14} /></IconButton></Tooltip>
          <Tooltip label="Copy block text"><IconButton title="Copy block text" size="sm" onClick={() => toast({ title: "Block text copied" })}><IcCopy size={14} /></IconButton></Tooltip>
          <Tooltip label="Delete block"><IconButton title="Delete block" size="sm" danger onClick={onDelete}><IcTrash size={14} /></IconButton></Tooltip>
        </>}
      >
        {b.sample && <Row gap={8}><Badge tone="warning">Sample copy</Badge><Button size="sm" onClick={() => patch({ sample: false })}>Keep</Button><Button size="sm" variant="ghost" onClick={() => patch({ sample: false, text: "", heading: "" })}>Clear</Button></Row>}
        {alternates && (
          <div style={{ border: "1px solid var(--ui-border)", borderRadius: 6, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <PanelSectionTitle>Pick a version</PanelSectionTitle>
            {alternates.map((a) => <button key={a} type="button" className="ui-card-btn" onClick={() => onPickAlternate(a)}><span className="ui-card-btn__desc" style={{ color: "var(--ui-text)" }}>{a}</span></button>)}
            <Button size="sm" variant="ghost" onClick={() => onPickAlternate(null)}>Keep current</Button>
          </div>
        )}
        {hasHeader && (
          <>
            {b.heading !== undefined && <Field label="Heading">{(p) => <Input {...p} value={b.heading} onChange={(e) => patch({ heading: e.target.value }, "h")} />}</Field>}
            <Row gap={8}>
              <Seg label="Header size" value={b.headerSize ?? "M"} onChange={(v) => patch({ headerSize: v })} options={(["S", "M", "L", "XL"] as const).map((s) => ({ value: s, label: s }))} />
              <Seg label="Header align" value={b.headerAlign ?? "C"} onChange={(v) => patch({ headerAlign: v })} options={(["L", "C", "R"] as const).map((s) => ({ value: s, label: s }))} />
            </Row>
          </>
        )}
        {b.kind === "text" && (
          <>
            <Field label="Text" hint="**bold**, [text](url) and {{ merge_tags }} work here">{(p) => <Textarea {...p} rows={6} value={b.text ?? ""} onChange={(e) => patch({ text: e.target.value }, "t")} />}</Field>
            <InlineToolbar />
            <Row gap={8}>
              <Seg label="Align" value={b.align ?? "left"} onChange={(v) => patch({ align: v })} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }]} />
              <Toggle checked={!!b.italic} onChange={(v) => patch({ italic: v })} label="Italic" />
            </Row>
            <Seg label="Weight" value={String(b.weight ?? 300)} onChange={(v) => patch({ weight: Number(v) as MockBlock["weight"] })} options={["100", "200", "300", "400"].map((w) => ({ value: w, label: w }))} />
            <Row>
              <Button size="sm" onClick={() => patch({ text: (b.text ?? "").split(". ").slice(0, 2).join(". ") + "." })}>Shorten</Button>
              <Button size="sm" onClick={() => toast({ title: "No banned claims found", kind: "success" })}>Check claims</Button>
            </Row>
          </>
        )}
        {b.kind === "stat" && <Field label="Text">{(p) => <Textarea {...p} rows={3} value={b.text ?? ""} onChange={(e) => patch({ text: e.target.value }, "t")} />}</Field>}
        {b.kind === "checklist" && <Field label="Items" hint="One per line">{(p) => <Textarea {...p} rows={4} value={(b.items ?? []).join("\n")} onChange={(e) => patch({ items: e.target.value.split("\n") }, "i")} />}</Field>}
        {b.kind === "promo" && <Field label="Text">{(p) => <Input {...p} value={b.text ?? ""} onChange={(e) => patch({ text: e.target.value }, "t")} />}</Field>}
        {b.kind === "cta" && <><Field label="Button label">{(p) => <Input {...p} value={b.text ?? ""} onChange={(e) => patch({ text: e.target.value }, "t")} />}</Field><Note>Link and colour are in the Email tab under Call to action.</Note></>}
        {b.kind === "hero" && <><Field label="Caption">{(p) => <Input {...p} value={b.heading ?? ""} onChange={(e) => patch({ heading: e.target.value }, "h")} />}</Field><Note>The hero image, its prompt and source are in the Images tab.</Note></>}
        {b.kind === "testimonial" && <><Field label="Quote">{(p) => <Textarea {...p} rows={3} value={b.text ?? ""} onChange={(e) => patch({ text: e.target.value }, "t")} />}</Field><Field label="Author">{(p) => <Input {...p} value={b.author ?? ""} onChange={(e) => patch({ author: e.target.value }, "a")} />}</Field><Seg label="Stars" value={String(b.stars ?? 5)} onChange={(v) => patch({ stars: Number(v) })} options={["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n }))} /></>}
        {(b.kind === "imagetext" || b.kind === "imagebullets" || b.kind === "image") && <><Seg label="Image side" value={b.imageSide ?? "left"} onChange={(v) => patch({ imageSide: v })} options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} /><BlockImage /></>}
        {["discount", "timeline", "trustgrid", "comparison", "ingredients", "table", "grid", "headerimage"].includes(b.kind) && <Note>Fields for this kind ({BLOCK_KIND_LABELS[b.kind]}) are the same as today: {kindFields(b.kind)}.</Note>}
        <Row><Button size="sm" onClick={onDuplicate} icon={<IcCopy size={12} />}>Duplicate</Button><Button size="sm" onClick={() => toast({ title: "Merge tag inserted", description: "{{ first_name|default:'there' }}" })}>Personalise</Button><Button size="sm" onClick={() => toast({ title: "Brand fact inserted", description: "558 reviews, 91% five star" })}>Brand fact</Button></Row>
      </Panel>
    </>
  );
}

function kindFields(k: MockBlock["kind"]) {
  return ({
    discount: "code, description, original and new price", timeline: "label and text rows, add and remove", trustgrid: "image and caption rows",
    comparison: "left and right label, price, perk", ingredients: "panel heading, name and dose rows, trust line", table: "columns 2 to 4, rows up to 12, star a row",
    grid: "up to 6 cells with heading, caption and image", headerimage: "card or pill style, eyebrow, headline, second card, 4:5 image",
  } as Record<string, string>)[k] ?? "";
}

/** Selection-driven inline styling, as today: sizes, bold, italic, underline, uppercase, brand colours, clear. */
function InlineToolbar() {
  const { toast } = useToast();
  const b = (label: string, title: string) => <IconButton key={label} title={title} size="sm" outlined onClick={() => toast({ title: `${title} applied to the selection` })}><span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span></IconButton>;
  return (
    <div role="toolbar" aria-label="Inline style" style={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
      {["XS", "S", "L", "XL"].map((s) => b(s, `Size ${s}`))}
      <span className="ui-divider-v" />
      {b("B", "Bold")}{b("I", "Italic")}{b("U", "Underline")}{b("AA", "Uppercase")}
      <span className="ui-divider-v" />
      <RoleSwatches value={null} onChange={(v) => toast({ title: `${v ?? "Theme"} colour applied to the selection` })} allowTheme={false} />
      <Button size="sm" variant="ghost" onClick={() => toast({ title: "Styling cleared" })}>Clear</Button>
      <Note>Select text in the field first.</Note>
    </div>
  );
}

function BlockImage() {
  const { toast } = useToast();
  const [writer, setWriter] = useState("craft");
  const [drawer, setDrawer] = useState("gpt");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: "1px solid var(--ui-border)", borderRadius: 6 }}>
      <PanelSectionTitle>Block image</PanelSectionTitle>
      <Field label="Image URL">{(p) => <Input {...p} defaultValue="https://kt6ezg…/carousel-images/…png" />}</Field>
      <Field label="Prompt">{(p) => <Textarea {...p} rows={2} defaultValue="Written from this block's own copy" />}</Field>
      <Row gap={8}>
        <Seg label="Writes prompt" value={writer} onChange={setWriter} options={[{ value: "fast", label: "Fast" }, { value: "craft", label: "Craft" }, { value: "best", label: "Best" }]} />
        <Seg label="Draws image" value={drawer} onChange={setDrawer} options={[{ value: "gpt", label: "GPT" }, { value: "flux", label: "FLUX" }, { value: "seedream", label: "Seedream" }]} />
      </Row>
      <Field label="Standing instructions">{(p) => <Input {...p} placeholder="e.g. always overhead, never people" />}</Field>
      <Row>
        <Button size="sm" onClick={() => toast({ title: "Asset library" })}>Library</Button>
        <Button size="sm" onClick={() => toast({ title: "Upload", description: "Oversize photos are shrunk on the way in." })}>Upload</Button>
        <Button size="sm" onClick={() => toast({ title: "Prompt rewritten" })}>Rewrite prompt</Button>
        <Button size="sm" onClick={() => toast({ title: "Chose from library", description: "Picked the bedside lamp shot: it matches the block's mood." })}>Choose from library</Button>
        <Button size="sm" variant="primary" onClick={() => toast({ title: "Generating image", description: "About 30 seconds." })}>Generate</Button>
        <Button size="sm" onClick={() => toast({ title: "Crop editor", description: "Drag, zoom, focal point, apply." })}>Edit crop</Button>
        <Button size="sm" variant="ghost" onClick={() => toast({ title: "Image cleared" })}>Clear</Button>
      </Row>
    </div>
  );
}

/* ── Images tab ────────────────────────────────────────────────────────── */
export function ImagesTab({ images, onChange }: { images: ImageSlot[]; onChange: (next: ImageSlot[]) => void }) {
  const { toast } = useToast();
  const set = (id: string, p: Partial<ImageSlot>) => onChange(images.map((s) => (s.id === id ? { ...s, ...p } : s)));
  return (
    <>
      {images.map((s, i) => (
        <Panel key={s.id} title={s.role === "hero" ? "Hero image · 4:5" : `Image ${i} · ${s.aspect}`} actions={s.role !== "hero" && <IconButton title="Remove image" size="sm" danger onClick={() => onChange(images.filter((x) => x.id !== s.id))}><IcTrash size={14} /></IconButton>}>
          <div style={{ aspectRatio: s.aspect.replace(":", "/"), borderRadius: 6, overflow: "hidden", border: "1px solid var(--ui-border)", background: "var(--ui-surface-2)" }}>{s.url ? <img src={s.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Skeleton width="100%" height="100%" />}</div>
          <Seg label="Source" value={s.source} onChange={(v) => set(s.id, { source: v })} options={[{ value: "generated", label: "Generated" }, { value: "asset", label: "Asset" }, { value: "upload", label: "Upload" }]} />
          {s.source === "generated" && (
            <>
              <Field label="Prompt">{(p) => <Textarea {...p} rows={3} value={s.prompt} onChange={(e) => set(s.id, { prompt: e.target.value })} />}</Field>
              <Seg label="Mood" value={s.mood ?? "calm"} onChange={(v) => set(s.id, { mood: v })} options={["calm", "warm", "clinical", "dusk", "bright"].map((m) => ({ value: m, label: m }))} />
              <Row><Button size="sm" onClick={() => set(s.id, { prompt: "Amber bottle on a linen nightstand, 6am light through sheer curtain, nothing else in frame" })} icon={<IcRefresh size={12} />}>Regenerate prompt</Button><Button size="sm" variant="primary" onClick={() => toast({ title: "Generating image", description: "About 30 seconds. The email stays editable." })}>{s.url ? "Regenerate" : "Generate image"}</Button></Row>
            </>
          )}
          {s.source === "asset" && <Row><Button size="sm" onClick={() => toast({ title: "Asset library", description: "Folders, search, pick." })}>{s.url ? "Swap asset" : "Choose asset"}</Button><Button size="sm" variant="ghost" onClick={() => set(s.id, { source: "generated" })}>Generate new</Button></Row>}
          {s.source === "upload" && <Row><Button size="sm" onClick={() => toast({ title: "Choose file", description: "Kept for 7 days unless the email is saved." })}>{s.url ? "Replace image" : "Choose file"}</Button><Button size="sm" variant="ghost" onClick={() => set(s.id, { source: "generated" })}>Generate new</Button></Row>}
          <Row><Button size="sm" onClick={() => toast({ title: "Crop editor", description: "Drag to move, zoom, 3 by 3 focal grid, reset, apply." })}>Edit crop</Button></Row>
        </Panel>
      ))}
      {images.length < 6 && <Button icon={<IcPlus size={14} />} onClick={() => onChange([...images, { id: `img-${Date.now()}`, role: "secondary", source: "generated", prompt: "", aspect: "1:1" }])}>Add image</Button>}
      <Note>Up to 5 secondary images. Click any image in the preview to jump to its slot.</Note>
    </>
  );
}

/* ── Brief tab ─────────────────────────────────────────────────────────── */
export function EmailBriefTab({ onRegenerateAll }: { onRegenerateAll: () => void }) {
  const { toast } = useToast();
  return (
    <>
      <Panel title="Brief">
        <Field label="Topic or angle">{(p) => <Textarea {...p} rows={2} defaultValue="Melatonin supplements boost DNA repair in night shift workers" />}</Field>
        <Field label="Tone">{(p) => <Select {...p} defaultValue="calm, editorial">{["calm, editorial", "warm, personal", "direct, product-first", "urgent, promotional"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
        <Field label="Occasion" hint="Optional">{(p) => <Input {...p} placeholder="e.g. Memorial Day weekend" />}</Field>
        <Field label="Offer" hint="Optional">{(p) => <Input {...p} defaultValue="Three month plan, $60" />}</Field>
        <Field label="CTA link">{(p) => <Input {...p} defaultValue="https://lunialife.com/products/restore" />}</Field>
        <Field label="Layout">{(p) => <Select {...p} defaultValue="model"><option value="model">Let the model choose</option>{["Editorial", "Discount announcement", "Educational", "Proof-led", "Welcome", "Last call", "Ingredient deep dive", "Subscribe or one-time", "Wind-down story", "Why we're different"].map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
        <Row><Button variant="primary" icon={<IcRefresh size={14} />} onClick={onRegenerateAll}>Regenerate from brief</Button><Button variant="ghost" onClick={() => toast({ title: "Test mode", description: "Canned copy and library images, no AI spent. For layout work." })}>Test (no AI)</Button></Row>
        <Note>Rewrites every block. Rewrite one block from its own panel when only one is wrong.</Note>
      </Panel>
      <Panel title="Whole email" collapsible defaultCollapsed>
        <Row><Button size="sm" onClick={() => toast({ title: "Improving with Claude", description: "Rewrites the chosen subject and the text blocks only. Revert is one click." })}>Improve with Claude</Button><Button size="sm" variant="ghost" onClick={() => toast({ title: "Reverted" })}>Revert</Button></Row>
        <Row><Button size="sm" onClick={() => toast({ title: "Import from Klaviyo", description: "Pick a flow; each message becomes its own email in a deck, with batch restructure and save all." })}>Import a Klaviyo flow</Button></Row>
      </Panel>
    </>
  );
}
