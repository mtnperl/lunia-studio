"use client";
import { useState, useMemo } from "react";
import { getGraphicTypeMeta } from "@/lib/graphic-types";

type Props = {
  /** Compact JSON string from slide.graphic */
  graphicJson: string;
  onSave: (newJson: string) => void;
  onClose: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

export default function GraphicDataEditor({ graphicJson, onSave, onClose }: Props) {
  const initial = useMemo<AnyData>(() => {
    const fallback = { component: "callout", data: { text: "" } };
    try {
      const raw = (graphicJson ?? "").trim();
      if (!raw || raw === '""') return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
      // Guarantee data is an object so FieldRenderer always receives a record
      const data = parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
        ? parsed.data
        : {};
      return { component: typeof parsed.component === "string" ? parsed.component : "callout", data };
    } catch {
      return fallback;
    }
  }, [graphicJson]);
  const [draft, setDraft] = useState<AnyData>(initial);
  const meta = getGraphicTypeMeta(draft?.component);

  function updateData(newData: AnyData) {
    setDraft({ ...draft, data: newData });
  }

  const componentLabel = meta?.label ?? draft?.component ?? "graphic";
  const componentDesc = meta?.description ?? "Tweak the values shown in the graphic";

  return (
    <div style={{
      marginTop: 8,
      border: "1px solid var(--accent-mid)",
      borderRadius: 8,
      overflow: "hidden",
      background: "var(--surface)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", background: "var(--accent-dim)",
        borderBottom: "1px solid var(--accent-mid)",
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Edit graphic data — {componentLabel}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {componentDesc}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setDraft(initial)}
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}
          >
            Revert
          </button>
          <button
            onClick={() => { onSave(JSON.stringify(draft)); onClose(); }}
            style={{ background: "var(--accent)", border: "none", borderRadius: 5, fontSize: 10, color: "#fff", cursor: "pointer", fontFamily: "inherit", padding: "4px 12px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700 }}
          >
            Save
          </button>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1, padding: "4px 6px" }}>✕</button>
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: "12px 14px", maxHeight: 400, overflowY: "auto" }}>
        {(() => {
          const safeData = draft?.data && typeof draft.data === "object" && !Array.isArray(draft.data)
            ? draft.data
            : {};
          const keys = Object.keys(safeData);
          if (keys.length === 0) {
            return (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: "12px 0", textAlign: "center" }}>
                No editable fields for this component yet — pick a different type or regenerate.
              </div>
            );
          }
          return (
            <FieldRenderer
              value={safeData}
              path={[]}
              onChange={(newVal) => updateData(newVal)}
            />
          );
        })()}
      </div>
    </div>
  );
}

// ─── Field renderer ───────────────────────────────────────────────────────────
function FieldRenderer({ value, path, label, onChange }: {
  value: AnyData;
  path: (string | number)[];
  label?: string;
  onChange: (v: AnyData) => void;
}) {
  if (value === null || value === undefined) {
    return <StringField label={label ?? path.join(".")} value="" onChange={(v) => onChange(v)} />;
  }
  if (typeof value === "string") {
    return <StringField label={label ?? String(path[path.length - 1] ?? "")} value={value} onChange={onChange} />;
  }
  if (typeof value === "number") {
    return <NumberField label={label ?? String(path[path.length - 1] ?? "")} value={value} onChange={onChange} />;
  }
  if (typeof value === "boolean") {
    return <BoolField label={label ?? String(path[path.length - 1] ?? "")} value={value} onChange={onChange} />;
  }
  if (Array.isArray(value)) {
    return (
      <ArrayField
        label={label ?? String(path[path.length - 1] ?? "")}
        items={value}
        onChange={onChange}
      />
    );
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return (
      <div style={{ display: "grid", gap: 10, padding: label ? "8px 0 8px 12px" : 0, borderLeft: label ? "2px solid var(--border)" : undefined, marginLeft: label ? 4 : 0 }}>
        {label && (
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {label}
          </div>
        )}
        {keys.map((k) => (
          <FieldRenderer
            key={k}
            value={value[k]}
            path={[...path, k]}
            label={k}
            onChange={(newVal) => onChange({ ...value, [k]: newVal })}
          />
        ))}
      </div>
    );
  }
  return null;
}

function StringField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isLong = value.length > 60 || /\n/.test(value);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
      <FieldLabel label={label} />
      {isLong ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ ...fieldInputStyle, resize: "vertical", minHeight: 36 }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={fieldInputStyle}
        />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
      <FieldLabel label={label} />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={fieldInputStyle}
      />
    </div>
  );
}

function BoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
      <FieldLabel label={label} />
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--accent)", cursor: "pointer" }}
      />
    </div>
  );
}

function ArrayField({ label, items, onChange }: { label: string; items: AnyData[]; onChange: (v: AnyData[]) => void }) {
  function addItem() {
    // Clone the first item as a template for the new one (cleared values)
    const template = items[0];
    let newItem: AnyData;
    if (template === undefined) newItem = "";
    else if (typeof template === "string") newItem = "";
    else if (typeof template === "number") newItem = 0;
    else if (Array.isArray(template)) newItem = [];
    else if (typeof template === "object" && template !== null) {
      newItem = Object.fromEntries(Object.keys(template).map((k) => {
        const v = template[k];
        if (typeof v === "string") return [k, ""];
        if (typeof v === "number") return [k, 0];
        if (typeof v === "boolean") return [k, false];
        return [k, v];
      }));
    } else newItem = "";
    onChange([...items, newItem]);
  }
  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, newVal: AnyData) {
    const next = [...items];
    next[idx] = newVal;
    onChange(next);
  }

  return (
    <div style={{ display: "grid", gap: 8, padding: "6px 0 6px 12px", borderLeft: "2px solid var(--border)", marginLeft: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label} ({items.length})
        </div>
        <button
          onClick={addItem}
          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px", fontWeight: 700 }}
        >
          + Add
        </button>
      </div>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "start" }}>
          <FieldRenderer
            value={item}
            path={[idx]}
            onChange={(v) => updateItem(idx, v)}
          />
          <button
            onClick={() => removeItem(idx)}
            title="Remove"
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10, color: "var(--error)", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", fontWeight: 700, height: "fit-content", marginTop: 2 }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500, textAlign: "right", paddingRight: 4 }}>
      {label}
    </span>
  );
}

const fieldInputStyle: React.CSSProperties = {
  padding: "5px 8px",
  fontSize: 12,
  fontFamily: "inherit",
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  width: "100%",
  boxSizing: "border-box",
};
