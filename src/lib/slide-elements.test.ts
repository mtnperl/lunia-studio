import { describe, it, expect, vi } from "vitest";
import {
  pickableStyle,
  editableProps,
  editingStyle,
  isEditable,
  EDITABLE_ELEMENTS,
  SLIDE_ELEMENT_LABEL,
  ELEMENT_CONTROLS,
  type SlideElement,
} from "./slide-elements";

// The whole point of this module is that the editor's affordances cannot leak
// into the exported PNG. These tests guard that property, because a regression
// there is invisible in the app and only shows up in a shipped image.

describe("pickableStyle", () => {
  it("returns nothing at all when the slide is not interactive", () => {
    // The export and render paths pass interactive=false. Any property here
    // would land on the same nodes Puppeteer screenshots.
    expect(pickableStyle("headline", "headline", false)).toEqual({});
    expect(pickableStyle("body", null, false)).toEqual({});
  });

  it("never sets a property that participates in layout", () => {
    const style = pickableStyle("headline", "headline", true) as Record<string, unknown>;
    for (const banned of ["border", "borderWidth", "padding", "margin", "width", "height", "display", "position"]) {
      expect(style[banned]).toBeUndefined();
    }
  });

  it("draws the ring on the selected element only", () => {
    expect(pickableStyle("headline", "headline", true).outline).toContain("var(--accent");
    expect(pickableStyle("headline", "body", true).outline).toContain("transparent");
  });

  it("keeps an unselected element's outline reserved rather than absent", () => {
    // Same width either way: a ring that appears from nothing would shift
    // neighbouring content on hover if the property were ever animated.
    const on = String(pickableStyle("body", "body", true).outline);
    const off = String(pickableStyle("body", "headline", true).outline);
    expect(on.startsWith("2px solid")).toBe(true);
    expect(off.startsWith("2px solid")).toBe(true);
  });
});

describe("editingStyle", () => {
  it("is empty when not editing", () => {
    expect(editingStyle(false)).toEqual({});
  });

  it("switches the cursor to a text caret while editing", () => {
    expect(editingStyle(true).cursor).toBe("text");
  });
});

describe("editableProps", () => {
  const handlers = () => ({
    onBeginEdit: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
  });

  it("offers only double-click before editing starts", () => {
    const props = editableProps("headline", false, handlers()) as Record<string, unknown>;
    expect(props.onDoubleClick).toBeTypeOf("function");
    // A single click must stay free for selection, and the node must not be
    // editable until asked — a stray click should never put the artwork into
    // an edit state.
    expect(props.contentEditable).toBeUndefined();
    expect(props.onBlur).toBeUndefined();
  });

  it("begins editing on double-click, without bubbling to the selection handler", () => {
    const h = handlers();
    const props = editableProps("body", false, h) as unknown as {
      onDoubleClick: (e: { stopPropagation: () => void }) => void;
    };
    const stopPropagation = vi.fn();
    props.onDoubleClick({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalled();
    expect(h.onBeginEdit).toHaveBeenCalledWith("body");
  });

  it("commits the typed text on blur", () => {
    const h = handlers();
    const props = editableProps("headline", true, h) as unknown as {
      onBlur: (e: { currentTarget: { innerText: string } }) => void;
    };
    props.onBlur({ currentTarget: { innerText: "  Sleep is a cortisol story  " } });
    expect(h.onCommit).toHaveBeenCalledWith("headline", "Sleep is a cortisol story");
  });

  it("normalises the non-breaking spaces contentEditable inserts", () => {
    // Typed nbsp survives into the export and renders as visibly wrong
    // spacing, so it is stripped at the boundary rather than downstream.
    const h = handlers();
    const props = editableProps("headline", true, h) as unknown as {
      onBlur: (e: { currentTarget: { innerText: string } }) => void;
    };
    props.onBlur({ currentTarget: { innerText: "Lower\u00A0cortisol,\u00A0better\u00A0sleep" } });
    expect(h.onCommit).toHaveBeenCalledWith("headline", "Lower cortisol, better sleep");
  });

  it("abandons the edit on Escape without committing", () => {
    const h = handlers();
    const props = editableProps("headline", true, h) as unknown as {
      onKeyDown: (e: { key: string; shiftKey?: boolean; preventDefault: () => void; currentTarget: { innerText: string } }) => void;
    };
    props.onKeyDown({ key: "Escape", preventDefault: vi.fn(), currentTarget: { innerText: "half-typed" } });
    expect(h.onCancel).toHaveBeenCalled();
    expect(h.onCommit).not.toHaveBeenCalled();
  });

  it("commits a headline on Enter — it is one thought, not a paragraph", () => {
    const h = handlers();
    const props = editableProps("headline", true, { ...h, multiline: false }) as unknown as {
      onKeyDown: (e: { key: string; shiftKey?: boolean; preventDefault: () => void; currentTarget: { innerText: string } }) => void;
    };
    const preventDefault = vi.fn();
    props.onKeyDown({ key: "Enter", shiftKey: false, preventDefault, currentTarget: { innerText: "Done" } });
    expect(preventDefault).toHaveBeenCalled();
    expect(h.onCommit).toHaveBeenCalledWith("headline", "Done");
  });

  it("lets the body keep Enter for line breaks", () => {
    const h = handlers();
    const props = editableProps("body", true, { ...h, multiline: true }) as unknown as {
      onKeyDown: (e: { key: string; shiftKey?: boolean; preventDefault: () => void; currentTarget: { innerText: string } }) => void;
    };
    const preventDefault = vi.fn();
    props.onKeyDown({ key: "Enter", shiftKey: false, preventDefault, currentTarget: { innerText: "line one" } });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(h.onCommit).not.toHaveBeenCalled();
  });

  it("lets shift+enter through on a headline too", () => {
    const h = handlers();
    const props = editableProps("headline", true, { ...h, multiline: false }) as unknown as {
      onKeyDown: (e: { key: string; shiftKey?: boolean; preventDefault: () => void; currentTarget: { innerText: string } }) => void;
    };
    props.onKeyDown({ key: "Enter", shiftKey: true, preventDefault: vi.fn(), currentTarget: { innerText: "x" } });
    expect(h.onCommit).not.toHaveBeenCalled();
  });
});

describe("element vocabulary", () => {
  it("treats the graphic as selectable but not typeable", () => {
    expect(isEditable("graphic")).toBe(false);
    expect(EDITABLE_ELEMENTS).not.toContain("graphic" as SlideElement);
    expect(SLIDE_ELEMENT_LABEL.graphic).toBe("Graphic");
  });

  it("gives every element a label and at least one control", () => {
    for (const el of Object.keys(SLIDE_ELEMENT_LABEL) as SlideElement[]) {
      expect(SLIDE_ELEMENT_LABEL[el]).toBeTruthy();
      expect(ELEMENT_CONTROLS[el].length).toBeGreaterThan(0);
    }
  });
});
