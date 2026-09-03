"use client";
import { useEffect, useMemo, useState } from "react";
import type { Fact, FactStatus, Subject } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, IconButton, Tooltip, Badge, Input, Textarea, Select, Field, Dialog, EmptyState, Skeleton, Tabs, useToast, useConfirm, IcRefresh, IcTrash, IcCopy, IcPlus } from "@/components/ui";

type Carrier = { kind: "carousel" | "email"; id: string; title: string; snippets: string[] };

/** The claims ledger. Every number the studio publishes should be here with
 *  its source. Verified facts are quoted at generation time; pending ones wait
 *  for a human; retracted ones stay so their old value can be hunted down. */
export default function FactsView({ onOpenDocument }: { onOpenDocument: (kind: "carousel" | "email", id: string) => void }) {
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | FactStatus>("all");
  const [editing, setEditing] = useState<Fact | null>(null);
  const [adding, setAdding] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchSubject, setResearchSubject] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [carriers, setCarriers] = useState<{ fact: Fact; signatures: string[]; carriers: Carrier[]; note?: string } | null>(null);
  const [coverage, setCoverage] = useState<{ covered: number; total: number; unresearched: number } | null>(null);
  const { toast } = useToast();
  const confirm = useConfirm();

  const load = () => Promise.all([
    fetch("/api/facts").then((r) => r.json()).catch(() => []),
    fetch("/api/subjects").then((r) => r.json()).catch(() => []),
  ]).then(([f, s]) => { setFacts(Array.isArray(f) ? f : []); setSubjects(Array.isArray(s) ? s : (s?.subjects ?? [])); })
    .then(() => fetch("/api/facts/coverage").then((r) => r.json()).then((c) => { if (c && typeof c.total === "number") setCoverage(c); }).catch(() => {}));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (facts ?? []).filter((f) => (status === "all" || f.status === status) && (!needle || `${f.subjectText} ${f.statement} ${f.value ?? ""} ${f.source.citation ?? ""}`.toLowerCase().includes(needle)));
  }, [facts, q, status]);
  const groups = useMemo(() => {
    const m = new Map<string, Fact[]>();
    for (const f of filtered) { const k = f.subjectText || "Unfiled"; (m.get(k) ?? m.set(k, []).get(k)!).push(f); }
    return [...m.entries()];
  }, [filtered]);
  const counts = useMemo(() => ({ verified: (facts ?? []).filter((f) => f.status === "verified").length, pending: (facts ?? []).filter((f) => f.status === "pending").length, retracted: (facts ?? []).filter((f) => f.status === "retracted").length }), [facts]);
  const subjectsWithoutFacts = useMemo(() => { const have = new Set((facts ?? []).map((f) => f.subjectId).filter(Boolean)); return subjects.filter((s) => !have.has(s.id)); }, [facts, subjects]);

  const patch = async (id: string, p: Partial<Fact>) => {
    const r = await fetch(`/api/facts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    if (!r.ok) { toast({ title: "Could not update the fact", kind: "danger" }); return null; }
    const next = (await r.json()) as Fact;
    setFacts((fs) => (fs ?? []).map((f) => (f.id === id ? next : f)));
    return next;
  };
  const remove = async (f: Fact) => {
    if (!(await confirm({ title: "Delete this fact?", description: "Retract it instead if a document might still carry the value.", confirmLabel: "Delete", tone: "danger" }))) return;
    await fetch(`/api/facts/${f.id}`, { method: "DELETE" });
    setFacts((fs) => (fs ?? []).filter((x) => x.id !== f.id));
    toast({ title: "Fact deleted" });
  };
  const seed = async () => {
    setBusy("seed");
    const r = await fetch("/api/facts/seed", { method: "POST" }).then((x) => x.json()).catch(() => null);
    setBusy(null);
    if (!r?.ok) { toast({ title: "Seeding failed", kind: "danger" }); return; }
    toast({ title: `Seeded from ${r.scanned} checked carousels`, description: `${r.added} new, ${r.updated} updated. Edited slides were skipped.`, kind: "success" });
    load();
  };
  const research = async () => {
    const subj = subjects.find((s) => s.id === researchSubject);
    if (!subj) return;
    setResearchOpen(false); setBusy("research");
    toast({ title: `Researching: ${subj.text}`, description: "Primary sources only. About a minute. Results arrive as pending." });
    const r = await fetch("/api/facts/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjectId: subj.id }) }).then((x) => x.json()).catch(() => null);
    setBusy(null);
    if (!r?.ok) { toast({ title: "Research failed", description: r?.error, kind: "danger", duration: 0 }); return; }
    toast({ title: `${r.added} facts to review`, description: subj.text, kind: "success" });
    setStatus("pending"); load();
  };
  const batch = async () => {
    setBusy("batch");
    toast({ title: "Researching the next 2 subjects", description: "Primary sources only. A minute each. Results arrive as pending." });
    const r = await fetch("/api/facts/research-batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ limit: 2 }) }).then((x) => x.json()).catch(() => null);
    setBusy(null);
    if (!r?.ok) { toast({ title: "Batch failed", kind: "danger" }); return; }
    const done = (r.researched as { subject: string; added?: number; error?: string }[]);
    toast({ title: `${done.filter((d) => !d.error).length} subjects researched`, description: done.map((d) => `${d.subject.slice(0, 40)}: ${d.error ? "failed" : `${d.added} facts`}`).join(" · "), kind: "success" });
    setStatus("pending"); load();
  };
  const hunt = async (f: Fact) => {
    setBusy(`hunt-${f.id}`);
    const r = await fetch(`/api/facts/propagate?factId=${encodeURIComponent(f.id)}`).then((x) => x.json()).catch(() => null);
    setBusy(null);
    if (!r) { toast({ title: "Search failed", kind: "danger" }); return; }
    setCarriers({ fact: f, signatures: r.signatures ?? [], carriers: r.carriers ?? [], note: r.note });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px 80px" }}>
      <PageHeader
        title="Facts"
        description="Every number the studio publishes, with its source. Verified facts are quoted when a carousel or email is written. Pending ones wait for you."
        actions={<>
          <Button onClick={() => setResearchOpen(true)} icon={<IcRefresh size={14} />} busy={busy === "research"}>Research a subject</Button>
          <Button onClick={seed} busy={busy === "seed"}>Seed from fact checks</Button>
          <Button variant="primary" icon={<IcPlus size={14} />} onClick={() => setAdding(true)}>Add a fact</Button>
        </>}
      />

      {coverage && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", border: "1px solid var(--ui-border)", borderRadius: 8, background: "var(--ui-surface)", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span><b>{coverage.covered}</b> of <b>{coverage.total}</b> subjects have facts on file</span>
              <span style={{ color: "var(--ui-text-3)", fontFamily: "var(--ui-font-mono)", fontSize: 12 }}>{Math.round((coverage.covered / Math.max(1, coverage.total)) * 100)}%</span>
            </div>
            <div style={{ height: 6, background: "var(--ui-surface-3)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${(coverage.covered / Math.max(1, coverage.total)) * 100}%`, height: "100%", background: "var(--ui-text)", transition: "width var(--ui-dur-4) var(--ui-ease-out)" }} /></div>
            <span style={{ fontSize: 12, color: "var(--ui-text-3)" }}>A subject with nothing on file is researched the first time it is used, and three more are researched every night. {coverage.unresearched} still to go.</span>
          </div>
          <Button onClick={batch} busy={busy === "batch"} icon={<IcRefresh size={14} />}>Research the next 2 now</Button>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: "1 1 260px" }}><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search facts, subjects, sources" aria-label="Search facts" /></div>
        <Tabs value={status} onChange={setStatus} ariaLabel="Status" items={[{ value: "all", label: `All ${(facts ?? []).length}` }, { value: "verified", label: `Verified ${counts.verified}` }, { value: "pending", label: `Pending ${counts.pending}` }, { value: "retracted", label: `Retracted ${counts.retracted}` }]} />
      </div>

      {facts === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-busy="true"><Skeleton height={64} /><Skeleton height={64} /><Skeleton height={64} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={facts.length === 0 ? "The ledger is empty" : "Nothing matches"}
          description={facts.length === 0 ? "Seed it from the fact checks already on file, or research a subject from your library." : "Try a different search or status."}
          actions={facts.length === 0 ? <><Button variant="primary" onClick={seed} busy={busy === "seed"}>Seed from fact checks</Button><Button onClick={() => setResearchOpen(true)}>Research a subject</Button></> : undefined}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {groups.map(([subject, items]) => (
            <section key={subject}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px", display: "flex", alignItems: "baseline", gap: 8 }}>{subject}<span style={{ fontFamily: "var(--ui-font-mono)", fontSize: 11, color: "var(--ui-text-3)" }}>{items.length}</span></h2>
              <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, overflow: "hidden" }}>
                {items.map((f) => (
                  <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--ui-border)", background: f.status === "retracted" ? "var(--ui-surface)" : "var(--ui-bg)", opacity: f.status === "retracted" ? 0.75 : 1 }}>
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 14, lineHeight: 1.45, textDecoration: f.status === "retracted" ? "line-through" : undefined }}>{f.statement}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "var(--ui-text-2)" }}>
                        <Badge tone={f.status === "verified" ? "success" : f.status === "pending" ? "warning" : "neutral"}>{f.status}</Badge>
                        {f.value && <span style={{ fontFamily: "var(--ui-font-mono)" }}>{f.value}</span>}
                        <span>{f.origin === "verification" ? "from a fact check" : f.origin === "research" ? "from research" : "added by hand"}</span>
                        {f.source.url ? <a href={f.source.url} target="_blank" rel="noreferrer" style={{ color: "var(--ui-focus)" }}>{f.source.citation ? f.source.citation.slice(0, 80) : f.source.title ?? new URL(f.source.url).hostname}</a> : f.source.citation && <span>{f.source.citation.slice(0, 80)}</span>}
                        {f.previous && f.previous.length > 0 && <span style={{ color: "var(--ui-warning)" }}>corrected {f.previous.length} time{f.previous.length > 1 ? "s" : ""}</span>}
                      </div>
                      {f.source.quote && <div style={{ fontSize: 12, color: "var(--ui-text-3)", fontStyle: "italic", borderLeft: "2px solid var(--ui-border)", paddingLeft: 8 }}>{f.source.quote.slice(0, 220)}{f.source.quote.length > 220 ? "…" : ""}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                      {f.status === "pending" && <Button size="sm" variant="primary" onClick={async () => { await patch(f.id, { status: "verified" }); toast({ title: "Verified", kind: "success" }); }}>Approve</Button>}
                      <Tooltip label="Edit"><IconButton title="Edit" size="sm" onClick={() => setEditing(f)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg></IconButton></Tooltip>
                      <Tooltip label="Where is the old value still used?"><IconButton title="Find documents carrying an earlier value" size="sm" onClick={() => hunt(f)} disabled={busy === `hunt-${f.id}`}><IcCopy size={14} /></IconButton></Tooltip>
                      {f.status !== "retracted" ? <Tooltip label="Retract"><IconButton title="Retract" size="sm" danger onClick={async () => { await patch(f.id, { status: "retracted" }); toast({ title: "Retracted", description: "Kept in the ledger so its value can be hunted." }); }}><IcTrash size={14} /></IconButton></Tooltip> : <Tooltip label="Delete for good"><IconButton title="Delete" size="sm" danger onClick={() => remove(f)}><IcTrash size={14} /></IconButton></Tooltip>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <FactDialog open={adding || !!editing} fact={editing} subjects={subjects} onClose={() => { setAdding(false); setEditing(null); }} onSave={async (draft) => {
        if (editing) { await patch(editing.id, draft); toast({ title: "Saved", description: draft.statement !== editing.statement ? "The earlier statement is kept so you can find where it is still used." : undefined }); }
        else { const r = await fetch("/api/facts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, origin: "manual" }) }); if (r.ok) { toast({ title: "Fact added" }); load(); } else toast({ title: "Could not add the fact", kind: "danger" }); }
        setAdding(false); setEditing(null);
      }} />

      <Dialog open={researchOpen} onClose={() => setResearchOpen(false)} title="Research a subject" footer={<><Button onClick={() => setResearchOpen(false)}>Cancel</Button><Button variant="primary" disabled={!researchSubject} onClick={research}>Research</Button></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Subject" hint={`${subjectsWithoutFacts.length} of ${subjects.length} subjects have no facts yet`}>{(p) => (
            <Select {...p} value={researchSubject} onChange={(e) => setResearchSubject(e.target.value)}>
              <option value="">Choose a subject</option>
              {subjectsWithoutFacts.map((s) => <option key={s.id} value={s.id}>{s.text}</option>)}
              {subjects.filter((s) => !subjectsWithoutFacts.includes(s)).length > 0 && <optgroup label="Already has facts">{subjects.filter((s) => !subjectsWithoutFacts.includes(s)).map((s) => <option key={s.id} value={s.id}>{s.text}</option>)}</optgroup>}
            </Select>
          )}</Field>
          <span style={{ fontSize: 12, color: "var(--ui-text-2)" }}>Finds three to six facts with primary sources, each with the figure, its condition and a verbatim quote. They land as pending; nothing is quoted in generation until you approve it.</span>
        </div>
      </Dialog>

      <Dialog open={!!carriers} onClose={() => setCarriers(null)} title="Where the earlier value still lives" wide>
        {carriers && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13 }}><b>{carriers.fact.statement}</b></div>
            {carriers.note && <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>{carriers.note}</span>}
            {carriers.signatures.length > 0 && <div style={{ fontSize: 12, color: "var(--ui-text-2)" }}>Looked for: {carriers.signatures.map((s) => <code key={s} style={{ fontFamily: "var(--ui-font-mono)", marginRight: 8 }}>{s}</code>)}</div>}
            {carriers.carriers.length === 0 && carriers.signatures.length > 0 && <span style={{ fontSize: 13, color: "var(--ui-success)" }}>No saved carousel or email carries it.</span>}
            {carriers.carriers.map((c) => (
              <div key={c.id} style={{ border: "1px solid var(--ui-border)", borderRadius: 6, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 500 }}><Badge>{c.kind}</Badge> {c.title}</span><Button size="sm" onClick={() => { setCarriers(null); onOpenDocument(c.kind, c.id); }}>Open</Button></div>
                {c.snippets.map((s, i) => <div key={i} style={{ fontSize: 12, color: "var(--ui-text-2)", fontFamily: "var(--ui-font-mono)" }}>…{s}…</div>)}
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function FactDialog(props: { open: boolean; fact: Fact | null; subjects: Subject[]; onClose: () => void; onSave: (draft: Partial<Fact> & { statement: string }) => Promise<void> }) {
  // Mounted only while open, keyed by the fact, so the fields start from the
  // fact every time without an effect.
  if (!props.open) return null;
  return <FactDialogInner key={props.fact?.id ?? "new"} {...props} />;
}

function FactDialogInner({ fact, subjects, onClose, onSave }: { open: boolean; fact: Fact | null; subjects: Subject[]; onClose: () => void; onSave: (draft: Partial<Fact> & { statement: string }) => Promise<void> }) {
  const [statement, setStatement] = useState(fact?.statement ?? "");
  const [value, setValue] = useState(fact?.value ?? "");
  const [citation, setCitation] = useState(fact?.source.citation ?? "");
  const [url, setUrl] = useState(fact?.source.url ?? "");
  const [quote, setQuote] = useState(fact?.source.quote ?? "");
  const [subjectId, setSubjectId] = useState(fact?.subjectId ?? "");
  const [subjectText, setSubjectText] = useState(fact?.subjectText ?? "");
  const [status, setStatus] = useState<FactStatus>(fact?.status ?? "pending");
  return (
    <Dialog open onClose={onClose} title={fact ? "Edit fact" : "Add a fact"} wide footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={statement.trim().length < 8} onClick={() => onSave({ statement: statement.trim(), value: value || undefined, source: { citation: citation || undefined, url: url || undefined, quote: quote || undefined }, subjectId: subjectId || undefined, subjectText: subjectText || subjects.find((s) => s.id === subjectId)?.text || "", status })}>{fact ? "Save" : "Add"}</Button></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}><Field label="Statement" hint="One sentence with the figure and the condition it was measured under.">{(p) => <Textarea {...p} rows={2} value={statement} onChange={(e) => setStatement(e.target.value)} />}</Field></div>
        <Field label="Figure">{(p) => <Input {...p} value={value} onChange={(e) => setValue(e.target.value)} placeholder="8 mg per 200 ml cup" />}</Field>
        <Field label="Status">{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as FactStatus)}><option value="pending">Pending</option><option value="verified">Verified</option><option value="retracted">Retracted</option></Select>}</Field>
        <Field label="Subject">{(p) => <Select {...p} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); const s = subjects.find((x) => x.id === e.target.value); if (s) setSubjectText(s.text); }}><option value="">Not in the subject library</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.text}</option>)}</Select>}</Field>
        <Field label="Subject text" hint="Used when the subject is not in the library">{(p) => <Input {...p} value={subjectText} onChange={(e) => setSubjectText(e.target.value)} />}</Field>
        <div style={{ gridColumn: "1 / -1" }}><Field label="Citation">{(p) => <Input {...p} value={citation} onChange={(e) => setCitation(e.target.value)} placeholder="Keenan EK et al. How much theanine in a cup of tea? Food Chem. 2011;125(2):588-594." />}</Field></div>
        <div style={{ gridColumn: "1 / -1" }}><Field label="URL">{(p) => <Input {...p} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://doi.org/…" />}</Field></div>
        <div style={{ gridColumn: "1 / -1" }}><Field label="Quote" hint="Verbatim from the source">{(p) => <Textarea {...p} rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} />}</Field></div>
      </div>
    </Dialog>
  );
}
