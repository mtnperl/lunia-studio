/**
 * The parts of a slide you can select.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────────
 * The carousel editor used to tune a picture from a list of nouns beside it:
 * one Settings panel holding six visually identical S/M/L/XL rows — logo,
 * arrows, citation, headline, body, icons — none of which told you which part
 * of the slide it moved, and all of which were present whatever you were
 * looking at. You read the labels, guessed, clicked, and looked back at the
 * artwork to find out.
 *
 * Selecting the thing itself removes the guess. The inspector then shows the
 * controls for what you clicked and nothing else, so the number of visible
 * knobs drops from every knob in the product to the two or three that can
 * possibly apply.
 *
 * ─── Why it lives in lib/ ────────────────────────────────────────────────────
 * Both halves need this vocabulary and neither should import the other: the
 * slide components (which draw the hit regions) and the editor (which holds
 * the selection and renders the panel). A shared module keeps the slide
 * components ignorant of the editor entirely — they take a callback and a
 * selected id, and know nothing about inspectors.
 */

export type SlideElement = "headline" | "body" | "citation" | "graphic";

/** Human labels for the inspector header. */
export const SLIDE_ELEMENT_LABEL: Record<SlideElement, string> = {
  headline: "Headline",
  body: "Body",
  citation: "Citation",
  graphic: "Graphic",
};

/**
 * A slide element's selectable state, as inline style.
 *
 * `outline` rather than `border`, and no padding or margin change, because
 * these styles are applied to the SAME nodes the export renders. Outline is
 * drawn outside the box and never participates in layout, so a selected
 * headline occupies exactly the pixels an unselected one does — the preview
 * cannot drift from the PNG just because something is selected.
 *
 * `outlineOffset` lifts the ring off the glyphs so it reads as a container
 * rather than an underline on the text.
 */
export function pickableStyle(
  element: SlideElement,
  selected: SlideElement | null | undefined,
  interactive: boolean,
): React.CSSProperties {
  if (!interactive) return {};
  const isSelected = selected === element;
  return {
    cursor: "pointer",
    outline: isSelected ? "2px solid var(--accent, #1D1D1F)" : "2px solid transparent",
    outlineOffset: 6,
    borderRadius: 2,
    transition: "outline-color 120ms ease",
  };
}

/**
 * Which controls belong to which element.
 *
 * Kept as data next to the type so adding an element forces a decision about
 * what it owns, rather than leaving the control stranded in a global panel —
 * which is how six unrelated size rows ended up in one place to begin with.
 */
export const ELEMENT_CONTROLS: Record<SlideElement, readonly string[]> = {
  headline: ["text", "size"],
  body: ["text", "size"],
  citation: ["text", "size", "visibility"],
  graphic: ["type", "data", "iconSize", "regenerate"],
};

/** The elements whose content is text you can type. `graphic` is not one. */
export const EDITABLE_ELEMENTS: readonly SlideElement[] = ["headline", "body", "citation"];

export function isEditable(element: SlideElement): boolean {
  return EDITABLE_ELEMENTS.includes(element);
}

/**
 * Props that turn a slide's text zone into a field you type in.
 *
 * Single click selects, double click edits — the convention every design tool
 * already taught the user, and it keeps a stray click from putting the
 * artwork into an edit state.
 *
 * The value is deliberately UNCONTROLLED. React re-rendering a
 * contentEditable's children while the caret is inside it resets the caret to
 * the start on every keystroke, so the text is written once when editing
 * begins and read back out on blur. The caller gives the node a `key` that
 * changes when editing stops, which is what lets React take ownership again.
 *
 * Enter commits for a headline and a citation, which are single thoughts.
 * The body keeps Enter for line breaks and commits on blur or Escape.
 */
export function editableProps(
  element: SlideElement,
  editing: boolean,
  opts: {
    onBeginEdit: (element: SlideElement) => void;
    onCommit: (element: SlideElement, value: string) => void;
    onCancel: () => void;
    multiline?: boolean;
  },
) {
  if (!editing) {
    return {
      onDoubleClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        opts.onBeginEdit(element);
      },
    };
  }
  // contentEditable inserts non-breaking spaces as you type; they survive
  // into the export and render as visibly wrong spacing. Escaped rather
  // than written literally so the character is visible in the source.
  const commit = (node: HTMLElement) =>
    opts.onCommit(element, node.innerText.replace(/\u00A0/g, " ").trim());
  return {
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: true,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
    onBlur: (e: React.FocusEvent<HTMLElement>) => commit(e.currentTarget),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") { e.preventDefault(); opts.onCancel(); return; }
      if (e.key === "Enter" && !opts.multiline && !e.shiftKey) {
        e.preventDefault();
        commit(e.currentTarget);
      }
    },
  };
}

/** Visual state for a zone being typed into. Layout-neutral, like the ring. */
export function editingStyle(editing: boolean): React.CSSProperties {
  return editing
    ? { outline: "2px solid var(--accent, #1D1D1F)", outlineOffset: 6, cursor: "text" }
    : {};
}
