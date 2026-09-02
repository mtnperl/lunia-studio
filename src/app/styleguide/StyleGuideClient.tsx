"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import {
  Button, IconButton, Spinner, Field, Input, Textarea, Select, Toggle, Slider, Tooltip, Kbd, Shortcut,
  Popover, Menu, useContextMenu, Panel, PanelSectionTitle, Tabs, ToastProvider, useToast, Dialog, ConfirmProvider, useConfirm,
  EmptyState, Skeleton, SkeletonText, CommandPalette, Badge, CardButton,
  IcCopy, IcTrash, IcRefresh, IcPlus, IcDownload, IcUndo, IcRedo, IcCheck,
  type MenuItem, type Command,
} from "@/components/ui";

/* ── helpers ──────────────────────────────────────────────────────────────── */

function luminance(hex: string) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/* Theme lives on <html data-theme>; a tiny external store lets token readers
   re-render when it changes without setState-in-effect. */
const THEME_EVENT = "lunia:theme";
function subscribeTheme(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(THEME_EVENT, cb); window.removeEventListener("storage", cb); };
}
function readTheme(): "light" | "dark" {
  return (localStorage.getItem("lunia:theme") as "light" | "dark" | null) ?? "light";
}
function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const set = (t: "light" | "dark") => {
    localStorage.setItem("lunia:theme", t);
    // Flip the attribute before notifying, so token readers see the new theme's values.
    document.documentElement.setAttribute("data-theme", t);
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  return [theme, set] as const;
}
function useToken(name: string, theme: string) {
  return useSyncExternalStore(
    subscribeTheme,
    () => { void theme; return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); },
    () => "",
  );
}
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia("(prefers-reduced-motion: reduce)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const H = ({ id, children, note }: { id: string; children: ReactNode; note?: string }) => (
  <div style={{ margin: "56px 0 20px", scrollMarginTop: 72 }} id={id}>
    <h2 style={{ fontSize: "var(--ui-text-20)", lineHeight: "var(--ui-lh-20)", fontWeight: 600, letterSpacing: "var(--ui-tracking-tight)", margin: 0 }}>{children}</h2>
    {note && <p style={{ margin: "6px 0 0", color: "var(--ui-text-2)", fontSize: "var(--ui-text-13)", maxWidth: 640 }}>{note}</p>}
  </div>
);
const Sub = ({ children }: { children: ReactNode }) => (
  <h3 style={{ fontSize: "var(--ui-text-12)", fontWeight: 600, letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", color: "var(--ui-text-3)", margin: "24px 0 10px" }}>{children}</h3>
);
const Row = ({ children, gap = 12, wrap = true }: { children: ReactNode; gap?: number; wrap?: boolean }) => (
  <div style={{ display: "flex", gap, alignItems: "center", flexWrap: wrap ? "wrap" : "nowrap" }}>{children}</div>
);
const Note = ({ children }: { children: ReactNode }) => (
  <span style={{ fontSize: "var(--ui-text-11)", color: "var(--ui-text-3)", fontFamily: "var(--ui-font-mono)" }}>{children}</span>
);

/* ── sections ─────────────────────────────────────────────────────────────── */

function Swatch({ name, textOn, theme }: { name: string; textOn?: string[]; theme: string }) {
  const value = useToken(name, theme);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 150 }}>
      <div style={{ height: 56, borderRadius: "var(--ui-radius-2)", background: `var(${name})`, border: "1px solid var(--ui-border)" }} />
      <div style={{ fontSize: 12, fontWeight: 500 }}>{name.replace("--ui-", "")}</div>
      <Note>{value}</Note>
      {textOn && value.startsWith("#") && textOn.filter((t) => t !== "--ui-text-3" || name === "--ui-bg" || name === "--ui-surface").map((t) => <ContrastLine key={t} fg={t} bg={value} theme={theme} />)}
    </div>
  );
}
function ContrastLine({ fg, bg, theme }: { fg: string; bg: string; theme: string }) {
  const fgv = useToken(fg, theme);
  if (!fgv.startsWith("#")) return null;
  const r = contrast(fgv, bg);
  const ok = r >= 4.5;
  return <Note>{fg.replace("--ui-", "")} {r.toFixed(1)}:1 <span style={{ color: ok ? "var(--ui-success)" : "var(--ui-danger)" }}>{ok ? "AA" : "fail"}</span></Note>;
}

function ColourSection({ theme }: { theme: string }) {
  const grounds = ["--ui-bg", "--ui-bg-sunken", "--ui-surface", "--ui-surface-2", "--ui-surface-3"];
  return (
    <>
      <H id="colour" note="Chrome is cool neutral in both themes. The only hue in the chrome is the focus and selection blue, plus three status colours. Brand colour is a content token and never appears here.">Colour</H>
      <Sub>Grounds, with text contrast</Sub>
      <Row gap={16}>{grounds.map((g) => <Swatch key={g} name={g} theme={theme} textOn={["--ui-text", "--ui-text-2", "--ui-text-3"]} />)}</Row>
      <Sub>Ink and lines</Sub>
      <Row gap={16}>{["--ui-text", "--ui-text-2", "--ui-text-3", "--ui-border", "--ui-border-strong", "--ui-ink"].map((g) => <Swatch key={g} name={g} theme={theme} />)}</Row>
      <Sub>Function</Sub>
      <Row gap={16}>{["--ui-focus", "--ui-success", "--ui-warning", "--ui-danger"].map((g) => <Swatch key={g} name={g} theme={theme} />)}</Row>
      <Sub>Canvas content tokens (closed set, output only)</Sub>
      <Row gap={16}>
        {["--lunia-deep-navy", "--lunia-rich-navy", "--lunia-slate-blue", "--lunia-soft-ivory", "--lunia-aqua", "--lunia-signal-yellow"].map((g) => (
          <LuniaSwatch key={g} name={g} theme={theme} />
        ))}
      </Row>
      <p style={{ fontSize: 13, color: "var(--ui-text-2)", maxWidth: 640 }}>No gradients. The two navies never sit adjacent in the same module. These six are the only colours allowed in exported artwork.</p>
    </>
  );
}
function LuniaSwatch({ name, theme }: { name: string; theme: string }) {
  const value = useToken(name, theme);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 150 }}>
      <div style={{ height: 56, borderRadius: "var(--ui-radius-2)", background: `var(${name})`, border: "1px solid var(--ui-border)" }} />
      <div style={{ fontSize: 12, fontWeight: 500 }}>{name.replace("--lunia-", "")}</div>
      <Note>{value}</Note>
    </div>
  );
}

function TypeSection() {
  const sizes = [36, 30, 24, 20, 18, 16, 14, 13, 12, 11];
  return (
    <>
      <H id="type" note="One family, Inter. Whole pixels. Each size has a paired line height. Tight tracking from 20px up, wide tracking only for 11 to 12px uppercase labels.">Type</H>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sizes.map((s) => (
          <div key={s} style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "baseline", gap: 16 }}>
            <Note>{s}px / {`var(--ui-lh-${s})`}</Note>
            <div style={{ fontSize: `var(--ui-text-${s})`, lineHeight: `var(--ui-lh-${s})`, fontWeight: s >= 20 ? 600 : 400, letterSpacing: s >= 20 ? "var(--ui-tracking-tight)" : undefined }}>
              {s >= 24 ? "Most GABA in food never reaches your brain" : s >= 16 ? "Pick a subject, shape the slides, and export a finished set." : "GABA is a large, charged molecule and crosses the blood-brain barrier poorly."}
            </div>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "baseline", gap: 16 }}>
          <Note>11px caps</Note>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", color: "var(--ui-text-3)" }}>Section label</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "baseline", gap: 16 }}>
          <Note>mono 12px</Note>
          <div style={{ fontFamily: "var(--ui-font-mono)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>1080 × 1350 · 4:5 · 5 slides · 00:42</div>
        </div>
      </div>
    </>
  );
}

function SpaceSection() {
  const steps = [2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];
  return (
    <>
      <H id="space" note="8px rhythm with a 2, 4, 6 fine grain for control internals.">Space</H>
      <Row gap={16}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: s, height: s, background: "var(--ui-text)", borderRadius: 2 }} />
            <Note>{i + 1} · {s}</Note>
          </div>
        ))}
      </Row>
      <Sub>Radii</Sub>
      <Row gap={16}>
        {[["1", 4], ["2", 6], ["3", 8], ["4", 12], ["full", 9999]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 56, height: 56, background: "var(--ui-surface-2)", border: "1px solid var(--ui-border-strong)", borderRadius: `var(--ui-radius-${k})` }} />
            <Note>{k} · {v === 9999 ? "full" : `${v}px`}</Note>
          </div>
        ))}
      </Row>
      <Sub>Elevation</Sub>
      <Row gap={24}>
        <div style={{ width: 160, height: 80, background: "var(--ui-surface)", border: "1px solid var(--ui-border)", borderRadius: 8, display: "grid", placeItems: "center" }}><Note>0 · card, rail</Note></div>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ width: 160, height: 80, background: "var(--ui-surface-2)", border: "1px solid var(--ui-border)", borderRadius: 8, boxShadow: `var(--ui-elev-${n})`, display: "grid", placeItems: "center" }}>
            <Note>{n} · {["popover", "dialog", "toast"][n - 1]}</Note>
          </div>
        ))}
      </Row>
      <p style={{ fontSize: 13, color: "var(--ui-text-2)", maxWidth: 640 }}>Only floating layers cast a shadow. Cards and rails are separated by a border and a surface step.</p>
    </>
  );
}

function MotionSection() {
  const [tick, setTick] = useState(0);
  return (
    <>
      <H id="motion" note="Four durations, three curves. Enter eases out, exit eases in, movement eases in and out. Under prefers-reduced-motion every duration is 0 and animations stop.">Motion</H>
      <Row gap={24}>
        {[["1", "80ms", "hover, press"], ["2", "150ms", "toggle, tooltip"], ["3", "220ms", "panel, popover, dialog"], ["4", "350ms", "drawer, page"]].map(([k, ms, use]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8, width: 150 }}>
            <div style={{ height: 6, background: "var(--ui-surface-3)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: tick % 2 ? "100%" : "12%", background: "var(--ui-text)", transition: `width var(--ui-dur-${k}) var(--ui-ease-in-out)` }} />
            </div>
            <Note>dur-{k} · {ms}</Note>
            <span style={{ fontSize: 12, color: "var(--ui-text-2)" }}>{use}</span>
          </div>
        ))}
      </Row>
      <div style={{ marginTop: 12 }}><Button size="sm" onClick={() => setTick((t) => t + 1)}>Play</Button></div>
    </>
  );
}

function ButtonsSection() {
  return (
    <>
      <H id="buttons" note="Five variants, three sizes, seven states. Primary is ink, not colour. One primary per view.">Button</H>
      {(["primary", "secondary", "ghost", "danger", "selected"] as const).map((v) => (
        <div key={v} style={{ display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--ui-border)" }}>
          <Note>{v}</Note>
          <Row>
            <Button variant={v} size="sm">Small</Button>
            <Button variant={v} size="md">Medium</Button>
            <Button variant={v} size="lg">Large</Button>
            <Button variant={v} icon={<IcPlus size={14} />}>With icon</Button>
            <Button variant={v} busy>Busy</Button>
            <Button variant={v} disabled>Disabled</Button>
          </Row>
        </div>
      ))}
      <Sub>Icon button</Sub>
      <Row>
        <IconButton title="Copy"><IcCopy /></IconButton>
        <IconButton title="Refresh" outlined><IcRefresh /></IconButton>
        <IconButton title="Undo" active><IcUndo /></IconButton>
        <IconButton title="Delete" danger><IcTrash /></IconButton>
        <IconButton title="Small" size="sm"><IcRedo size={14} /></IconButton>
        <IconButton title="Disabled" disabled><IcDownload /></IconButton>
        <Note>quiet · outlined · active · danger · sm · disabled</Note>
      </Row>
      <Sub>Focus</Sub>
      <p style={{ fontSize: 13, color: "var(--ui-text-2)", margin: "0 0 8px" }}>Press Tab to see the ring. It is the same two-layer ring on every control, including cards and thumbnails.</p>
      <Row><Button>Tab to me</Button><Button variant="primary">Then me</Button><IconButton title="Then this"><IcCheck /></IconButton></Row>
    </>
  );
}

function FormsSection() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [val, setVal] = useState(62);
  const [sel, setSel] = useState("4:5");
  return (
    <>
      <H id="forms" note="Inputs sit on the page ground with a 3:1 edge. Every field has a label; hint and error are wired to the control.">Input, select, toggle, slider</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, maxWidth: 900 }}>
        <Field label="Topic">{(p) => <Input {...p} placeholder="Foods that naturally increase GABA levels" />}</Field>
        <Field label="Offer" hint="Shown in the promo band">{(p) => <Input {...p} defaultValue="Up to 35% off" />}</Field>
        <Field label="CTA link" error="Enter a full URL, starting with https">{(p) => <Input {...p} defaultValue="lunialife.com" invalid />}</Field>
        <Field label="Disabled">{(p) => <Input {...p} disabled value="Not editable" readOnly />}</Field>
        <Field label="Format">{(p) => <Select {...p} value={sel} onChange={(e) => setSel(e.target.value)}><option value="4:5">4:5 Portrait</option><option value="9:16">9:16 Story</option><option value="1:1">1:1 Square</option></Select>}</Field>
        <Field label="Sizes">{(p) => <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Input {...p} size="sm" placeholder="Small" /><Input placeholder="Medium" aria-label="Medium" /><Input size="lg" placeholder="Large" aria-label="Large" /></div>}</Field>
        <Field label="Caption">{(p) => <Textarea {...p} rows={3} defaultValue="GABA is the brain's main inhibitory neurotransmitter, and most of the GABA you eat never reaches it." />}</Field>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="ui-field__label">Toggles</span>
          <Toggle checked={on} onChange={setOn} label="Show slide numbers" />
          <Toggle checked={off} onChange={setOff} label="Citations bar" />
          <Toggle checked={true} onChange={() => {}} label="Disabled on" disabled />
        </div>
        <Field label="Logo size" hint="Arrow keys move by 1, Shift for 10">{(p) => <Slider id={p.id} value={val} onChange={setVal} min={0} max={100} format={(v) => `${v}%`} />}</Field>
      </div>
    </>
  );
}

function OverlaysSection() {
  const [pop, setPop] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dlg, setDlg] = useState(false);
  const [cmd, setCmd] = useState(false);
  const popAnchor = useRef<HTMLButtonElement | null>(null);
  const menuAnchor = useRef<HTMLButtonElement | null>(null);
  const ctx = useContextMenu();
  const { toast } = useToast();
  const confirm = useConfirm();

  const items: MenuItem[] = [
    { type: "heading", label: "Slide" },
    { label: "Duplicate", icon: <IcCopy size={14} />, shortcut: "mod+d", onSelect: () => toast({ title: "Slide duplicated" }) },
    { label: "Regenerate copy", icon: <IcRefresh size={14} />, onSelect: () => toast({ title: "Regenerating slide 2", description: "Only the copy changes. The graphic stays." }) },
    { label: "Move up", disabled: true, onSelect: () => {} },
    { type: "separator" },
    { label: "Delete slide", icon: <IcTrash size={14} />, danger: true, shortcut: "backspace", onSelect: async () => {
      if (await confirm({ title: "Delete slide 2?", description: "You can undo this for a few seconds afterwards.", confirmLabel: "Delete", tone: "danger" })) {
        toast({ title: "Slide deleted", kind: "success", action: { label: "Undo", onClick: () => toast({ title: "Slide restored" }) } });
      }
    } },
  ];
  const commands: Command[] = [
    { id: "new-carousel", label: "New carousel", group: "Create", shortcut: "mod+n", onSelect: () => toast({ title: "New carousel" }) },
    { id: "new-email", label: "New email", group: "Create", onSelect: () => toast({ title: "New email" }) },
    { id: "dup", label: "Duplicate slide", group: "Slide", shortcut: "mod+d", onSelect: () => toast({ title: "Duplicated" }) },
    { id: "regen", label: "Regenerate slide copy", group: "Slide", keywords: "rewrite ai", onSelect: () => toast({ title: "Regenerating" }) },
    { id: "export", label: "Export PNGs", group: "Export", shortcut: "mod+e", onSelect: () => toast({ title: "Exporting 5 PNGs", kind: "success" }) },
    { id: "theme", label: "Toggle dark mode", group: "View", keywords: "theme light", onSelect: () => document.getElementById("sg-theme-toggle")?.click() },
    { id: "shortcuts", label: "Keyboard shortcuts", group: "Help", shortcut: "?", onSelect: () => toast({ title: "Shortcut sheet lands in the shell slice" }) },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <H id="overlays" note="Tooltip on hover and focus. Popover for small forms. Menu for actions, with roving focus and type-ahead. Dialog on the native element for a free focus trap. Toast for outcomes, with one optional action such as Undo.">Tooltip, popover, menu, dialog, toast</H>
      <Row gap={16}>
        <Tooltip label="Download this slide" shortcut="mod+shift+e"><Button>Hover or focus me</Button></Tooltip>
        <Button ref={popAnchor} onClick={() => setPop(true)}>Open popover</Button>
        <Button ref={menuAnchor} onClick={() => setMenu(true)} aria-haspopup="menu" aria-expanded={menu}>Open menu</Button>
        <Button onClick={() => setDlg(true)}>Open dialog</Button>
        <Button onClick={() => setCmd(true)}>Command palette <Shortcut keys="mod+k" /></Button>
      </Row>
      <Row gap={8}>
        <Button variant="ghost" onClick={() => toast({ title: "Saved", kind: "success" })}>Toast: saved</Button>
        <Button variant="ghost" onClick={() => toast({ title: "Could not reach the image service", description: "Your slides are safe. Try the image again in a moment.", kind: "danger", duration: 0 })}>Toast: error</Button>
        <Button variant="ghost" onClick={() => toast({ title: "Slide deleted", action: { label: "Undo", onClick: () => toast({ title: "Restored" }) } })}>Toast: with undo</Button>
        <Button variant="ghost" onClick={async () => { const ok = await confirm({ title: "Discard this draft?", description: "The generated copy and images will be lost. This cannot be undone.", confirmLabel: "Discard", tone: "danger" }); toast({ title: ok ? "Discarded" : "Kept" }); }}>Confirm dialog</Button>
      </Row>
      <Sub>Context menu</Sub>
      <div {...ctx.bind} style={{ border: "1px dashed var(--ui-border-strong)", borderRadius: 8, padding: 24, color: "var(--ui-text-2)", fontSize: 13, maxWidth: 400, cursor: "context-menu" }}>
        Right-click here for the slide menu.
      </div>
      <Menu open={ctx.open} onClose={ctx.close} anchorRect={ctx.rect} items={items} ariaLabel="Slide actions" />

      <Popover open={pop} onClose={() => setPop(false)} anchorRef={popAnchor} ariaLabel="Rename" width={280}>
        <Field label="Carousel name">{(p) => <Input {...p} autoFocus defaultValue="GABA foods" />}</Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 10 }}>
          <Button variant="ghost" onClick={() => setPop(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { setPop(false); toast({ title: "Renamed" }); }}>Save</Button>
        </div>
      </Popover>
      <Menu open={menu} onClose={() => setMenu(false)} anchorRef={menuAnchor} items={items} ariaLabel="Slide actions" />
      <Dialog open={dlg} onClose={() => setDlg(false)} title="Export carousel" footer={<><Button onClick={() => setDlg(false)}>Cancel</Button><Button variant="primary" onClick={() => { setDlg(false); toast({ title: "Exporting 5 PNGs", kind: "success" }); }}>Export</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span>Five slides at 1080 by 1350. Files are named by slide number.</span>
          <Field label="Format">{(p) => <Select {...p} defaultValue="png"><option value="png">PNG, one file per slide</option><option value="pdf">PDF, one document</option></Select>}</Field>
        </div>
      </Dialog>
      <CommandPalette open={cmd} onClose={() => setCmd(false)} commands={commands} />
    </>
  );
}

function StructureSection() {
  const [tab, setTab] = useState<"editor" | "feed" | "story">("editor");
  const [ptab, setPtab] = useState<"copy" | "image" | "layout">("copy");
  const [pick, setPick] = useState("edu");
  return (
    <>
      <H id="structure" note="Panels for rails. Tabs for views. Card buttons for option groups, as real radios. Badges for state only.">Panel, tabs, cards, badges</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, maxWidth: 900 }}>
        <Panel title="Slide 2" actions={<IconButton title="Regenerate" size="sm"><IcRefresh size={14} /></IconButton>}>
          <PanelSectionTitle>Copy</PanelSectionTitle>
          <Field label="Headline">{(p) => <Input {...p} defaultValue="Food GABA barely reaches your brain" />}</Field>
          <PanelSectionTitle>Layout</PanelSectionTitle>
          <Tabs value={ptab} onChange={setPtab} ariaLabel="Slide properties" items={[{ value: "copy", label: "Copy" }, { value: "image", label: "Image" }, { value: "layout", label: "Layout" }]} />
        </Panel>
        <Panel title="Brief" collapsible defaultCollapsed>
          <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Hook: Most GABA in food never reaches your brain. Tone: educational.</span>
        </Panel>
        <Panel title="Settings" collapsible>
          <Toggle checked onChange={() => {}} label="Show arrows" />
          <Toggle checked={false} onChange={() => {}} label="Citations bar" />
        </Panel>
      </div>
      <Sub>Tabs</Sub>
      <Row gap={24}>
        <Tabs value={tab} onChange={setTab} ariaLabel="Preview mode" items={[{ value: "editor", label: "Editor" }, { value: "feed", label: "IG feed" }, { value: "story", label: "Story", disabled: true }]} />
        <Tabs value={tab} onChange={setTab} ariaLabel="Preview mode underline" variant="underline" items={[{ value: "editor", label: "Editor" }, { value: "feed", label: "IG feed" }, { value: "story", label: "Story" }]} />
      </Row>
      <Sub>Option cards (radio group)</Sub>
      <div role="radiogroup" aria-label="Hook tone" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, maxWidth: 900 }}>
        {[["edu", "Educational", "Clear, factual, teaches something new"], ["sci", "Science-backed", "Lead with research findings and data"], ["myth", "Myth-bust", "Challenge a common misconception"], ["bold", "Bold hook", "Provocative, creates urgency"]].map(([k, t, d]) => (
          <CardButton key={k} title={t} description={d} selected={pick === k} onClick={() => setPick(k)} />
        ))}
      </div>
      <Sub>Badges</Sub>
      <Row><Badge>Draft</Badge><Badge tone="success">Saved</Badge><Badge tone="warning">Needs review</Badge><Badge tone="danger">Failed</Badge><Badge>5 slides</Badge></Row>
      <Sub>Keys</Sub>
      <Row><Shortcut keys="mod+k" /><Shortcut keys="mod+shift+z" /><Shortcut keys="esc" /><Kbd>?</Kbd></Row>
    </>
  );
}

function StatesSection() {
  return (
    <>
      <H id="states" note="Empty, loading, generating. Skeletons are shaped like the thing that is loading. Spinners only inside a control that is busy.">Empty and loading states</H>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, maxWidth: 900 }}>
        <EmptyState
          icon={<IcPlus size={28} strokeWidth={1.5} />}
          title="No carousels yet"
          description="Start from a subject in your library or paste a topic. A first draft takes about two minutes."
          actions={<><Button variant="primary">New carousel</Button><Button>Browse subjects</Button></>}
        />
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, border: "1px solid var(--ui-border)", borderRadius: 8, background: "var(--ui-surface)" }}>
          <Row gap={10}><Skeleton circle width={32} height={32} /><Skeleton width="50%" height={14} /></Row>
          <Skeleton height={140} style={{ borderRadius: 6 }} />
          <SkeletonText lines={3} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, border: "1px solid var(--ui-border)", borderRadius: 8 }}>
          <Row gap={8}><Spinner label="Writing slide 3" /><span style={{ fontSize: 13 }}>Writing slide 3 of 5</span></Row>
          <Row gap={8}><IcCheck size={14} /><span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Hooks drafted</span></Row>
          <Row gap={8}><IcCheck size={14} /><span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Slide 1, slide 2 written</span></Row>
          <Row gap={8}><span style={{ width: 14 }} /><span style={{ fontSize: 13, color: "var(--ui-text-3)" }}>Citations, graphics</span></Row>
          <Note>generation progress pattern (real steps, not a timer)</Note>
        </div>
      </div>
    </>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */

const NAV = [["colour", "Colour"], ["type", "Type"], ["space", "Space, radii, elevation"], ["motion", "Motion"], ["buttons", "Buttons"], ["forms", "Forms"], ["overlays", "Overlays"], ["structure", "Structure"], ["states", "States"]];

function Guide() {
  const [theme, setTheme] = useTheme();
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  const reduced = useReducedMotion();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: "100vh", background: "var(--ui-bg)", color: "var(--ui-text)", fontFamily: "var(--ui-font)" }}>
      <nav aria-label="Sections" style={{ position: "sticky", top: 0, height: "100vh", padding: 20, borderRight: "1px solid var(--ui-border)", background: "var(--ui-surface)", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Design system</div>
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="ui-menu-item" style={{ textDecoration: "none", color: "var(--ui-text-2)" }}>{label}</a>
        ))}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Toggle id="sg-theme-toggle" checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} label="Dark mode" />
          <Note>reduced motion: {reduced ? "on" : "off"}</Note>
          <Link href="/" style={{ fontSize: 12, color: "var(--ui-text-2)" }}>Back to Studio</Link>
        </div>
      </nav>
      <main style={{ padding: "32px 48px 96px", maxWidth: 1100 }}>
        <h1 style={{ fontSize: "var(--ui-text-24)", lineHeight: "var(--ui-lh-24)", fontWeight: 600, letterSpacing: "var(--ui-tracking-tight)", margin: 0 }}>Lunia Studio style guide</h1>
        <p style={{ color: "var(--ui-text-2)", fontSize: 14, maxWidth: 640, margin: "8px 0 0" }}>
          The chrome is neutral so the work carries the colour. Every value on this page is a token in <code style={{ fontFamily: "var(--ui-font-mono)", fontSize: 12 }}>src/app/tokens.css</code>; every control is a primitive in <code style={{ fontFamily: "var(--ui-font-mono)", fontSize: 12 }}>src/components/ui</code>. Press <Shortcut keys="mod+k" /> anywhere on this page.
        </p>
        <ColourSection theme={theme} />
        <TypeSection />
        <SpaceSection />
        <MotionSection />
        <ButtonsSection />
        <FormsSection />
        <OverlaysSection />
        <StructureSection />
        <StatesSection />
      </main>
    </div>
  );
}

export default function StyleGuideClient() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Guide />
      </ConfirmProvider>
    </ToastProvider>
  );
}
