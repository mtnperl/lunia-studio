"use client";
import { useState, useEffect } from "react";
import { SavedCarousel, Script } from "@/lib/types";
import { getLibrary } from "@/lib/storage";

type DayAssignment = { carouselId?: string; scriptId?: string };
type CalendarStore = Record<string, DayAssignment>; // YYYY-MM-DD → assignment

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STORAGE_KEY = "lunia:calendar";

function loadStore(): CalendarStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: CalendarStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export default function CalendarView({ onNewCarousel, onNewScript }: {
  onNewCarousel: () => void;
  onNewScript: () => void;
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [store, setStore] = useState<CalendarStore>({});
  const [carousels, setCarousels] = useState<SavedCarousel[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerDate, setPickerDate] = useState<string | null>(null); // open picker for this date

  useEffect(() => {
    setStore(loadStore());
    Promise.all([
      fetch("/api/carousel/library").then(r => r.json()).catch(() => []),
      getLibrary().catch(() => [] as Script[]),
    ]).then(([c, s]) => {
      setCarousels(Array.isArray(c) ? c : []);
      setScripts(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, []);

  function assign(dateKey: string, assignment: DayAssignment) {
    const next = { ...store, [dateKey]: assignment };
    setStore(next);
    saveStore(next);
    setPickerDate(null);
  }

  function clear(dateKey: string) {
    const next = { ...store };
    delete next[dateKey];
    setStore(next);
    saveStore(next);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekLabel = (() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const mo = start.toLocaleDateString("en-US", { month: "short" });
    const startDay = start.getDate();
    const endMo = end.toLocaleDateString("en-US", { month: "short" });
    const endDay = end.getDate();
    const year = end.getFullYear();
    if (mo === endMo) return `${mo} ${startDay} – ${endDay}, ${year}`;
    return `${mo} ${startDay} – ${endMo} ${endDay}, ${year}`;
  })();

  const sortedCarousels = [...carousels].sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  const sortedScripts = [...scripts].sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Content Calendar</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Plan your weekly content schedule</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onNewScript} style={{
            fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 7,
            border: "1.5px solid var(--border)", background: "var(--bg)",
            color: "var(--text)", cursor: "pointer", fontFamily: "inherit",
          }}>+ Script</button>
          <button onClick={onNewCarousel} style={{
            fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 7,
            border: "none", background: "var(--text)", color: "var(--bg)",
            cursor: "pointer", fontFamily: "inherit",
          }}>+ Carousel</button>
        </div>
      </div>

      {/* Week navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 16, color: "var(--text)" }}
        >‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", minWidth: 180, textAlign: "center" }}>{weekLabel}</span>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 16, color: "var(--text)" }}
        >›</button>
        <button
          onClick={() => setWeekStart(getMonday(new Date()))}
          style={{ marginLeft: 8, background: "none", border: "1.5px solid var(--border)", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--muted)" }}
        >Today</button>
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 32 }}>
        {weekDays.map((day, i) => {
          const key = toKey(day);
          const assignment = store[key];
          const carousel = assignment?.carouselId ? carousels.find(c => c.id === assignment.carouselId) : null;
          const script = assignment?.scriptId ? scripts.find(s => s.id === assignment.scriptId) : null;
          const isBroken = assignment && !carousel && !script;
          const isToday = toKey(new Date()) === key;
          const isOpen = pickerDate === key;

          return (
            <div key={key} style={{ position: "relative" }}>
              <div style={{
                border: `1.5px solid ${isToday ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8,
                padding: "10px 8px",
                minHeight: 100,
                background: isToday ? "rgba(30,122,138,0.04)" : "var(--surface)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}>
                {/* Day header */}
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? "var(--accent)" : "var(--muted)", letterSpacing: "0.04em" }}>
                  {DAY_LABELS[i]} <span style={{ fontWeight: 500 }}>{day.getDate()}</span>
                </div>

                {/* Assignment chip */}
                {isBroken && (
                  <div style={{ fontSize: 10, padding: "3px 6px", borderRadius: 4, background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span>Deleted</span>
                    <button onClick={() => clear(key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                  </div>
                )}
                {carousel && (
                  <div style={{ fontSize: 10, padding: "3px 6px", borderRadius: 4, background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-mid)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4 }}>{carousel.topic}</span>
                    <button onClick={() => clear(key)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: 0, fontSize: 12, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                )}
                {script && (
                  <div style={{ fontSize: 10, padding: "3px 6px", borderRadius: 4, background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4 }}>{script.title}</span>
                    <button onClick={() => clear(key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", padding: 0, fontSize: 12, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                )}

                {/* Assign button */}
                {!assignment && (
                  <button
                    onClick={() => setPickerDate(isOpen ? null : key)}
                    style={{
                      marginTop: "auto", fontSize: 10, fontWeight: 600, color: "var(--muted)",
                      background: "none", border: "1px dashed var(--border)", borderRadius: 5,
                      padding: "4px 0", cursor: "pointer", fontFamily: "inherit", width: "100%",
                    }}
                  >+ Assign</button>
                )}
                {assignment && !isBroken && (
                  <button
                    onClick={() => setPickerDate(isOpen ? null : key)}
                    style={{
                      marginTop: "auto", fontSize: 10, fontWeight: 600, color: "var(--muted)",
                      background: "none", border: "none",
                      padding: "2px 0", cursor: "pointer", fontFamily: "inherit", width: "100%",
                    }}
                  >+ Change</button>
                )}
              </div>

              {/* Inline picker */}
              {isOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
                  background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)", padding: 12,
                  minWidth: 220, maxWidth: 280,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Assign to {DAY_LABELS[i]} {day.getDate()}</div>

                  {loading ? (
                    <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>Loading...</div>
                  ) : sortedCarousels.length === 0 && sortedScripts.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>
                      No saved content yet.<br />Generate a carousel or script first.
                    </div>
                  ) : (
                    <>
                      {sortedCarousels.length > 0 && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Carousels</div>
                          <div style={{ maxHeight: 140, overflowY: "auto", marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                            {sortedCarousels.slice(0, 8).map(c => (
                              <div
                                key={c.id}
                                onClick={() => assign(key, { carouselId: c.id })}
                                style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border)" }}
                              >
                                <div style={{ fontWeight: 600, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.topic}</div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{new Date(c.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {sortedScripts.length > 0 && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Scripts</div>
                          <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                            {sortedScripts.slice(0, 6).map(s => (
                              <div
                                key={s.id}
                                onClick={() => assign(key, { scriptId: s.id })}
                                style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border)" }}
                              >
                                <div style={{ fontWeight: 600, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{s.title}</div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{new Date(s.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setPickerDate(null)}
                    style={{ marginTop: 8, width: "100%", fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}
                  >Cancel</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Close picker on outside click */}
      {pickerDate && (
        <div
          onClick={() => setPickerDate(null)}
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
        />
      )}
    </div>
  );
}
