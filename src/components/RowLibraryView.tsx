"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, Button, EmptyState, Input, Select, Skeleton, useToast } from "@/components/ui";
import {
  ROW_STATUSES,
  isBuildable,
  type CarouselRow,
  type HookOption,
  type RowImportError,
  type RowStatus,
} from "@/lib/carousel-rows";

type ImportReport = {
  dryRun: boolean;
  read: number;
  imported: number;
  added: number;
  updated: number;
  buildable: number;
  rejected: number;
  skipped: number;
  errors: RowImportError[];
  total: number;
};

const STATUS_LABEL: Record<RowStatus, string> = {
  draft: "Draft",
  "in-production": "In production",
  published: "Published",
  parked: "Parked",
};

const STATUS_TONE: Record<RowStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  "in-production": "warning",
  published: "success",
  parked: "neutral",
};

const HOOKS: HookOption[] = ["a", "b", "c"];

/**
 * The row library. One reviewed spreadsheet row is one six-slide carousel,
 * and this screen is where the sheet lands and where a row's two editable
 * decisions live: which hook the cover wears, and where the row sits in
 * production.
 *
 * Slide copy is not editable here on purpose. It came from a sheet a human
 * reviewed; a row that drifts from its source stops being reviewable. Change
 * the words on the deck after it is built, or change the sheet and re-import.
 */
export default function RowLibraryView() {
  const [rows, setRows] = useState<CarouselRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState<"all" | RowStatus>("all");
  const [buildFilter, setBuildFilter] = useState<"all" | "buildable" | "rejected" | "unbuilt">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Delete all arms on the first click and fires on the second, and disarms
  // itself after four seconds so a loaded button never sits waiting. Same
  // guard the Facts screen used before it went: clearing a library is one
  // decision, and a modal for it is ceremony.
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current); }, []);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();

  async function deleteAll() {
    if (!armed) {
      setArmed(true);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed(false);
    setClearing(true);
    try {
      const res = await fetch("/api/carousel-rows", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ kind: "danger", title: "Could not empty the library", description: data?.error });
        return;
      }
      setReport(null);
      setPendingFile(null);
      setOpen(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
      toast({ kind: "success", title: "Library emptied", description: `${data?.deleted ?? 0} rows deleted. Import the sheet to start again.` });
    } catch {
      toast({ kind: "danger", title: "Network error while emptying the library" });
    } finally {
      setClearing(false);
    }
  }

  async function load() {
    try {
      const d = await fetch("/api/carousel-rows").then((r) => r.json());
      setRows(Array.isArray(d) ? d : []);
    } catch {
      setRows([]);
    }
  }
  useEffect(() => { void load(); }, []);

  /** Two passes on purpose: a dry run reports what the file would do and
   *  writes nothing, so a wrong export is caught before it lands. */
  async function runImport(file: File, dryRun: boolean) {
    setImporting(true);
    try {
      const res = await fetch(`/api/carousel-rows/import${dryRun ? "?dryRun=true" : ""}`, {
        method: "POST",
        body: await file.arrayBuffer(),
      });
      const data = await res.json();
      if (!res.ok) {
        setReport(null);
        setPendingFile(null);
        toast({ kind: "danger", title: "Import failed", description: data?.error ?? `HTTP ${res.status}` });
        return;
      }
      setReport(data as ImportReport);
      if (dryRun) {
        setPendingFile(file);
      } else {
        setPendingFile(null);
        if (fileRef.current) fileRef.current.value = "";
        await load();
        toast({ kind: "success", title: "Sheet imported", description: `${data.added} new, ${data.updated} updated.` });
      }
    } catch {
      toast({ kind: "danger", title: "Network error during import" });
    } finally {
      setImporting(false);
    }
  }

  async function patchRow(id: string, patch: { selectedHook?: HookOption; status?: RowStatus }) {
    const before = rows;
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? prev);
    try {
      const res = await fetch(`/api/carousel-rows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRows(before ?? null);
      toast({ kind: "danger", title: "Could not save that change" });
    }
  }

  const types = useMemo(() => {
    const set = new Set((rows ?? []).map((r) => r.carouselType).filter(Boolean));
    return ["All", ...[...set].sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (type !== "All" && r.carouselType !== type) return false;
      if (status !== "all" && r.status !== status) return false;
      if (buildFilter === "buildable" && !isBuildable(r)) return false;
      if (buildFilter === "rejected" && r.build !== "NO") return false;
      if (buildFilter === "unbuilt" && (!isBuildable(r) || r.usedAt)) return false;
      if (q && !r.subject.toLowerCase().includes(q) && !r.why.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, type, status, buildFilter]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    return {
      total: all.length,
      buildable: all.filter(isBuildable).length,
      unbuilt: all.filter((r) => isBuildable(r) && !r.usedAt).length,
      rejected: all.filter((r) => r.build === "NO").length,
    };
  }, [rows]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>
      <PageHeader
        title="Carousel rows"
        description="One reviewed row is one six-slide carousel. The headlines, bodies, hooks and sources come from the sheet; the builder writes only the caption and the last slide."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {(rows?.length ?? 0) > 0 && (
              <Button
                variant={armed ? "danger" : "ghost"}
                onClick={() => void deleteAll()}
                busy={clearing}
                title={armed ? "Click again to delete every row. This cannot be undone." : "Empty the library so the sheet can be imported clean"}
              >
                {armed
                  ? `Click again to delete all ${rows!.length}${counts.unbuilt < counts.buildable ? ` (${counts.buildable - counts.unbuilt} already built)` : ""}`
                  : "Delete all"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
              Import the sheet
            </Button>
          </div>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void runImport(f, true);
        }}
      />

      {report && (
        <div style={{ marginBottom: 20, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {report.dryRun ? "This is what the file would do" : "Imported"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, fontVariantNumeric: "tabular-nums" }}>
            {report.read} rows read · {report.added} new · {report.updated} updated · {report.buildable} buildable · {report.rejected} reviewed NO
            {report.skipped > 0 && ` · ${report.skipped} skipped`}
          </div>
          {report.errors.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--warning)", lineHeight: 1.6 }}>
              {report.errors.slice(0, 8).map((e) => (
                <li key={`${e.sourceRow}-${e.subject}`}>Row {e.sourceRow}: {e.problem}</li>
              ))}
              {report.errors.length > 8 && <li>and {report.errors.length - 8} more</li>}
            </ul>
          )}
          {report.dryRun && pendingFile && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button variant="primary" size="sm" busy={importing} onClick={() => void runImport(pendingFile, false)}>
                Import it
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setReport(null); setPendingFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rows…" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={buildFilter} onChange={(e) => setBuildFilter(e.target.value as typeof buildFilter)}>
          <option value="all">Every row</option>
          <option value="unbuilt">Not built yet</option>
          <option value="buildable">Buildable</option>
          <option value="rejected">Reviewed NO</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Any status</option>
          {ROW_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
      </div>

      {rows !== null && rows.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, fontVariantNumeric: "tabular-nums" }}>
          {filtered.length} of {counts.total} · {counts.unbuilt} still to build · {counts.rejected} reviewed NO
        </div>
      )}

      {rows === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={44} />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No rows yet"
          description="Import the carousel review sheet. It is read as a CSV or a spreadsheet, and the first pass only reports what it would do."
          actions={<Button variant="primary" onClick={() => fileRef.current?.click()}>Import the sheet</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing matches" description="No row matches these filters." />
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {filtered.map((r) => {
            const expanded = open === r.id;
            return (
              <div key={r.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                <div
                  onClick={() => setOpen(expanded ? null : r.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }}
                >
                  <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>{r.subject}</div>
                    <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                      {r.carouselType} · Evidence {r.evidence}/5 · Story {r.story}/5
                      {r.usedAt && ` · built ${r.usedAt.slice(0, 10)}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {r.build === "NO"
                      ? <Badge tone="warning">Reviewed NO</Badge>
                      : <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>}
                  </div>
                </div>

                {expanded && (
                  <div style={{ padding: "0 14px 16px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                    <Field label="Why this verdict">{r.why || "Nothing on file."}</Field>
                    {r.citation && (
                      <Field label="Citation">
                        {r.citationUrl
                          ? <a href={r.citationUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{r.citation}</a>
                          : r.citation}
                      </Field>
                    )}
                    {r.visualSystem && <Field label="Visual system">{r.visualSystem}</Field>}

                    {isBuildable(r) ? (
                      <>
                        <div style={{ marginTop: 14 }}>
                          <SectionLabel>Cover hook</SectionLabel>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {HOOKS.filter((k) => r.hooks[k]).map((k) => {
                              const on = r.selectedHook === k;
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => void patchRow(r.id, { selectedHook: k })}
                                  style={{
                                    textAlign: "left", padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                                    fontFamily: "inherit", fontSize: 13, lineHeight: 1.4,
                                    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                                    background: on ? "var(--accent-dim)" : "var(--bg)",
                                    color: "var(--text)",
                                  }}
                                >
                                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--subtle)", marginRight: 8 }}>
                                    {k}
                                  </span>
                                  {r.hooks[k]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ marginTop: 14 }}>
                          <SectionLabel>The six slides</SectionLabel>
                          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                            {r.slides.map((s, i) => (
                              <li key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>
                                <div style={{ fontWeight: 600 }}>{s.headline}</div>
                                <div style={{ color: "var(--muted)" }}>{s.body}</div>
                                {s.onSlideSource && (
                                  <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}>{s.onSlideSource}</div>
                                )}
                              </li>
                            ))}
                          </ol>
                          <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 8, lineHeight: 1.5 }}>
                            Slide 6 guides the deck&rsquo;s summary slide rather than being printed as written.
                            Edit the words on the deck, or edit the sheet and import it again.
                          </div>
                        </div>

                        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                          <SectionLabel inline>Status</SectionLabel>
                          <Select value={r.status} onChange={(e) => void patchRow(r.id, { status: e.target.value as RowStatus })}>
                            {ROW_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                        This row was reviewed as NO, so it carries no slides and cannot be built. It is kept
                        because the reason above is the useful part. To build it, write its six slides in the
                        sheet, set Build to YES, and import again.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--subtle)", marginBottom: inline ? 0 : 8, flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, wordBreak: "break-word" }}>{children}</div>
    </div>
  );
}
