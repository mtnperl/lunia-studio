import Link from "next/link";

const card: React.CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, background: "var(--ui-surface)", display: "flex", flexDirection: "column", gap: 8 };
const h2: React.CSSProperties = { fontSize: 18, fontWeight: 600, margin: "40px 0 12px", letterSpacing: "-0.01em" };
const p: React.CSSProperties = { fontSize: 14, lineHeight: 1.55, color: "var(--ui-text-2)", margin: 0, maxWidth: 680 };
const linkBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 14px", borderRadius: 6, background: "var(--ui-ink)", color: "var(--ui-on-ink)", fontSize: 13, fontWeight: 500, textDecoration: "none" };
const linkGhost: React.CSSProperties = { ...linkBtn, background: "transparent", color: "var(--ui-text)", border: "1px solid var(--ui-border-strong)" };

/** Phase 3 index: what to click, what each region is for, and the two open
 *  decisions with a recommendation. */
export default function ProposalIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ui-bg)", color: "var(--ui-text)", fontFamily: "var(--ui-font)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px 96px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span className="ui-badge ui-badge--warning">Proposal</span>
          <Link href="/" style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Back to Studio</Link>
          <Link href="/styleguide" style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Style guide</Link>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>The new editor</h1>
        <p style={{ ...p, marginTop: 8 }}>Clickable prototypes on mocked data. The chrome is real: these are the tokens and primitives from Phase 2. Nothing here talks to the backend, so generate, regenerate and export are simulated with the timing they would have.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 24 }}>
          <div style={card}>
            <strong>Carousel editor</strong>
            <span style={p}>Filmstrip, canvas at true 4:5, properties rail, bulk actions, Instagram preview.</span>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Link href="/proposal/carousel" style={linkBtn}>Open with a document</Link><Link href="/proposal/carousel?state=empty" style={linkGhost}>Start empty</Link></div>
          </div>
          <div style={card}>
            <strong>Email editor</strong>
            <span style={p}>Block list, the exported HTML as the canvas, desktop and mobile widths, block properties.</span>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Link href="/proposal/email" style={linkBtn}>Open with a document</Link><Link href="/proposal/email?state=empty" style={linkGhost}>Start empty</Link></div>
          </div>
          <div style={card}>
            <strong>Phone review view</strong>
            <span style={p}>What a phone gets instead of the editor: swipe, read, approve, or ask for a change. Best viewed narrow.</span>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Link href="/proposal/review" style={linkBtn}>Open</Link></div>
          </div>
        </div>

        <h2 style={h2}>Try these</h2>
        <ol style={{ ...p, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Start empty, press <kbd className="ui-kbd">⌘</kbd><kbd className="ui-kbd">N</kbd>, pick a subject, generate. Hooks arrive first; pick one while the slides keep writing.</li>
          <li>Click the headline on the slide and type. Cmd Z undoes. Watch the save state in the top bar.</li>
          <li>Drag a slide in the filmstrip. Shift click two more, then use the bar that appears under the canvas.</li>
          <li>Right click a slide, or press <kbd className="ui-kbd">⌘</kbd><kbd className="ui-kbd">K</kbd> and type what you want.</li>
          <li>In the email, click a block in the preview, then switch Desktop to Mobile. Rewrite one block from its panel.</li>
          <li>Top bar, Directions: flip the two open decisions live.</li>
        </ol>

        <h2 style={h2}>The shell, region by region</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          <div style={card}><strong>Top bar</strong><span style={p}>Where am I, what is it called, is it saved, can I undo, how do I get it out. Views in the middle because they change what the canvas is, not what the document is. One primary action, export. Cmd K lives here so the whole app is one keystroke away.</span></div>
          <div style={card}><strong>Left rail: structure</strong><span style={p}>The document as a list you can reorder, select and act on. Slides or blocks. It is also where generation progress shows, because that is where new slides appear.</span></div>
          <div style={card}><strong>Canvas</strong><span style={p}>The artwork at true dimensions on a sunken ground, fit to the space, largest thing on screen. Everything on it is directly editable. The bulk bar and floating toolbar are the only chrome allowed on top of it.</span></div>
          <div style={card}><strong>Right rail: properties</strong><span style={p}>What is selected and what you can do to it. Three tabs: the selection, the whole document&apos;s style, the brief. The brief stays here so tone and topic can change after generation without starting over.</span></div>
        </div>

        <h2 style={h2}>The generation moment</h2>
        <p style={p}>Before: a short sheet, not a page. Topic, tone, style, length. Everything else moves to the Style tab where its effect is visible. During: the document exists from the first second. Hooks arrive in a few seconds as three real slides to pick from; the body slides land one at a time in the filmstrip with a skeleton for the one being written; the hook image renders last and the slide is editable while it does. The progress list is real steps, not a timer. After: a toast says what arrived, nothing is in the library until you keep it, and every slide, graphic and image has its own regenerate so the whole thing never has to be redone.</p>

        <h2 style={h2}>Two open decisions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={card}>
            <strong>1. Where slide text is edited</strong>
            <span style={p}><b>A. Rail plus on canvas.</b> Click text on the slide to edit it there; the same fields sit in the right rail with character counts and the AI actions. <b>B. Floating toolbar.</b> Click text on the slide; a small toolbar appears above it with shorten, punch up, rewrite; the rail shows only graphic and image.</span>
            <span style={p}><b>Recommendation: A.</b> The rail keeps every field of a slide scannable at once, which matters when checking five slides for consistency, and it is where the character count and claim check live. B is prettier for a single edit and worse for a review pass. Both keep on-canvas editing.</span>
          </div>
          <div style={card}>
            <strong>2. Where the brief lives after generation</strong>
            <span style={p}><b>A. Brief tab in the rail.</b> Topic, tone, length stay editable; regenerate from brief is one click. <b>B. Sheet, then gone.</b> The brief is a one-time dialog; changing tone means a new document.</span>
            <span style={p}><b>Recommendation: A.</b> The audit&apos;s most repeated complaint was the frozen brief. Keeping it in the rail costs one tab and removes the Start over button entirely.</span>
          </div>
        </div>

        <h2 style={h2}>Settled, not up for a vote</h2>
        <ul style={{ ...p, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Canvas centre, structure left, properties right, one top bar. Same shell for both editors.</li>
          <li>Neutral chrome. Brand colour only inside the artwork.</li>
          <li>Documents have URLs. Home becomes a library.</li>
          <li>Streaming generation with per-element regenerate. No full-page loaders.</li>
          <li>Undo, autosave and shortcuts in both editors. Cmd K everywhere.</li>
          <li>Phone gets the review view. Tablet gets the editor with the rail as a bottom sheet.</li>
          <li>The email canvas is the exported HTML, not a React approximation. The prototype fakes it in React only so it can be edited in place; production uses the real renderer with block ids, which already exists.</li>
        </ul>

        <h2 style={h2}>Known gaps in the prototype</h2>
        <p style={p}>Slides are drawn with a simplified renderer, not the real slide components, so type sizes and graphics are approximate. Images are one placeholder. Drag uses native HTML drag, which the production build will replace with pointer events for touch. Nothing persists on reload.</p>
      </div>
    </div>
  );
}
