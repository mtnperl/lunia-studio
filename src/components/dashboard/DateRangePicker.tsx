"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type DateRange = { since: string; until: string }; // YYYY-MM-DD

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

const PRESETS = [
  "Yesterday",
  "Last 7 days",
  "Last 14 days",
  "Last 30 days",
  "Last Week",
  "Last Month",
  "Last Quarter",
  "This Month",
  "This Quarter",
  "Last Year",
  "This Year",
] as const;
type Preset = (typeof PRESETS)[number];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── UTC date helpers ────────────────────────────────────────────────────────
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function addDaysUtc(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
function startOfMonthUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}
function endOfMonthUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0));
}
function startOfQuarterUtc(d: Date): Date {
  const m = d.getUTCMonth();
  return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(m / 3) * 3, 1));
}

function rangeFromPreset(preset: Preset): DateRange {
  const today = todayUtc();
  switch (preset) {
    case "Yesterday": {
      const y = addDaysUtc(today, -1);
      return { since: toIso(y), until: toIso(y) };
    }
    case "Last 7 days":  return { since: toIso(addDaysUtc(today, -6)),  until: toIso(today) };
    case "Last 14 days": return { since: toIso(addDaysUtc(today, -13)), until: toIso(today) };
    case "Last 30 days": return { since: toIso(addDaysUtc(today, -29)), until: toIso(today) };
    case "Last Week": {
      // ISO week — Mon to Sun, previous week
      const dow = today.getUTCDay() || 7; // Sun = 0 → 7
      const lastSun = addDaysUtc(today, -dow);
      const lastMon = addDaysUtc(lastSun, -6);
      return { since: toIso(lastMon), until: toIso(lastSun) };
    }
    case "Last Month": {
      const start = startOfMonthUtc(today.getUTCFullYear(), today.getUTCMonth() - 1);
      const end = endOfMonthUtc(start.getUTCFullYear(), start.getUTCMonth());
      return { since: toIso(start), until: toIso(end) };
    }
    case "Last Quarter": {
      const thisQStart = startOfQuarterUtc(today);
      const lastQEnd = addDaysUtc(thisQStart, -1);
      const lastQStart = startOfQuarterUtc(lastQEnd);
      return { since: toIso(lastQStart), until: toIso(lastQEnd) };
    }
    case "This Month": {
      const start = startOfMonthUtc(today.getUTCFullYear(), today.getUTCMonth());
      return { since: toIso(start), until: toIso(today) };
    }
    case "This Quarter": {
      const start = startOfQuarterUtc(today);
      return { since: toIso(start), until: toIso(today) };
    }
    case "Last Year": {
      const start = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear() - 1, 11, 31));
      return { since: toIso(start), until: toIso(end) };
    }
    case "This Year": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      return { since: toIso(start), until: toIso(today) };
    }
  }
}

function formatTriggerLabel(r: DateRange): string {
  const a = fromIso(r.since);
  const b = fromIso(r.until);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const fmt = (d: Date, includeYear: boolean) => {
    const m = MONTH_NAMES[d.getUTCMonth()].slice(0, 3);
    return includeYear ? `${m} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : `${m} ${d.getUTCDate()}`;
  };
  if (r.since === r.until) return fmt(a, true);
  if (sameYear) return `${fmt(a, false)} → ${fmt(b, true)}`;
  return `${fmt(a, true)} → ${fmt(b, true)}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [pickStage, setPickStage] = useState<"start" | "end">("start");
  const [viewYear, setViewYear] = useState(() => fromIso(value.since).getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(() => fromIso(value.since).getUTCMonth());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Reset draft each time the popover opens
  useEffect(() => {
    if (open) {
      setDraft(value);
      setPickStage("start");
      const since = fromIso(value.since);
      setViewYear(since.getUTCFullYear());
      setViewMonth(since.getUTCMonth());
    }
  }, [open, value]);

  // Position the popover on open / scroll / resize. Fixed positioning escapes
  // any parent overflow:hidden (which was clipping us before). We anchor to the
  // trigger and clamp to the viewport so the popover never spills off-screen.
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const POPOVER_WIDTH = 720;
      const VIEWPORT_PAD = 12;
      const vw = window.innerWidth;
      const width = Math.min(POPOVER_WIDTH, vw - VIEWPORT_PAD * 2);
      // Right-align to trigger by default, then clamp left-edge to >= viewport-pad.
      let left = rect.right - width;
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      const top = rect.bottom + 6;
      setPos({ top, left, width });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function applyPreset(preset: Preset) {
    const r = rangeFromPreset(preset);
    setDraft(r);
    const since = fromIso(r.since);
    setViewYear(since.getUTCFullYear());
    setViewMonth(since.getUTCMonth());
    setPickStage("start");
  }

  function handleDayClick(iso: string) {
    if (pickStage === "start") {
      setDraft({ since: iso, until: iso });
      setPickStage("end");
      return;
    }
    if (iso < draft.since) {
      setDraft({ since: iso, until: draft.since });
    } else {
      setDraft({ since: draft.since, until: iso });
    }
    setPickStage("start");
  }

  function commit() {
    onChange(draft);
    setOpen(false);
  }

  function activePreset(): Preset | null {
    for (const p of PRESETS) {
      const r = rangeFromPreset(p);
      if (r.since === draft.since && r.until === draft.until) return p;
    }
    return null;
  }

  // Two-month view: viewMonth and viewMonth+1
  const months = useMemo(() => {
    const a = { year: viewYear, month: viewMonth };
    const next = new Date(Date.UTC(viewYear, viewMonth + 1, 1));
    const b = { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    return [a, b];
  }, [viewYear, viewMonth]);

  function shiftView(delta: number) {
    const d = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          cursor: "pointer",
          transition: "border-color 120ms ease, background 120ms ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <span aria-hidden style={{ color: "var(--muted)", fontSize: 11 }}>▦</span>
        {formatTriggerLabel(value)}
        <span aria-hidden style={{ color: "var(--muted)", fontSize: 9 }}>▾</span>
      </button>

      {open && pos && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Date range picker"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 1000,
            display: "flex",
            background: "var(--surface-r)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            color: "var(--text)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.18)",
          }}
        >
          {/* Preset rail */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border)",
            background: "var(--surface)",
            minWidth: 160,
            padding: "6px 0",
          }}>
            {PRESETS.map(p => {
              const active = activePreset() === p;
              return (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  style={{
                    textAlign: "left",
                    padding: "10px 16px",
                    background: "transparent",
                    border: "none",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--accent)" : "var(--text)",
                    cursor: "pointer",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-h)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Calendar pane */}
          <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column" }}>
            {/* Month/year nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button
                onClick={() => shiftView(-1)}
                aria-label="Previous month"
                style={navButtonStyle()}
              >‹</button>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={viewMonth}
                  onChange={e => setViewMonth(parseInt(e.target.value, 10))}
                  style={selectStyle()}
                >
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select
                  value={viewYear}
                  onChange={e => setViewYear(parseInt(e.target.value, 10))}
                  style={selectStyle()}
                >
                  {Array.from({ length: 11 }, (_, i) => todayUtc().getUTCFullYear() - 5 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => shiftView(1)}
                aria-label="Next month"
                style={navButtonStyle()}
              >›</button>
            </div>

            {/* Two months side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {months.map(({ year, month }) => (
                <MonthGrid
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  draft={draft}
                  pickStage={pickStage}
                  onDayClick={handleDayClick}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: "auto",
              paddingTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <span style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--muted)",
              }}>
                Dates are in UTC
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setOpen(false)} style={ghostButtonStyle()}>Cancel</button>
                <button onClick={commit} style={primaryButtonStyle()}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MonthGrid ──────────────────────────────────────────────────────────────
function MonthGrid({
  year, month, draft, pickStage, onDayClick,
}: {
  year: number;
  month: number;
  draft: DateRange;
  pickStage: "start" | "end";
  onDayClick: (iso: string) => void;
}) {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = toIso(todayUtc());

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ iso, day: d });
  }

  return (
    <div>
      <div style={{
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text)",
        textAlign: "center",
        marginBottom: 8,
      }}>
        {MONTH_NAMES[month].slice(0, 3)} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--muted)",
            textAlign: "center",
            padding: "6px 0",
          }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const isStart = c.iso === draft.since;
          const isEnd = c.iso === draft.until;
          const inRange = c.iso > draft.since && c.iso < draft.until;
          const inFutureBeyondToday = c.iso > today;

          let bg = "transparent";
          let color = "var(--text)";
          let radius = "4px";
          let fontWeight: number = 400;

          if (isStart && isEnd) {
            bg = "var(--accent)";
            color = "var(--bg)";
            fontWeight = 600;
          } else if (isStart) {
            bg = "var(--accent)";
            color = "var(--bg)";
            fontWeight = 600;
            radius = "4px 0 0 4px";
          } else if (isEnd) {
            bg = "var(--accent)";
            color = "var(--bg)";
            fontWeight = 600;
            radius = "0 4px 4px 0";
          } else if (inRange) {
            bg = "var(--accent-dim)";
            color = "var(--text)";
            radius = "0";
          }

          return (
            <button
              key={i}
              onClick={() => onDayClick(c.iso)}
              disabled={inFutureBeyondToday}
              style={{
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                fontSize: 12,
                fontWeight,
                padding: "8px 0",
                background: bg,
                color: inFutureBeyondToday ? "var(--subtle)" : color,
                border: "none",
                borderRadius: radius,
                cursor: inFutureBeyondToday ? "not-allowed" : "pointer",
                transition: "background 120ms ease",
                opacity: inFutureBeyondToday ? 0.4 : 1,
              }}
              onMouseEnter={e => {
                if (inFutureBeyondToday) return;
                if (!isStart && !isEnd && !inRange) {
                  e.currentTarget.style.background = "var(--surface-h)";
                }
              }}
              onMouseLeave={e => {
                if (inFutureBeyondToday) return;
                if (!isStart && !isEnd && !inRange) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
              aria-label={`${pickStage === "start" ? "Start" : "End"} date ${c.iso}`}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Inline button styles ───────────────────────────────────────────────────
function navButtonStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted)",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
function selectStyle(): React.CSSProperties {
  return {
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "4px 8px",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    cursor: "pointer",
  };
}
function ghostButtonStyle(): React.CSSProperties {
  return {
    padding: "8px 18px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted)",
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
}
function primaryButtonStyle(): React.CSSProperties {
  return {
    padding: "8px 22px",
    borderRadius: 999,
    border: "1px solid var(--accent)",
    background: "var(--accent)",
    color: "var(--bg)",
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}
