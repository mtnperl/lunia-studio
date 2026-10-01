// Partial edits to a saved carousel. Send only what changes, addressed by name
// and position, and get the whole deck back. Built for Muze, but nothing here
// is Muze specific.
//
// Why this exists instead of /save: save rebuilds the record from the request
// body, so a body missing the style settings, overlays or hook image variants
// wipes them. A patch merges into the stored record and touches nothing it was
// not asked to.
import { stripDashes } from "./strip-dashes";
import { scanBannedTerms } from "./banned-terms";
import {
  ChartbookContentSchema,
  DidYouKnowContentSchema,
  GraphicSpecSchema,
  PrimerContentSchema,
  type CarouselContentSlide,
  type Hook,
  type SavedCarousel,
} from "./types";

export type PatchResult =
  | {
      ok: true;
      carousel: SavedCarousel;
      /** Every field that changed, as a path like `hooks[0].subline`. */
      changed: string[];
      /** Copy that was saved but needs a look: banned terms, broken emphasis. */
      warnings: string[];
      /** Images whose pixels still show the old text. Regenerate them. */
      staleImages: string[];
    }
  | { ok: false; status: number; error: string; details?: string[] };

const MAX_TEXT = 5000;

const TOP_KEYS = [
  "ifSavedAt",
  "topic",
  "selectedHook",
  "hooks",
  "slides",
  "cta",
  "takeaway",
  "caption",
  "didYouKnowContent",
  "primerContent",
  "chartbookContent",
];

type Obj = Record<string, unknown>;
type Ctx = { changed: string[]; warnings: string[]; errors: string[] };

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** One string, cleaned the way generated copy is: dashes stripped, banned terms flagged. */
function text(ctx: Ctx, path: string, v: unknown): string | undefined {
  if (typeof v !== "string") {
    ctx.errors.push(`${path} must be a string`);
    return undefined;
  }
  if (v.length > MAX_TEXT) {
    ctx.errors.push(`${path} is over ${MAX_TEXT} characters`);
    return undefined;
  }
  const s = stripDashes(v);
  for (const m of scanBannedTerms(s)) {
    ctx.warnings.push(`${path}: "${m.matched}" is a banned ${m.category.replace("_", " ")}`);
  }
  return s;
}

function cleanDeep(ctx: Ctx, path: string, v: unknown): unknown {
  if (typeof v === "string") return text(ctx, path, v) ?? v;
  if (Array.isArray(v)) return v.map((x, i) => cleanDeep(ctx, `${path}[${i}]`, x));
  if (isObj(v)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleanDeep(ctx, `${path}.${k}`, x)]));
  }
  return v;
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (isObj(base) && isObj(patch)) {
    const out: Obj = { ...base };
    for (const [k, v] of Object.entries(patch)) out[k] = deepMerge(base[k], v);
    return out;
  }
  return patch;
}

function unknownKeys(ctx: Ctx, path: string, obj: Obj, allowed: string[]): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) ctx.errors.push(`${path}: unknown field "${k}". Allowed: ${allowed.join(", ")}`);
  }
}

/** Apply text fields from `entry` onto `target`. A clearable field set to "" is removed. */
function applyText(
  ctx: Ctx,
  target: Obj,
  path: string,
  entry: Obj,
  fields: string[],
  clearable: string[] = [],
): void {
  for (const f of fields) {
    if (!(f in entry)) continue;
    const v = text(ctx, `${path}.${f}`, entry[f]);
    if (v === undefined) continue;
    if (v === "" && clearable.includes(f)) delete target[f];
    else target[f] = v;
    ctx.changed.push(`${path}.${f}`);
  }
}

/**
 * Edit entries of an array by position. `index` must point at an existing
 * entry, or at `length` to add one on the end. Returns the touched indexes.
 */
function patchList<T extends object>(
  ctx: Ctx,
  name: string,
  input: unknown,
  arr: T[],
  spec: {
    fields: string[];
    clearable?: string[];
    required: string[];
    blank: () => T;
    extraKeys?: string[];
    extra?: (item: T, entry: Obj, path: string) => void;
  },
): number[] {
  const touched: number[] = [];
  if (!Array.isArray(input)) {
    ctx.errors.push(`${name} must be a list of objects like {"index": 0, "headline": "..."}`);
    return touched;
  }
  input.forEach((entry, n) => {
    const path = `${name}[${n}]`;
    if (!isObj(entry)) {
      ctx.errors.push(`${path} must be an object`);
      return;
    }
    unknownKeys(ctx, path, entry, ["index", ...spec.fields, ...(spec.extraKeys ?? [])]);
    const i = entry.index;
    if (!Number.isInteger(i) || (i as number) < 0 || (i as number) > arr.length) {
      ctx.errors.push(
        `${path}.index must be a whole number from 0 to ${arr.length - 1}, or ${arr.length} to add a new one`,
      );
      return;
    }
    const idx = i as number;
    const isNew = idx === arr.length;
    if (isNew) arr.push(spec.blank());
    const item = arr[idx] as unknown as Obj;
    const at = `${name}[${idx}]`;
    applyText(ctx, item, at, entry, spec.fields, spec.clearable);
    spec.extra?.(arr[idx]!, entry, at);
    if (isNew) {
      for (const r of spec.required) {
        if (!item[r]) ctx.errors.push(`${at}: a new entry needs "${r}"`);
      }
    }
    touched.push(idx);
  });
  return touched;
}

const STRUCTURED = [
  ["didYouKnowContent", "did_you_know", DidYouKnowContentSchema],
  ["primerContent", "primer", PrimerContentSchema],
  ["chartbookContent", "chartbook", ChartbookContentSchema],
] as const;

export function applyCarouselPatch(current: SavedCarousel, raw: unknown): PatchResult {
  if (!isObj(raw)) return { ok: false, status: 400, error: "Body must be a JSON object" };

  if (typeof raw.ifSavedAt === "string" && raw.ifSavedAt !== current.savedAt) {
    return {
      ok: false,
      status: 409,
      error: `Someone saved this deck since you read it (now ${current.savedAt}). Re-read it and resend.`,
    };
  }

  const ctx: Ctx = { changed: [], warnings: [], errors: [] };
  unknownKeys(ctx, "body", raw, TOP_KEYS);

  const c = structuredClone(current);
  const content = c.content;
  const touchesStandard = ["hooks", "slides", "cta", "takeaway", "caption", "selectedHook"].some((k) => k in raw);
  if (touchesStandard && !content) {
    return {
      ok: false,
      status: 400,
      error: `This deck is format "${c.format ?? "standard"}" and has no hooks or slides. Edit its own content key instead.`,
    };
  }

  if ("topic" in raw) {
    const v = text(ctx, "topic", raw.topic);
    if (v !== undefined) {
      c.topic = v;
      ctx.changed.push("topic");
    }
  }

  let touchedHooks: number[] = [];
  let touchedSlides: number[] = [];

  if ("hooks" in raw) {
    touchedHooks = patchList<Hook>(ctx, "hooks", raw.hooks, content.hooks, {
      fields: ["headline", "subline", "sourceNote", "emphasis"],
      clearable: ["sourceNote", "emphasis"],
      required: ["headline", "subline"],
      blank: () => ({ headline: "", subline: "" }),
    });
  }

  if ("slides" in raw) {
    touchedSlides = patchList<CarouselContentSlide>(ctx, "slides", raw.slides, content.slides, {
      fields: ["headline", "body", "citation", "emphasis", "headlineEmphasis", "figure", "graphicImagePrompt"],
      clearable: ["emphasis", "figure", "graphicImagePrompt"],
      required: ["headline", "body"],
      blank: () => ({ headline: "", body: "", citation: "" }),
      extraKeys: ["graphic"],
      extra: (slide, entry, path) => {
        if (!("graphic" in entry)) return;
        if (entry.graphic === null) {
          delete slide.graphic;
        } else {
          const parsed = GraphicSpecSchema.safeParse(entry.graphic);
          if (!parsed.success) {
            ctx.errors.push(
              `${path}.graphic is not a valid graphic: ${parsed.error.issues
                .slice(0, 3)
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")}. Use null to remove it.`,
            );
            return;
          }
          slide.graphic = JSON.stringify(parsed.data);
        }
        ctx.changed.push(`${path}.graphic`);
      },
    });
  }

  if ("selectedHook" in raw) {
    const n = raw.selectedHook;
    if (!Number.isInteger(n) || (n as number) < 0 || (n as number) >= content.hooks.length) {
      ctx.errors.push(`selectedHook must be a whole number from 0 to ${content.hooks.length - 1}`);
    } else {
      c.selectedHook = n as number;
      ctx.changed.push("selectedHook");
    }
  }

  if ("cta" in raw) {
    if (!isObj(raw.cta)) ctx.errors.push("cta must be an object like {\"headline\": \"...\", \"followLine\": \"...\"}");
    else {
      unknownKeys(ctx, "cta", raw.cta, ["headline", "followLine"]);
      applyText(ctx, content.cta as unknown as Obj, "cta", raw.cta, ["headline", "followLine"]);
    }
  }

  if ("takeaway" in raw) {
    const t = raw.takeaway;
    if (!isObj(t)) {
      ctx.errors.push("takeaway must be an object");
    } else {
      unknownKeys(ctx, "takeaway", t, ["headline", "headlineEmphasis", "points", "interaction"]);
      const isNew = !content.takeaway;
      const tk = (content.takeaway ??= {
        headline: "",
        points: [],
        interaction: { type: "save", label: "" },
      });
      applyText(ctx, tk as unknown as Obj, "takeaway", t, ["headline", "headlineEmphasis"], ["headlineEmphasis"]);
      if ("points" in t) {
        if (!Array.isArray(t.points) || t.points.length < 1 || t.points.length > 5) {
          ctx.errors.push("takeaway.points must be a list of 1 to 5 strings");
        } else {
          const pts = t.points.map((p, i) => text(ctx, `takeaway.points[${i}]`, p));
          if (pts.every((p): p is string => p !== undefined)) {
            tk.points = pts;
            ctx.changed.push("takeaway.points");
          }
        }
      }
      if ("interaction" in t) {
        const it = t.interaction;
        if (!isObj(it)) {
          ctx.errors.push('takeaway.interaction must be like {"type": "save", "label": "..."}');
        } else {
          unknownKeys(ctx, "takeaway.interaction", it, ["type", "label"]);
          if ("type" in it) {
            if (it.type === "save" || it.type === "send" || it.type === "comment") {
              tk.interaction.type = it.type;
              ctx.changed.push("takeaway.interaction.type");
            } else ctx.errors.push('takeaway.interaction.type must be "save", "send" or "comment"');
          }
          applyText(ctx, tk.interaction as unknown as Obj, "takeaway.interaction", it, ["label"]);
        }
      }
      if (isNew && (!tk.headline || tk.points.length === 0 || !tk.interaction.label)) {
        ctx.errors.push("A new takeaway needs headline, points and interaction.label");
      }
    }
  }

  if ("caption" in raw) {
    const v = text(ctx, "caption", raw.caption);
    if (v !== undefined) {
      content.caption = v;
      ctx.changed.push("caption");
    }
  }

  for (const [key, fmt, schema] of STRUCTURED) {
    if (!(key in raw)) continue;
    const patch = raw[key];
    if (c.format !== fmt) {
      ctx.errors.push(`${key} only applies to ${fmt} decks; this one is ${c.format ?? "standard"}`);
    } else if (!isObj(patch)) {
      ctx.errors.push(`${key} must be an object holding just the fields to change`);
    } else {
      const merged = deepMerge((c as unknown as Obj)[key], cleanDeep(ctx, key, patch));
      const parsed = schema.safeParse(merged);
      if (!parsed.success) {
        ctx.errors.push(
          ...parsed.error.issues.slice(0, 5).map((i) => `${key}.${i.path.join(".")}: ${i.message}`),
        );
      } else {
        (c as unknown as Obj)[key] = parsed.data;
        ctx.changed.push(`${key} (${Object.keys(patch).join(", ")})`);
      }
    }
  }

  // Emphasis has to be an exact piece of its text or the renderer drops it, so
  // a patch that leaves one broken is refused. Checked on the edited entries
  // only, after every change in the patch has landed, so a headline and its
  // new emphasis can travel together. Decks with an old mismatch elsewhere are
  // not nagged about it.
  if (content) {
    const fix = 'Send an emphasis that is an exact piece of it, or "" to clear it.';
    for (const i of touchedHooks) {
      const h = content.hooks[i]!;
      if (h.emphasis && !h.headline.includes(h.emphasis)) {
        ctx.errors.push(`hooks[${i}].emphasis "${h.emphasis}" is not inside the headline. ${fix}`);
      }
    }
    for (const i of touchedSlides) {
      const s = content.slides[i]!;
      if (s.headlineEmphasis && !s.headline.includes(s.headlineEmphasis)) {
        ctx.errors.push(`slides[${i}].headlineEmphasis "${s.headlineEmphasis}" is not inside the headline. ${fix}`);
      }
      if (s.emphasis && !s.body.includes(s.emphasis)) {
        ctx.errors.push(`slides[${i}].emphasis "${s.emphasis}" is not inside the body. ${fix}`);
      }
    }
  }

  if (ctx.errors.length > 0) {
    return { ok: false, status: 400, error: "Nothing was saved. Fix these and resend.", details: ctx.errors };
  }
  if (ctx.changed.length === 0) {
    return {
      ok: false,
      status: 400,
      error: `Nothing to change. Allowed keys: ${TOP_KEYS.filter((k) => k !== "ifSavedAt").join(", ")}`,
    };
  }

  // Editorial hooks have their text painted into the image.
  const staleImages: string[] = [];
  const hookTextChanged = ctx.changed.some(
    (p) => p === `hooks[${c.selectedHook}].headline` || p === `hooks[${c.selectedHook}].subline` || p === "selectedHook",
  );
  if (hookTextChanged && c.hookImageUrl && c.stylePreset === "editorial-scientific") staleImages.push("hook");

  return { ok: true, carousel: c, changed: ctx.changed, warnings: ctx.warnings, staleImages };
}
